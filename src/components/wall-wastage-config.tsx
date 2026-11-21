import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Check,
  Layers,
  Percent,
  Sliders,
  Info,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  type WallWastageAppConfig,
  type MeasurementUnitChoice,
  EXTERNAL_WALL_PRESET,
  INTERNAL_WALL_PRESET,
  DEFAULT_WALL_WASTAGE_CONFIG,
  inchesToMeters,
  metersToInches,
  validateWallThickness,
  validateWastagePercentage,
  getStoredWallWastageConfig,
  saveStoredWallWastageConfig,
} from "@/lib/wall-wastage-config";

interface WallAndWastageConfigProps {
  projectId: string;
  externalWallInches: number;
  internalWallInches: number;
  wastagePct: number;
  onChange: (updates: {
    externalWallInches: number;
    internalWallInches: number;
    wastagePct: number;
    config: WallWastageAppConfig;
  }) => void;
  compact?: boolean;
}

export function WallAndWastageConfig({
  projectId,
  externalWallInches = 9,
  internalWallInches = 4.5,
  wastagePct = 5,
  onChange,
  compact = false,
}: WallAndWastageConfigProps) {
  // Mode selection: 'presets' (standard 9" ext & 4.5" int) vs 'custom'
  const isCustomExt = Math.abs(externalWallInches - 9) > 0.05;
  const isCustomInt = Math.abs(internalWallInches - 4.5) > 0.05;
  const initialMode: "standard_ext" | "standard_int" | "custom" =
    isCustomExt || isCustomInt
      ? "custom"
      : "standard_ext";

  const [selectedWallOption, setSelectedWallOption] = useState<"standard_ext" | "standard_int" | "custom">(initialMode);

  // Custom inputs state
  const [customExtVal, setCustomExtVal] = useState<number>(externalWallInches);
  const [customExtUnit, setCustomExtUnit] = useState<MeasurementUnitChoice>("inches");
  const [customIntVal, setCustomIntVal] = useState<number>(internalWallInches);
  const [customIntUnit, setCustomIntUnit] = useState<MeasurementUnitChoice>("inches");

  // Wastage state
  const [currentWastage, setCurrentWastage] = useState<number>(wastagePct);
  const [customWastageInput, setCustomWastageInput] = useState<string>(String(wastagePct));

  // Validation errors
  const [extError, setExtError] = useState<string | null>(null);
  const [intError, setIntError] = useState<string | null>(null);
  const [wastageError, setWastageError] = useState<string | null>(null);

  // Sync with prop changes
  useEffect(() => {
    setCurrentWastage(wastagePct);
    setCustomWastageInput(String(wastagePct));
  }, [wastagePct]);

  const emitConfigUpdate = (
    extIn: number,
    intIn: number,
    wPct: number,
    isCustom: boolean,
  ) => {
    const extMeters = inchesToMeters(extIn);
    const intMeters = inchesToMeters(intIn);

    const fullConfig: WallWastageAppConfig = {
      wall_configuration: {
        external_wall: {
          type: isCustom && Math.abs(extIn - 9) > 0.05 ? "custom" : "standard",
          thickness_inches: +(extIn.toFixed(1)),
          thickness_meters: extMeters,
          ...(isCustom
            ? {
                thickness_value: customExtUnit === "inches" ? extIn : extMeters,
                original_measurement_unit: customExtUnit,
              }
            : {}),
        },
        internal_wall: {
          type: isCustom && Math.abs(intIn - 4.5) > 0.05 ? "custom" : "standard",
          thickness_inches: +(intIn.toFixed(1)),
          thickness_meters: intMeters,
          ...(isCustom
            ? {
                thickness_value: customIntUnit === "inches" ? intIn : intMeters,
                original_measurement_unit: customIntUnit,
              }
            : {}),
        },
      },
      material_configuration: {
        wastage_percentage: wPct,
      },
    };

    saveStoredWallWastageConfig(fullConfig);
    onChange({
      externalWallInches: extIn,
      internalWallInches: intIn,
      wastagePct: wPct,
      config: fullConfig,
    });
  };

  // Handler for Option 1: Standard External Wall Preset
  const handleSelectExternalPreset = () => {
    setSelectedWallOption("standard_ext");
    setExtError(null);
    setIntError(null);
    emitConfigUpdate(9, 4.5, currentWastage, false);
  };

  // Handler for Option 2: Standard Internal Partition Preset
  const handleSelectInternalPreset = () => {
    setSelectedWallOption("standard_int");
    setExtError(null);
    setIntError(null);
    emitConfigUpdate(9, 4.5, currentWastage, false);
  };

  // Handler for Option 3: Custom Thickness
  const handleSelectCustom = () => {
    setSelectedWallOption("custom");
    validateAndApplyCustom(customExtVal, customExtUnit, customIntVal, customIntUnit, currentWastage);
  };

  const handleCustomExtChange = (valStr: string, unit: MeasurementUnitChoice) => {
    const val = parseFloat(valStr);
    const check = validateWallThickness(val, unit);
    if (!check.valid) {
      setExtError(check.error || "Invalid thickness");
      return;
    }
    setExtError(null);
    const inVal = unit === "inches" ? val : metersToInches(val);
    setCustomExtVal(val);
    setCustomExtUnit(unit);
    emitConfigUpdate(inVal, internalWallInches, currentWastage, true);
  };

  const handleCustomIntChange = (valStr: string, unit: MeasurementUnitChoice) => {
    const val = parseFloat(valStr);
    const check = validateWallThickness(val, unit);
    if (!check.valid) {
      setIntError(check.error || "Invalid thickness");
      return;
    }
    setIntError(null);
    const inVal = unit === "inches" ? val : metersToInches(val);
    setCustomIntVal(val);
    setCustomIntUnit(unit);
    emitConfigUpdate(externalWallInches, inVal, currentWastage, true);
  };

  const validateAndApplyCustom = (
    eVal: number,
    eUnit: MeasurementUnitChoice,
    iVal: number,
    iUnit: MeasurementUnitChoice,
    wPct: number,
  ) => {
    const eCheck = validateWallThickness(eVal, eUnit);
    const iCheck = validateWallThickness(iVal, iUnit);

    setExtError(eCheck.valid ? null : eCheck.error || "Invalid external thickness");
    setIntError(iCheck.valid ? null : iCheck.error || "Invalid internal thickness");

    if (eCheck.valid && iCheck.valid) {
      const extIn = eUnit === "inches" ? eVal : metersToInches(eVal);
      const intIn = iUnit === "inches" ? iVal : metersToInches(iVal);
      emitConfigUpdate(extIn, intIn, wPct, true);
    }
  };

  const handleWastagePresetClick = (pct: number) => {
    setCurrentWastage(pct);
    setCustomWastageInput(String(pct));
    setWastageError(null);
    emitConfigUpdate(externalWallInches, internalWallInches, pct, selectedWallOption === "custom");
  };

  const handleCustomWastageChange = (valStr: string) => {
    setCustomWastageInput(valStr);
    const num = parseFloat(valStr);
    const check = validateWastagePercentage(num);
    if (!check.valid) {
      setWastageError(check.error || "Invalid wastage percentage");
      return;
    }
    setWastageError(null);
    setCurrentWastage(num);
    emitConfigUpdate(externalWallInches, internalWallInches, num, selectedWallOption === "custom");
  };

  return (
    <div className="space-y-6">
      {/* ─────────────────────────────────────────────────────────────────────────
       * SECTION 1: WALL THICKNESS CONFIGURATION ("Select Your Wall Type")
       * ───────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[28px] border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#e5e7eb] dark:border-zinc-800 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#00f0a0] text-black font-bold text-xs">
              <Layers size={15} />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-black dark:text-white">
                Select Your Wall Type
              </h3>
              <p className="text-xs text-[#86909c]">
                Conventional Indian residential construction presets & custom thickness for civil takeoff.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-[#f2f4f5] dark:bg-zinc-900 text-black dark:text-[#00f0a0] border border-[#e5e7eb] dark:border-zinc-800">
              Ext: {externalWallInches}&quot; ({inchesToMeters(externalWallInches)}m) | Int: {internalWallInches}&quot; ({inchesToMeters(internalWallInches)}m)
            </span>
          </div>
        </div>

        {/* Preset Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Option 1: External Wall */}
          <div
            onClick={handleSelectExternalPreset}
            className={`cursor-pointer rounded-2xl p-4 transition-all border text-left flex flex-col justify-between ${
              selectedWallOption === "standard_ext"
                ? "border-black dark:border-[#00f0a0] bg-[#ecffe0]/50 dark:bg-zinc-900 ring-2 ring-black/5 dark:ring-[#00f0a0]/20"
                : "border-[#e5e7eb] dark:border-zinc-800 bg-[#f2f4f5]/60 dark:bg-zinc-900/40 hover:border-zinc-400"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-display uppercase tracking-wider text-black dark:text-white">
                  Option 1: External Wall
                </span>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white dark:bg-zinc-800 border border-black/10 text-black dark:text-[#00f0a0]">
                  {selectedWallOption === "standard_ext" ? <Check size={12} strokeWidth={3} /> : null}
                </span>
              </div>
              <div className="text-lg font-black font-display text-black dark:text-white mt-1">
                9 inches <span className="text-xs font-normal text-[#86909c]">/ 0.23 m</span>
              </div>
              <p className="text-xs text-[#86909c] mt-2 font-medium leading-relaxed">
                Conventional external brick wall (load-bearing & weather envelope masonry).
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-black/5 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-[#00f0a0]">
              <ShieldCheck size={13} /> Recommended Indian Standard
            </div>
          </div>

          {/* Option 2: Internal Partition Wall */}
          <div
            onClick={handleSelectInternalPreset}
            className={`cursor-pointer rounded-2xl p-4 transition-all border text-left flex flex-col justify-between ${
              selectedWallOption === "standard_int"
                ? "border-black dark:border-[#00f0a0] bg-[#ecffe0]/50 dark:bg-zinc-900 ring-2 ring-black/5 dark:ring-[#00f0a0]/20"
                : "border-[#e5e7eb] dark:border-zinc-800 bg-[#f2f4f5]/60 dark:bg-zinc-900/40 hover:border-zinc-400"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-display uppercase tracking-wider text-black dark:text-white">
                  Option 2: Internal Partition
                </span>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white dark:bg-zinc-800 border border-black/10 text-black dark:text-[#00f0a0]">
                  {selectedWallOption === "standard_int" ? <Check size={12} strokeWidth={3} /> : null}
                </span>
              </div>
              <div className="text-lg font-black font-display text-black dark:text-white mt-1">
                4.5 inches <span className="text-xs font-normal text-[#86909c]">/ 0.115 m</span>
              </div>
              <p className="text-xs text-[#86909c] mt-2 font-medium leading-relaxed">
                Conventional internal partition wall (space divider brickwork).
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-black/5 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-[#00f0a0]">
              <ShieldCheck size={13} /> Non-structural partition preset
            </div>
          </div>

          {/* Option 3: Custom Thickness */}
          <div
            onClick={handleSelectCustom}
            className={`cursor-pointer rounded-2xl p-4 transition-all border text-left flex flex-col justify-between ${
              selectedWallOption === "custom"
                ? "border-black dark:border-[#00f0a0] bg-[#ecffe0]/50 dark:bg-zinc-900 ring-2 ring-black/5 dark:ring-[#00f0a0]/20"
                : "border-[#e5e7eb] dark:border-zinc-800 bg-[#f2f4f5]/60 dark:bg-zinc-900/40 hover:border-zinc-400"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-display uppercase tracking-wider text-black dark:text-white">
                  Option 3: Custom Thickness
                </span>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white dark:bg-zinc-800 border border-black/10 text-black dark:text-[#00f0a0]">
                  {selectedWallOption === "custom" ? <Check size={12} strokeWidth={3} /> : null}
                </span>
              </div>
              <div className="text-lg font-black font-display text-black dark:text-white mt-1 flex items-center gap-1.5">
                <Sliders size={16} /> User-Defined
              </div>
              <p className="text-xs text-[#86909c] mt-2 font-medium leading-relaxed">
                For civil engineers & users with specific architectural or heavy masonry specifications.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-black/5 dark:border-zinc-800 flex items-center gap-1.5 text-[11px] font-semibold text-black dark:text-white">
              Manual entry (Inches or Meters)
            </div>
          </div>
        </div>

        {/* Expandable Custom Thickness Controls (Only when Option 3 is selected) */}
        {selectedWallOption === "custom" && (
          <div className="mt-5 p-5 rounded-2xl bg-[#f2f4f5] dark:bg-zinc-900 border border-[#e5e7eb] dark:border-zinc-800 animate-in fade-in duration-200 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-black dark:text-white">
              <Sliders size={14} className="text-[#00f0a0]" /> Custom Thickness Input (Inches & Meters Supported)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* External Custom Wall */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black dark:text-white block">
                  External Envelope Wall Thickness
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="36"
                    value={customExtVal}
                    onChange={(e) => handleCustomExtChange(e.target.value, customExtUnit)}
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-xs font-mono font-bold text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0]"
                  />
                  <select
                    value={customExtUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value as MeasurementUnitChoice;
                      setCustomExtUnit(newUnit);
                      const converted = newUnit === "meters" ? inchesToMeters(customExtVal) : metersToInches(customExtVal);
                      setCustomExtVal(converted);
                      handleCustomExtChange(String(converted), newUnit);
                    }}
                    className="rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-black dark:text-white outline-none cursor-pointer"
                  >
                    <option value="inches">Inches (in)</option>
                    <option value="meters">Meters (m)</option>
                  </select>
                </div>
                {extError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} /> {extError}
                  </p>
                )}
                <p className="text-[11px] text-[#86909c]">
                  Active value: {externalWallInches}&quot; = {inchesToMeters(externalWallInches)} m
                </p>
              </div>

              {/* Internal Custom Wall */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-black dark:text-white block">
                  Internal Partition Wall Thickness
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="36"
                    value={customIntVal}
                    onChange={(e) => handleCustomIntChange(e.target.value, customIntUnit)}
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-xs font-mono font-bold text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0]"
                  />
                  <select
                    value={customIntUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value as MeasurementUnitChoice;
                      setCustomIntUnit(newUnit);
                      const converted = newUnit === "meters" ? inchesToMeters(customIntVal) : metersToInches(customIntVal);
                      setCustomIntVal(converted);
                      handleCustomIntChange(String(converted), newUnit);
                    }}
                    className="rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-semibold text-black dark:text-white outline-none cursor-pointer"
                  >
                    <option value="inches">Inches (in)</option>
                    <option value="meters">Meters (m)</option>
                  </select>
                </div>
                {intError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle size={12} /> {intError}
                  </p>
                )}
                <p className="text-[11px] text-[#86909c]">
                  Active value: {internalWallInches}&quot; = {inchesToMeters(internalWallInches)} m
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
       * SECTION 2: MATERIAL WASTAGE CONFIGURATION ("Material Wastage")
       * ───────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[28px] border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#e5e7eb] dark:border-zinc-800 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#00f0a0] text-black font-bold text-xs">
              <Percent size={15} />
            </div>
            <div>
              <h3 className="text-base font-bold font-display text-black dark:text-white">
                Material Wastage
              </h3>
              <p className="text-xs text-[#86909c]">
                Construction materials inevitably involve cutting, handling, transportation and installation wastage.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-black text-[#00f0a0]">
              Active Wastage: {currentWastage}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* Quick Presets & Custom Input */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-black dark:text-white block">
              Configured Wastage Allowance
            </label>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { val: 3, label: "3% (Precise)" },
                { val: 5, label: "5% (Standard Default)" },
                { val: 10, label: "10% (High Tolerance)" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => handleWastagePresetClick(p.val)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    currentWastage === p.val
                      ? "bg-black text-white dark:bg-[#00f0a0] dark:text-black shadow-sm"
                      : "bg-[#f2f4f5] dark:bg-zinc-900 text-[#86909c] hover:text-black dark:hover:text-white border border-[#e5e7eb] dark:border-zinc-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs font-medium text-[#86909c]">Custom %:</span>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={customWastageInput}
                onChange={(e) => handleCustomWastageChange(e.target.value)}
                className="w-24 rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-3 py-1.5 text-xs font-mono font-bold text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0]"
              />
              <span className="text-xs font-bold text-black dark:text-white">%</span>
            </div>

            {wastageError && (
              <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle size={12} /> {wastageError}
              </p>
            )}
          </div>

          {/* Real-Time Wastage Calculation Box */}
          <div className="rounded-2xl bg-[#ecffe0]/50 dark:bg-zinc-900/70 p-4 border border-[#00f0a0]/30 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold font-display text-black dark:text-[#00f0a0]">
              <Sparkles size={14} /> Wastage Calculation Formula
            </div>
            <p className="font-mono text-xs text-black dark:text-white bg-white/70 dark:bg-zinc-950 p-2.5 rounded-xl border border-black/5 dark:border-zinc-800">
              Final Quantity = Base Requirement × (1 + {currentWastage} / 100)
            </p>
            <div className="text-[11px] text-[#86909c] space-y-1">
              <p>
                <strong>Practical Example:</strong> Base requirement of 1,000 bricks with {currentWastage}% wastage ={" "}
                <span className="font-bold text-black dark:text-white">
                  {Math.round(1000 * (1 + currentWastage / 100)).toLocaleString("en-IN")} bricks
                </span>{" "}
                to order.
              </p>
              <p className="text-[10px] italic">
                * Wastage is applied strictly to material procurement quantities (bricks, cement, sand, steel, tiles). Room dimensions and carpet areas remain untouched.
              </p>
            </div>
          </div>
        </div>

        {/* Civil Disclaimer Note */}
        <div className="mt-5 pt-3 border-t border-[#e5e7eb] dark:border-zinc-800 flex items-start gap-2 text-[11px] text-[#86909c]">
          <Info size={14} className="shrink-0 text-blue-500 mt-0.5" />
          <span>
            Estimation presets adhere to Indian Standard (IS 1200 / IS 2212) conventions. Actual wall thickness specifications and site contingency allowances should be verified by a licensed structural engineer.
          </span>
        </div>
      </div>
    </div>
  );
}
