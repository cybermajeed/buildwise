import { useSyncExternalStore } from "react";

export type MaterialPrice = {
  id: string;
  name: string;
  unit: string;
  currentPrice: number;
  previousPrice?: number;
  lastUpdated: string;
};

export type MaterialState = {
  prices: MaterialPrice[];
};

const KEY = "buildwise.materials";
const defaultPrices: MaterialPrice[] = [
  {
    id: "cement",
    name: "Portland Pozzolana Cement (PPC/OPC)",
    unit: "bag (50kg)",
    currentPrice: 385,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "steel",
    name: "Reinforcement Steel (Fe500D TMT)",
    unit: "kg",
    currentPrice: 68,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "sand",
    name: "River Sand / M-Sand (Zone II)",
    unit: "cft",
    currentPrice: 55,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "aggregate",
    name: "Coarse Aggregate (20mm Blue Metal)",
    unit: "cft",
    currentPrice: 45,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "bricks",
    name: "Red Clay Modular Bricks (Class 1)",
    unit: "pcs",
    currentPrice: 9,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: "concrete",
    name: "Ready Mix Concrete (M20/M25 Design)",
    unit: "cum",
    currentPrice: 4800,
    lastUpdated: new Date().toISOString(),
  },
];

const empty: MaterialState = { prices: defaultPrices };

let cache: MaterialState = empty;
let cacheRaw: string | null = null;
const listeners = new Set<() => void>();

function read(): MaterialState {
  if (typeof window === "undefined") return empty;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as MaterialState) : empty;
    cache = {
      prices:
        Array.isArray(parsed.prices) && parsed.prices.length > 0 ? parsed.prices : defaultPrices,
    };
  } catch {
    cache = empty;
  }
  return cache;
}

function write(next: MaterialState) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  cacheRaw = null;
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

export function useMaterialStore(): MaterialState {
  return useSyncExternalStore(subscribe, read, () => empty);
}

export function updateMaterialPrice(id: string, newPrice: number) {
  const state = read();
  const prices = state.prices.map((p) => {
    if (p.id !== id) return p;
    if (p.currentPrice === newPrice) return p;
    return {
      ...p,
      previousPrice: p.currentPrice,
      currentPrice: newPrice,
      lastUpdated: new Date().toISOString(),
    };
  });
  write({ prices });

  // Note: Recalculation of project estimates happens dynamically in components
  // or we can dispatch an event if needed. For now, components using both stores
  // can re-render and calculate the impact.
}
