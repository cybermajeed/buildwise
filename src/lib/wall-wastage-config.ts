/**
 * Wall Thickness Configuration & Material Wastage Settings
 * Adheres strictly to IS 1200 / conventional Indian residential construction standards.
 */

export type WallPresetType = "standard" | "custom";
export type MeasurementUnitChoice = "inches" | "meters";

export interface WallThicknessSetting {
  type: WallPresetType;
  thickness_inches: number;
  thickness_meters: number;
  thickness_value?: number;
  original_measurement_unit?: MeasurementUnitChoice;
}

export interface WallConfiguration {
  external_wall: WallThicknessSetting;
  internal_wall: WallThicknessSetting;
}

export interface MaterialConfiguration {
  wastage_percentage: number;
}

export interface WallWastageAppConfig {
  wall_configuration: WallConfiguration;
  material_configuration: MaterialConfiguration;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conventional Indian Residential Presets
// ─────────────────────────────────────────────────────────────────────────────

export const EXTERNAL_WALL_PRESET: WallThicknessSetting = {
  type: "standard",
  thickness_inches: 9,
  thickness_meters: 0.23,
};

export const INTERNAL_WALL_PRESET: WallThicknessSetting = {
  type: "standard",
  thickness_inches: 4.5,
  thickness_meters: 0.115,
};

export const DEFAULT_WALL_CONFIG: WallConfiguration = {
  external_wall: { ...EXTERNAL_WALL_PRESET },
  internal_wall: { ...INTERNAL_WALL_PRESET },
};

export const DEFAULT_MATERIAL_CONFIG: MaterialConfiguration = {
  wastage_percentage: 5,
};

export const DEFAULT_WALL_WASTAGE_CONFIG: WallWastageAppConfig = {
  wall_configuration: DEFAULT_WALL_CONFIG,
  material_configuration: DEFAULT_MATERIAL_CONFIG,
};

// ─────────────────────────────────────────────────────────────────────────────
// Unit Conversion and Validation Helpers
// ─────────────────────────────────────────────────────────────────────────────

const METERS_TO_INCHES = 39.3701;
const INCHES_TO_METERS = 0.0254;

export function inchesToMeters(inches: number): number {
  return +(inches * INCHES_TO_METERS).toFixed(3);
}

export function metersToInches(meters: number): number {
  return +(meters * METERS_TO_INCHES).toFixed(1);
}

export function validateWallThickness(
  val: number,
  unit: MeasurementUnitChoice,
): { valid: boolean; error?: string } {
  if (isNaN(val) || val <= 0) {
    return { valid: false, error: "Thickness must be a positive number greater than 0." };
  }
  if (unit === "inches") {
    if (val < 1 || val > 36) {
      return { valid: false, error: "Wall thickness in inches must be between 1\" and 36\"." };
    }
  } else {
    if (val < 0.025 || val > 0.914) {
      return { valid: false, error: "Wall thickness in meters must be between 0.025 m and 0.914 m." };
    }
  }
  return { valid: true };
}

export function validateWastagePercentage(val: number): { valid: boolean; error?: string } {
  if (isNaN(val) || val < 0) {
    return { valid: false, error: "Wastage percentage cannot be negative." };
  }
  if (val > 50) {
    return { valid: false, error: "Wastage percentage cannot exceed 50% for realistic construction." };
  }
  return { valid: true };
}

/**
 * Creates a custom wall thickness setting with unit conversion and validation.
 */
export function createCustomWallSetting(
  value: number,
  unit: MeasurementUnitChoice,
): WallThicknessSetting {
  const inches = unit === "inches" ? valClamp(value, 1, 36) : metersToInches(value);
  const meters = unit === "meters" ? valClamp(value, 0.025, 0.914) : inchesToMeters(value);

  return {
    type: "custom",
    thickness_inches: +(inches).toFixed(1),
    thickness_meters: +(meters).toFixed(3),
    thickness_value: value,
    original_measurement_unit: unit,
  };
}

function valClamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Applies material wastage percentage to a base quantity.
 * Formula: Final material quantity = Base material quantity * (1 + Wastage percentage / 100)
 */
export function applyMaterialWastage(
  baseQuantity: number,
  wastagePct: number,
  roundMode: "ceil" | "round" | "decimals" = "decimals",
): number {
  if (baseQuantity <= 0) return 0;
  const safeWastage = Math.max(0, Math.min(50, isNaN(wastagePct) ? 5 : wastagePct));
  const raw = baseQuantity * (1 + safeWastage / 100);

  if (roundMode === "ceil") {
    return Math.ceil(raw);
  }
  if (roundMode === "round") {
    return Math.round(raw);
  }
  return +(raw.toFixed(1));
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistent Browser Storage
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG_STORAGE_KEY = "buildwise.wall_wastage_config";

export function getStoredWallWastageConfig(): WallWastageAppConfig {
  if (typeof window === "undefined") return DEFAULT_WALL_WASTAGE_CONFIG;
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return sanitizeWallWastageConfig(parsed);
    }
  } catch (e) {
    console.warn("Failed to read wall & wastage config from storage:", e);
  }
  return DEFAULT_WALL_WASTAGE_CONFIG;
}

export function saveStoredWallWastageConfig(cfg: WallWastageAppConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.warn("Failed to persist wall & wastage config:", e);
  }
}

export function sanitizeWallWastageConfig(raw: any): WallWastageAppConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_WALL_WASTAGE_CONFIG;

  const wastage =
    typeof raw.material_configuration?.wastage_percentage === "number" &&
    raw.material_configuration.wastage_percentage >= 0 &&
    raw.material_configuration.wastage_percentage <= 50
      ? raw.material_configuration.wastage_percentage
      : 5;

  const ext = raw.wall_configuration?.external_wall;
  const extSetting: WallThicknessSetting =
    ext && typeof ext.thickness_inches === "number" && ext.thickness_inches > 0
      ? {
          type: ext.type === "custom" ? "custom" : "standard",
          thickness_inches: ext.thickness_inches,
          thickness_meters: ext.thickness_meters || inchesToMeters(ext.thickness_inches),
          thickness_value: ext.thickness_value,
          original_measurement_unit: ext.original_measurement_unit,
        }
      : { ...EXTERNAL_WALL_PRESET };

  const intW = raw.wall_configuration?.internal_wall;
  const intSetting: WallThicknessSetting =
    intW && typeof intW.thickness_inches === "number" && intW.thickness_inches > 0
      ? {
          type: intW.type === "custom" ? "custom" : "standard",
          thickness_inches: intW.thickness_inches,
          thickness_meters: intW.thickness_meters || inchesToMeters(intW.thickness_inches),
          thickness_value: intW.thickness_value,
          original_measurement_unit: intW.original_measurement_unit,
        }
      : { ...INTERNAL_WALL_PRESET };

  return {
    wall_configuration: {
      external_wall: extSetting,
      internal_wall: intSetting,
    },
    material_configuration: {
      wastage_percentage: wastage,
    },
  };
}
