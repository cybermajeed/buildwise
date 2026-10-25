import { useSyncExternalStore } from "react";
import { read as readAppStore } from "./project-store";

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type Room = {
  id: string;
  name: string;
  lengthFt: number;
  widthFt: number;
  areaSqFt: number;
  rawDimensionText?: string | undefined;
  roomType?: string | undefined;
};

export type Wall = {
  id: string;
  description: string;
  lengthFt: number;
  heightFt: number;
  areaSqFt: number;
  wallType?: "external" | "internal";
};

export type Opening = {
  id: string;
  type: "Door" | "Window";
  widthFt: number;
  heightFt: number;
  count: number;
};

export type KeyParameters = {
  wallThicknessIn: number;
  floorHeightFt: number;
  plinthHeightFt: number;
  numberOfFloors: number;
  foundationDepthFt: number;
};

export type QuantityItem = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  icon: string;
  description?: string;
  secondaryBreakdown?: string;
};

export type MaterialConstituent = {
  label: string;
  quantity: number;
  unit: string;
  basis: string;
};

export type BOQItem = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  rate: number;
  category?: string;
};

export type PlanFile = {
  name: string;
  sizeBytes: number;
  previewDataUrl?: string;
  uploadedAt: string;
};

export type WizardStep = 0 | 1 | 2 | 3 | 4;

export type PlanAnalysisState = {
  projectId: string;
  step: WizardStep;
  file: PlanFile | null;
  projectName: string;
  floorHeightFt: number;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
  keyParams: KeyParameters;
  quantities: QuantityItem[];
  boqItems: BOQItem[];
  constituents: MaterialConstituent[];
  elementsTab: "rooms" | "walls" | "openings";
  takeoffTab: "summary" | "detailed" | "boq";
};

// ─── Default Architectural Extraction Baseline ───────────────────────────────
// Clean empty baseline: All fields remain blank until a plan image is uploaded or manually input
export const DEFAULT_ROOMS: Room[] = [];
export const DEFAULT_WALLS: Wall[] = [];
export const DEFAULT_OPENINGS: Opening[] = [];

export const DEFAULT_KEY_PARAMS: KeyParameters = {
  wallThicknessIn: 9,
  floorHeightFt: 10,
  plinthHeightFt: 2.5,
  numberOfFloors: 1,
  foundationDepthFt: 4.0,
};

// ─── Quantity Surveying (QS) Derivation Logic ────────────────────────────────
// Real physical calculations adhering to IS 1200 / Standard Method of Measurement (SMM).

export function deriveQuantities(
  rooms: Room[],
  walls: Wall[],
  openings: Opening[],
  params: KeyParameters,
): { quantities: QuantityItem[]; constituents: MaterialConstituent[] } {
  // If no plan uploaded and no rooms/walls defined, return completely blank quantities
  if (rooms.length === 0 && walls.length === 0) {
    return { quantities: [], constituents: [] };
  }

  // Conversion factors
  const SQFT_TO_SQM = 0.092903;
  const CFT_TO_CUM = 0.0283168;

  // 1. Carpet & Built-up Floor Area
  const totalCarpetAreaSqFt = rooms.reduce((s, r) => s + r.areaSqFt, 0) * params.numberOfFloors;
  const totalFloorAreaSqm = +(totalCarpetAreaSqFt * SQFT_TO_SQM).toFixed(1);

  // 2. Wall Length & Areas
  const extWalls = walls.filter(
    (w) => w.wallType === "external" || w.description.toLowerCase().includes("external"),
  );
  const intWalls = walls.filter(
    (w) => w.wallType === "internal" || !w.description.toLowerCase().includes("external"),
  );

  const totalWallLengthFt = walls.reduce((s, w) => s + w.lengthFt, 0);
  const extWallLengthFt = extWalls.reduce((s, w) => s + w.lengthFt, 0);
  const intWallLengthFt = intWalls.reduce((s, w) => s + w.lengthFt, 0);

  const grossWallAreaSqFt = walls.reduce((s, w) => s + w.areaSqFt, 0) * params.numberOfFloors;

  // Openings deductions
  const doorCount = openings.filter((o) => o.type === "Door").reduce((s, o) => s + o.count, 0);
  const windowCount = openings.filter((o) => o.type === "Window").reduce((s, o) => s + o.count, 0);
  const totalOpeningsAreaSqFt = openings.reduce((s, o) => s + o.widthFt * o.heightFt * o.count, 0);

  // Deduct openings proportionally between external and internal walls (approx 70% external, 30% internal)
  const extOpeningsAreaSqFt = totalOpeningsAreaSqFt * 0.65;
  const intOpeningsAreaSqFt = totalOpeningsAreaSqFt * 0.35;

  const grossExtWallAreaSqFt = extWalls.reduce((s, w) => s + w.areaSqFt, 0) * params.numberOfFloors;
  const grossIntWallAreaSqFt = intWalls.reduce((s, w) => s + w.areaSqFt, 0) * params.numberOfFloors;

  const netExtWallAreaSqFt = Math.max(0, grossExtWallAreaSqFt - extOpeningsAreaSqFt);
  const netIntWallAreaSqFt = Math.max(0, grossIntWallAreaSqFt - intOpeningsAreaSqFt);
  const netTotalWallAreaSqFt = netExtWallAreaSqFt + netIntWallAreaSqFt;

  // 3. Earthwork Excavation
  // Foundation trenches under load-bearing walls: Trench Width = 2.5 ft, Depth = params.foundationDepthFt (default 4 ft).
  // Plus plinth filling and site leveling.
  const foundationTrenchCft = totalWallLengthFt * 2.5 * params.foundationDepthFt;
  const siteLevelingCft = totalCarpetAreaSqFt * 0.5; // 6-inch surface leveling
  const totalExcavationCum = +((foundationTrenchCft + siteLevelingCft) * CFT_TO_CUM).toFixed(1);

  // 4. Plain Cement Concrete (Bed PCC 1:4:8 under foundations)
  // 6-inch thick lean concrete bed along foundation trenches (Width = 2.5 ft)
  const pccBedCft = totalWallLengthFt * 2.5 * 0.5;
  const pccCum = +(pccBedCft * CFT_TO_CUM).toFixed(1);

  // 5. Reinforced Cement Concrete (RCC M20/M25: 1:1.5:3)
  // a) Footings & Pedestals: avg width 1.5 ft, avg depth 1.0 ft along wall lines
  const footingRccCft = totalWallLengthFt * 1.5 * 1.0;
  // b) Plinth Beams: cross section = (wallThicknessIn/12) x 1.0 ft height along walls
  const wallThicknessFt = params.wallThicknessIn / 12;
  const plinthBeamRccCft = totalWallLengthFt * wallThicknessFt * 1.0;
  // c) Roof Slab: 5-inch (0.417 ft) thick slab over total floor area
  const slabRccCft = totalCarpetAreaSqFt * (5 / 12);
  // d) Columns, Lintels & Chajjas: approx 15% of slab & beam volume
  const columnsLintelsRccCft = (plinthBeamRccCft + slabRccCft) * 0.15;

  const totalRccCft = footingRccCft + plinthBeamRccCft + slabRccCft + columnsLintelsRccCft;
  const totalRccCum = +(totalRccCft * CFT_TO_CUM).toFixed(1);

  // 6. Brickwork / Masonry (Volume in m³)
  // External walls: 9" thick (0.75 ft)
  const extBrickCft = netExtWallAreaSqFt * wallThicknessFt;
  const extBrickCum = +(extBrickCft * CFT_TO_CUM).toFixed(1);

  // Internal walls: 4.5" thick partition (0.375 ft)
  const intBrickCft = netIntWallAreaSqFt * 0.375;
  const intBrickCum = +(intBrickCft * CFT_TO_CUM).toFixed(1);

  const totalBrickCum = +(extBrickCum + intBrickCum).toFixed(1);
  // Standard Indian modular bricks: ~500 bricks per m³ of brickwork (IS 2212)
  const totalBricksCount = Math.round(totalBrickCum * 500);

  // 7. Plastering (Cement Mortar in m²)
  // External Plaster (15-20mm waterproof mortar): Outer face of external walls
  const extPlasterSqFt = netExtWallAreaSqFt;
  // Internal Plaster (12mm mortar): Both faces of internal walls + inner face of external walls + Ceilings
  const intPlasterSqFt = netIntWallAreaSqFt * 2 + netExtWallAreaSqFt + totalCarpetAreaSqFt;
  const totalPlasterSqFt = extPlasterSqFt + intPlasterSqFt;
  const totalPlasterSqm = +(totalPlasterSqFt * SQFT_TO_SQM).toFixed(1);

  // 8. Flooring (Tiles / Vitrified in m²)
  // Floor area plus 5% skirting deduction/addition
  const flooringSqm = +(totalCarpetAreaSqFt * 1.05 * SQFT_TO_SQM).toFixed(1);

  // 9. Painting (Primer + Putty + 2 Coats in m²)
  // Internal walls + Ceilings + External walls
  const totalPaintingSqm = +(totalPlasterSqFt * SQFT_TO_SQM).toFixed(1);

  // 10. Reinforcement Steel (TMT Fe500 in kg)
  // Standard structural QS design norm: ~95 kg steel per m³ of RCC concrete for residential structures
  const steelKg = Math.round(totalRccCum * 95);
  const steelMT = +(steelKg / 1000).toFixed(2);

  // 11. Constituent Material Breakdown (Cement, Sand, Aggregate)
  // Concrete: 8.2 bags cement/m³, 0.45 m³ sand/m³, 0.85 m³ coarse aggregate/m³
  // Brickwork: 1.4 bags cement/m³, 0.25 m³ sand/m³
  // Plastering: 0.16 bags cement/m², 0.02 m³ sand/m²
  const cementBagsConcrete = (totalRccCum + pccCum) * 8.0;
  const cementBagsBrickwork = totalBrickCum * 1.4;
  const cementBagsPlaster = totalPlasterSqm * 0.16;
  const totalCementBags = Math.round(cementBagsConcrete + cementBagsBrickwork + cementBagsPlaster);

  const sandCumConcrete = (totalRccCum + pccCum) * 0.45;
  const sandCumBrickwork = totalBrickCum * 0.25;
  const sandCumPlaster = totalPlasterSqm * 0.02;
  const totalSandCum = +(sandCumConcrete + sandCumBrickwork + sandCumPlaster).toFixed(1);
  const totalSandCft = Math.round(totalSandCum / CFT_TO_CUM);

  const aggregateCum = +((totalRccCum + pccCum) * 0.85).toFixed(1);
  const aggregateCft = Math.round(aggregateCum / CFT_TO_CUM);

  const quantities: QuantityItem[] = [
    {
      id: "excavation",
      label: "Foundation Earthwork Excavation",
      quantity: totalExcavationCum,
      unit: "m³",
      icon: "⛏",
      description: `Foundation trenches (width 2.5 ft, depth ${params.foundationDepthFt} ft) & surface leveling`,
      secondaryBreakdown: `${Math.round(totalExcavationCum / CFT_TO_CUM)} cft`,
    },
    {
      id: "pcc_bed",
      label: "Bed Concrete (PCC 1:4:8)",
      quantity: pccCum,
      unit: "m³",
      icon: "🧱",
      description: '6" lean bed concrete under footings and trenches',
      secondaryBreakdown: `${Math.round(pccCum * 35.315)} cft`,
    },
    {
      id: "concrete",
      label: "Structural RCC (M20 / M25)",
      quantity: totalRccCum,
      unit: "m³",
      icon: "🏗",
      description: "Footings, plinth beams, columns, lintels & 5-inch roof slab",
      secondaryBreakdown: `${Math.round(totalRccCum * 35.315)} cft`,
    },
    {
      id: "brickwork_ext",
      label: 'External Brick Masonry (9" Wall)',
      quantity: extBrickCum,
      unit: "m³",
      icon: "🧱",
      description: `${Math.round(extBrickCum * 500).toLocaleString("en-IN")} standard bricks`,
      secondaryBreakdown: `${Math.round(extBrickCum * 35.315)} cft`,
    },
    {
      id: "brickwork_int",
      label: 'Internal Brick Masonry (4.5" Partition)',
      quantity: intBrickCum,
      unit: "m³",
      icon: "🧱",
      description: `${Math.round(intBrickCum * 500).toLocaleString("en-IN")} standard bricks`,
      secondaryBreakdown: `${Math.round(intBrickCum * 35.315)} cft`,
    },
    {
      id: "plastering",
      label: "Cement Plastering (12mm/15mm)",
      quantity: totalPlasterSqm,
      unit: "m²",
      icon: "🪣",
      description: "Internal wall & ceiling plaster + external waterproof plaster",
      secondaryBreakdown: `${Math.round(totalPlasterSqm * 10.764)} sq ft`,
    },
    {
      id: "flooring",
      label: "Flooring & Skirting (Vitrified / Tiles)",
      quantity: flooringSqm,
      unit: "m²",
      icon: "⬜",
      description: "Carpet area coverage with 5% peripheral skirting allowance",
      secondaryBreakdown: `${Math.round(flooringSqm * 10.764)} sq ft`,
    },
    {
      id: "painting",
      label: "Surface Painting & Primer",
      quantity: totalPaintingSqm,
      unit: "m²",
      icon: "🖌",
      description: "Primer + 2 coats interior emulsion & exterior weathercoat",
      secondaryBreakdown: `${Math.round(totalPaintingSqm * 10.764)} sq ft`,
    },
    {
      id: "steel",
      label: "Reinforcement Steel (TMT Fe500)",
      quantity: steelKg,
      unit: "kg",
      icon: "⚙",
      description: `${steelMT} Metric Tonnes (calculated @ 95 kg/m³ of RCC)`,
      secondaryBreakdown: `${steelMT} MT`,
    },
    {
      id: "doors",
      label: "Doors (Framed & Shutter)",
      quantity: doorCount,
      unit: "nos",
      icon: "🚪",
      description: `${doorCount} doors extracted from plan specifications`,
    },
    {
      id: "windows",
      label: "Windows & Ventilators",
      quantity: windowCount,
      unit: "nos",
      icon: "🪟",
      description: `${windowCount} windows & ventilators extracted from plan`,
    },
  ];

  const constituents: MaterialConstituent[] = [
    {
      label: "Portland Pozzolana Cement (PPC)",
      quantity: totalCementBags,
      unit: "Bags (50 kg)",
      basis: "Derived from RCC, PCC, brick mortar & plastering mix designs",
    },
    {
      label: "River Sand / M-Sand",
      quantity: totalSandCft,
      unit: "cft",
      basis: `${totalSandCum} m³ for concrete, masonry jointing and plaster coats`,
    },
    {
      label: "Coarse Aggregate (20mm / 10mm)",
      quantity: aggregateCft,
      unit: "cft",
      basis: `${aggregateCum} m³ for RCC foundation, beams, columns & roof slab`,
    },
    {
      label: "Total Modular Clay Bricks",
      quantity: totalBricksCount,
      unit: "pieces",
      basis: `Estimated at 500 standard modular bricks per m³ of finished masonry`,
    },
    {
      label: "TMT Steel Bars (Fe500D)",
      quantity: steelKg,
      unit: "kg",
      basis: `Standard structural design consumption @ 95 kg per m³ structural concrete`,
    },
  ];

  return { quantities, constituents };
}

// ─── Standard Market Rates (INR Defaults) ────────────────────────────────────

export const DEFAULT_RATES: Record<string, number> = {
  excavation: 280, // ₹ per m³ (Earthwork excavation & disposal)
  pcc_bed: 4800, // ₹ per m³ (1:4:8 Lean bed concrete)
  concrete: 7200, // ₹ per m³ (M20/M25 RCC with formwork & shuttering)
  brickwork_ext: 5600, // ₹ per m³ (9" external brickwork in 1:6 mortar)
  brickwork_int: 5400, // ₹ per m³ (4.5" partition brickwork)
  plastering: 260, // ₹ per m² (12-15mm smooth cement plaster)
  flooring: 750, // ₹ per m² (Vitrified tiles with bed & pointing)
  painting: 140, // ₹ per m² (1 coat primer + 2 coats emulsion)
  steel: 75, // ₹ per kg (Fe500D rebar cutting, bending, binding & placement)
  doors: 7500, // ₹ per unit (Flush door with hardwood/granite frame & fittings)
  windows: 4800, // ₹ per unit (3-track UPVC/aluminum sliding with glass)
};

export function deriveBOQItems(quantities: QuantityItem[]): BOQItem[] {
  return quantities.map((q) => ({
    id: q.id,
    label: q.label,
    quantity: q.quantity,
    unit: q.unit,
    rate: DEFAULT_RATES[q.id] ?? 500,
    category:
      q.id.includes("excavation") || q.id.includes("concrete") || q.id.includes("pcc")
        ? "Civil Structure"
        : q.id.includes("brick")
          ? "Masonry"
          : q.id.includes("doors") || q.id.includes("windows")
            ? "Openings"
            : "Finishing",
  }));
}

// ─── Project-Scoped LocalStorage Management ──────────────────────────────────

function getStorageKey(projectId: string): string {
  return `buildwise.plananalysis.${projectId}`;
}

export function createEmptyPlanState(projectId: string, name?: string): PlanAnalysisState {
  return {
    projectId,
    step: 0,
    file: null,
    projectName: name || "Residential Plan Analysis",
    floorHeightFt: 10,
    rooms: [],
    walls: [],
    openings: [],
    keyParams: DEFAULT_KEY_PARAMS,
    quantities: [],
    boqItems: [],
    constituents: [],
    elementsTab: "rooms",
    takeoffTab: "summary",
  };
}

// Memory cache by projectId with raw string tracking for referential stability
const cacheByProject = new Map<string, PlanAnalysisState>();
const cacheRawByProject = new Map<string, string | null>();
const listeners = new Set<() => void>();

export function getResolvedProjectId(explicitProjectId?: string): string {
  if (explicitProjectId) return explicitProjectId;
  if (typeof window === "undefined") return "default";
  const appState = readAppStore();
  if (appState.activeProjectId) return appState.activeProjectId;
  if (appState.projects.length > 0 && appState.projects[0]) return appState.projects[0].id;
  return "default";
}

export function readPlanState(projectId?: string): PlanAnalysisState {
  const resolvedId = getResolvedProjectId(projectId);
  if (typeof window === "undefined") return createEmptyPlanState(resolvedId);

  const key = getStorageKey(resolvedId);
  const raw = window.localStorage.getItem(key);
  const cachedRaw = cacheRawByProject.get(resolvedId);
  const cachedState = cacheByProject.get(resolvedId);

  // Return strictly stable referential snapshot if localStorage content has not changed
  if (cachedState && raw === cachedRaw) {
    return cachedState;
  }

  if (!raw) {
    if (cachedState) return cachedState;
    const fresh = createEmptyPlanState(resolvedId);
    cacheByProject.set(resolvedId, fresh);
    cacheRawByProject.set(resolvedId, null);
    return fresh;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlanAnalysisState>;
    // If no plan file has been uploaded, purge any stale mock data so all fields remain blank
    const hasMockRooms = parsed.rooms?.some(
      (r) => r.name === "Living Room" && r.lengthFt === 14 && r.widthFt === 16,
    );
    const rooms = !parsed.file && hasMockRooms ? [] : parsed.rooms || [];
    const walls = !parsed.file && hasMockRooms ? [] : parsed.walls || [];
    const openings = !parsed.file && hasMockRooms ? [] : parsed.openings || [];
    const keyParams = parsed.keyParams || DEFAULT_KEY_PARAMS;
    const { quantities, constituents } = deriveQuantities(rooms, walls, openings, keyParams);

    const fullState: PlanAnalysisState = {
      ...createEmptyPlanState(resolvedId),
      ...parsed,
      projectId: resolvedId,
      rooms,
      walls,
      openings,
      quantities,
      boqItems: deriveBOQItems(quantities),
      constituents,
      // If cached file had previewDataUrl in memory, preserve it
      file:
        cachedState?.file?.previewDataUrl && parsed.file
          ? { ...parsed.file, previewDataUrl: cachedState.file.previewDataUrl }
          : parsed.file || null,
    };
    cacheByProject.set(resolvedId, fullState);
    cacheRawByProject.set(resolvedId, raw);
    return fullState;
  } catch {
    const fallback = cachedState || createEmptyPlanState(resolvedId);
    cacheByProject.set(resolvedId, fallback);
    cacheRawByProject.set(resolvedId, raw);
    return fallback;
  }
}

export function writePlanState(projectId: string, next: PlanAnalysisState) {
  let serialized: string | null = null;
  if (typeof window !== "undefined") {
    try {
      // Strip heavy previewDataUrl before saving to localStorage to stay within browser quota
      const { file } = next;
      const fileForStorage: PlanFile | null = file
        ? { name: file.name, sizeBytes: file.sizeBytes, uploadedAt: file.uploadedAt }
        : null;

      const toStore: PlanAnalysisState = {
        ...next,
        projectId,
        file: fileForStorage,
      };
      serialized = JSON.stringify(toStore);
      window.localStorage.setItem(getStorageKey(projectId), serialized);
    } catch (e) {
      console.warn("Storage quota warning or write failure:", e);
    }
  }

  // Retain memory state (with dataUrl) and update caches
  cacheByProject.set(projectId, next);
  cacheRawByProject.set(projectId, serialized);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", listener);
  };
}

export function usePlanAnalysisStore(explicitProjectId?: string): PlanAnalysisState {
  const resolvedId = getResolvedProjectId(explicitProjectId);
  return useSyncExternalStore(
    subscribe,
    () => readPlanState(resolvedId),
    () => createEmptyPlanState(resolvedId),
  );
}

// ─── Actions (Project-Scoped) ────────────────────────────────────────────────

export function paSetStep(step: WizardStep, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  writePlanState(id, { ...current, step });
}

export function paSetFile(file: PlanFile, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  writePlanState(id, { ...current, file });
}

export function paSetProjectName(name: string, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  writePlanState(id, { ...current, projectName: name });
}

export function paSetFloorHeight(ft: number, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const keyParams = { ...current.keyParams, floorHeightFt: ft };
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    current.walls,
    current.openings,
    keyParams,
  );
  writePlanState(id, {
    ...current,
    floorHeightFt: ft,
    keyParams,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paUpdateRoom(
  roomId: string,
  changes: Partial<Omit<Room, "id">>,
  projectId?: string,
) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const rooms = current.rooms.map((r) => {
    if (r.id !== roomId) return r;
    const updated = { ...r, ...changes };
    updated.areaSqFt = +(updated.lengthFt * updated.widthFt).toFixed(1);
    return updated;
  });
  const { quantities, constituents } = deriveQuantities(
    rooms,
    current.walls,
    current.openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    rooms,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paAddRoom(projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const newId = `r_${Date.now()}`;
  const rooms: Room[] = [
    ...current.rooms,
    { id: newId, name: "Additional Room", lengthFt: 10, widthFt: 10, areaSqFt: 100 },
  ];
  const { quantities, constituents } = deriveQuantities(
    rooms,
    current.walls,
    current.openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    rooms,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paRemoveRoom(roomId: string, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const rooms = current.rooms.filter((r) => r.id !== roomId);
  const { quantities, constituents } = deriveQuantities(
    rooms,
    current.walls,
    current.openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    rooms,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paUpdateWall(
  wallId: string,
  changes: Partial<Omit<Wall, "id">>,
  projectId?: string,
) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const walls = current.walls.map((w) => {
    if (w.id !== wallId) return w;
    const updated = { ...w, ...changes };
    updated.areaSqFt = +(updated.lengthFt * updated.heightFt).toFixed(1);
    return updated;
  });
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    walls,
    current.openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    walls,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paAddWall(projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const newId = `w_${Date.now()}`;
  const walls: Wall[] = [
    ...current.walls,
    {
      id: newId,
      description: "Additional Partition Wall",
      lengthFt: 12,
      heightFt: current.keyParams.floorHeightFt || 10,
      areaSqFt: 120,
      wallType: "internal",
    },
  ];
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    walls,
    current.openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    walls,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paRemoveWall(wallId: string, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const walls = current.walls.filter((w) => w.id !== wallId);
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    walls,
    current.openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    walls,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paUpdateOpening(
  openingId: string,
  changes: Partial<Omit<Opening, "id">>,
  projectId?: string,
) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const openings = current.openings.map((o) => (o.id !== openingId ? o : { ...o, ...changes }));
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    current.walls,
    openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    openings,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paAddOpening(projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const newId = `o_${Date.now()}`;
  const openings: Opening[] = [
    ...current.openings,
    { id: newId, type: "Window", widthFt: 4, heightFt: 4, count: 1 },
  ];
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    current.walls,
    openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    openings,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paRemoveOpening(openingId: string, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const openings = current.openings.filter((o) => o.id !== openingId);
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    current.walls,
    openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    openings,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paUpdateKeyParams(params: Partial<KeyParameters>, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const keyParams = { ...current.keyParams, ...params };
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    current.walls,
    current.openings,
    keyParams,
  );
  writePlanState(id, {
    ...current,
    keyParams,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paRecalculate(projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const { quantities, constituents } = deriveQuantities(
    current.rooms,
    current.walls,
    current.openings,
    current.keyParams,
  );
  writePlanState(id, {
    ...current,
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export function paUpdateBOQRate(itemId: string, rate: number, projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const boqItems = current.boqItems.map((b) => (b.id !== itemId ? b : { ...b, rate }));
  writePlanState(id, { ...current, boqItems });
}

export function paSetElementsTab(tab: PlanAnalysisState["elementsTab"], projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  writePlanState(id, { ...current, elementsTab: tab });
}

export function paSetTakeoffTab(tab: PlanAnalysisState["takeoffTab"], projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  writePlanState(id, { ...current, takeoffTab: tab });
}

export function paReset(projectId?: string) {
  const id = getResolvedProjectId(projectId);
  const clean = createEmptyPlanState(id);
  writePlanState(id, clean);
}

export function paApplyExtraction(
  extraction: {
    rooms: Room[];
    walls?: Wall[];
    openings?: Opening[];
    projectName?: string;
  },
  projectId?: string,
) {
  const id = getResolvedProjectId(projectId);
  const current = readPlanState(id);
  const rooms = extraction.rooms.length > 0 ? extraction.rooms : current.rooms;
  const walls = extraction.walls && extraction.walls.length > 0 ? extraction.walls : current.walls;
  const openings =
    extraction.openings && extraction.openings.length > 0 ? extraction.openings : current.openings;
  const { quantities, constituents } = deriveQuantities(rooms, walls, openings, current.keyParams);
  writePlanState(id, {
    ...current,
    rooms,
    walls,
    openings,
    projectName: current.projectName || extraction.projectName || "Floor Plan",
    quantities,
    constituents,
    boqItems: deriveBOQItems(quantities),
  });
}

export const boqTotal = (items: BOQItem[]) =>
  items.reduce((s, b) => s + (Number.isFinite(b.quantity) ? b.quantity : 0) * (b.rate || 0), 0);

export const inrPa = (n: number) =>
  `₹${(Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
