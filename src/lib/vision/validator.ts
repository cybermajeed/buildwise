import type {
  StructuredFloorPlanData,
  ExtractedRoom,
  ExtractedOpening,
  VerificationStatus,
} from "./types";
import { parseArchitecturalDimension } from "./dimension-parser";

export interface ValidationReport {
  validatedData: StructuredFloorPlanData;
  warnings: string[];
  discrepancies: Array<{
    roomName: string;
    vlmReading?: string | null;
    ocrReading?: string | null;
    issue: string;
  }>;
  overallConfidence: "high" | "medium" | "estimated";
}

/**
 * Cross-Validation Layer
 * Fuses and cross-checks the Vision-Language Model interpretation with 2D Spatial OCR results.
 * Flags discrepancies, prevents negative or invalid values, deduplicates rooms,
 * and ensures areas are only calculated when both dimensions are explicitly verified.
 */
export function validateAndCrossCheck(
  vlmData: StructuredFloorPlanData | null,
  ocrData: StructuredFloorPlanData,
  rawOcrText?: string,
): ValidationReport {
  const warnings: string[] = [];
  const discrepancies: Array<{
    roomName: string;
    vlmReading?: string | null;
    ocrReading?: string | null;
    issue: string;
  }> = [];

  const sourceRooms = vlmData && vlmData.rooms.length > 0 ? vlmData.rooms : ocrData.rooms;
  const ocrRoomsMap = new Map<string, ExtractedRoom>();

  for (const r of ocrData.rooms) {
    const key = normalizeKey(r.name);
    ocrRoomsMap.set(key, r);
  }

  const validatedRooms: ExtractedRoom[] = [];
  const seenRoomKeys = new Set<string>();

  for (const room of sourceRooms) {
    const key = normalizeKey(room.name);

    // 1. Duplicate detection: If exact same room name appears multiple times without numbering
    // Distinguish Bed 1 vs Bed 2, or deduplicate if duplicate bounding box/dimensions
    if (seenRoomKeys.has(key)) {
      // Check if it has a distinct bounding box or different dimensions (e.g. two Bedrooms)
      const existing = validatedRooms.find((r) => normalizeKey(r.name) === key);
      const isSameSize =
        existing &&
        existing.width === room.width &&
        existing.length === room.length &&
        existing.original_text === room.original_text;

      if (isSameSize) {
        warnings.push(`Duplicate room entry "${room.name}" detected and merged.`);
        continue;
      } else {
        // Distinct room with generic name -> disambiguate (e.g. Bedroom 2)
        room.name = `${room.name} (${validatedRooms.filter((r) => normalizeKey(r.name).startsWith(key)).length + 1})`;
      }
    }
    seenRoomKeys.add(key);

    let status: VerificationStatus = room.verification_status;
    let width = room.width;
    let length = room.length;
    let unit = room.unit;
    let originalText = room.original_text;
    let notes = room.notes || "";

    // 2. Prevent invalid or negative dimensions
    if (width !== null && (width <= 0 || width > 100000 || isNaN(width))) {
      warnings.push(`Room "${room.name}" has invalid width ${width}. Dropped.`);
      width = null;
      status = "unmeasured";
    }
    if (length !== null && (length <= 0 || length > 100000 || isNaN(length))) {
      warnings.push(`Room "${room.name}" has invalid length ${length}. Dropped.`);
      length = null;
      status = "unmeasured";
    }

    // 3. Cross-Check with OCR readings
    const matchingOcr = ocrRoomsMap.get(key);
    if (vlmData && matchingOcr) {
      if (matchingOcr.original_text && room.original_text) {
        // Both detected dimension text: check concordance
        const vlmParsed = parseArchitecturalDimension(room.original_text);
        const ocrParsed = parseArchitecturalDimension(matchingOcr.original_text);

        if (vlmParsed && ocrParsed) {
          const dimsMatch =
            (Math.abs(vlmParsed.width - ocrParsed.width) < 0.05 &&
              Math.abs(vlmParsed.length - ocrParsed.length) < 0.05) ||
            (Math.abs(vlmParsed.width - ocrParsed.length) < 0.05 &&
              Math.abs(vlmParsed.length - ocrParsed.width) < 0.05);

          if (dimsMatch) {
            status = "verified";
          } else {
            // Discrepancy! Flag for review
            status = "review_needed";
            notes = `OCR detected "${matchingOcr.original_text}", VLM interpreted "${room.original_text}".`;
            discrepancies.push({
              roomName: room.name,
              vlmReading: room.original_text,
              ocrReading: matchingOcr.original_text,
              issue: "VLM and OCR extracted differing dimension values for this room.",
            });
            warnings.push(
              `Dimension conflict for "${room.name}": VLM found "${room.original_text}", OCR found "${matchingOcr.original_text}". Flagged for review.`,
            );
          }
        }
      } else if (!room.original_text && matchingOcr.original_text) {
        // VLM missed dimension, but OCR found explicit dimension
        const parsed = parseArchitecturalDimension(matchingOcr.original_text);
        if (parsed) {
          width = parsed.width;
          length = parsed.length;
          unit = parsed.unit;
          originalText = matchingOcr.original_text;
          status = "verified";
          notes = `Recovered dimension from OCR: ${matchingOcr.original_text}`;
        }
      }
    }

    // 4. Missing dimension check (Rule 1 & Rule 5)
    if (width === null || length === null) {
      status = "unmeasured";
      warnings.push(`Room "${room.name}" has no printed dimensions. Left unmeasured for manual entry.`);
    }

    // 5. Calculate area ONLY when both dimensions are strictly present
    let areaSqFt: number | null = null;
    let areaOriginalUnit: number | null = null;

    if (width !== null && length !== null && width > 0 && length > 0) {
      if (unit === "meters") {
        areaOriginalUnit = +(width * length).toFixed(2);
        areaSqFt = +(width * 3.28084 * length * 3.28084).toFixed(1);
      } else if (unit === "millimeters") {
        areaOriginalUnit = +( (width / 1000) * (length / 1000) ).toFixed(2);
        areaSqFt = +( (width / 304.8) * (length / 304.8) ).toFixed(1);
      } else {
        // Feet
        areaOriginalUnit = +(width * length).toFixed(1);
        areaSqFt = areaOriginalUnit;
      }
    }

    validatedRooms.push({
      ...room,
      width,
      length,
      unit,
      original_text: originalText,
      verification_status: status,
      areaSqFt,
      areaOriginalUnit,
      notes,
    });
  }

  // Cross-check Openings (combine VLM and OCR openings without duplicates)
  const openings: ExtractedOpening[] = vlmData && vlmData.openings.length > 0
    ? vlmData.openings
    : ocrData.openings;

  // Filter out any openings mistakenly categorized as rooms
  const finalRooms = validatedRooms.filter((r) => {
    const isOpeningName = /^(?:d\d+|w\d+|v\d+|door|window|vent)\b/i.test(r.name);
    if (isOpeningName) {
      warnings.push(`Item "${r.name}" reclassified from room to opening.`);
      return false;
    }
    return true;
  });

  // Calculate overall extraction confidence
  const verifiedCount = finalRooms.filter((r) => r.verification_status === "verified").length;
  const totalRooms = finalRooms.length;
  let overallConfidence: "high" | "medium" | "estimated" = "estimated";

  if (totalRooms > 0) {
    const ratio = verifiedCount / totalRooms;
    if (ratio >= 0.8 && discrepancies.length === 0) {
      overallConfidence = "high";
    } else if (ratio >= 0.5) {
      overallConfidence = "medium";
    }
  }

  return {
    validatedData: {
      rooms: finalRooms,
      openings,
      structural_elements: vlmData?.structural_elements || ocrData.structural_elements,
      unclassified_annotations: vlmData?.unclassified_annotations || ocrData.unclassified_annotations,
    },
    warnings,
    discrepancies,
    overallConfidence,
  };
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
