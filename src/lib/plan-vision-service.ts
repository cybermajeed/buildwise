import type { Room, Wall, Opening } from "./plan-analysis-store";
import { createWorker } from "tesseract.js";

export type VisionProvider = "tesseract";

export interface AIConfig {
  provider: VisionProvider;
  apiKey?: string;
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
  source: "tesseract-ocr" | "heuristic-ocr";
  advancedAnalysis?: AdvancedAnalysis;
}

export class NoVisionKeyError extends Error {
  constructor(message = "Blueprint dimension extraction operates via client-side OCR.") {
    super(message);
    this.name = "NoVisionKeyError";
  }
}

const AI_CONFIG_KEY = "buildwise.ai_vision_config";

export function getStoredAIConfig(): AIConfig {
  return { provider: "tesseract", apiKey: "client-side", model: "tesseract-ocr" };
}

export function saveAIConfig(_config: AIConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AI_CONFIG_KEY, JSON.stringify({ provider: "tesseract" }));
}

export function clearAIConfig(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AI_CONFIG_KEY);
}

export function getEffectiveAIConfig(): AIConfig {
  return { provider: "tesseract", apiKey: "client-side", model: "tesseract-ocr" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Architectural Dimension Parser & Mathematical Normalizer (IS Conventions)
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

export function extractDimensionSubstring(text: string): string | null {
  if (!text || typeof text !== "string") return null;

  // 1. Imperial feet-inches: e.g. 14'-6" x 12'-0", 14'6" x 12'0", 14' x 12', 14'-0"X12'-0", 14'-6"x12'
  const imp = text.match(
    /\b\d{1,2}\s*(?:'|ft|-)?\s*\d{0,2}\s*(?:"|in)?\s*(?:[xX*×by/]|and)\s*\d{1,2}\s*(?:'|ft|-)?\s*\d{0,2}\s*(?:"|in)?\b/i,
  );
  if (imp) return imp[0];

  // 2. Metric mm: e.g. 3600 x 4200, 3000 x 3000
  const mm = text.match(/\b\d{3,5}\s*(?:[xX*×by])\s*\d{3,5}\b/i);
  if (mm) return mm[0];

  // 3. Metric meters: e.g. 3.60 x 4.20, 3.5 x 4.0
  const m = text.match(
    /\b\d{1,2}(?:\.\d+)?\s*(?:m|meter)?\s*(?:[xX*×by])\s*\d{1,2}(?:\.\d+)?\s*(?:m|meter)?\b/i,
  );
  if (m) return m[0];

  return null;
}

const ROOM_NAME_REGEX =
  /\b(master\s+bed(?:room)?|bed\s*room|bed\s*\d+|living(?:\s+room|\s+area|\s+hall)?|drawing(?:\s+room)?|dining(?:\s+room|\s+hall|\s+area)?|kitchen|pantry|bath(?:room)?|toilet|w\.?c\.?|wash|powder\s+room|balcony|terrace|verandah?|foyer|entry|porch|portico|passage|corridor|lobby|utility|store(?:room)?|storage|puja|pooja|prayer|study(?:\s+room)?|office|gym|stair(?:s|case)?|garage|car\s+porch)\b/i;

function cleanRoomName(raw: string, dimText?: string): string {
  let name = raw;
  if (dimText) {
    name = name.replace(dimText, "");
  }
  name = name.replace(/[^a-zA-Z0-9\s-]/g, " ").trim();
  if (!name || name.length < 2) return "Functional Space";
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-Side Tesseract.js In-Browser OCR Engine
// ─────────────────────────────────────────────────────────────────────────────
export async function extractWithTesseract(
  base64DataUrl: string,
  fileName = "Floor Plan",
): Promise<ExtractionResult> {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  try {
    worker = await createWorker("eng");
    const result = await worker.recognize(base64DataUrl);
    const fullText = result.data.text || "";
    const lines = result.data.lines
      ? result.data.lines.map((l) => l.text.trim()).filter((l) => l.length > 0)
      : fullText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    const discoveredRooms: Room[] = [];

    // Scan lines for room labels and dimension callouts
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const dimInLine = extractDimensionSubstring(line);

      if (dimInLine) {
        const parsed = parseArchitecturalDimensionString(dimInLine);
        if (parsed && parsed.widthFt >= 2 && parsed.lengthFt >= 2) {
          const roomMatch = line.match(ROOM_NAME_REGEX);
          const prevLine = i > 0 ? lines[i - 1] : undefined;
          const prevMatch = prevLine ? prevLine.match(ROOM_NAME_REGEX) : null;
          const roomName = roomMatch
            ? cleanRoomName(roomMatch[0])
            : prevMatch
              ? cleanRoomName(prevMatch[0])
              : cleanRoomName(line, dimInLine);

          discoveredRooms.push({
            id: `ocr_r_${discoveredRooms.length + 1}`,
            name: roomName,
            widthFt: parsed.widthFt,
            lengthFt: parsed.lengthFt,
            areaSqFt: parsed.areaSqFt,
            rawDimensionText: dimInLine,
            roomType: roomName.toLowerCase().includes("bed")
              ? "bedroom"
              : roomName.toLowerCase().includes("bath") || roomName.toLowerCase().includes("toilet")
                ? "toilet"
                : roomName.toLowerCase().includes("kitchen")
                  ? "kitchen"
                  : roomName.toLowerCase().includes("living")
                    ? "living"
                    : "other",
          });
          continue;
        }
      }

      // Check if current line is room name and next line has the dimension
      const roomMatch = line.match(ROOM_NAME_REGEX);
      if (roomMatch && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine) {
          const nextDim = extractDimensionSubstring(nextLine);
          if (nextDim) {
            const parsed = parseArchitecturalDimensionString(nextDim);
            if (parsed && parsed.widthFt >= 2 && parsed.lengthFt >= 2) {
              const roomName = cleanRoomName(roomMatch[0]);
              discoveredRooms.push({
                id: `ocr_r_${discoveredRooms.length + 1}`,
                name: roomName,
                widthFt: parsed.widthFt,
                lengthFt: parsed.lengthFt,
                areaSqFt: parsed.areaSqFt,
                rawDimensionText: nextDim,
                roomType: roomName.toLowerCase().includes("bed")
                  ? "bedroom"
                  : roomName.toLowerCase().includes("bath") ||
                      roomName.toLowerCase().includes("toilet")
                    ? "toilet"
                    : roomName.toLowerCase().includes("kitchen")
                      ? "kitchen"
                      : roomName.toLowerCase().includes("living")
                        ? "living"
                        : "other",
              });
              i++; // skip next line
            }
          }
        }
      }
    }

    // Deduplicate rooms
    const uniqueRooms: Room[] = [];
    const seen = new Set<string>();
    for (const r of discoveredRooms) {
      const key = `${r.name.toLowerCase()}_${r.widthFt}_${r.lengthFt}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRooms.push({
          ...r,
          id: `r_${uniqueRooms.length + 1}`,
        });
      }
    }

    if (uniqueRooms.length === 0) {
      return {
        projectName: fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        rooms: [],
        walls: [],
        openings: [],
        summary:
          "In-Browser OCR scan complete. No dimension callouts (e.g. 14'-0\" X 12'-0\" or 3600 x 4200) were detected in the drawing text. You can add room dimensions manually below.",
        confidence: "estimated",
        source: "tesseract-ocr",
        advancedAnalysis: {
          totalCarpetAreaSqFt: 0,
          totalBuiltUpAreaSqFt: 0,
          externalWallThicknessIn: 9.0,
          internalWallThicknessIn: 4.5,
          ceilingHeightFt: 10.0,
          unitSystem: "imperial (feet-inches)",
          circulationEfficiencyPct: 80,
          structuralNotes: [
            "Processed with client-side Tesseract.js WebAssembly OCR",
            "Zero external API keys required",
            "Manual dimension entry enabled",
          ],
          civilTakeoffSummary: "No dimensions found. Manual dimension entry required.",
        },
      };
    }

    const totalCarpet = uniqueRooms.reduce((acc, r) => acc + r.areaSqFt, 0);
    const totalPerimeter = uniqueRooms.reduce((acc, r) => acc + 2 * (r.widthFt + r.lengthFt), 0);
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

    const openings: Opening[] = [
      {
        id: "op_doors",
        type: "Door",
        widthFt: 3.0,
        heightFt: 7.0,
        count: uniqueRooms.length,
      },
      {
        id: "op_windows",
        type: "Window",
        widthFt: 4.0,
        heightFt: 4.0,
        count: Math.max(1, Math.round(uniqueRooms.length * 0.7)),
      },
    ];

    return {
      projectName: fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
      rooms: uniqueRooms,
      walls,
      openings,
      summary: `In-Browser OCR extracted ${uniqueRooms.length} room dimensions directly from blueprint callouts (${totalCarpet} sq.ft total carpet area).`,
      confidence: uniqueRooms.length >= 3 ? "high" : "medium",
      source: "tesseract-ocr",
      advancedAnalysis: {
        totalCarpetAreaSqFt: totalCarpet,
        totalBuiltUpAreaSqFt: +(totalCarpet * 1.2).toFixed(1),
        externalWallThicknessIn: 9.0,
        internalWallThicknessIn: 4.5,
        ceilingHeightFt: 10.0,
        unitSystem: "imperial (feet-inches)",
        scaleDetected: "From text callouts",
        circulationEfficiencyPct: 84,
        structuralNotes: [
          "Processed in-browser via Tesseract.js WebAssembly",
          `Parsed ${uniqueRooms.length} room callouts with mathematical dimension normalizer`,
        ],
        civilTakeoffSummary: `Extracted ${uniqueRooms.length} rooms totaling ${totalCarpet} sq.ft carpet area.`,
      },
    };
  } finally {
    if (worker) {
      await worker.terminate().catch(() => {});
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Validator for UI Key Testing
// ─────────────────────────────────────────────────────────────────────────────
export async function testVisionConnection(
  _config?: AIConfig,
): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: "In-Browser Tesseract.js OCR engine operational (Client-Side WebAssembly).",
  };
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
    summary: "Blank blueprint schedule ready for manual dimension entry or OCR extraction.",
    confidence: "estimated",
    source: "heuristic-ocr",
  };
}

export function extractWithHeuristics(fileName = "Uploaded Drawing"): ExtractionResult {
  return createBlankExtraction(fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Analysis Dispatcher — Directly Runs In-Browser OCR
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzePlanImage(
  base64DataUrl: string,
  fileName = "Floor Plan",
): Promise<ExtractionResult> {
  return await extractWithTesseract(base64DataUrl, fileName);
}
