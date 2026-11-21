import { runSpatialOCR } from "./spatial-ocr";
import { getVLMProvider } from "./vlm-provider";
import { validateAndCrossCheck } from "./validator";
import type {
  StructuredFloorPlanData,
  UnifiedExtractionResponse,
  ExtractionMetadata,
} from "./types";
import type { Room, Wall, Opening } from "../plan-analysis-store";

export interface PipelineOptions {
  fileName?: string;
  mimeType?: string;
  enableVLM?: boolean;
  apiKey?: string;
  model?: string;
}

/**
 * Architectural Floor Plan Processing Pipeline
 * 1. Image Preprocessing & High-Resolution Normalization
 * 2. 2D Spatial OCR with Bounding Box Extraction
 * 3. Vision-Language Model Analysis (Gemini API via official SDK)
 * 4. Cross-Validation & Consensus Layer
 * 5. Conversion to Application Store & Structured Architectural Schema
 */
export async function executeFloorPlanPipeline(
  base64DataUrl: string,
  options: PipelineOptions = {},
): Promise<UnifiedExtractionResponse> {
  const fileName = options.fileName || "Floor Plan";
  const mimeType = options.mimeType || detectMimeType(base64DataUrl);
  const enableVLM = options.enableVLM !== false;

  let ocrResult: Awaited<ReturnType<typeof runSpatialOCR>>;
  try {
    ocrResult = await runSpatialOCR(base64DataUrl);
  } catch (ocrErr) {
    console.warn("[Pipeline] OCR text pass error:", ocrErr);
    ocrResult = {
      structuredData: {
        rooms: [],
        openings: [],
        structural_elements: [],
        unclassified_annotations: [],
      },
      rawText: "",
      lineBlocks: [],
    };
  }

  // 2. Vision-Language Model Analysis (if VLM provider available and enabled)
  const vlmProvider = getVLMProvider();
  let vlmData: StructuredFloorPlanData | null = null;
  let providerUsed: "gemini-vlm" | "spatial-ocr" = "spatial-ocr";
  let vlmError: string | null = null;

  if (enableVLM && vlmProvider.isAvailable(options.apiKey)) {
    try {
      vlmData = await vlmProvider.extractFloorPlan(
        base64DataUrl,
        mimeType,
        ocrResult.rawText,
        options.apiKey,
        options.model,
      );
      providerUsed = "gemini-vlm";
    } catch (err: any) {
      console.warn("[Pipeline] VLM extraction failed, falling back to spatial OCR:", err?.message || err);
      vlmError = err?.message || "VLM call failed";
      vlmData = null;
    }
  }

  // 3. Cross-Validation & Consensus
  const validation = validateAndCrossCheck(vlmData, ocrResult.structuredData, ocrResult.rawText);
  const finalStructured = validation.validatedData;

  // 4. Map to application store Room[] format
  const mappedRooms = finalStructured.rooms.map((r, idx) => {
    // Width & Length in feet for calculations:
    let widthFt = 0;
    let lengthFt = 0;
    let areaSqFt = 0;

    if (r.width !== null && r.length !== null) {
      if (r.unit === "meters") {
        widthFt = +(r.width * 3.28084).toFixed(2);
        lengthFt = +(r.length * 3.28084).toFixed(2);
      } else if (r.unit === "millimeters") {
        widthFt = +(r.width / 304.8).toFixed(2);
        lengthFt = +(r.length / 304.8).toFixed(2);
      } else {
        // Feet
        widthFt = +(r.width).toFixed(2);
        lengthFt = +(r.length).toFixed(2);
      }
      areaSqFt = +(widthFt * lengthFt).toFixed(1);
    }

    return {
      id: `r_${idx + 1}`,
      name: r.name,
      widthFt,
      lengthFt,
      areaSqFt,
      rawDimensionText: r.original_text || (r.width && r.length ? `${r.width} x ${r.length} ${r.unit}` : undefined),
      roomType: r.roomType,
      originalWidth: r.width,
      originalLength: r.length,
      originalUnit: r.unit,
      verificationStatus: r.verification_status,
    };
  });

  // Calculate takeoff aggregates
  const totalCarpet = mappedRooms.reduce((acc, r) => acc + (r.areaSqFt || 0), 0);
  const totalPerimeter = mappedRooms.reduce(
    (acc, r) => acc + (r.widthFt > 0 && r.lengthFt > 0 ? 2 * (r.widthFt + r.lengthFt) : 0),
    0,
  );
  const extWallLen = +(totalPerimeter * 0.45).toFixed(1);
  const intWallLen = +(totalPerimeter * 0.55).toFixed(1);

  const walls: Wall[] = [
    {
      id: "w_ext_1",
      description: "External Envelope Perimeter Wall",
      lengthFt: extWallLen,
      heightFt: 10,
      areaSqFt: +(extWallLen * 10).toFixed(1),
      wallType: "external",
    },
    {
      id: "w_int_1",
      description: "Internal Partition Walls",
      lengthFt: intWallLen,
      heightFt: 10,
      areaSqFt: +(intWallLen * 10).toFixed(1),
      wallType: "internal",
    },
  ];

  // Map Openings
  const mappedOpenings: Opening[] = finalStructured.openings.length > 0
    ? finalStructured.openings.map((op, idx) => ({
        id: `op_${idx + 1}`,
        type: op.type === "Door" ? "Door" : "Window",
        widthFt: op.width ? (op.unit === "meters" ? +(op.width * 3.28084).toFixed(2) : op.width) : 3.0,
        heightFt: op.height ? (op.unit === "meters" ? +(op.height * 3.28084).toFixed(2) : op.height) : 7.0,
        count: op.count || 1,
      }))
    : [
        {
          id: "op_doors",
          type: "Door",
          widthFt: 3.0,
          heightFt: 7.0,
          count: Math.max(1, mappedRooms.length),
        },
        {
          id: "op_windows",
          type: "Window",
          widthFt: 4.0,
          heightFt: 4.0,
          count: Math.max(1, Math.round(mappedRooms.length * 0.7)),
        },
      ];

  // Detected unit system
  const detectedUnit =
    finalStructured.detected_unit ||
    (finalStructured.rooms.some((r) => r.unit === "meters")
      ? "meters"
      : finalStructured.rooms.some((r) => r.unit === "millimeters")
        ? "millimeters"
        : finalStructured.rooms.some((r) => r.unit === "feet")
          ? "feet"
          : null);

  const unitSystemDetected: "metric" | "imperial" | "mixed" | "unknown" =
    detectedUnit === "meters" || detectedUnit === "millimeters"
      ? "metric"
      : detectedUnit === "feet"
        ? "imperial"
        : "metric";

  const metadata: ExtractionMetadata = {
    provider: providerUsed,
    modelUsed: providerUsed === "gemini-vlm" ? (options.model || process.env?.GEMINI_MODEL || "gemini-3.8-flash") : "Tesseract.js Wasm",
    processedAt: new Date().toISOString(),
    unitSystemDetected,
    rawOcrText: ocrResult.rawText,
    validationWarnings: validation.warnings,
  };

  const measuredCount = mappedRooms.filter((r) => r.widthFt > 0 && r.lengthFt > 0).length;
  const verifiedCount = mappedRooms.filter((r) => r.verificationStatus === "verified").length;
  const estimatedCount = mappedRooms.filter((r) => r.verificationStatus === "estimated").length;

  let summary = "";
  if (providerUsed === "gemini-vlm") {
    summary = `Gemini Multimodal VLM extracted ${mappedRooms.length} spaces (${verifiedCount} verified dimensions, ${estimatedCount} deduced from scale, unit: ${detectedUnit || "metric"}). Total carpet: ${totalCarpet} sq.ft.`;
  } else {
    summary = `Spatial OCR extracted ${mappedRooms.length} spaces (${verifiedCount} verified dimensions, ${estimatedCount} deduced from scale). Total carpet: ${totalCarpet} sq.ft.`;
  }

  return {
    projectName: fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
    rooms: mappedRooms,
    walls,
    openings: mappedOpenings,
    structuredData: finalStructured,
    detectedUnit,
    unitSystem: unitSystemDetected,
    metadata,
    summary,
    confidence: validation.overallConfidence,
    source: providerUsed === "gemini-vlm" ? "gemini-vlm" : "tesseract-ocr",
  };
}

function detectMimeType(dataUrl: string): string {
  if (dataUrl.startsWith("data:application/pdf")) return "application/pdf";
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) return "image/jpeg";
  if (dataUrl.startsWith("data:image/webp")) return "image/webp";
  return "image/png";
}
