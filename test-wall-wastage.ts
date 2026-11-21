import {
  DEFAULT_WALL_CONFIG,
  DEFAULT_MATERIAL_CONFIG,
  DEFAULT_WALL_WASTAGE_CONFIG,
  EXTERNAL_WALL_PRESET,
  INTERNAL_WALL_PRESET,
  inchesToMeters,
  metersToInches,
  validateWallThickness,
  validateWastagePercentage,
  applyMaterialWastage,
  createCustomWallSetting,
  sanitizeWallWastageConfig,
} from "./src/lib/wall-wastage-config";

import {
  DEFAULT_KEY_PARAMS,
  deriveQuantities,
  type Room,
  type Wall,
  type Opening,
  type KeyParameters,
} from "./src/lib/plan-analysis-store";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    testsFailed++;
  }
}

console.log("===============================================================================");
console.log("RUNNING TEST SUITE: Wall Thickness & Material Wastage Settings (12 Scenarios)");
console.log("===============================================================================\n");

// Scenario 1: Default Configuration
console.log("Scenario 1: Default Configuration for New Projects / Sessions");
{
  assert(DEFAULT_WALL_CONFIG.external_wall.thickness_inches === 9, "Default external wall thickness is 9 inches");
  assert(DEFAULT_WALL_CONFIG.external_wall.thickness_meters === 0.23, "Default external wall metric equivalent is 0.23 m");
  assert(DEFAULT_WALL_CONFIG.internal_wall.thickness_inches === 4.5, "Default internal wall thickness is 4.5 inches");
  assert(DEFAULT_WALL_CONFIG.internal_wall.thickness_meters === 0.115, "Default internal wall metric equivalent is 0.115 m");
  assert(DEFAULT_MATERIAL_CONFIG.wastage_percentage === 5, "Default material wastage percentage is 5%");
  assert(DEFAULT_KEY_PARAMS.wallThicknessIn === 9, "KeyParameters default wallThicknessIn is 9");
  assert(DEFAULT_KEY_PARAMS.internalWallThicknessIn === 4.5, "KeyParameters default internalWallThicknessIn is 4.5");
  assert(DEFAULT_KEY_PARAMS.wastagePct === 5, "KeyParameters default wastagePct is 5");
}

// Scenario 2: Standard External Wall Preset
console.log("\nScenario 2: Standard External Wall Preset (9 inches / 0.23 m)");
{
  assert(EXTERNAL_WALL_PRESET.type === "standard", "Preset type is standard");
  assert(EXTERNAL_WALL_PRESET.thickness_inches === 9, "Thickness is 9 inches");
  assert(EXTERNAL_WALL_PRESET.thickness_meters === 0.23, "Thickness is 0.23 meters");
}

// Scenario 3: Standard Internal Partition Preset
console.log("\nScenario 3: Standard Internal Partition Wall Preset (4.5 inches / 0.115 m)");
{
  assert(INTERNAL_WALL_PRESET.type === "standard", "Preset type is standard");
  assert(INTERNAL_WALL_PRESET.thickness_inches === 4.5, "Thickness is 4.5 inches");
  assert(INTERNAL_WALL_PRESET.thickness_meters === 0.115, "Thickness is 0.115 meters");
}

// Scenario 4: Custom External Wall Thickness
console.log("\nScenario 4: Custom External Wall Thickness (e.g. 13.5 inches / 0.35 m)");
{
  const customInch = createCustomWallSetting(13.5, "inches");
  assert(customInch.type === "custom", "Setting type is custom");
  assert(customInch.thickness_inches === 13.5, "Thickness in inches preserved (13.5)");
  assert(customInch.thickness_meters === 0.343, "Metric converted correctly (0.343 m)");
  assert(customInch.original_measurement_unit === "inches", "Original unit preserved");

  const customMeter = createCustomWallSetting(0.35, "meters");
  assert(customMeter.type === "custom", "Setting type is custom");
  assert(customMeter.thickness_meters === 0.35, "Thickness in meters preserved (0.35)");
  assert(Math.abs(customMeter.thickness_inches - 13.8) < 0.2, "Inch converted correctly (~13.8)");
}

// Scenario 5: Custom Internal Wall Thickness
console.log("\nScenario 5: Custom Internal Partition Wall Thickness (e.g. 6 inches / 0.15 m)");
{
  const customInt = createCustomWallSetting(6, "inches");
  assert(customInt.thickness_inches === 6, "Internal thickness set to 6 inches");
  assert(customInt.thickness_meters === 0.152, "Metric converted to 0.152 m");

  const customIntMeter = createCustomWallSetting(0.15, "meters");
  assert(customIntMeter.thickness_meters === 0.15, "Internal thickness set to 0.15 m");
  assert(Math.abs(customIntMeter.thickness_inches - 5.9) < 0.2, "Inch converted correctly (~5.9 inches)");
}

// Scenario 6: Material Wastage Modification
console.log("\nScenario 6: Material Wastage Calculation & Scaling (5% vs 10%)");
{
  // User prompt example: Base material requirement: 1,000 bricks, Wastage: 5% -> 1,050 bricks
  const bricksAt5 = applyMaterialWastage(1000, 5, "ceil");
  assert(bricksAt5 === 1050, `1000 bricks at 5% wastage = ${bricksAt5} (expected 1050)`);

  const bricksAt10 = applyMaterialWastage(1000, 10, "ceil");
  assert(bricksAt10 === 1100, `1000 bricks at 10% wastage = ${bricksAt10} (expected 1100)`);

  // Whole units/bags use ceil mode
  const cementAt5 = applyMaterialWastage(101, 5, "ceil");
  assert(cementAt5 === 107, `101 bags cement at 5% = ${cementAt5} (ceil from 106.05)`);

  // Volume decimals mode
  const sandAt5 = applyMaterialWastage(20.4, 5, "decimals");
  assert(sandAt5 === 21.4, `20.4 m3 sand at 5% = ${sandAt5} (expected 21.4)`);
}

// Scenario 7: Configuration Persistence & Sanitization
console.log("\nScenario 7: Persistence & Sanitization Structure");
{
  const rawInput = {
    wall_configuration: {
      external_wall: {
        type: "custom",
        thickness_inches: 12,
        thickness_meters: 0.305,
        thickness_value: 12,
        original_measurement_unit: "inches",
      },
      internal_wall: {
        type: "standard",
        thickness_inches: 4.5,
        thickness_meters: 0.115,
      },
    },
    material_configuration: {
      wastage_percentage: 8,
    },
  };

  const sanitized = sanitizeWallWastageConfig(rawInput);
  assert(sanitized.wall_configuration.external_wall.thickness_inches === 12, "Sanitized external wall matches 12 inches");
  assert(sanitized.wall_configuration.external_wall.type === "custom", "Sanitized external type is custom");
  assert(sanitized.material_configuration.wastage_percentage === 8, "Sanitized wastage percentage is 8%");

  // Corrupted input falls back safely
  const corrupted = sanitizeWallWastageConfig({ material_configuration: { wastage_percentage: -5 } });
  assert(corrupted.material_configuration.wastage_percentage === 5, "Negative wastage falls back to default 5%");
  assert(corrupted.wall_configuration.external_wall.thickness_inches === 9, "Missing wall config falls back to default 9 inches");
}

// Scenario 8: Room Dimension Integrity (Never alter clear room dimensions or area)
console.log("\nScenario 8: Room Dimension Integrity (Room dimensions & floor area NEVER changed)");
{
  const rooms: Room[] = [
    { id: "r1", name: "BEDROOM 1", widthFt: 10, lengthFt: 10, areaSqFt: 100, rawDimensionText: "3.0M X 3.0M" },
    { id: "r2", name: "LIVING ROOM", widthFt: 15, lengthFt: 20, areaSqFt: 300, rawDimensionText: "4.5M X 6.0M" },
  ];
  const walls: Wall[] = [
    { id: "w1", description: "External Perimeter Wall", lengthFt: 100, heightFt: 10, areaSqFt: 1000, wallType: "external" },
    { id: "w2", description: "Internal Partition Wall", lengthFt: 40, heightFt: 10, areaSqFt: 400, wallType: "internal" },
  ];
  const openings: Opening[] = [];

  const defaultParams: KeyParameters = {
    wallThicknessIn: 9,
    internalWallThicknessIn: 4.5,
    wastagePct: 5,
    floorHeightFt: 10,
    plinthHeightFt: 2.5,
    numberOfFloors: 1,
    foundationDepthFt: 4.0,
  };

  const takeoffDefault = deriveQuantities(rooms, walls, openings, defaultParams);

  // Now change wall thickness to heavy 18" and wastage to 15%
  const heavyParams: KeyParameters = {
    ...defaultParams,
    wallThicknessIn: 18,
    internalWallThicknessIn: 9,
    wastagePct: 15,
  };

  const takeoffHeavy = deriveQuantities(rooms, walls, openings, heavyParams);

  // Verify room dimensions in the input are 100% untouched
  assert(rooms[0].widthFt === 10 && rooms[0].lengthFt === 10, "Room 1 width and length remain 10 x 10 ft");
  assert(rooms[0].areaSqFt === 100, "Room 1 area remains 100 sq.ft");
  assert(rooms[1].widthFt === 15 && rooms[1].lengthFt === 20, "Room 2 dimensions remain 15 x 20 ft");
  assert(rooms[1].areaSqFt === 300, "Room 2 area remains 300 sq.ft");
}

// Scenario 9: Wall Measurements & Material Quantities
console.log("\nScenario 9: Physical Wall Measurements & Masonry Reflection");
{
  const rooms: Room[] = [
    { id: "r1", name: "Room", widthFt: 10, lengthFt: 10, areaSqFt: 100 },
  ];
  const walls: Wall[] = [
    { id: "w1", description: "External Wall", lengthFt: 100, heightFt: 10, areaSqFt: 1000, wallType: "external" },
    { id: "w2", description: "Internal Wall", lengthFt: 50, heightFt: 10, areaSqFt: 500, wallType: "internal" },
  ];
  const openings: Opening[] = [];

  // With 9" ext wall (0.75 ft)
  const takeoff9 = deriveQuantities(rooms, walls, openings, {
    ...DEFAULT_KEY_PARAMS,
    wallThicknessIn: 9,
    internalWallThicknessIn: 4.5,
    wastagePct: 5,
  });

  // With 13.5" ext wall (1.125 ft)
  const takeoff13 = deriveQuantities(rooms, walls, openings, {
    ...DEFAULT_KEY_PARAMS,
    wallThicknessIn: 13.5,
    internalWallThicknessIn: 4.5,
    wastagePct: 5,
  });

  const extBrick9 = takeoff9.quantities.find((q) => q.id === "brickwork_ext")!;
  const extBrick13 = takeoff13.quantities.find((q) => q.id === "brickwork_ext")!;

  assert(extBrick13.quantity > extBrick9.quantity, `13.5" wall volume (${extBrick13.quantity} m³) is greater than 9" wall (${extBrick9.quantity} m³)`);
  const ratio = extBrick13.quantity / extBrick9.quantity;
  assert(Math.abs(ratio - (13.5 / 9)) < 0.05, `Wall volume scales proportionally by thickness ratio (~1.5x)`);
}

// Scenario 10: Single Wastage Application (No Double Counting)
console.log("\nScenario 10: Single Wastage Application (Never applied twice)");
{
  const baseQty = 1000;
  const wastage = 5;
  const singleApplied = applyMaterialWastage(baseQty, wastage, "ceil");
  assert(singleApplied === 1050, "Direct formula yields 1050");

  // If a bug applied it twice: 1050 * 1.05 = 1102.5 -> ensure our store result matches single applied
  const rooms: Room[] = [{ id: "r1", name: "R", widthFt: 10, lengthFt: 10, areaSqFt: 100 }];
  const walls: Wall[] = [{ id: "w1", description: "Ext", lengthFt: 50, heightFt: 10, areaSqFt: 500, wallType: "external" }];
  const openings: Opening[] = [];

  const res5 = deriveQuantities(rooms, walls, openings, { ...DEFAULT_KEY_PARAMS, wastagePct: 5 });
  const res0 = deriveQuantities(rooms, walls, openings, { ...DEFAULT_KEY_PARAMS, wastagePct: 0 });

  const bricks0 = res0.constituents.find((c) => c.label.includes("Bricks"))!.quantity;
  const bricks5 = res5.constituents.find((c) => c.label.includes("Bricks"))!.quantity;

  const expected5 = Math.ceil(bricks0 * 1.05);
  assert(bricks5 === expected5, `Bricks with 5% wastage (${bricks5}) strictly equals base (${bricks0}) * 1.05 (${expected5})`);
}

// Scenario 11: Shared Wall Accounting
console.log("\nScenario 11: Separate Internal and External Wall Accounting");
{
  const rooms: Room[] = [{ id: "r1", name: "R", widthFt: 10, lengthFt: 10, areaSqFt: 100 }];
  const walls: Wall[] = [
    { id: "ext1", description: "Perimeter", lengthFt: 80, heightFt: 10, areaSqFt: 800, wallType: "external" },
    { id: "int1", description: "Partition", lengthFt: 20, heightFt: 10, areaSqFt: 200, wallType: "internal" },
  ];
  const openings: Opening[] = [];

  const res = deriveQuantities(rooms, walls, openings, {
    ...DEFAULT_KEY_PARAMS,
    wallThicknessIn: 9,
    internalWallThicknessIn: 4.5,
  });

  const extItem = res.quantities.find((q) => q.id === "brickwork_ext")!;
  const intItem = res.quantities.find((q) => q.id === "brickwork_int")!;

  assert(extItem.label.includes('9" Wall'), 'External item reflects 9" Wall');
  assert(intItem.label.includes('4.5" Partition'), 'Internal item reflects 4.5" Partition');
  assert(extItem.quantity > intItem.quantity, "External volume correctly accounts for 80 ft run vs internal 20 ft run");
}

// Scenario 12: Input Validation Layer
console.log("\nScenario 12: Input Validation Layer (Rejects invalid values)");
{
  assert(!validateWallThickness(-5, "inches").valid, "Rejects negative wall thickness (-5 inches)");
  assert(!validateWallThickness(0, "inches").valid, "Rejects 0 wall thickness");
  assert(!validateWallThickness(40, "inches").valid, "Rejects excessively large wall thickness (> 36 inches)");
  assert(!validateWallThickness(1.5, "meters").valid, "Rejects excessive metric wall thickness (> 0.914 m)");
  assert(validateWallThickness(9, "inches").valid, "Accepts valid 9 inches");
  assert(validateWallThickness(0.23, "meters").valid, "Accepts valid 0.23 meters");

  assert(!validateWastagePercentage(-1).valid, "Rejects negative wastage percentage");
  assert(!validateWastagePercentage(60).valid, "Rejects unrealistic wastage > 50%");
  assert(validateWastagePercentage(0).valid, "Accepts 0% wastage");
  assert(validateWastagePercentage(5).valid, "Accepts standard 5% wastage");
  assert(validateWastagePercentage(10).valid, "Accepts 10% wastage");
}

console.log("\n===============================================================================");
if (testsFailed === 0) {
  console.log(`ALL TESTS PASSED! (${testsPassed} checks succeeded, 0 failures)`);
} else {
  console.error(`TESTS FAILED: ${testsFailed} failures out of ${testsPassed + testsFailed} checks`);
  process.exit(1);
}
console.log("===============================================================================");
