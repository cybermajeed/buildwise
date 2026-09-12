import { useSyncExternalStore } from "react";

export type ProjectItem = {
  slug: string;
  label: string;
  quantity: string;
  cost: number;
  rate?: number;
  unit?: string;
};

export type EstimateVersion = {
  id: string;
  createdAt: string;
  items: ProjectItem[];
  totalCost: number;
};

export type ProjectState = {
  id: string;
  name: string;
  clientName?: string;
  location?: string;
  items: ProjectItem[];
  savedAt?: string;
  versions?: EstimateVersion[];
};

export type AppState = {
  projects: ProjectState[];
  activeProjectId: string | null;
  mode: "simple" | "professional";
};

const KEY = "buildwise.appstate";
const empty: AppState = { projects: [], activeProjectId: null, mode: "simple" };

let cache: AppState = empty;
let cacheRaw: string | null = null;
const listeners = new Set<() => void>();

function read(): AppState {
  if (typeof window === "undefined") return empty;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as AppState) : empty;
    cache = {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      activeProjectId: parsed.activeProjectId || null,
      mode: parsed.mode || "simple",
    };
  } catch {
    cache = empty;
  }
  return cache;
}

function write(next: AppState) {
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

export function useAppStore(): AppState {
  return useSyncExternalStore(subscribe, read, () => empty);
}

export function useActiveProject(): ProjectState | undefined {
  const state = useAppStore();
  return state.projects.find((p) => p.id === state.activeProjectId);
}

export function setAppMode(mode: "simple" | "professional") {
  write({ ...read(), mode });
}

export function createProject(name: string) {
  const state = read();
  const newProject: ProjectState = {
    id: crypto.randomUUID(),
    name,
    items: [],
    savedAt: new Date().toISOString(),
    versions: [],
  };
  write({
    ...state,
    projects: [...state.projects, newProject],
    activeProjectId: newProject.id,
  });
  return newProject.id;
}

export function setActiveProject(id: string | null) {
  write({ ...read(), activeProjectId: id });
}

export function updateActiveProject(updates: Partial<Omit<ProjectState, "id">>) {
  const state = read();
  if (!state.activeProjectId) return;
  const projects = state.projects.map((p) =>
    p.id === state.activeProjectId ? { ...p, ...updates } : p,
  );
  write({ ...state, projects });
}

export function upsertItem(item: ProjectItem) {
  const state = read();
  if (!state.activeProjectId) return;

  const projects = state.projects.map((p) => {
    if (p.id !== state.activeProjectId) return p;
    const items = p.items.filter((i) => i.slug !== item.slug);
    return { ...p, items: [...items, item] };
  });

  write({ ...state, projects });
}

export function removeItem(slug: string) {
  const state = read();
  if (!state.activeProjectId) return;

  const projects = state.projects.map((p) => {
    if (p.id !== state.activeProjectId) return p;
    return { ...p, items: p.items.filter((i) => i.slug !== slug) };
  });

  write({ ...state, projects });
}

export function saveVersion() {
  const state = read();
  if (!state.activeProjectId) return;

  const projects = state.projects.map((p) => {
    if (p.id !== state.activeProjectId) return p;
    const version: EstimateVersion = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      items: [...p.items],
      totalCost: totalCost(p.items),
    };
    return { ...p, versions: [...(p.versions || []), version] };
  });

  write({ ...state, projects });
}

export function deleteProject(id: string) {
  const state = read();
  const projects = state.projects.filter((p) => p.id !== id);
  const activeProjectId = state.activeProjectId === id ? null : state.activeProjectId;
  write({ ...state, projects, activeProjectId });
}

export function duplicateProject(id: string) {
  const state = read();
  const projectToDuplicate = state.projects.find((p) => p.id === id);
  if (!projectToDuplicate) return;

  const newProject: ProjectState = {
    ...projectToDuplicate,
    id: crypto.randomUUID(),
    name: `${projectToDuplicate.name} (Copy)`,
    savedAt: new Date().toISOString(),
    versions: [],
  };

  write({ ...state, projects: [...state.projects, newProject] });
}

export function clearProject() {
  const state = read();
  if (!state.activeProjectId) return;
  const projects = state.projects.map((p) => {
    if (p.id !== state.activeProjectId) return p;
    return { ...p, items: [] };
  });
  write({ ...state, projects });
}

export const totalCost = (items: ProjectItem[]) =>
  items.reduce((sum, i) => sum + (Number.isFinite(i.cost) ? i.cost : 0), 0);

export const inr = (n: number) =>
  `₹${(Number.isFinite(n) ? n : 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
