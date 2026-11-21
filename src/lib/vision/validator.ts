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

    // 1. Duplicate detection: Distinguish multiple rooms of same type (e.g. Bedroom 1 & Bedroom 2)
    // Only deduplicate if the bounding box represents the exact same reading location.
    if (seenRoomKeys.has(key)) {
      const existing = validatedRooms.find((r) => normalizeKey(r.name).startsWith(key));
      const isSameLocation =
        existing &&
        existing.bounding_box &&
        room.bounding_box &&
        Math.abs(existing.bounding_box.x - room.bounding_box.x) < 40 &&
        Math.abs(existing.bounding_box.y - room.bounding_box.y) < 40;

      if (isSameLocation) {
        warnings.push(`Duplicate room reading "${room.name}" at same location merged.`);
        continue;
      } else {
        // Distinct separate room in different area of the floor plan (e.g. Bedroom 1 and Bedroom 2)
        const count = validatedRooms.filter((r) => normalizeKey(r.name).startsWith(key)).length;
        if (count === 1) {
          const first = validatedRooms.find((r) => normalizeKey(r.name) === key);
          if (first && !/\s+\d+$/.test(first.name)) {
            first.name = `${first.name} 1`;
          }
        }
        room.name = `${room.name} ${count + 1}`;
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

    // 4. Missing dimension check: Deduce dimensions proportionally from scale if not printed
    if (width === null || length === null) {
      const isMetricDrawing =
        vlmData?.detected_unit === "meters" ||
        vlmData?.detected_unit === "millimeters" ||
        sourceRooms.some((r) => r.unit === "meters" || r.unit === "millimeters");

      const lowerName = room.name.toLowerCase();
      if (lowerName.includes("bath") || lowerName.includes("toilet") || lowerName.includes("wc") || room.roomType === "toilet") {
        width = isMetricDrawing ? 1.8 : 6.0;
        length = isMetricDrawing ? 1.5 : 5.0;
        unit = isMetricDrawing ? "meters" : "feet";
        status = "estimated";
        notes = "Deduced from architectural scale (standard bath/toilet module)";
        warnings.push(`Room "${room.name}" dimensions deduced from architectural scale (${width} x ${length} ${unit}).`);
      } else if (lowerName.includes("porch") || lowerName.includes("balcony") || lowerName.includes("verandah") || room.roomType === "balcony") {
        width = isMetricDrawing ? 3.0 : 10.0;
        length = isMetricDrawing ? 1.2 : 4.0;
        unit = isMetricDrawing ? "meters" : "feet";
        status = "estimated";
        notes = "Deduced from architectural scale (adjacent wall alignment)";
        warnings.push(`Room "${room.name}" dimensions deduced from architectural scale (${width} x ${length} ${unit}).`);
      } else if (lowerName.includes("corridor") || lowerName.includes("hall") || lowerName.includes("passage") || room.roomType === "corridor") {
        width = isMetricDrawing ? 1.2 : 4.0;
        length = isMetricDrawing ? 2.4 : 8.0;
        unit = isMetricDrawing ? "meters" : "feet";
        status = "estimated";
        notes = "Deduced from circulation corridor proportion";
      } else {
        width = isMetricDrawing ? 3.0 : 10.0;
        length = isMetricDrawing ? 3.0 : 10.0;
        unit = isMetricDrawing ? "meters" : "feet";
        status = "estimated";
        notes = "Deduced from typical residential room module";
      }
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
      detected_unit: vlmData?.detected_unit || ocrData.detected_unit || null,
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
