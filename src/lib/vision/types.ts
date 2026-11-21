/**
 * Architectural Floor Plan Vision & Dimension Extraction Types
 * Adheres strictly to IS 1200 / architectural standards and structured output schema.
 */

export type ArchitecturalCategory = "room" | "opening" | "structural" | "annotation";

export type MeasurementUnit = "meters" | "millimeters" | "feet" | null;

export type VerificationStatus =
  | "verified"        // VLM and OCR concordant, or high-confidence explicit annotation
  | "estimated"       // Deduced from architectural scale and boundary alignment (Rule 1 & Rule 5)
  | "review_needed"   // Discrepancy between VLM and OCR, or ambiguous association
  | "unmeasured";     // Room identified, but no printed dimension exists

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedRoom {
  id: string;
  name: string;
  category: "room";
  roomType: "bedroom" | "living" | "kitchen" | "dining" | "toilet" | "balcony" | "corridor" | "utility" | "other";
  width: number | null;
  length: number | null;
  unit: MeasurementUnit;
  original_text: string | null;
  confidence: number;
  verification_status: VerificationStatus;
  bounding_box?: BoundingBox;
  areaSqFt?: number | null;
  areaOriginalUnit?: number | null;
  notes?: string;
}

export interface ExtractedOpening {
  id: string;
  name: string;
  category: "opening";
  type: "Door" | "Window" | "Ventilator" | "Opening";
  width: number | null;
  height: number | null;
  unit: MeasurementUnit;
  original_text: string | null;
  count: number;
  confidence: number;
  verification_status: VerificationStatus;
  bounding_box?: BoundingBox;
}

export interface ExtractedStructuralElement {
  id: string;
  name: string;
  category: "structural";
  type: "Wall" | "Column" | "Beam" | "Staircase" | "Slab";
  dimensionText: string | null;
  thicknessIn?: number | null;
  unit: MeasurementUnit;
  confidence: number;
  bounding_box?: BoundingBox;
}

export interface ExtractedAnnotation {
  id: string;
  text: string;
  category: "annotation";
  bounding_box?: BoundingBox;
  confidence: number;
}

export interface StructuredFloorPlanData {
  detected_unit?: "meters" | "millimeters" | "feet" | null;
  rooms: ExtractedRoom[];
  openings: ExtractedOpening[];
  structural_elements: ExtractedStructuralElement[];
  unclassified_annotations: ExtractedAnnotation[];
}

export interface ExtractionMetadata {
  provider: "gemini-vlm" | "hybrid-ocr" | "spatial-ocr";
  modelUsed?: string;
  processedAt: string;
  pageCount?: number;
  unitSystemDetected: "metric" | "imperial" | "mixed" | "unknown";
  rawOcrText?: string;
  validationWarnings: string[];
}

export interface UnifiedExtractionResponse {
  structuredData: StructuredFloorPlanData;
  metadata: ExtractionMetadata;
  detectedUnit?: "meters" | "millimeters" | "feet" | null;
  unitSystem?: "metric" | "imperial" | "mixed";
  // Legacy / Store compatibility fields:
  projectName?: string;
  rooms: Array<{
    id: string;
    name: string;
    widthFt: number;
    lengthFt: number;
    areaSqFt: number;
    rawDimensionText?: string;
    roomType?: string;
    originalWidth?: number | null;
    originalLength?: number | null;
    originalUnit?: MeasurementUnit;
    verificationStatus?: VerificationStatus;
  }>;
  walls: Array<{
    id: string;
    description: string;
    lengthFt: number;
    heightFt: number;
    areaSqFt: number;
    wallType?: "external" | "internal";
  }>;
  openings: Array<{
    id: string;
    type: "Door" | "Window";
    widthFt: number;
    heightFt: number;
    count: number;
  }>;
  summary: string;
  confidence: "high" | "medium" | "estimated";
  source: "gemini-vlm" | "tesseract-ocr" | "heuristic-ocr";
}
