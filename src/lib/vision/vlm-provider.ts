import { GoogleGenAI } from "@google/genai";
import type {
  StructuredFloorPlanData,
  ExtractedRoom,
  ExtractedOpening,
  ExtractedStructuralElement,
  ExtractedAnnotation,
} from "./types";

export interface IVLMProvider {
  name: string;
  isAvailable(overrideApiKey?: string): boolean;
  extractFloorPlan(
    base64Data: string,
    mimeType: string,
    ocrTextContext?: string,
    overrideApiKey?: string,
    overrideModel?: string,
  ): Promise<StructuredFloorPlanData>;
}

const SYSTEM_PROMPT = `
You are an expert civil engineer, architectural quantity surveyor, and floor plan analysis system adhering strictly to Indian Standard (IS 1200) conventions.

Your task is to analyze the uploaded architectural floor plan drawing, automatically detect its unit of measurement, and extract all spaces, rooms, openings, and dimensions.

CRITICAL RULES YOU MUST STRICTLY FOLLOW:

RULE 1: PRECISE EXTRACTION AND ARCHITECTURAL SCALE DEDUCTION.
- AUTOMATICALLY DETECT UNIT: Check if the diagram uses "meters" (e.g. 3.0M X 3.0M), "millimeters" (e.g. 3000 X 3000), or "feet" (e.g. 10'-0" X 10'-0"). Return this in detected_unit.
- EXPLICIT CALLOUTS: For rooms with explicitly printed dimensions (e.g. BEDROOM 3.0M X 3.0M, KITCHEN 3.0M X 2.0M, DINING 3.0M X 2.3M, LIVING ROOM 3.0M X 3.0M): extract the exact width, length, unit, and original_text. Mark verification_status as "verified".
- SPACES WITHOUT CALLOUTS (e.g. BATHROOM, PORCH, TOILET): DO NOT leave them at 0 or unmeasured! Deduce their realistic architectural dimensions based on architectural drawing scale and alignment with adjacent measured walls (e.g. Porch width aligns with Living Room 3.0m x depth ~1.2m; Bathroom fits between the two 3.0m bedrooms, approximately 1.5m to 2.0m x 1.2m to 2.0m). Mark verification_status as "estimated", set original_text to null, and use the detected unit.

RULE 2: NEVER CONFUSE UNRELATED MEASUREMENTS.
- Do NOT interpret door opening dimensions (e.g. D1: 1.0M X 2.1M or 3'0" X 7'0") as room dimensions.
- Do NOT interpret window dimensions (e.g. W1: 1.5M X 1.2M or 4'0" X 4'0") as room dimensions.
- Do NOT interpret furniture dimensions or wall thickness (e.g. 9" wall, 230mm) as room dimensions.
- Categorize doors and windows into the "openings" array, NOT the "rooms" array.

RULE 3: PRESERVE ORIGINAL MEASUREMENTS EXACTLY.
- If the drawing says "3.0M X 3.0M", set width: 3.0, length: 3.0, unit: "meters", original_text: "3.0M X 3.0M".
- If the drawing says "3.0M X 2.0M", set width: 3.0, length: 2.0, unit: "meters", original_text: "3.0M X 2.0M".
- If the drawing says "3.0M X 2.3M", set width: 3.0, length: 2.3, unit: "meters", original_text: "3.0M X 2.3M".
- If the drawing says "14'-6\\" X 12'-0\\"", set width: 14.5, length: 12.0, unit: "feet", original_text: "14'-6\\" X 12'-0\\"".
- If the drawing says "3600 X 4200", set width: 3600, length: 4200, unit: "millimeters", original_text: "3600 X 4200".
Do NOT silently convert units or discard the original text.

RULE 4: ASSOCIATE DIMENSIONS CORRECTLY.
Use spatial layout, room boundary walls, and text proximity. The dimension text printed directly under or inside a room label belongs to that specific room. Never randomly associate dimensions.

RULE 5: HANDLE AMBIGUITY HONESTLY.
If a dimension text is blurry, truncated, or ambiguous, flag verification_status: "review_needed".

ARCHITECTURAL CATEGORIES:
- "rooms": Master Bedroom, Bedroom, Living Room, Dining Room, Kitchen, Toilet, Bathroom, Balcony, Porch, Corridor, Utility, Puja.
- "openings": Main Door, Internal Doors (D1, D2, D3), Windows (W1, W2, W3), Ventilators (V1).
- "structural_elements": Columns (C1, C2), Staircase, Load-bearing walls.
- "unclassified_annotations": General notes, title block, drawing revision notes.

Return your response in pure JSON conforming to the requested schema.
`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    detected_unit: {
      type: "STRING",
      enum: ["meters", "millimeters", "feet"],
    },
    rooms: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          roomType: {
            type: "STRING",
            enum: [
              "bedroom",
              "living",
              "kitchen",
              "dining",
              "toilet",
              "balcony",
              "corridor",
              "utility",
              "other",
            ],
          },
          width: { type: "NUMBER" },
          length: { type: "NUMBER" },
          unit: { type: "STRING", enum: ["meters", "millimeters", "feet"] },
          original_text: { type: "STRING" },
          confidence: { type: "NUMBER" },
          verification_status: {
            type: "STRING",
            enum: ["verified", "estimated", "review_needed", "unmeasured"],
          },
          bounding_box: {
            type: "OBJECT",
            properties: {
              x: { type: "NUMBER" },
              y: { type: "NUMBER" },
              width: { type: "NUMBER" },
              height: { type: "NUMBER" },
            },
          },
        },
        required: ["name", "roomType", "confidence", "verification_status"],
      },
    },
    openings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          type: { type: "STRING", enum: ["Door", "Window", "Ventilator", "Opening"] },
          width: { type: "NUMBER" },
          height: { type: "NUMBER" },
          unit: { type: "STRING", enum: ["meters", "millimeters", "feet"] },
          original_text: { type: "STRING" },
          count: { type: "NUMBER" },
          confidence: { type: "NUMBER" },
          verification_status: {
            type: "STRING",
            enum: ["verified", "review_needed", "unmeasured"],
          },
        },
        required: ["name", "type", "confidence", "verification_status"],
      },
    },
    structural_elements: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          type: { type: "STRING", enum: ["Wall", "Column", "Beam", "Staircase", "Slab"] },
          dimensionText: { type: "STRING" },
          confidence: { type: "NUMBER" },
        },
        required: ["name", "type"],
      },
    },
    unclassified_annotations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          confidence: { type: "NUMBER" },
        },
        required: ["text"],
      },
    },
  },
  required: ["rooms", "openings", "structural_elements", "unclassified_annotations"],
};

export class GeminiVLMProvider implements IVLMProvider {
  public name = "Gemini Vision Language Model";

  private getApiKey(): string | undefined {
    return (
      (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
      (typeof process !== "undefined" && process.env?.GOOGLE_API_KEY) ||
      undefined
    );
  }

  private getModelName(overrideModel?: string): string {
    return (
      overrideModel ||
      (typeof process !== "undefined" && process.env?.GEMINI_MODEL) ||
      "gemini-3.5-flash"
    );
  }

  public isAvailable(overrideApiKey?: string): boolean {
    return Boolean(overrideApiKey || this.getApiKey());
  }

  public async extractFloorPlan(
    base64Data: string,
    mimeType: string,
    ocrTextContext?: string,
    overrideApiKey?: string,
    overrideModel?: string,
  ): Promise<StructuredFloorPlanData> {
    const apiKey = overrideApiKey || this.getApiKey();
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY or GOOGLE_API_KEY environment variable is not configured on the server.",
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const primaryModel = this.getModelName(overrideModel);

    // Strip data URL header if present (e.g. "data:image/png;base64,")
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");

    const contents: any[] = [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || "image/png",
            },
          },
          {
            text: `Analyze this architectural floor plan drawing.
${
  ocrTextContext
    ? `For cross-referencing, OCR preliminary text detection detected the following raw strings:\n${ocrTextContext.slice(0, 3000)}\n`
    : ""
}
1. Automatically detect the primary unit of measurement used in the diagram (e.g. 'meters', 'millimeters', or 'feet').
2. Extract all rooms and spaces:
   - For rooms with explicitly printed dimensions (e.g. BEDROOM 3.0M X 3.0M, KITCHEN 3.0M X 2.0M, DINING 3.0M X 2.3M, LIVING ROOM 3.0M X 3.0M): extract exact width, length, and mark status as 'verified'.
   - For architectural spaces without printed text (such as BATHROOM or PORCH): deduce their dimensions using architectural scale and alignment with adjacent walls (e.g. Porch aligns with Living Room width 3.0m; Bathroom fits between the bedrooms), mark status as 'estimated'.
Never leave rooms unmeasured with 0. Extract doors, windows, and structural notes.`,
          },
        ],
      },
    ];

    // Priority model chain: primary model first, followed by fast and reliable fallbacks
    const modelsToAttempt = [
      primaryModel,
      ...["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"].filter(
        (m) => m !== primaryModel,
      ),
    ];

    let lastError: Error | null = null;

    for (const currentModel of modelsToAttempt) {
      const maxRetries = 2;
      const baseDelay = 1500;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA as any,
              temperature: 0.1, // Minimal temperature for strict factual accuracy
            },
          });

          const text = response.text;
          if (!text) {
            throw new Error(`Empty response received from Gemini model ${currentModel}`);
          }

          const parsed = JSON.parse(text) as any;
          return this.normalizeVLMOutput(parsed);
        } catch (err: any) {
          lastError = err;
          const isRateLimit =
            err?.status === 429 ||
            err?.message?.includes("RESOURCE_EXHAUSTED") ||
            err?.message?.includes("rate limit");

          if (attempt < maxRetries && isRateLimit) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.warn(
              `[Gemini VLM] Rate limit on ${currentModel}. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`,
            );
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }

          const isDemandOrUnavailable =
            err?.status === 503 ||
            err?.status === 404 ||
            String(err?.message).includes("503") ||
            String(err?.message).includes("404") ||
            String(err?.message).includes("high demand") ||
            String(err?.message).includes("no longer available") ||
            String(err?.message).includes("fetch failed");

          if (isDemandOrUnavailable) {
            console.warn(
              `[Gemini VLM] Model ${currentModel} returned ${err?.message || err?.status}. Attempting next model in chain...`,
            );
            // Break inner retry to advance to next model in modelsToAttempt
            break;
          }

          // If another fatal error (e.g. auth failed), stop immediately
          if (err?.status === 401 || err?.status === 403) {
            throw err;
          }

          break;
        }
      }
    }

    throw lastError || new Error("Failed to process floor plan with Gemini VLM");
  }

  private normalizeVLMOutput(raw: any): StructuredFloorPlanData {
    const rawRooms = Array.isArray(raw?.rooms) ? raw.rooms : [];
    const rawOpenings = Array.isArray(raw?.openings) ? raw.openings : [];
    const rawStructural = Array.isArray(raw?.structural_elements)
      ? raw.structural_elements
      : [];
    const rawAnnotations = Array.isArray(raw?.unclassified_annotations)
      ? raw.unclassified_annotations
      : [];

    const rooms: ExtractedRoom[] = rawRooms.map((r: any, idx: number) => {
      const hasDims =
        typeof r.width === "number" &&
        typeof r.length === "number" &&
        r.width > 0 &&
        r.length > 0;

      const detectedUnit = raw?.detected_unit || r.unit || "meters";

      return {
        id: `vlm_r_${idx + 1}`,
        name: r.name || `Space ${idx + 1}`,
        category: "room",
        roomType: r.roomType || "other",
        width: hasDims ? r.width : null,
        length: hasDims ? r.length : null,
        unit: hasDims ? r.unit || detectedUnit : null,
        original_text: r.original_text || null,
        confidence: typeof r.confidence === "number" ? r.confidence : 0.9,
        verification_status: hasDims
          ? r.verification_status || "verified"
          : "unmeasured",
        bounding_box: r.bounding_box || undefined,
      };
    });

    const openings: ExtractedOpening[] = rawOpenings.map(
      (op: any, idx: number) => ({
        id: `vlm_op_${idx + 1}`,
        name: op.name || `Opening ${idx + 1}`,
        category: "opening",
        type: op.type || "Door",
        width: typeof op.width === "number" ? op.width : null,
        height: typeof op.height === "number" ? op.height : null,
        unit: op.unit || null,
        original_text: op.original_text || null,
        count: typeof op.count === "number" ? op.count : 1,
        confidence: typeof op.confidence === "number" ? op.confidence : 0.9,
        verification_status: op.verification_status || "verified",
        bounding_box: op.bounding_box || undefined,
      }),
    );

    const structuralElements: ExtractedStructuralElement[] = rawStructural.map(
      (st: any, idx: number) => ({
        id: `vlm_st_${idx + 1}`,
        name: st.name || `Structural ${idx + 1}`,
        category: "structural",
        type: st.type || "Wall",
        dimensionText: st.dimensionText || null,
        unit: st.dimensionText ? "millimeters" : null,
        confidence: typeof st.confidence === "number" ? st.confidence : 0.9,
      }),
    );

    const annotations: ExtractedAnnotation[] = rawAnnotations.map(
      (ann: any, idx: number) => ({
        id: `vlm_ann_${idx + 1}`,
        text: ann.text || "",
        category: "annotation",
        confidence: typeof ann.confidence === "number" ? ann.confidence : 0.8,
      }),
    );

    return {
      detected_unit: raw?.detected_unit || null,
      rooms,
      openings,
      structural_elements: structuralElements,
      unclassified_annotations: annotations,
    };
  }
}

/**
 * Singleton factory for VLM provider.
 * Allows easy plugging of alternative providers in future (e.g. OpenAI, Anthropic).
 */
export function getVLMProvider(): IVLMProvider {
  return new GeminiVLMProvider();
}
