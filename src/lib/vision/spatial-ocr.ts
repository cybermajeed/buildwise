import { createWorker } from "tesseract.js";
import {
  parseArchitecturalDimension,
  extractDimensionCallout,
  classifyArchitecturalEntity,
} from "./dimension-parser";
import type {
  StructuredFloorPlanData,
  ExtractedRoom,
  ExtractedOpening,
  ExtractedStructuralElement,
  ExtractedAnnotation,
  BoundingBox,
} from "./types";

interface OCRWordBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface OCRLineBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  words: OCRWordBlock[];
}

/**
 * 2D Spatial OCR Engine
 * Extracts text with bounding boxes and performs spatial proximity association
 * between room labels and dimension callouts.
 */
export async function runSpatialOCR(
  imageDataUrl: string,
): Promise<{
  structuredData: StructuredFloorPlanData;
  rawText: string;
  lineBlocks: OCRLineBlock[];
}> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("eng");
    const result = await worker.recognize(imageDataUrl);
    const rawText = result.data.text || "";

    const lines: OCRLineBlock[] = (result.data.lines || []).map((l) => ({
      text: l.text.trim(),
      confidence: l.confidence / 100,
      bbox: {
        x0: l.bbox.x0,
        y0: l.bbox.y0,
        x1: l.bbox.x1,
        y1: l.bbox.y1,
      },
      words: (l.words || []).map((w) => ({
        text: w.text.trim(),
        confidence: w.confidence / 100,
        bbox: {
          x0: w.bbox.x0,
          y0: w.bbox.y0,
          x1: w.bbox.x1,
          y1: w.bbox.y1,
        },
      })),
    }));

    const rooms: ExtractedRoom[] = [];
    const openings: ExtractedOpening[] = [];
    const structuralElements: ExtractedStructuralElement[] = [];
    const annotations: ExtractedAnnotation[] = [];

    // Map of candidate dimension callouts with 2D coordinates
    interface DetectedDimensionCallout {
      text: string;
      parsed: NonNullable<ReturnType<typeof parseArchitecturalDimension>>;
      bbox: { x0: number; y0: number; x1: number; y1: number };
      lineIndex: number;
      used: boolean;
    }

    const detectedDimensions: DetectedDimensionCallout[] = [];

    // First pass: locate all valid architectural dimensions and their 2D coordinates
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.text) continue;

      const dimCallout = extractDimensionCallout(line.text);
      if (dimCallout) {
        const parsed = parseArchitecturalDimension(dimCallout);
        if (parsed) {
          detectedDimensions.push({
            text: dimCallout,
            parsed,
            bbox: line.bbox,
            lineIndex: i,
            used: false,
          });
        }
      }
    }

    // Second pass: identify room labels and opening labels
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.text) continue;

      const classification = classifyArchitecturalEntity(line.text);

      // Handle OPENINGS (Doors, Windows)
      if (classification.category === "opening" && classification.openingType) {
        const dimCallout = extractDimensionCallout(line.text);
        const parsed = dimCallout ? parseArchitecturalDimension(dimCallout) : null;

        openings.push({
          id: `op_${openings.length + 1}`,
          name: classification.normalizedName,
          category: "opening",
          type: classification.openingType,
          width: parsed ? parsed.width : null,
          height: parsed ? parsed.length : null,
          unit: parsed ? parsed.unit : null,
          original_text: dimCallout || null,
          count: 1,
          confidence: line.confidence,
          verification_status: parsed ? "verified" : "unmeasured",
          bounding_box: toBox(line.bbox),
        });
        continue;
      }

      // Handle STRUCTURAL ELEMENTS (Columns, Stairs, Walls)
      if (classification.category === "structural" && classification.structuralType) {
        const dimCallout = extractDimensionCallout(line.text);
        structuralElements.push({
          id: `st_${structuralElements.length + 1}`,
          name: classification.normalizedName,
          category: "structural",
          type: classification.structuralType,
          dimensionText: dimCallout || null,
          unit: dimCallout ? "millimeters" : null,
          confidence: line.confidence,
          bounding_box: toBox(line.bbox),
        });
        continue;
      }

      // Handle ROOMS
      if (classification.category === "room") {
        // Find if this line itself already contains the dimension
        const selfDim = extractDimensionCallout(line.text);
        let associatedDim: DetectedDimensionCallout | null = null;

        if (selfDim) {
          const selfParsed = parseArchitecturalDimension(selfDim);
          if (selfParsed) {
            associatedDim = {
              text: selfDim,
              parsed: selfParsed,
              bbox: line.bbox,
              lineIndex: i,
              used: true,
            };
          }
        }

        // If not in the same line, find the closest dimension callout vertically below or horizontally near
        if (!associatedDim) {
          let bestDistance = Infinity;
          let bestCandidate: DetectedDimensionCallout | null = null;

          const labelCenterX = (line.bbox.x0 + line.bbox.x1) / 2;
          const labelBottomY = line.bbox.y1;

          for (const cand of detectedDimensions) {
            if (cand.used) continue;

            const candCenterX = (cand.bbox.x0 + cand.bbox.x1) / 2;
            const candTopY = cand.bbox.y0;

            const dx = candCenterX - labelCenterX;
            const dy = candTopY - labelBottomY;

            // In architectural drawings, dimensions are typically 0 to 120px below the room label
            // or vertically aligned within horizontal tolerance
            const isBelow = dy >= -10 && dy <= 160;
            const isHorizontallyAligned = Math.abs(dx) <= 200;

            if (isBelow && isHorizontallyAligned) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < bestDistance) {
                bestDistance = distance;
                bestCandidate = cand;
              }
            }
          }

          if (bestCandidate) {
            bestCandidate.used = true;
            associatedDim = bestCandidate;
          }
        }

        rooms.push({
          id: `ocr_r_${rooms.length + 1}`,
          name: classification.normalizedName,
          category: "room",
          roomType: classification.roomType || "other",
          width: associatedDim ? associatedDim.parsed.width : null,
          length: associatedDim ? associatedDim.parsed.length : null,
          unit: associatedDim ? associatedDim.parsed.unit : null,
          original_text: associatedDim ? associatedDim.text : null,
          confidence: line.confidence,
          verification_status: associatedDim ? "verified" : "unmeasured",
          bounding_box: toBox(line.bbox),
          areaSqFt: associatedDim ? associatedDim.parsed.areaSqFt : null,
          areaOriginalUnit: associatedDim ? associatedDim.parsed.areaOriginalUnit : null,
        });
        continue;
      }

      // Remaining lines treated as unclassified annotations
      if (line.text.length > 2) {
        annotations.push({
          id: `ann_${annotations.length + 1}`,
          text: line.text,
          category: "annotation",
          bounding_box: toBox(line.bbox),
          confidence: line.confidence,
        });
      }
    }

    return {
      structuredData: {
        rooms,
        openings,
        structural_elements: structuralElements,
        unclassified_annotations: annotations,
      },
      rawText,
      lineBlocks: lines,
    };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}

function toBox(bbox: { x0: number; y0: number; x1: number; y1: number }): BoundingBox {
  return {
    x: Math.round(bbox.x0),
    y: Math.round(bbox.y0),
    width: Math.round(bbox.x1 - bbox.x0),
    height: Math.round(bbox.y1 - bbox.y0),
  };
}
