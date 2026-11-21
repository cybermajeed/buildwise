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

JSON OUTPUT STRUCTURE:
Return only valid JSON conforming strictly to:
{
  "detected_unit": "meters", // "meters" | "feet" | "millimeters"
  "rooms": [
    {
      "name": "BEDROOM 1",
      "roomType": "bedroom", // "bedroom" | "living" | "kitchen" | "dining" | "toilet" | "balcony" | "corridor" | "utility" | "other"
      "width": 3.0,
      "length": 3.0,
      "unit": "meters",
      "original_text": "3.0M X 3.0M",
      "confidence": 0.98,
      "verification_status": "verified" // "verified" | "estimated" | "review_needed" | "unmeasured"
    }
  ],
  "openings": [
    {
      "name": "Main Door",
      "type": "Door",
      "width": 1.0,
      "height": 2.1,
      "unit": "meters",
      "original_text": "1.0M X 2.1M",
      "count": 1,
      "confidence": 0.95,
      "verification_status": "verified"
    }
  ],
  "structural_elements": [
    {
      "name": "External Wall",
      "type": "Wall",
      "dimensionText": "230mm",
      "confidence": 0.9
    }
  ],
  "unclassified_annotations": [
    {
      "text": "NORTH",
      "confidence": 0.85
    }
  ]
}
`;

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
      "gemini-3.5-flash-lite"
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

    const primaryModel = this.getModelName(overrideModel);

    // Strip data URL header if present (e.g. "data:image/png;base64,")
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");

    const promptText = `Analyze this architectural floor plan drawing.
${
  ocrTextContext
    ? `For cross-referencing, OCR preliminary text detection detected the following raw strings:\n${ocrTextContext.slice(0, 3000)}\n`
    : ""
}
1. Automatically detect the primary unit of measurement used in the diagram (e.g. 'meters', 'millimeters', or 'feet').
2. Extract all rooms and spaces:
   - For rooms with explicitly printed dimensions (e.g. BEDROOM 3.0M X 3.0M, KITCHEN 3.0M X 2.0M, DINING 3.0M X 2.3M, LIVING ROOM 3.0M X 3.0M): extract exact width, length, and mark status as 'verified'.
   - For architectural spaces without printed text (such as BATHROOM or PORCH): deduce their dimensions using architectural scale and alignment with adjacent walls (e.g. Porch aligns with Living Room width 3.0m; Bathroom fits between the bedrooms), mark status as 'estimated'.
Never leave rooms unmeasured with 0. Extract doors, windows, and structural notes. Return ONLY valid JSON adhering to the specified schema.`;

    // Fast priority chain: requested model, then ultra-fast flash-lite, then standard flash
    const modelsToAttempt = [
      primaryModel,
      ...["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"].filter(
        (m) => m !== primaryModel,
      ),
    ];

    let lastError: Error | null = null;

    for (const currentModel of modelsToAttempt) {
      try {
        const payload = {
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || "image/png",
                    data: cleanBase64,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000), // 15s timeout
          },
        );

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.warn(
            `[Gemini VLM] Model ${currentModel} returned ${res.status}: ${errText.slice(0, 200)}`,
          );
          if (res.status === 401 || res.status === 403) {
            throw new Error(`Gemini API authorization error: ${res.status}`);
          }
          continue;
        }

        const data = (await res.json()) as any;
        const candidate = data?.candidates?.[0];
        const rawText = candidate?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new Error(`Empty response received from Gemini model ${currentModel}`);
        }

        let cleaned = rawText.trim();
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
        }

        const parsed = JSON.parse(cleaned);
        return this.normalizeVLMOutput(parsed);
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[Gemini VLM] Model ${currentModel} error:`,
          err?.message || err,
        );
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
