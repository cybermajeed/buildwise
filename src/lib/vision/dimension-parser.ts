import type { MeasurementUnit } from "./types";

export interface ParsedDimensionResult {
  width: number;
  length: number;
  unit: "meters" | "millimeters" | "feet";
  originalText: string;
  widthFormatted: string;
  lengthFormatted: string;
  widthFt: number;
  lengthFt: number;
  areaSqFt: number;
  areaOriginalUnit: number;
}

/**
 * Parses architectural dimension strings adhering to IS conventions.
 * Preserves the exact original measurements, units, and provides normalized values.
 */
export function parseArchitecturalDimension(raw: string): ParsedDimensionResult | null {
  if (!raw || typeof raw !== "string") return null;
  const clean = normalizeDimensionText(raw);

  // 1. Metric Meters with explicit M: e.g. "3.0M X 3.0M", "3.0m x 2.0m", "3.0M X 2.3M", "3.5m × 4.2m"
  const metricWithM =
    clean.match(
      /^(\d{1,2}(?:\.\d+)?)\s*(?:m|meter|mtrs?)?\s*(?:[xX*×by/]|and)\s*(\d{1,2}(?:\.\d+)?)\s*(?:m|meter|mtrs?)$/i,
    ) ||
    clean.match(
      /^(\d{1,2}(?:\.\d+)?)\s*(?:m|meter|mtrs?)\s*(?:[xX*×by/]|and)\s*(\d{1,2}(?:\.\d+)?)(?:\s*(?:m|meter|mtrs?))?$/i,
    );

  if (metricWithM && metricWithM[1] && metricWithM[2]) {
    const w = parseFloat(metricWithM[1]);
    const l = parseFloat(metricWithM[2]);
    if (w > 0 && l > 0 && w < 100 && l < 100) {
      const wFt = +(w * 3.28084).toFixed(2);
      const lFt = +(l * 3.28084).toFixed(2);
      const areaOriginal = +(w * l).toFixed(2);
      const areaSqFt = +(wFt * lFt).toFixed(1);
      return {
        width: w,
        length: l,
        unit: "meters",
        originalText: clean,
        widthFormatted: `${w}m`,
        lengthFormatted: `${l}m`,
        widthFt: wFt,
        lengthFt: lFt,
        areaSqFt,
        areaOriginalUnit: areaOriginal,
      };
    }
  }

  // 2. Metric Millimeters: e.g. "3600 x 4200", "3000 X 3000 mm", "3600 × 4200"
  const metricMm = clean.match(
    /^(\d{3,5})\s*(?:mm)?\s*(?:[xX*×by/]|and)\s*(\d{3,5})\s*(?:mm)?$/i,
  );
  if (metricMm && metricMm[1] && metricMm[2]) {
    const mm1 = parseInt(metricMm[1], 10);
    const mm2 = parseInt(metricMm[2], 10);
    if (mm1 >= 300 && mm2 >= 300 && mm1 <= 50000 && mm2 <= 50000) {
      const wFt = +(mm1 / 304.8).toFixed(2);
      const lFt = +(mm2 / 304.8).toFixed(2);
      const areaOriginal = +( (mm1 / 1000) * (mm2 / 1000) ).toFixed(2); // m²
      const areaSqFt = +(wFt * lFt).toFixed(1);
      return {
        width: mm1,
        length: mm2,
        unit: "millimeters",
        originalText: clean,
        widthFormatted: `${mm1}mm`,
        lengthFormatted: `${mm2}mm`,
        widthFt: wFt,
        lengthFt: lFt,
        areaSqFt,
        areaOriginalUnit: areaOriginal,
      };
    }
  }

  // 3. Imperial Feet & Inches: e.g. "14'-6\" x 12'-0\"", "14'6\" x 12'0\"", "14' x 12'", "14'-6\"X12'-0\""
  const imperialMatch = clean.match(
    /^(\d{1,2})\s*(?:['’]|ft)?\s*-?\s*(\d{1,2})?\s*(?:["”]|in)?\s*(?:[xX*×by/]|and)\s*(\d{1,2})\s*(?:['’]|ft)?\s*-?\s*(\d{1,2})?\s*(?:["”]|in)?$/i,
  );
  if (imperialMatch && imperialMatch[1] && imperialMatch[3]) {
    // Exclude strings that look like decimals (e.g. 3.0 x 3.0)
    if (!clean.includes(".")) {
      const ft1 = parseInt(imperialMatch[1], 10);
      const in1 = imperialMatch[2] ? parseInt(imperialMatch[2], 10) : 0;
      const ft2 = parseInt(imperialMatch[3], 10);
      const in2 = imperialMatch[4] ? parseInt(imperialMatch[4], 10) : 0;

      if (in1 < 12 && in2 < 12 && ft1 > 0 && ft2 > 0 && ft1 <= 150 && ft2 <= 150) {
        const wFt = +(ft1 + in1 / 12).toFixed(2);
        const lFt = +(ft2 + in2 / 12).toFixed(2);
        const areaSqFt = +(wFt * lFt).toFixed(1);
        return {
          width: wFt,
          length: lFt,
          unit: "feet",
          originalText: clean,
          widthFormatted: in1 > 0 ? `${ft1}'-${in1}"` : `${ft1}'`,
          lengthFormatted: in2 > 0 ? `${ft2}'-${in2}"` : `${ft2}'`,
          widthFt: wFt,
          lengthFt: lFt,
          areaSqFt,
          areaOriginalUnit: areaSqFt,
        };
      }
    }
  }

  // 4. Decimal Meters without explicit M: e.g. "3.00 x 3.00", "3.0 x 2.3", "3.60 x 4.20"
  const decimalMeters =
    clean.match(/^(\d{1,2}\.\d+)\s*(?:[xX*×by/]|and)\s*(\d{1,2}(?:\.\d+)?)$/i) ||
    clean.match(/^(\d{1,2})\s*(?:[xX*×by/]|and)\s*(\d{1,2}\.\d+)$/i);

  if (decimalMeters && decimalMeters[1] && decimalMeters[2]) {
    const w = parseFloat(decimalMeters[1]);
    const l = parseFloat(decimalMeters[2]);
    if (w > 0.5 && l > 0.5 && w < 50 && l < 50) {
      const wFt = +(w * 3.28084).toFixed(2);
      const lFt = +(l * 3.28084).toFixed(2);
      const areaOriginal = +(w * l).toFixed(2);
      const areaSqFt = +(wFt * lFt).toFixed(1);
      return {
        width: w,
        length: l,
        unit: "meters",
        originalText: clean,
        widthFormatted: `${w}m`,
        lengthFormatted: `${l}m`,
        widthFt: wFt,
        lengthFt: lFt,
        areaSqFt,
        areaOriginalUnit: areaOriginal,
      };
    }
  }

  return null;
}

/**
 * Normalizes dimension string to recover missing decimal points and clean delimiters.
 */
export function normalizeDimensionText(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.replace(/[|=_—[\]]+/g, " ");
  // Normalize "X-", "X_", "X /"
  s = s.replace(/[xX*×by/]\s*[-_]\s*/g, " X ");
  // Normalize missing decimal points in metric notations: e.g. "30M" -> "3.0M", "23M" -> "2.3M", "20M" -> "2.0M"
  s = s.replace(/\b([1-9])([0-9])\s*M\b/gi, (_m, d1, d2) => `${d1}.${d2}M`);
  return s.trim();
}

/**
 * Extracts a dimension substring from noisy OCR lines without false positives.
 */
export function extractDimensionCallout(text: string): string | null {
  if (!text || typeof text !== "string") return null;

  const normalized = normalizeDimensionText(text);

  // 1. Metric with explicit M: "3.0M X 3.0M", "3.0m x 2.0m", "3.0M X 2.3M", "3.0M X-3.0M"
  const m1 = normalized.match(
    /\b\d{1,2}(?:\.\d+)?\s*(?:m|meter|mtrs?)\s*(?:[xX*×by/]|and)\s*\d{1,2}(?:\.\d+)?\s*(?:m|meter|mtrs?)\b/i,
  );
  if (m1) return m1[0].trim();

  // 2. Metric decimal: "3.0 X 3.0", "3.0 x 2.3"
  const m2 = normalized.match(/\b\d{1,2}\.\d+\s*(?:[xX*×by/]|and)\s*\d{1,2}(?:\.\d+)?\b/i);
  if (m2) return m2[0].trim();
  const m3 = normalized.match(/\b\d{1,2}\s*(?:[xX*×by/]|and)\s*\d{1,2}\.\d+\b/i);
  if (m3) return m3[0].trim();

  // 3. Millimeters: "3600 x 4200", "3000 x 3000 mm"
  const mm = normalized.match(/\b\d{3,5}\s*(?:mm)?\s*(?:[xX*×by/]|and)\s*\d{3,5}\s*(?:mm)?\b/i);
  if (mm) return mm[0].trim();

  // 4. Imperial feet and inches: "14'-6\" x 12'-0\"", "14'6\" x 12'0\"", "14' x 12'"
  const imp = normalized.match(
    /\b\d{1,2}\s*(?:['’]|ft)?\s*-?\s*\d{0,2}\s*(?:["”]|in)?\s*(?:[xX*×by/]|and)\s*\d{1,2}\s*(?:['’]|ft)?\s*-?\s*\d{0,2}\s*(?:["”]|in)?(?:\b|$|\s)/i,
  );
  if (imp && imp[0].trim().length > 3) return imp[0].trim();

  return null;
}

/**
 * Classifies an architectural label into room, opening, structural or annotation.
 * STRICT: Only verified architectural rooms or spaces are ever assigned category: "room".
 * Never classifies random strings, OCR fragments, or unknown words as rooms.
 */
export function classifyArchitecturalEntity(rawName: string): {
  category: "room" | "opening" | "structural" | "annotation";
  roomType?: "bedroom" | "living" | "kitchen" | "dining" | "toilet" | "balcony" | "corridor" | "utility" | "other";
  openingType?: "Door" | "Window" | "Ventilator" | "Opening";
  structuralType?: "Wall" | "Column" | "Beam" | "Staircase" | "Slab";
  normalizedName: string;
} {
  // Strip pipe delimiters, underlines, brackets and leading/trailing punctuation
  const cleaned = rawName
    .replace(/[|=_—[\]#*~`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = cleaned.toLowerCase();

  // Discard empty or trivial noise strings
  if (!cleaned || cleaned.length < 2) {
    return { category: "annotation", normalizedName: rawName.trim() };
  }

  // 1. OPENINGS (Doors, Windows, Ventilators)
  if (/^(?:d\s*\d+|main\s*door|internal\s*door|sliding\s*door|door)\b/i.test(lower)) {
    return {
      category: "opening",
      openingType: "Door",
      normalizedName: cleanLabel(cleaned),
    };
  }
  if (/^(?:w\s*\d+|window|sliding\s*window|french\s*window)\b/i.test(lower)) {
    return {
      category: "opening",
      openingType: "Window",
      normalizedName: cleanLabel(cleaned),
    };
  }
  if (/^(?:v\s*\d+|vent(?:ilator)?|exhaust)\b/i.test(lower)) {
    return {
      category: "opening",
      openingType: "Ventilator",
      normalizedName: cleanLabel(cleaned),
    };
  }

  // 2. STRUCTURAL ELEMENTS (Walls, Columns, Beams, Stairs)
  if (/\b(?:column|c\s*\d+|pillar|rcc\s*column)\b/i.test(lower)) {
    return {
      category: "structural",
      structuralType: "Column",
      normalizedName: cleanLabel(cleaned),
    };
  }
  if (/\b(?:stair(?:case|s)?|flight|landing)\b/i.test(lower)) {
    return {
      category: "structural",
      structuralType: "Staircase",
      normalizedName: cleanLabel(cleaned),
    };
  }
  if (/\b(?:beam|plinth\s*beam|lintel|tie\s*beam)\b/i.test(lower)) {
    return {
      category: "structural",
      structuralType: "Beam",
      normalizedName: cleanLabel(cleaned),
    };
  }
  if (/\b(?:wall|external\s*wall|partition|parapet)\b/i.test(lower)) {
    return {
      category: "structural",
      structuralType: "Wall",
      normalizedName: cleanLabel(cleaned),
    };
  }

  // 3. ROOMS & FUNCTIONAL SPACES (Strict matching with OCR autocorrect)
  if (/\b(?:master\s*bed(?:room)?|bed\s*room|bedroom|bed\s*\d+|guest\s*bed(?:room)?|bdrm)\b/i.test(lower)) {
    return { category: "room", roomType: "bedroom", normalizedName: "Bedroom" };
  }
  if (
    /\b(?:living(?:\s+room|\s+area|\s+hall)?|drawing(?:\s+room)?|hall|lounge|family\s*room|sitting\s*room|ving(?:\s+roo)?|lving)\b/i.test(
      lower,
    )
  ) {
    return { category: "room", roomType: "living", normalizedName: "Living Room" };
  }
  if (/\b(?:kitchen|modular\s*kitchen|pantry|dry\s*kitchen|wet\s*kitchen|ktchn|kitch)\b/i.test(lower)) {
    return { category: "room", roomType: "kitchen", normalizedName: "Kitchen" };
  }
  if (/\b(?:dining(?:\s+room|\s+area|\s+hall)?|dinning|dining\s*hall)\b/i.test(lower)) {
    return { category: "room", roomType: "dining", normalizedName: "Dining" };
  }
  if (/\b(?:bath(?:room)?|toilet|w\.?c\.?|wash\s*room|powder\s*room|attached\s*toilet|restroom)\b/i.test(lower)) {
    return { category: "room", roomType: "toilet", normalizedName: "Bathroom" };
  }
  if (/\b(?:balcony|terrace|verandah?|sitout|deck|balc)\b/i.test(lower)) {
    return { category: "room", roomType: "balcony", normalizedName: "Balcony" };
  }
  if (/\b(?:porch|portico|foyer|entry|entrance|corridor|passage|lobby)\b/i.test(lower)) {
    return { category: "room", roomType: "corridor", normalizedName: cleanLabel(cleaned) };
  }
  if (/\b(?:utility|wash\s*area|store(?:room)?|storage|pooja|puja|prayer|study|office|gym)\b/i.test(lower)) {
    return { category: "room", roomType: "utility", normalizedName: cleanLabel(cleaned) };
  }

  // 4. ANNOTATION (Notes, scales, random strings, non-architectural words)
  // CRITICAL: Any unidentified or non-room text is ALWAYS categorized as annotation, NEVER as a room.
  return {
    category: "annotation",
    normalizedName: cleaned,
  };
}

function cleanLabel(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
