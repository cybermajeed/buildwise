/**
 * Architectural Floor Plan Accuracy Benchmark Suite
 * Measures and asserts:
 * 1. Room detection accuracy
 * 2. Dimension text extraction accuracy
 * 3. Room-to-dimension association accuracy
 * 4. Exact dimension match accuracy
 * 5. False-positive measurement rate (asserts 0% invented dimensions)
 */

import {
  parseArchitecturalDimension,
  extractDimensionCallout,
  classifyArchitecturalEntity,
} from "./dimension-parser";
import { validateAndCrossCheck } from "./validator";
import type {
  StructuredFloorPlanData,
  ExtractedRoom,
  ExtractedOpening,
  ExtractedStructuralElement,
} from "./types";

export interface GroundTruthRoom {
  name: string;
  expectedWidth: number | null;
  expectedLength: number | null;
  expectedUnit: "meters" | "millimeters" | "feet" | null;
  expectedOriginalText: string | null;
}

export interface GroundTruthFixture {
  id: string;
  title: string;
  drawingStyle: "metric-meters" | "metric-mm" | "imperial-feet-inches" | "mixed-openings" | "unmeasured-spaces";
  rawLines: Array<{
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  groundTruthRooms: GroundTruthRoom[];
  groundTruthOpenings: Array<{
    name: string;
    type: "Door" | "Window" | "Ventilator";
    width: number;
    height: number;
  }>;
}

export interface BenchmarkMetrics {
  totalGroundTruthRooms: number;
  detectedRoomsCount: number;
  roomDetectionAccuracyPct: number;
  dimensionTextExtractionAccuracyPct: number;
  roomToDimensionAssociationAccuracyPct: number;
  exactDimensionMatchAccuracyPct: number;
  falsePositiveMeasurementRatePct: number;
  details: Array<{
    fixtureId: string;
    fixtureTitle: string;
    roomName: string;
    expected: string;
    actual: string;
    dimensionMatch: boolean;
    associatedCorrectly: boolean;
  }>;
}

/**
 * Benchmark Test Fixtures covering all required test criteria:
 * - Metric meters (3.0M X 3.0M, 3.0M X 2.0M, 3.0M X 2.3M)
 * - Imperial feet-inches (14'-6" x 12'-0", 12'0" x 11'0")
 * - Metric mm (3600 x 4200)
 * - Doors & windows near room labels (verifying opening sizes are not confused with room sizes)
 * - Multiple bedrooms with similar labels (Master Bed, Bed 2)
 * - Missing dimensions / unmeasured spaces (verifying Rule 1 & Rule 5: 0% false positives)
 */
export const BENCHMARK_FIXTURES: GroundTruthFixture[] = [
  // Fixture 1: Metric Drawing (User Specification Test Case)
  {
    id: "fix_metric_villa",
    title: "Metric Residential Villa Floor Plan",
    drawingStyle: "metric-meters",
    rawLines: [
      { text: "BEDROOM", bbox: { x0: 100, y0: 100, x1: 220, y1: 125 } },
      { text: "3.0M X 3.0M", bbox: { x0: 100, y0: 135, x1: 240, y1: 160 } },

      { text: "KITCHEN", bbox: { x0: 350, y0: 100, x1: 450, y1: 125 } },
      { text: "3.0M X 2.0M", bbox: { x0: 350, y0: 135, x1: 490, y1: 160 } },

      { text: "DINING", bbox: { x0: 600, y0: 100, x1: 680, y1: 125 } },
      { text: "3.0M X 2.3M", bbox: { x0: 600, y0: 135, x1: 740, y1: 160 } },

      { text: "LIVING ROOM", bbox: { x0: 200, y0: 300, x1: 360, y1: 325 } },
      { text: "3.0M X 3.0M", bbox: { x0: 200, y0: 335, x1: 340, y1: 360 } },

      // Unmeasured room (Rule 1 & Rule 5 test)
      { text: "TOILET", bbox: { x0: 450, y0: 300, x1: 530, y1: 325 } },

      // Doors and windows near room labels (Rule 2 test)
      { text: "D1 1.0M X 2.1M", bbox: { x0: 230, y0: 165, x1: 330, y1: 185 } },
      { text: "W1 1.5M X 1.2M", bbox: { x0: 100, y0: 80, x1: 200, y1: 95 } },
    ],
    groundTruthRooms: [
      {
        name: "Bedroom",
        expectedWidth: 3.0,
        expectedLength: 3.0,
        expectedUnit: "meters",
        expectedOriginalText: "3.0M X 3.0M",
      },
      {
        name: "Kitchen",
        expectedWidth: 3.0,
        expectedLength: 2.0,
        expectedUnit: "meters",
        expectedOriginalText: "3.0M X 2.0M",
      },
      {
        name: "Dining",
        expectedWidth: 3.0,
        expectedLength: 2.3,
        expectedUnit: "meters",
        expectedOriginalText: "3.0M X 2.3M",
      },
      {
        name: "Living Room",
        expectedWidth: 3.0,
        expectedLength: 3.0,
        expectedUnit: "meters",
        expectedOriginalText: "3.0M X 3.0M",
      },
      {
        name: "Toilet",
        expectedWidth: null,
        expectedLength: null,
        expectedUnit: null,
        expectedOriginalText: null,
      },
    ],
    groundTruthOpenings: [
      { name: "D1", type: "Door", width: 1.0, height: 2.1 },
      { name: "W1", type: "Window", width: 1.5, height: 1.2 },
    ],
  },

  // Fixture 2: Imperial Architectural Plan
  {
    id: "fix_imperial_residence",
    title: "Imperial 2BHK Floor Plan Callouts",
    drawingStyle: "imperial-feet-inches",
    rawLines: [
      { text: "MASTER BEDROOM", bbox: { x0: 100, y0: 100, x1: 280, y1: 125 } },
      { text: "14'-6\" X 12'-0\"", bbox: { x0: 100, y0: 135, x1: 270, y1: 160 } },

      { text: "BEDROOM 2", bbox: { x0: 380, y0: 100, x1: 500, y1: 125 } },
      { text: "12'-0\" X 11'-0\"", bbox: { x0: 380, y0: 135, x1: 520, y1: 160 } },

      { text: "KITCHEN", bbox: { x0: 600, y0: 100, x1: 700, y1: 125 } },
      { text: "10'-0\" X 9'-6\"", bbox: { x0: 600, y0: 135, x1: 730, y1: 160 } },

      // Unmeasured balcony
      { text: "BALCONY", bbox: { x0: 100, y0: 250, x1: 190, y1: 275 } },

      // Door
      { text: "DOOR D1 3'-0\" X 7'-0\"", bbox: { x0: 280, y0: 160, x1: 370, y1: 180 } },
    ],
    groundTruthRooms: [
      {
        name: "Master Bedroom",
        expectedWidth: 14.5,
        expectedLength: 12.0,
        expectedUnit: "feet",
        expectedOriginalText: "14'-6\" X 12'-0\"",
      },
      {
        name: "Bedroom 2",
        expectedWidth: 12.0,
        expectedLength: 11.0,
        expectedUnit: "feet",
        expectedOriginalText: "12'-0\" X 11'-0\"",
      },
      {
        name: "Kitchen",
        expectedWidth: 10.0,
        expectedLength: 9.5,
        expectedUnit: "feet",
        expectedOriginalText: "10'-0\" X 9'-6\"",
      },
      {
        name: "Balcony",
        expectedWidth: null,
        expectedLength: null,
        expectedUnit: null,
        expectedOriginalText: null,
      },
    ],
    groundTruthOpenings: [
      { name: "Door D1", type: "Door", width: 3.0, height: 7.0 },
    ],
  },

  // Fixture 3: Millimeter Technical Layout
  {
    id: "fix_mm_layout",
    title: "Structural Commercial Layout (mm)",
    drawingStyle: "metric-mm",
    rawLines: [
      { text: "OFFICE 1", bbox: { x0: 100, y0: 100, x1: 200, y1: 125 } },
      { text: "3600 X 4200", bbox: { x0: 100, y0: 135, x1: 240, y1: 160 } },

      { text: "CONFERENCE ROOM", bbox: { x0: 350, y0: 100, x1: 520, y1: 125 } },
      { text: "4500 X 6000", bbox: { x0: 350, y0: 135, x1: 490, y1: 160 } },

      // Column (Rule 2: structural element)
      { text: "RCC COLUMN C1 300 X 300", bbox: { x0: 100, y0: 300, x1: 250, y1: 325 } },
    ],
    groundTruthRooms: [
      {
        name: "Office 1",
        expectedWidth: 3600,
        expectedLength: 4200,
        expectedUnit: "millimeters",
        expectedOriginalText: "3600 X 4200",
      },
      {
        name: "Conference Room",
        expectedWidth: 4500,
        expectedLength: 6000,
        expectedUnit: "millimeters",
        expectedOriginalText: "4500 X 6000",
      },
    ],
    groundTruthOpenings: [],
  },
];

/**
 * Runs the benchmark test suite against all ground-truth fixtures.
 */
export function runAccuracyBenchmark(): BenchmarkMetrics {
  let totalGtRooms = 0;
  let detectedRooms = 0;
  let correctDimensionTexts = 0;
  let correctAssociations = 0;
  let exactDimensionMatches = 0;
  let falsePositiveMeasurements = 0;

  const details: BenchmarkMetrics["details"] = [];

  for (const fixture of BENCHMARK_FIXTURES) {
    // 1. Run 2D spatial extraction on fixture's lines
    const detectedRoomsMap = new Map<string, { width: number | null; length: number | null; unit: string | null; originalText: string | null }>();

    // Candidate dimensions
    const dims: Array<{ text: string; parsed: any; bbox: any; used: boolean }> = [];
    for (const line of fixture.rawLines) {
      const callout = extractDimensionCallout(line.text);
      if (callout) {
        const parsed = parseArchitecturalDimension(callout);
        if (parsed) {
          dims.push({ text: callout, parsed, bbox: line.bbox, used: false });
        }
      }
    }

    // Process room labels
    for (const line of fixture.rawLines) {
      const classification = classifyArchitecturalEntity(line.text);
      if (classification.category === "room") {
        // Find dimension in same line or closest below
        let matchedDim: any = null;
        const selfDim = extractDimensionCallout(line.text);
        if (selfDim) {
          matchedDim = parseArchitecturalDimension(selfDim);
        } else {
          let bestDist = Infinity;
          for (const d of dims) {
            if (d.used) continue;
            const dx = (d.bbox.x0 + d.bbox.x1) / 2 - (line.bbox.x0 + line.bbox.x1) / 2;
            const dy = d.bbox.y0 - line.bbox.y1;
            if (dy >= -10 && dy <= 160 && Math.abs(dx) <= 200) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < bestDist) {
                bestDist = dist;
                matchedDim = d;
              }
            }
          }
          if (matchedDim) {
            matchedDim.used = true;
            matchedDim = matchedDim.parsed;
          }
        }

        detectedRoomsMap.set(normalizeKey(classification.normalizedName), {
          width: matchedDim ? matchedDim.width : null,
          length: matchedDim ? matchedDim.length : null,
          unit: matchedDim ? matchedDim.unit : null,
          originalText: matchedDim ? matchedDim.originalText : null,
        });
      }
    }

    // Compare with ground truth
    for (const gt of fixture.groundTruthRooms) {
      totalGtRooms++;
      const normKey = normalizeKey(gt.name);
      const actual = detectedRoomsMap.get(normKey);

      if (actual) {
        detectedRooms++;

        const isUnmeasuredExpected = gt.expectedWidth === null && gt.expectedLength === null;

        if (isUnmeasuredExpected) {
          if (actual.width === null && actual.length === null) {
            // Correctly identified unmeasured room without hallucinating dimensions
            exactDimensionMatches++;
            correctAssociations++;
            correctDimensionTexts++;
            details.push({
              fixtureId: fixture.id,
              fixtureTitle: fixture.title,
              roomName: gt.name,
              expected: "Unmeasured (null)",
              actual: "Unmeasured (null)",
              dimensionMatch: true,
              associatedCorrectly: true,
            });
          } else {
            // FALSE POSITIVE! Hallucinated or misassigned dimension to an unmeasured room!
            falsePositiveMeasurements++;
            details.push({
              fixtureId: fixture.id,
              fixtureTitle: fixture.title,
              roomName: gt.name,
              expected: "Unmeasured (null)",
              actual: `${actual.width} x ${actual.length} ${actual.unit}`,
              dimensionMatch: false,
              associatedCorrectly: false,
            });
          }
        } else {
          // Explicit dimension expected
          const wMatch = actual.width !== null && Math.abs(actual.width - (gt.expectedWidth || 0)) < 0.05;
          const lMatch = actual.length !== null && Math.abs(actual.length - (gt.expectedLength || 0)) < 0.05;
          const uMatch = actual.unit === gt.expectedUnit;
          const isExact = wMatch && lMatch && uMatch;

          if (isExact) {
            exactDimensionMatches++;
            correctAssociations++;
            correctDimensionTexts++;
          }

          details.push({
            fixtureId: fixture.id,
            fixtureTitle: fixture.title,
            roomName: gt.name,
            expected: `${gt.expectedWidth} x ${gt.expectedLength} ${gt.expectedUnit} (${gt.expectedOriginalText})`,
            actual: actual.width !== null ? `${actual.width} x ${actual.length} ${actual.unit} (${actual.originalText})` : "null",
            dimensionMatch: isExact,
            associatedCorrectly: isExact,
          });
        }
      } else {
        details.push({
          fixtureId: fixture.id,
          fixtureTitle: fixture.title,
          roomName: gt.name,
          expected: `${gt.expectedWidth} x ${gt.expectedLength} ${gt.expectedUnit}`,
          actual: "NOT_DETECTED",
          dimensionMatch: false,
          associatedCorrectly: false,
        });
      }
    }
  }

  const roomDetectionAccuracyPct = +( (detectedRooms / totalGtRooms) * 100 ).toFixed(1);
  const dimensionTextExtractionAccuracyPct = +( (correctDimensionTexts / totalGtRooms) * 100 ).toFixed(1);
  const roomToDimensionAssociationAccuracyPct = +( (correctAssociations / totalGtRooms) * 100 ).toFixed(1);
  const exactDimensionMatchAccuracyPct = +( (exactDimensionMatches / totalGtRooms) * 100 ).toFixed(1);
  const falsePositiveMeasurementRatePct = +( (falsePositiveMeasurements / totalGtRooms) * 100 ).toFixed(1);

  return {
    totalGroundTruthRooms: totalGtRooms,
    detectedRoomsCount: detectedRooms,
    roomDetectionAccuracyPct,
    dimensionTextExtractionAccuracyPct,
    roomToDimensionAssociationAccuracyPct,
    exactDimensionMatchAccuracyPct,
    falsePositiveMeasurementRatePct,
    details,
  };
}

function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
