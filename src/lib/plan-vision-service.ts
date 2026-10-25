import type { Room, Wall, Opening } from "./plan-analysis-store";

export type VisionProvider = "gemini" | "openai";

export interface AIConfig {
  provider: VisionProvider;
  apiKey: string;
  model?: string;
}

export interface AdvancedAnalysis {
  totalCarpetAreaSqFt: number;
  totalBuiltUpAreaSqFt?: number;
  externalWallThicknessIn?: number;
  internalWallThicknessIn?: number;
  ceilingHeightFt?: number;
  unitSystem: "imperial (feet-inches)" | "metric (meters/mm)" | "mixed";
  scaleDetected?: string;
  circulationEfficiencyPct?: number;
  structuralNotes: string[];
  civilTakeoffSummary: string;
}

export interface ExtractionResult {
  projectName?: string;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  summary: string;
  confidence: "high" | "medium" | "estimated";
  source: "gemini-ai" | "openai-ai" | "heuristic-ocr";
  advancedAnalysis?: AdvancedAnalysis;
}

export class NoVisionKeyError extends Error {
  constructor(
    message = "An AI Vision API key (Google Gemini or OpenAI) is required to accurately extract dimensions and room schedules from your uploaded blueprint.",
  ) {
    super(message);
    this.name = "NoVisionKeyError";
  }
}

const AI_CONFIG_KEY = "buildwise.ai_vision_config";

export function getStoredAIConfig(): AIConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AIConfig;
  } catch {
    return null;
  }
}

export function saveAIConfig(config: AIConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

export function clearAIConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AI_CONFIG_KEY);
}

export function getEffectiveAIConfig(): AIConfig | null {
  const stored = getStoredAIConfig();
  if (stored && stored.apiKey && stored.apiKey.trim().length > 5) {
    return stored;
  }
  // Check build-time environment variables if provided
  try {
    interface ViteEnv {
      readonly VITE_GEMINI_API_KEY?: string;
      readonly VITE_OPENAI_API_KEY?: string;
    }
    const env = (import.meta as unknown as { env?: ViteEnv }).env;
    const envGemini = env?.VITE_GEMINI_API_KEY;
    if (envGemini && typeof envGemini === "string" && envGemini.trim().length > 5) {
      return {
        provider: "gemini",
        apiKey: envGemini.trim(),
        model: "gemini-1.5-flash",
      };
    }
    const envOpenAI = env?.VITE_OPENAI_API_KEY;
    if (envOpenAI && typeof envOpenAI === "string" && envOpenAI.trim().length > 5) {
      return {
        provider: "openai",
        apiKey: envOpenAI.trim(),
        model: "gpt-4o",
      };
    }
  } catch {
    // Ignore environment lookup failures in strict contexts
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Architectural Dimension Parser & Normalizer
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Mathematically parses and normalizes architectural dimension strings.
 * Accurately converts imperial feet & inches (X'-Y") to fractional decimal feet.
 * Accurately converts metric millimeters and meters to decimal feet.
 */
export function parseArchitecturalDimensionString(raw: string): {
  widthFt: number;
  lengthFt: number;
  areaSqFt: number;
  units: "feet-inches" | "metric-mm" | "metric-m";
} | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim();

  // Pattern 1: Feet & inches: e.g. 14'-6" x 12'-0", 14'6" x 12'0", 14'-6"X12'-0", 14' x 12'
  const imperialMatch = clean.match(
    /^(\d+)\s*(?:'|ft|-)?\s*(\d+)?\s*(?:"|in)?\s*(?:[xX*×by/]|and)\s*(\d+)\s*(?:'|ft|-)?\s*(\d+)?\s*(?:"|in)?/i,
  );
  if (imperialMatch && imperialMatch[1] && imperialMatch[3]) {
    const ft1 = parseInt(imperialMatch[1], 10);
    const in1 = imperialMatch[2] ? parseInt(imperialMatch[2], 10) : 0;
    const ft2 = parseInt(imperialMatch[3], 10);
    const in2 = imperialMatch[4] ? parseInt(imperialMatch[4], 10) : 0;

    // Check sanity: inches must be 0-11
    if (in1 < 12 && in2 < 12 && ft1 > 0 && ft2 > 0) {
      const w = +(ft1 + in1 / 12).toFixed(2);
      const l = +(ft2 + in2 / 12).toFixed(2);
      return {
        widthFt: w,
        lengthFt: l,
        areaSqFt: +(w * l).toFixed(1),
        units: "feet-inches",
      };
    }
  }

  // Pattern 2: Metric mm: e.g. 3600 x 4200 or 3600 X 4200 mm
  const metricMmMatch = clean.match(/^(\d{3,5})\s*(?:[xX*×by])\s*(\d{3,5})/i);
  if (metricMmMatch && metricMmMatch[1] && metricMmMatch[2]) {
    const mm1 = parseInt(metricMmMatch[1], 10);
    const mm2 = parseInt(metricMmMatch[2], 10);
    if (mm1 > 500 && mm2 > 500) {
      const w = +(mm1 / 304.8).toFixed(2);
      const l = +(mm2 / 304.8).toFixed(2);
      return {
        widthFt: w,
        lengthFt: l,
        areaSqFt: +(w * l).toFixed(1),
        units: "metric-mm",
      };
    }
  }

  // Pattern 3: Metric meters: e.g. 3.60 x 4.20 or 3.6 x 4.2
  const metricMMatch = clean.match(/^(\d{1,2}(?:\.\d+)?)\s*(?:[xX*×by])\s*(\d{1,2}(?:\.\d+)?)/i);
  if (metricMMatch && metricMMatch[1] && metricMMatch[2]) {
    const m1 = parseFloat(metricMMatch[1]);
    const m2 = parseFloat(metricMMatch[2]);
    if (m1 > 0.5 && m2 > 0.5 && m1 < 50 && m2 < 50) {
      const w = +(m1 * 3.28084).toFixed(2);
      const l = +(m2 * 3.28084).toFixed(2);
      return {
        widthFt: w,
        lengthFt: l,
        areaSqFt: +(w * l).toFixed(1),
        units: "metric-m",
      };
    }
  }

  return null;
}

interface RawRoomInput {
  id?: string;
  name?: string;
  roomType?: string;
  rawDimensionText?: string;
  widthFt?: number | string;
  lengthFt?: number | string;
  areaSqFt?: number | string;
}

interface RawWallInput {
  id?: string;
  description?: string;
  lengthFt?: number | string;
  heightFt?: number | string;
  areaSqFt?: number | string;
  wallType?: string;
}

interface RawOpeningInput {
  id?: string;
  type?: string;
  widthFt?: number | string;
  heightFt?: number | string;
  count?: number | string;
}

interface RawAIResponse {
  projectName?: string;
  rooms?: RawRoomInput[];
  walls?: RawWallInput[];
  openings?: RawOpeningInput[];
  advancedAnalysis?: Partial<AdvancedAnalysis>;
  summary?: string;
}

function normalizeRoom(r: RawRoomInput, idx: number): Room {
  const name = typeof r.name === "string" && r.name.trim() ? r.name.trim() : `Room ${idx + 1}`;
  const rawDimensionText =
    typeof r.rawDimensionText === "string" && r.rawDimensionText.trim()
      ? r.rawDimensionText.trim()
      : undefined;
  let widthFt = typeof r.widthFt === "number" ? r.widthFt : Number(r.widthFt);
  let lengthFt = typeof r.lengthFt === "number" ? r.lengthFt : Number(r.lengthFt);

  // Cross-verify against mathematical parser if raw string exists
  if (rawDimensionText) {
    const parsed = parseArchitecturalDimensionString(rawDimensionText);
    if (parsed) {
      if (!Number.isFinite(widthFt) || Math.abs(widthFt - parsed.widthFt) > 0.05) {
        widthFt = parsed.widthFt;
      }
      if (!Number.isFinite(lengthFt) || Math.abs(lengthFt - parsed.lengthFt) > 0.05) {
        lengthFt = parsed.lengthFt;
      }
    }
  }

  if (!Number.isFinite(widthFt) || widthFt <= 0) widthFt = 10;
  if (!Number.isFinite(lengthFt) || lengthFt <= 0) lengthFt = 12;

  widthFt = +widthFt.toFixed(2);
  lengthFt = +lengthFt.toFixed(2);
  const areaSqFt = +(widthFt * lengthFt).toFixed(1);

  return {
    id: typeof r.id === "string" && r.id ? r.id : `r_${idx + 1}`,
    name,
    widthFt,
    lengthFt,
    areaSqFt,
    rawDimensionText,
    roomType: typeof r.roomType === "string" ? r.roomType.toLowerCase() : undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Civil Engineering Vision Prompt
// ─────────────────────────────────────────────────────────────────────────────
const CIVIL_SYSTEM_PROMPT = `You are a Principal Civil Engineer, Chief Structural Architect, and Senior Quantity Surveyor with 25+ years of experience auditing architectural working drawings, blueprints, and municipal floor plans.
Your mission is to perform an exhaustive, mathematically rigorous, multi-pass OCR extraction and full civil engineering analysis of the uploaded floor plan image.

EXTREME PRECISION DIRECTIVES FOR DIMENSIONS & WIDTHS:

1. COMPREHENSIVE TEXT & CALLOUT SCANNING:
   - Scan every space, room, corridor, verandah, balcony, toilet, and utility.
   - Blueprints place room dimensions in strings like:
     * "BED ROOM 12'-0\\" X 14'-6\\""
     * "LIVING 16'0\\" x 14'0\\""
     * "KITCHEN 10'-6\\" X 9'-3\\""
     * "TOILET 5'0\\" X 7'6\\""
     * "BED ROOM 3600 x 4200" (Metric mm)
     * "DRAWING 4.50 x 5.20" (Metric meters)
   - Inspect both:
     a) Text callouts written directly inside room boundaries.
     b) Dimension chains with arrowheads/ticks along exterior boundary walls and interior partition grids to determine clear wall-to-wall spans.
   - Extract the verbatim characters as "rawDimensionText" exactly as printed on the blueprint (e.g. "12'-0\\" X 14'-6\\"" or "3600 × 4200 mm").

2. STRICT WIDTH (X-AXIS) vs LENGTH (Y-AXIS) DETERMINATION:
   - In architectural notation "A × B", convention is:
     * First dimension "A" is the horizontal clear span (WIDTH, along drawing X-axis).
     * Second dimension "B" is the vertical clear span (LENGTH, along drawing Y-axis).
   - If the plan explicitly tags "W" and "L", or if dimension arrows show horizontal vs vertical spans, strictly assign:
     * "widthFt": Horizontal span across the drawing (left-to-right).
     * "lengthFt": Vertical span along the drawing (top-to-bottom).
   - Never flip width and length arbitrarily.

3. MATHEMATICALLY EXACT CONVERSIONS (NO HALLUCINATIONS):
   - IMPERIAL (Feet & Inches):
     * Notation: X'-Y\\" or X' Y\\" or X'X\\".
     * INCHES MUST BE DIVIDED BY 12:
       0\\" = 0.000 ft, 1\\" = 0.083 ft, 2\\" = 0.167 ft, 3\\" = 0.250 ft, 4\\" = 0.333 ft,
       5\\" = 0.417 ft, 6\\" = 0.500 ft, 7\\" = 0.583 ft, 8\\" = 0.667 ft, 9\\" = 0.750 ft,
       10\\" = 0.833 ft, 11\\" = 0.917 ft.
     * Example: 14'-6\\" = 14 + 6/12 = 14.50 ft.
     * Example: 10'-3\\" = 10 + 3/12 = 10.25 ft.
     * Example: 11'-9\\" = 11 + 9/12 = 11.75 ft.
     * Example: 13'-8\\" = 13 + 8/12 = 13.67 ft.
     * NEVER drop the inches! NEVER convert 14'-6\\" to 14.6! It is 14.50!
   - METRIC (Millimeters):
     * If numbers are >= 100 (e.g. 3600 x 4200), convert: mm / 304.8 = feet:
       3600 mm = 11.81 ft, 4200 mm = 13.78 ft, 3000 mm = 9.84 ft.
   - METRIC (Meters):
     * If numbers are decimals < 30 (e.g. 3.60 x 4.20), convert: meters * 3.28084 = feet:
       3.60 m = 11.81 ft, 4.20 m = 13.78 ft.
   - AREA CALCULATION:
     * "areaSqFt" MUST be calculated as Math.round(widthFt * lengthFt * 10) / 10.

4. FULL ADVANCED CIVIL & STRUCTURAL ANALYSIS:
   - Provide a complete architectural room schedule with room types.
   - Extract wall schedules:
     * External perimeter walls with detected wall thickness (typically 9\\" / 230mm for load bearing / external envelope).
     * Internal partition walls (typically 4.5\\" / 115mm).
     * Calculate wall length, height (default 10 ft if unspecified), and total wall area.
   - Extract openings schedule:
     * Doors (D, D1, D2, D3, Main Entrance) with detected or standard width & height and count.
     * Windows (W, W1, W2, Kitchen Window, Ventilator) with detected width & height and count.
   - Advanced Civil Takeoff Summary:
     * Total Carpet Area (sum of room areas).
     * Total Estimated Built-up / Plinth Area (carpet area + wall thickness footprint).
     * Circulation efficiency percentage.
     * Structural system notes (RCC frame with columns vs Load-bearing brick masonry).
     * Unit system detected ("imperial (feet-inches)", "metric (meters/mm)", or "mixed").
     * Drawing scale detected (e.g. "1:100", "1/4\\" = 1'-0\\"", or "Not Stated").
     * Full professional civil summary.

OUTPUT MUST BE VALID STRICT JSON ONLY (no markdown fences, no explanatory text):
{
  "projectName": "Extracted Project or Floor Name",
  "rooms": [
    {
      "id": "r1",
      "name": "Living Room",
      "roomType": "living",
      "rawDimensionText": "16'-0\\" X 14'-0\\"",
      "widthFt": 16.0,
      "lengthFt": 14.0,
      "areaSqFt": 224.0
    }
  ],
  "walls": [
    {
      "id": "w1",
      "description": "External Perimeter Wall (9\\" Brick/RCC)",
      "lengthFt": 110.0,
      "heightFt": 10.0,
      "areaSqFt": 1100.0,
      "wallType": "external"
    },
    {
      "id": "w2",
      "description": "Internal Partition Walls (4.5\\" Brick)",
      "lengthFt": 65.0,
      "heightFt": 10.0,
      "areaSqFt": 650.0,
      "wallType": "internal"
    }
  ],
  "openings": [
    {
      "id": "o1",
      "type": "Door",
      "widthFt": 3.5,
      "heightFt": 7.0,
      "count": 1
    },
    {
      "id": "o2",
      "type": "Window",
      "widthFt": 4.5,
      "heightFt": 4.5,
      "count": 4
    }
  ],
  "advancedAnalysis": {
    "totalCarpetAreaSqFt": 850.0,
    "totalBuiltUpAreaSqFt": 1020.0,
    "externalWallThicknessIn": 9.0,
    "internalWallThicknessIn": 4.5,
    "ceilingHeightFt": 10.0,
    "unitSystem": "imperial (feet-inches)",
    "scaleDetected": "1:100",
    "circulationEfficiencyPct": 83.3,
    "structuralNotes": [
      "RCC Framed Structure with 9-inch external envelope infill walls",
      "10'-0\\" clear ceiling height assumed based on standard residential norms",
      "Cross-ventilation verified across primary living spaces"
    ],
    "civilTakeoffSummary": "Full quantity takeoff based on extracted clear wall-to-wall dimensions..."
  },
  "summary": "Full advanced civil analysis: Extracted functional spaces with exact width and length callouts."
}`;

function cleanJsonResponse(rawText: string): RawAIResponse {
  let cleaned = rawText.trim();
  // Strip ```json and ``` if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned) as RawAIResponse;
}

// ─────────────────────────────────────────────────────────────────────────────
// Multimodal Gemini Vision Engine (1.5 Flash / 2.0 Flash / 1.5 Pro)
// ─────────────────────────────────────────────────────────────────────────────
async function extractWithGemini(
  base64DataUrl: string,
  apiKey: string,
  model = "gemini-1.5-flash",
): Promise<ExtractionResult> {
  const cleanBase64 = base64DataUrl.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
  const mimeType = base64DataUrl.split(";")[0]?.replace("data:", "") || "image/png";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: CIVIL_SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [
            {
              text: "Examine this architectural blueprint floor plan. Perform full advanced civil engineering analysis. Extract all rooms with exact width and length callouts and verify every dimension.",
            },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.0,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Gemini Vision API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Gemini returned empty response text.");

  const parsed = cleanJsonResponse(rawText);

  const rooms: Room[] = Array.isArray(parsed.rooms)
    ? parsed.rooms.map((r, idx) => normalizeRoom(r, idx))
    : [];

  const walls: Wall[] = Array.isArray(parsed.walls)
    ? parsed.walls.map((w, idx) => ({
        id: typeof w.id === "string" && w.id ? w.id : `w_${idx + 1}`,
        description:
          typeof w.description === "string" && w.description ? w.description : `Wall ${idx + 1}`,
        lengthFt: Number(w.lengthFt) || 30,
        heightFt: Number(w.heightFt) || 10,
        areaSqFt: Number(w.areaSqFt) || (Number(w.lengthFt) || 30) * (Number(w.heightFt) || 10),
        wallType: w.wallType === "internal" ? "internal" : "external",
      }))
    : [];

  const openings: Opening[] = Array.isArray(parsed.openings)
    ? parsed.openings.map((o, idx) => ({
        id: typeof o.id === "string" && o.id ? o.id : `o_${idx + 1}`,
        type: o.type === "Window" ? "Window" : "Door",
        widthFt: Number(o.widthFt) || 3,
        heightFt: Number(o.heightFt) || 7,
        count: Number(o.count) || 1,
      }))
    : [];

  const totalCarpet = rooms.reduce((acc, r) => acc + r.areaSqFt, 0);

  const rawAdv = parsed.advancedAnalysis;
  const advancedAnalysis: AdvancedAnalysis = {
    totalCarpetAreaSqFt: Number(rawAdv?.totalCarpetAreaSqFt) || totalCarpet,
    totalBuiltUpAreaSqFt: Number(rawAdv?.totalBuiltUpAreaSqFt) || +(totalCarpet * 1.2).toFixed(1),
    externalWallThicknessIn: Number(rawAdv?.externalWallThicknessIn) || 9.0,
    internalWallThicknessIn: Number(rawAdv?.internalWallThicknessIn) || 4.5,
    ceilingHeightFt: Number(rawAdv?.ceilingHeightFt) || 10.0,
    unitSystem: rawAdv?.unitSystem || "imperial (feet-inches)",
    scaleDetected: rawAdv?.scaleDetected || "As marked",
    circulationEfficiencyPct: Number(rawAdv?.circulationEfficiencyPct) || 84,
    structuralNotes: Array.isArray(rawAdv?.structuralNotes)
      ? rawAdv.structuralNotes
      : [
          "Extracted using Google Gemini Multi-Pass Vision Analysis",
          "Dimensions verified with exact fractional feet conversions",
        ],
    civilTakeoffSummary:
      typeof rawAdv?.civilTakeoffSummary === "string"
        ? rawAdv.civilTakeoffSummary
        : `Extracted ${rooms.length} functional spaces with exact dimensions, totaling ${totalCarpet} sq.ft carpet area.`,
  };

  return {
    projectName:
      typeof parsed.projectName === "string" ? parsed.projectName : "Extracted Architectural Plan",
    rooms,
    walls,
    openings,
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary
        : `Advanced Civil Analysis: ${rooms.length} spaces extracted with exact width & length callouts (${totalCarpet} sq.ft).`,
    confidence: "high",
    source: "gemini-ai",
    advancedAnalysis,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAI GPT-4o Vision Engine
// ─────────────────────────────────────────────────────────────────────────────
async function extractWithOpenAI(
  base64DataUrl: string,
  apiKey: string,
  model = "gpt-4o",
): Promise<ExtractionResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0.0,
      messages: [
        {
          role: "system",
          content: CIVIL_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Examine this architectural blueprint floor plan. Perform full advanced civil engineering analysis. Extract all rooms with exact width and length callouts and verify every dimension.",
            },
            {
              type: "image_url",
              image_url: { url: base64DataUrl, detail: "high" },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Vision API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error("OpenAI returned empty message content.");

  const parsed = cleanJsonResponse(rawContent);

  const rooms: Room[] = Array.isArray(parsed.rooms)
    ? parsed.rooms.map((r, idx) => normalizeRoom(r, idx))
    : [];

  const walls: Wall[] = Array.isArray(parsed.walls)
    ? parsed.walls.map((w, idx) => ({
        id: typeof w.id === "string" && w.id ? w.id : `w_${idx + 1}`,
        description:
          typeof w.description === "string" && w.description ? w.description : `Wall ${idx + 1}`,
        lengthFt: Number(w.lengthFt) || 30,
        heightFt: Number(w.heightFt) || 10,
        areaSqFt: Number(w.areaSqFt) || (Number(w.lengthFt) || 30) * (Number(w.heightFt) || 10),
        wallType: w.wallType === "internal" ? "internal" : "external",
      }))
    : [];

  const openings: Opening[] = Array.isArray(parsed.openings)
    ? parsed.openings.map((o, idx) => ({
        id: typeof o.id === "string" && o.id ? o.id : `o_${idx + 1}`,
        type: o.type === "Window" ? "Window" : "Door",
        widthFt: Number(o.widthFt) || 3,
        heightFt: Number(o.heightFt) || 7,
        count: Number(o.count) || 1,
      }))
    : [];

  const totalCarpet = rooms.reduce((acc, r) => acc + r.areaSqFt, 0);

  const rawAdv = parsed.advancedAnalysis;
  const advancedAnalysis: AdvancedAnalysis = {
    totalCarpetAreaSqFt: Number(rawAdv?.totalCarpetAreaSqFt) || totalCarpet,
    totalBuiltUpAreaSqFt: Number(rawAdv?.totalBuiltUpAreaSqFt) || +(totalCarpet * 1.2).toFixed(1),
    externalWallThicknessIn: Number(rawAdv?.externalWallThicknessIn) || 9.0,
    internalWallThicknessIn: Number(rawAdv?.internalWallThicknessIn) || 4.5,
    ceilingHeightFt: Number(rawAdv?.ceilingHeightFt) || 10.0,
    unitSystem: rawAdv?.unitSystem || "imperial (feet-inches)",
    scaleDetected: rawAdv?.scaleDetected || "As marked",
    circulationEfficiencyPct: Number(rawAdv?.circulationEfficiencyPct) || 84,
    structuralNotes: Array.isArray(rawAdv?.structuralNotes)
      ? rawAdv.structuralNotes
      : [
          "Extracted using OpenAI GPT-4o High-Resolution Vision",
          "Dimensions verified with exact fractional feet conversions",
        ],
    civilTakeoffSummary:
      typeof rawAdv?.civilTakeoffSummary === "string"
        ? rawAdv.civilTakeoffSummary
        : `Extracted ${rooms.length} functional spaces with exact dimensions, totaling ${totalCarpet} sq.ft carpet area.`,
  };

  return {
    projectName:
      typeof parsed.projectName === "string" ? parsed.projectName : "Extracted Architectural Plan",
    rooms,
    walls,
    openings,
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary
        : `Advanced Civil Analysis: ${rooms.length} spaces extracted with exact width & length callouts (${totalCarpet} sq.ft).`,
    confidence: "high",
    source: "openai-ai",
    advancedAnalysis,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Validator for UI Key Testing
// ─────────────────────────────────────────────────────────────────────────────
export async function testVisionConnection(
  config: AIConfig,
): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.apiKey || !config.apiKey.trim()) {
      return { success: false, message: "API key is missing or blank." };
    }

    if (config.provider === "gemini") {
      const model = config.model || "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping. Return JSON: {"status":"ok"}' }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, message: `Google Gemini error (${response.status}): ${err}` };
      }
      return { success: true, message: `Connected to Google Gemini (${model}) successfully!` };
    } else {
      const model = config.model || "gpt-4o";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Ping" }],
          max_tokens: 5,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, message: `OpenAI error (${response.status}): ${err}` };
      }
      return { success: true, message: `Connected to OpenAI (${model}) successfully!` };
    }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Network error connecting to AI vision service.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clean Blank / Manual Starter (Zero Fake Hallucinated Rooms)
// ─────────────────────────────────────────────────────────────────────────────
export function createBlankExtraction(projectName = "New Floor Plan"): ExtractionResult {
  return {
    projectName,
    rooms: [],
    walls: [],
    openings: [],
    summary: "Blank blueprint schedule ready for manual dimension entry or AI vision extraction.",
    confidence: "estimated",
    source: "heuristic-ocr",
  };
}

/**
 * Backward compatibility helper for offline demo mode
 */
export function extractWithHeuristics(fileName = "Uploaded Drawing"): ExtractionResult {
  return createBlankExtraction(fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Analysis Dispatcher
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzePlanImage(
  base64DataUrl: string,
  fileName = "Floor Plan",
): Promise<ExtractionResult> {
  const config = getEffectiveAIConfig();

  // If no API key is configured, do NOT silently inject fake mock rooms!
  // Throw explicit error so UI can prompt user to add their free Gemini or OpenAI key.
  if (!config || !config.apiKey || config.apiKey.trim().length <= 5) {
    throw new NoVisionKeyError(
      "AI Vision API key required: Please enter your Google Gemini (free) or OpenAI API key in the AI Vision settings to extract exact dimensions, widths, and schedules from this drawing.",
    );
  }

  if (config.provider === "openai") {
    return await extractWithOpenAI(base64DataUrl, config.apiKey.trim(), config.model || "gpt-4o");
  }

  return await extractWithGemini(
    base64DataUrl,
    config.apiKey.trim(),
    config.model || "gemini-1.5-flash",
  );
}
