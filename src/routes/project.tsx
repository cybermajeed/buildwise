import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Download,
  Save,
  Trash2,
  FolderOpen,
  Building2,
  MapPin,
  User,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  ArrowRight,
  UploadCloud,
  FileImage,
  Pencil,
  CheckCircle2,
  PieChart,
  Calculator,
  Boxes,
  History,
  Layers,
  Sparkles,
  Check,
  Loader2,
  Key,
  Ruler,
} from "lucide-react";
import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
import { FloorPlanVisualizer } from "@/components/floor-plan-visualizer";
import { AIVisionModal } from "@/components/ai-vision-modal";
import {
  analyzePlanImage,
  getEffectiveAIConfig,
  NoVisionKeyError,
  type ExtractionResult,
} from "@/lib/plan-vision-service";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useAppStore,
  useActiveProject,
  setActiveProject,
  createProject,
  updateActiveProject,
  saveProjectLocally,
  upsertItem,
  removeItem,
  saveVersion,
  clearProject,
  totalCost,
  inr,
  type ProjectItem,
} from "@/lib/project-store";
import {
  usePlanAnalysisStore,
  paSetFile,
  paUpdateRoom,
  paAddRoom,
  paRemoveRoom,
  paUpdateWall,
  paAddWall,
  paRemoveWall,
  paUpdateOpening,
  paAddOpening,
  paRemoveOpening,
  paUpdateKeyParams,
  paRecalculate,
  paReset,
  paApplyExtraction,
  inrPa,
  boqTotal,
  type Room,
} from "@/lib/plan-analysis-store";
import { useMaterialStore } from "@/lib/material-store";

export type ProjectTab = "plan" | "takeoff" | "boq" | "calculators" | "cost" | "reports";

type ProjectSearch = {
  tab?: ProjectTab | undefined;
  projectId?: string | undefined;
};

export const Route = createFileRoute("/project")({
  validateSearch: (search: Record<string, unknown>): ProjectSearch => {
    const rawTab = search["tab"];
    const rawProjectId = search["projectId"];
    return {
      tab: typeof rawTab === "string" ? (rawTab as ProjectTab) : "plan",
      projectId: typeof rawProjectId === "string" ? rawProjectId : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Project Modular Workspace — BuildWise" },
      {
        name: "description",
        content:
          "Modular construction workspace for plans, quantity takeoff, in-project calculators, BOQs, and cost estimates.",
      },
    ],
  }),
  component: ProjectModularWorkspace,
});

function ProjectModularWorkspace() {
  const { projects } = useAppStore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const activeProjectFromStore = useActiveProject();

  const activeProjectId = search.projectId;
  const project =
    (activeProjectId ? projects.find((p) => p.id === activeProjectId) : undefined) ||
    activeProjectFromStore ||
    projects[0];

  const projectId = project?.id;
  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
    }
  }, [projectId]);

  const activeTab: ProjectTab = search.tab || "plan";
  const setActiveTab = (tab: ProjectTab) => {
    navigate({ search: (prev) => ({ ...prev, tab }) });
  };

  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerName, setHeaderName] = useState(project?.name || "");
  const [headerClient, setHeaderClient] = useState(project?.clientName || "");
  const [headerLocation, setHeaderLocation] = useState(project?.location || "");

  // Sync local header editing state when project loads or updates
  useEffect(() => {
    if (project) {
      setHeaderName(project.name);
      setHeaderClient(project.clientName || "");
      setHeaderLocation(project.location || "");
    }
  }, [project?.id, project?.name, project?.clientName, project?.location, project]);

  if (!project) {
    return (
      <Page>
        <div className="max-w-md mx-auto text-center py-20 rounded-2xl border border-dashed border-border p-10">
          <Building2 size={40} className="mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold tracking-tight">No Project Selected</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a project or return to the project creation hub to begin.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => {
                const id = createProject("Residential Villa");
                setActiveProject(id);
                toast.success("Created 'Residential Villa'!");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} /> Create Quick Project
            </button>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </Page>
    );
  }

  const handleSaveHeaderDetails = () => {
    const trimmed = headerName.trim();
    if (!trimmed) {
      toast.error("Project name cannot be empty");
      return;
    }
    updateActiveProject(
      {
        name: trimmed,
        clientName: headerClient.trim(),
        location: headerLocation.trim(),
        savedAt: new Date().toISOString(),
      },
      project.id,
    );
    saveProjectLocally(project.id);
    setIsEditingHeader(false);
    toast.success(`Project updated to "${trimmed}" & saved locally!`);
  };

  const handleSaveProjectLocally = () => {
    const savedId = saveProjectLocally(project.id);
    if (savedId) {
      toast.success(`Project "${project.name}" saved locally to browser storage!`);
    } else {
      toast.error("Unable to save project locally");
    }
  };

  const handleSaveVersion = () => {
    saveVersion();
    updateActiveProject({ savedAt: new Date().toISOString() }, project.id);
    saveProjectLocally(project.id);
    toast.success("Project version snapshot saved locally!");
  };

  const materialCost = totalCost(project.items);
  const labourCost = materialCost * 0.4;
  const contingency = (materialCost + labourCost) * 0.05;
  const grandTotalCost = materialCost + labourCost + contingency;

  return (
    <Page>
      {/* ─── Top Project Header & Quick Metrics ────────────────────────────── */}
      <div className="rounded-[32px] border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0">
            {isEditingHeader ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={headerName}
                  onChange={(e) => setHeaderName(e.target.value)}
                  placeholder="Project Name"
                  className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-4 py-2 text-sm font-semibold outline-none focus:border-black dark:focus:border-[#00f0a0]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={headerClient}
                    onChange={(e) => setHeaderClient(e.target.value)}
                    placeholder="Client Name"
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-4 py-1.5 text-xs font-medium outline-none focus:border-black dark:focus:border-[#00f0a0]"
                  />
                  <input
                    type="text"
                    value={headerLocation}
                    onChange={(e) => setHeaderLocation(e.target.value)}
                    placeholder="Site Location"
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-4 py-1.5 text-xs font-medium outline-none focus:border-black dark:focus:border-[#00f0a0]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveHeaderDetails}
                    className="btn-pill-black !py-1.5 !px-4 !text-xs"
                  >
                    <CheckCircle2 size={13} /> Save Details
                  </button>
                  <button
                    onClick={() => {
                      setHeaderName(project.name);
                      setHeaderClient(project.clientName || "");
                      setHeaderLocation(project.location || "");
                      setIsEditingHeader(false);
                    }}
                    className="btn-pill-white !py-1.5 !px-4 !text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#00f0a0] text-black border border-black shrink-0 font-bold">
                    <Building2 size={14} />
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold font-display text-black dark:text-white truncate">
                    {project.name}
                  </h1>
                  <button
                    onClick={() => setIsEditingHeader(true)}
                    className="text-[#86909c] hover:text-black dark:hover:text-white p-1 transition-colors rounded-full hover:bg-[#f2f4f5]"
                    title="Edit project details"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#86909c]">
                  <span className="font-medium text-black dark:text-white">
                    {project.clientName || "Private Client"}
                  </span>
                  <span>•</span>
                  <span>{project.location || "Site Location"}</span>
                  <span>•</span>
                  <span className="font-mono text-[#86909c]">
                    Updated{" "}
                    {project.savedAt ? new Date(project.savedAt).toLocaleDateString() : "Today"}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#ecffe0] dark:bg-zinc-900 border border-[#00f0a0]/40 px-2 py-0.5 text-[10px] font-semibold text-black dark:text-[#00f0a0]">
                    <CheckCircle2 size={11} className="text-[#00a86b] dark:text-[#00f0a0]" /> Saved
                    Locally
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Project Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {projects.length > 1 && (
              <select
                value={project.id}
                onChange={(e) => {
                  setActiveProject(e.target.value);
                  const selected = projects.find((p) => p.id === e.target.value);
                  if (selected) toast.info(`Switched to ${selected.name}`);
                }}
                className="rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-semibold text-black dark:text-white outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleSaveProjectLocally}
              className="btn-pill-mint !py-2 !px-4 !text-xs cursor-pointer shadow-sm"
              title="Save all changes to browser localStorage"
            >
              <Save size={13} /> Save Locally
            </button>

            <button
              type="button"
              onClick={handleSaveVersion}
              className="btn-pill-black !py-2 !px-4 !text-xs cursor-pointer"
              title="Save project snapshot and record version"
            >
              <History size={13} /> Save Snapshot
            </button>

            <Link to="/" className="btn-pill-white !py-2 !px-4 !text-xs">
              <Plus size={13} /> New Project
            </Link>
          </div>
        </div>

        {/* High-Density Financial Metrics Strip (Mint & Black Badges) */}
        <div className="mt-6 pt-5 border-t border-[#e5e7eb] dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-[20px] bg-[#f2f4f5] dark:bg-zinc-900 p-3.5 border border-[#e5e7eb] dark:border-zinc-800">
            <span className="text-[10px] font-bold text-[#86909c] uppercase tracking-wider block font-display">
              Material (BOQ)
            </span>
            <span className="text-xl font-bold font-display text-black dark:text-white tabular-nums block mt-1">
              {inr(materialCost)}
            </span>
            <span className="text-[10px] text-[#86909c]">
              {project.items.length} items recorded
            </span>
          </div>

          <div className="rounded-[20px] bg-[#f2f4f5] dark:bg-zinc-900 p-3.5 border border-[#e5e7eb] dark:border-zinc-800">
            <span className="text-[10px] font-bold text-[#86909c] uppercase tracking-wider block font-display">
              Labour (~40%)
            </span>
            <span className="text-xl font-bold font-display text-black dark:text-white tabular-nums block mt-1">
              {inr(labourCost)}
            </span>
            <span className="text-[10px] text-[#86909c]">Civil thumb-rule</span>
          </div>

          <div className="rounded-[20px] bg-[#f2f4f5] dark:bg-zinc-900 p-3.5 border border-[#e5e7eb] dark:border-zinc-800">
            <span className="text-[10px] font-bold text-[#86909c] uppercase tracking-wider block font-display">
              Contingency (5%)
            </span>
            <span className="text-xl font-bold font-display text-black dark:text-white tabular-nums block mt-1">
              {inr(contingency)}
            </span>
            <span className="text-[10px] text-[#86909c]">Variance buffer</span>
          </div>

          <div className="rounded-[20px] bg-[#ecffe0] dark:bg-zinc-900 border border-[#00f0a0]/30 p-3.5">
            <span className="text-[10px] font-bold text-black dark:text-[#00f0a0] uppercase tracking-wider block font-display">
              Total Budget
            </span>
            <span className="text-xl font-black font-display text-black dark:text-[#00f0a0] tabular-nums block mt-1">
              {inr(grandTotalCost)}
            </span>
            <span className="text-[10px] text-[#86909c]">Complete project</span>
          </div>
        </div>
      </div>

      {/* ─── Minimalist Module Tabs (Pill Controls) ─────────────────────────── */}
      <div className="flex gap-2 pb-2 overflow-x-auto mb-8 select-none">
        {[
          { id: "plan" as const, label: "📐 Plan & Blueprint", desc: "Upload Blueprint" },
          { id: "takeoff" as const, label: "📏 Quantity Takeoff", desc: "QS Quantities" },
          { id: "boq" as const, label: "📋 Bill of Quantities", desc: "Rates & Amounts" },
          { id: "calculators" as const, label: "🧮 Calculators", desc: "Add Materials" },
          { id: "cost" as const, label: "📊 Cost & Budget", desc: "Analytics" },
          { id: "reports" as const, label: "📄 Reports & Versions", desc: "PDF Export" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-display rounded-full transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                : "bg-white dark:bg-zinc-950 border border-[#e5e7eb] dark:border-zinc-800 text-[#86909c] hover:text-black dark:hover:text-white hover:bg-[#f2f4f5]"
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: Plan & Blueprint Upload Module ────────────────────────────── */}
      {activeTab === "plan" && (
        <ModulePlanDrawings
          projectId={project.id}
          onProceedToTakeoff={() => setActiveTab("takeoff")}
        />
      )}

      {/* ─── TAB 2: Dimensions & Quantity Takeoff Module ──────────────────────── */}
      {activeTab === "takeoff" && (
        <ModuleDimensionsTakeoff
          projectId={project.id}
          onSyncToBOQ={() => setActiveTab("boq")}
          onGoToPlan={() => setActiveTab("plan")}
        />
      )}

      {/* ─── TAB 3: Bill of Quantities (BOQ) Module ───────────────────────────── */}
      {activeTab === "boq" && <ModuleBillOfQuantities />}

      {/* ─── TAB 4: Project Calculators Module ─────────────────────────────────── */}
      {activeTab === "calculators" && <ModuleProjectCalculators />}

      {/* ─── TAB 5: Cost & Analytics Module ───────────────────────────────────── */}
      {activeTab === "cost" && (
        <ModuleCostAnalytics
          materialCost={materialCost}
          labourCost={labourCost}
          contingency={contingency}
          grandTotal={grandTotalCost}
        />
      )}

      {/* ─── TAB 6: Reports & Version History Module ──────────────────────────── */}
      {activeTab === "reports" && <ModuleReportsVersions onSaveVersion={handleSaveVersion} />}
    </Page>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MODULE 1: Plan Drawings & Blueprint Upload (with Automated AI Vision)
// ─────────────────────────────────────────────────────────────────────────────
function ModulePlanDrawings({
  projectId,
  onProceedToTakeoff,
}: {
  projectId: string;
  onProceedToTakeoff: () => void;
}) {
  const state = usePlanAnalysisStore(projectId);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pendingExtraction, setPendingExtraction] = useState<ExtractionResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const updatePendingRoom = (roomId: string, changes: Partial<Room>) => {
    if (!pendingExtraction) return;
    setPendingExtraction({
      ...pendingExtraction,
      rooms: pendingExtraction.rooms.map((r) => {
        if (r.id !== roomId) return r;
        const updated = { ...r, ...changes };
        updated.areaSqFt = +(updated.widthFt * updated.lengthFt).toFixed(1);
        return updated;
      }),
    });
  };

  const removePendingRoom = (roomId: string) => {
    if (!pendingExtraction) return;
    setPendingExtraction({
      ...pendingExtraction,
      rooms: pendingExtraction.rooms.filter((r) => r.id !== roomId),
    });
  };

  const addPendingRoom = () => {
    if (!pendingExtraction) return;
    const newRoom: Room = {
      id: `r_${Date.now()}`,
      name: "New Space",
      widthFt: 12,
      lengthFt: 14,
      areaSqFt: 168,
      rawDimensionText: "Manual entry",
    };
    setPendingExtraction({
      ...pendingExtraction,
      rooms: [...pendingExtraction.rooms, newRoom],
    });
  };

  const runExtraction = async (dataUrl: string, fileName: string) => {
    setIsAnalyzing(true);
    toast.loading("Scanning drawing for room labels and dimensions (In-Browser OCR)...", {
      id: "vision-extract",
    });
    try {
      const result = await analyzePlanImage(dataUrl, fileName);
      setPendingExtraction(result);
      if (result.rooms.length > 0) {
        toast.success(
          `OCR complete: ${result.rooms.length} spaces extracted with exact dimensions!`,
          { id: "vision-extract" },
        );
      } else {
        toast.info(
          "Drawing scanned. No dimension callouts detected in text. You can add room sizes manually below.",
          { id: "vision-extract" },
        );
      }
    } catch (err) {
      toast.error(
        "Scanning error: " + (err instanceof Error ? err.message : "OCR analysis failed"),
        { id: "vision-extract" },
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        paSetFile(
          {
            name: file.name,
            sizeBytes: file.size,
            previewDataUrl: dataUrl,
            uploadedAt: new Date().toISOString(),
          },
          projectId,
        );
        // Automatically trigger AI Vision analysis on file upload
        runExtraction(dataUrl, file.name);
      };
      reader.readAsDataURL(file);
    } else {
      paSetFile(
        {
          name: file.name,
          sizeBytes: file.size,
          uploadedAt: new Date().toISOString(),
        },
        projectId,
      );
      toast.success(`Drawing document "${file.name}" attached.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Visualizer Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-black dark:text-white">
            Architectural Plan & Blueprint Analysis
          </h2>
          <p className="text-xs text-[#86909c] mt-0.5">
            In-browser OCR detects room tags, dimensions, and wall boundaries directly within your
            device.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isAnalyzing}
            className="btn-pill-black !py-2 !px-5 !text-xs cursor-pointer disabled:opacity-60"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={13} className="animate-spin text-[#00f0a0]" /> Scanning Drawing...
              </>
            ) : (
              <>
                <UploadCloud size={14} /> Scan Plan Drawing (OCR)
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="hidden"
          />
          <button
            onClick={onProceedToTakeoff}
            className="btn-pill-mint !py-2 !px-5 !text-xs cursor-pointer"
          >
            Takeoff <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* AI Extraction Review Banner (Pale-Mint Jobright Band with Full Advanced Analysis) */}
      {pendingExtraction && (
        <div className="rounded-[32px] border border-[#00f0a0]/60 bg-[#ecffe0] dark:bg-zinc-900 p-6 shadow-md animate-in fade-in duration-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold font-display text-black dark:text-white">
                <Sparkles size={16} className="text-[#00a86b] dark:text-[#00f0a0]" />
                <span className="text-sm font-bold">
                  Civil & Architectural OCR Extraction Complete
                </span>
                <span className="rounded-full bg-black text-[#00f0a0] px-2.5 py-0.5 text-[10px] font-semibold uppercase font-mono">
                  {pendingExtraction.source === "tesseract-ocr"
                    ? "In-Browser OCR"
                    : "Architectural OCR"}
                </span>
                <span className="rounded-full bg-white dark:bg-zinc-800 border border-black/10 px-2.5 py-0.5 text-[10px] font-mono text-black dark:text-white">
                  Confidence: {pendingExtraction.confidence}
                </span>
              </div>
              <p className="text-xs text-[#86909c] mt-1 font-medium">{pendingExtraction.summary}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  paApplyExtraction(pendingExtraction, projectId);
                  toast.success("Applied verified dimensions to Takeoff & BOQ!");
                  setPendingExtraction(null);
                }}
                className="btn-pill-black !py-2 !px-5 !text-xs cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Check size={14} /> Apply Verified Schedule to CAD & BOQ
              </button>
              <button
                type="button"
                onClick={() => setPendingExtraction(null)}
                className="btn-pill-white !py-2 !px-3.5 !text-xs cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Advanced Civil Specifications Metric Bar */}
          {pendingExtraction.advancedAnalysis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="rounded-[18px] bg-white dark:bg-zinc-800/80 border border-black/10 dark:border-zinc-700 p-2.5">
                <div className="text-[10px] text-[#86909c] font-semibold uppercase tracking-wider">
                  Total Carpet Area
                </div>
                <div className="text-sm font-bold font-display text-black dark:text-white font-mono mt-0.5">
                  {pendingExtraction.advancedAnalysis.totalCarpetAreaSqFt} sq.ft
                </div>
              </div>
              <div className="rounded-[18px] bg-white dark:bg-zinc-800/80 border border-black/10 dark:border-zinc-700 p-2.5">
                <div className="text-[10px] text-[#86909c] font-semibold uppercase tracking-wider">
                  Est. Built-up / Plinth
                </div>
                <div className="text-sm font-bold font-display text-black dark:text-white font-mono mt-0.5">
                  {pendingExtraction.advancedAnalysis.totalBuiltUpAreaSqFt ||
                    Math.round(pendingExtraction.advancedAnalysis.totalCarpetAreaSqFt * 1.2)}{" "}
                  sq.ft
                </div>
              </div>
              <div className="rounded-[18px] bg-white dark:bg-zinc-800/80 border border-black/10 dark:border-zinc-700 p-2.5">
                <div className="text-[10px] text-[#86909c] font-semibold uppercase tracking-wider">
                  Ext. Wall Thickness
                </div>
                <div className="text-sm font-bold font-display text-black dark:text-white font-mono mt-0.5">
                  {pendingExtraction.advancedAnalysis.externalWallThicknessIn || 9}&quot; Brickwork
                </div>
              </div>
              <div className="rounded-[18px] bg-white dark:bg-zinc-800/80 border border-black/10 dark:border-zinc-700 p-2.5">
                <div className="text-[10px] text-[#86909c] font-semibold uppercase tracking-wider">
                  Detected Units
                </div>
                <div className="text-sm font-bold font-display text-black dark:text-white font-mono mt-0.5 truncate">
                  {pendingExtraction.advancedAnalysis.unitSystem}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Dimension Verification Table */}
          <div className="rounded-[22px] bg-white dark:bg-zinc-950 border border-black/10 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e5e7eb] dark:border-zinc-800 bg-[#f2f4f5]/60 dark:bg-zinc-900/60">
              <span className="text-xs font-bold font-display text-black dark:text-white flex items-center gap-1.5">
                <Ruler size={13} className="text-[#00f0a0]" /> Verify & Edit Extracted Room
                Dimensions
              </span>
              <button
                type="button"
                onClick={addPendingRoom}
                className="text-[11px] font-semibold text-black dark:text-[#00f0a0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> Add Space
              </button>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f2f4f5] dark:bg-zinc-900 text-[#86909c] uppercase text-[10px] font-semibold tracking-wide sticky top-0">
                  <tr>
                    <th className="p-2.5">Room / Space Name</th>
                    <th className="p-2.5">Blueprint Callout</th>
                    <th className="p-2.5">Width (W ft)</th>
                    <th className="p-2.5">Length (L ft)</th>
                    <th className="p-2.5">Floor Area (sq.ft)</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb] dark:divide-zinc-800">
                  {pendingExtraction.rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={r.name}
                          onChange={(e) => updatePendingRoom(r.id, { name: e.target.value })}
                          className="w-full rounded-md border border-[#e5e7eb] dark:border-zinc-700 bg-transparent px-2 py-1 text-xs font-semibold text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0]"
                        />
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-[#86909c]">
                        {r.rawDimensionText ? (
                          <span className="rounded-full bg-[#f2f4f5] dark:bg-zinc-800 px-2 py-0.5 text-black dark:text-white font-medium border border-black/5">
                            {r.rawDimensionText}
                          </span>
                        ) : (
                          <span className="italic text-[#86909c]">Visual Span</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={r.widthFt}
                          onChange={(e) =>
                            updatePendingRoom(r.id, { widthFt: Number(e.target.value) })
                          }
                          className="w-20 rounded-md border border-[#e5e7eb] dark:border-zinc-700 bg-transparent px-2 py-1 text-xs font-mono font-bold text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0]"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          step="0.01"
                          value={r.lengthFt}
                          onChange={(e) =>
                            updatePendingRoom(r.id, { lengthFt: Number(e.target.value) })
                          }
                          className="w-20 rounded-md border border-[#e5e7eb] dark:border-zinc-700 bg-transparent px-2 py-1 text-xs font-mono font-bold text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0]"
                        />
                      </td>
                      <td className="p-2.5 font-mono font-bold text-black dark:text-white">
                        {r.areaSqFt}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => removePendingRoom(r.id)}
                          className="text-[#86909c] hover:text-red-600 p-1 transition-colors"
                          title="Remove space"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Blueprint Visualizer Canvas */}
      <FloorPlanVisualizer
        rooms={state.rooms}
        walls={state.walls}
        openings={state.openings}
        previewUrl={state.file?.previewDataUrl}
        projectName={state.projectName || "Floor Plan"}
        selectedRoomId={selectedRoomId}
        onSelectRoom={(r) => setSelectedRoomId(r.id)}
        onUploadClick={() => fileRef.current?.click()}
      />

      {/* Plan Details & Controls */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <FileImage size={15} className="text-primary" />
            <span className="font-bold text-xs text-foreground">
              {state.file?.name || "No Plan Uploaded"}
            </span>
            {state.file && (
              <span className="text-[11px] text-muted-foreground">
                ({(state.file.sizeBytes / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            {state.file?.previewDataUrl && (
              <button
                onClick={() => runExtraction(state.file!.previewDataUrl!, state.file!.name)}
                disabled={isAnalyzing}
                className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={isAnalyzing ? "animate-spin" : ""} /> Scan Drawing
                (OCR)
              </button>
            )}
            {state.file && (
              <button
                onClick={() => {
                  paReset(projectId);
                  toast.info("Cleared plan drawing.");
                }}
                className="text-destructive hover:underline font-semibold"
              >
                Clear Drawing
              </button>
            )}
          </div>
        </div>

        {/* Quick Room Dimension Editor below plan */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Spaces & Room Dimensions ({state.rooms.length} Spaces)
            </h4>
            <button
              onClick={() => paAddRoom(projectId)}
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <Plus size={12} /> Add Space
            </button>
          </div>

          {state.rooms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-secondary/20 p-6 text-center">
              <p className="text-xs text-muted-foreground">
                No spaces or dimensions extracted yet. Upload an architectural plan drawing above or
                click &quot;+ Add Space&quot; to define rooms manually.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {state.rooms.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoomId(r.id)}
                  className={`rounded-lg border p-2 text-xs transition-all cursor-pointer ${
                    selectedRoomId === r.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-background hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-foreground truncate">{r.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        paRemoveRoom(r.id, projectId);
                      }}
                      className="text-muted-foreground hover:text-destructive p-0.5"
                      title="Delete space"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="text-[10px] font-semibold text-muted-foreground">W:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={r.widthFt}
                      onChange={(e) =>
                        paUpdateRoom(r.id, { widthFt: Number(e.target.value) }, projectId)
                      }
                      className="w-14 rounded border border-input bg-card px-1 py-0.5 text-center text-xs text-foreground font-mono"
                      title="Width (ft)"
                    />
                    <span className="text-[10px] font-semibold text-muted-foreground">L:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={r.lengthFt}
                      onChange={(e) =>
                        paUpdateRoom(r.id, { lengthFt: Number(e.target.value) }, projectId)
                      }
                      className="w-14 rounded border border-input bg-card px-1 py-0.5 text-center text-xs text-foreground font-mono"
                      title="Length (ft)"
                    />
                    <span className="ml-auto font-mono text-[11px] font-bold text-foreground">
                      {r.areaSqFt} sq.ft
                    </span>
                  </div>
                  {r.rawDimensionText && (
                    <div className="mt-1 text-[10px] text-muted-foreground font-mono truncate">
                      Callout:{" "}
                      <span className="font-semibold text-foreground">{r.rawDimensionText}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MODULE 2: Dimensions & Quantity Takeoff Module
// ─────────────────────────────────────────────────────────────────────────────
function ModuleDimensionsTakeoff({
  projectId,
  onSyncToBOQ,
  onGoToPlan,
}: {
  projectId: string;
  onSyncToBOQ: () => void;
  onGoToPlan?: () => void;
}) {
  const state = usePlanAnalysisStore(projectId);

  const handleSyncTakeoffToBOQ = () => {
    state.boqItems.forEach((b) => {
      upsertItem({
        slug: b.id,
        label: b.label,
        quantity: `${b.quantity} ${b.unit}`,
        rate: b.rate,
        unit: b.unit,
        cost: b.quantity * b.rate,
      });
    });
    toast.success("All takeoff quantities synchronized directly to project BOQ!");
    onSyncToBOQ();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Quantity Takeoff (QS Standards)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Physical quantities calculated under IS 1200 / SMM civil conventions.
          </p>
        </div>
        <div className="flex gap-2">
          {state.quantities.length > 0 && (
            <>
              <button
                onClick={() => {
                  paRecalculate(projectId);
                  toast.success("Quantities recalculated from geometry.");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <RefreshCw size={13} /> Recalculate
              </button>
              <button
                onClick={handleSyncTakeoffToBOQ}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                <ArrowRight size={14} /> Sync Takeoff to BOQ
              </button>
            </>
          )}
        </div>
      </div>

      {/* Derived Quantities Summary Cards */}
      {state.quantities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-secondary/40 flex items-center justify-center text-muted-foreground border border-border/80 mb-3">
            <Ruler size={22} className="text-primary/70" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Takeoff Quantities Yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
            All fields remain blank until a plan image is uploaded or room dimensions are entered.
            Upload an architectural floor plan to extract dimensions, or add rooms manually below.
          </p>
          {onGoToPlan && (
            <button
              onClick={onGoToPlan}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <UploadCloud size={14} /> Go to Plan & Upload Blueprint
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.quantities.map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>{q.icon}</span> {q.label}
                </span>
                <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                  {q.quantity.toLocaleString("en-IN")} {q.unit}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                {q.description}
              </p>
              {q.secondaryBreakdown && (
                <span className="inline-block mt-2 font-mono text-[10px] bg-secondary/80 text-foreground px-2 py-0.5 rounded font-medium">
                  ≈ {q.secondaryBreakdown}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Constituent Materials Breakdown */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Boxes size={18} className="text-primary" />
          <h3 className="font-bold text-sm text-foreground">
            Constituent Materials Requirement Breakdown
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Derived from concrete mix ratios, brick masonry mortar, and interior/exterior plastering.
        </p>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/60 text-muted-foreground uppercase tracking-wide">
              <tr>
                <th className="p-3 font-semibold">Material</th>
                <th className="p-3 font-semibold">Required Quantity</th>
                <th className="p-3 font-semibold">Unit</th>
                <th className="p-3 font-semibold">Engineering Derivation Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!state.constituents || state.constituents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-muted-foreground italic">
                    No constituent materials calculated. Upload an architectural plan or define
                    rooms to calculate cement, sand, aggregate, and brick requirements.
                  </td>
                </tr>
              ) : (
                state.constituents.map((c) => (
                  <tr key={c.label} className="hover:bg-muted/40 transition-colors">
                    <td className="p-3 font-semibold text-foreground">{c.label}</td>
                    <td className="p-3 font-bold text-sm text-primary tabular-nums">
                      {c.quantity.toLocaleString("en-IN")}
                    </td>
                    <td className="p-3 text-muted-foreground font-medium">{c.unit}</td>
                    <td className="p-3 text-muted-foreground">{c.basis}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geometry Schedule: Rooms & Walls Inline Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rooms Schedule */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Room Schedule ({state.rooms.length} Rooms)</h3>
            <button
              onClick={() => paAddRoom(projectId)}
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <Plus size={13} /> Add Room
            </button>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/50 text-muted-foreground uppercase tracking-wide sticky top-0">
                <tr>
                  <th className="p-2 font-medium">Room</th>
                  <th className="p-2 font-medium">Width (W ft)</th>
                  <th className="p-2 font-medium">Length (L ft)</th>
                  <th className="p-2 font-medium">Area (sq.ft)</th>
                  <th className="p-2 font-medium text-right">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.rooms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground italic">
                      No rooms defined yet. Upload a plan or click &quot;+ Add Room&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  state.rooms.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2 font-medium">
                        <div>{r.name}</div>
                        {r.rawDimensionText && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {r.rawDimensionText}
                          </div>
                        )}
                      </td>
                      <td className="p-2 tabular-nums">
                        <input
                          type="number"
                          step="0.01"
                          value={r.widthFt}
                          onChange={(e) =>
                            paUpdateRoom(r.id, { widthFt: Number(e.target.value) }, projectId)
                          }
                          className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary font-mono"
                        />
                      </td>
                      <td className="p-2 tabular-nums">
                        <input
                          type="number"
                          step="0.01"
                          value={r.lengthFt}
                          onChange={(e) =>
                            paUpdateRoom(r.id, { lengthFt: Number(e.target.value) }, projectId)
                          }
                          className="w-16 rounded border border-input bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary font-mono"
                        />
                      </td>
                      <td className="p-2 font-semibold tabular-nums">{r.areaSqFt}</td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => paRemoveRoom(r.id, projectId)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Walls & Openings Summary */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Key Structural Parameters</h3>
            <button
              onClick={() => paAddWall(projectId)}
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
            >
              <Plus size={13} /> Add Wall
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <label className="block rounded-lg bg-secondary/30 p-2.5">
              <span className="text-muted-foreground font-medium block">Wall Thickness</span>
              <select
                value={state.keyParams.wallThicknessIn}
                onChange={(e) =>
                  paUpdateKeyParams({ wallThicknessIn: Number(e.target.value) }, projectId)
                }
                className="mt-1 w-full bg-background border border-input rounded p-1 font-semibold outline-none"
              >
                <option value={9}>9" (External Wall)</option>
                <option value={4.5}>4.5" (Partition)</option>
                <option value={13.5}>13.5" (Heavy Masonry)</option>
              </select>
            </label>

            <label className="block rounded-lg bg-secondary/30 p-2.5">
              <span className="text-muted-foreground font-medium block">Floor Height</span>
              <select
                value={state.keyParams.floorHeightFt}
                onChange={(e) =>
                  paUpdateKeyParams({ floorHeightFt: Number(e.target.value) }, projectId)
                }
                className="mt-1 w-full bg-background border border-input rounded p-1 font-semibold outline-none"
              >
                {[9, 10, 11, 12].map((v) => (
                  <option key={v} value={v}>
                    {v} feet
                  </option>
                ))}
              </select>
            </label>

            <label className="block rounded-lg bg-secondary/30 p-2.5">
              <span className="text-muted-foreground font-medium block">Foundation Trench</span>
              <select
                value={state.keyParams.foundationDepthFt || 4}
                onChange={(e) =>
                  paUpdateKeyParams({ foundationDepthFt: Number(e.target.value) }, projectId)
                }
                className="mt-1 w-full bg-background border border-input rounded p-1 font-semibold outline-none"
              >
                {[3, 3.5, 4, 4.5, 5].map((v) => (
                  <option key={v} value={v}>
                    {v} ft depth
                  </option>
                ))}
              </select>
            </label>

            <label className="block rounded-lg bg-secondary/30 p-2.5">
              <span className="text-muted-foreground font-medium block">Number of Floors</span>
              <select
                value={state.keyParams.numberOfFloors}
                onChange={(e) =>
                  paUpdateKeyParams({ numberOfFloors: Number(e.target.value) }, projectId)
                }
                className="mt-1 w-full bg-background border border-input rounded p-1 font-semibold outline-none"
              >
                {[1, 2, 3, 4].map((v) => (
                  <option key={v} value={v}>
                    G + {v - 1} {v === 1 ? "(Single)" : `(${v} Floors)`}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MODULE 3: Bill of Quantities (BOQ) Module
// ─────────────────────────────────────────────────────────────────────────────
function ModuleBillOfQuantities() {
  const project = useActiveProject();
  const { prices } = useMaterialStore();

  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemQty, setNewItemQty] = useState(100);
  const [newItemUnit, setNewItemUnit] = useState("nos");
  const [newItemRate, setNewItemRate] = useState(500);

  if (!project) return null;

  const handleUpdateItem = (slug: string, field: "quantity" | "rate", value: number) => {
    const item = project.items.find((i) => i.slug === slug);
    if (!item) return;

    const parsedQty = parseFloat(item.quantity) || 0;
    const currentQty = field === "quantity" ? value : parsedQty;
    const currentRate = field === "rate" ? value : item.rate || 0;

    upsertItem({
      ...item,
      quantity: `${currentQty} ${item.unit || ""}`.trim(),
      rate: currentRate,
      cost: currentQty * currentRate,
    });
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim()) return;
    const slug = `item_${Date.now()}`;
    upsertItem({
      slug,
      label: newItemLabel.trim(),
      quantity: `${newItemQty} ${newItemUnit}`.trim(),
      rate: newItemRate,
      unit: newItemUnit,
      cost: newItemQty * newItemRate,
    });
    setNewItemLabel("");
    toast.success(`Added "${newItemLabel.trim()}" to project BOQ!`);
  };

  const syncMarketPrices = () => {
    project.items.forEach((item) => {
      const match = prices.find((p) => p.id === item.slug);
      if (match && match.currentPrice !== item.rate) {
        handleUpdateItem(item.slug, "rate", match.currentPrice);
      }
    });
    toast.success("Project BOQ rates updated from latest market prices!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Project Bill of Quantities (BOQ)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modify quantities and rates. Changes directly update the estimated project cost.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncMarketPrices}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw size={13} /> Sync Market Rates
          </button>
        </div>
      </div>

      {/* BOQ Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Item Description</th>
                <th className="px-5 py-3.5 font-semibold">Quantity</th>
                <th className="px-5 py-3.5 font-semibold">Unit</th>
                <th className="px-5 py-3.5 font-semibold">Unit Rate (₹)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Total Amount (₹)</th>
                <th className="px-5 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {project.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                    No items in BOQ yet. Use the <strong>Dimensions & Takeoff</strong> tab to sync
                    takeoffs, or use the form below to add items.
                  </td>
                </tr>
              ) : (
                project.items.map((item) => {
                  const qtyVal = parseFloat(item.quantity) || 0;
                  return (
                    <tr key={item.slug} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3 font-semibold text-foreground">{item.label}</td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          value={qtyVal}
                          onChange={(e) =>
                            handleUpdateItem(item.slug, "quantity", Number(e.target.value))
                          }
                          className="w-24 rounded border border-input bg-background px-2 py-1 text-xs tabular-nums outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {item.unit || "-"}
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          value={item.rate || 0}
                          onChange={(e) =>
                            handleUpdateItem(item.slug, "rate", Number(e.target.value))
                          }
                          className="w-24 rounded border border-input bg-background px-2 py-1 text-xs tabular-nums outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-foreground tabular-nums">
                        {inr(item.cost)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            removeItem(item.slug);
                            toast.info(`Removed ${item.label}`);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Total Row */}
              <tr className="bg-primary/5 border-t-2 border-primary/20">
                <td colSpan={4} className="px-5 py-4 text-right font-extrabold text-base">
                  Total Material Cost:
                </td>
                <td className="px-5 py-4 text-right font-extrabold text-lg text-primary tabular-nums">
                  {inr(totalCost(project.items))}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Custom BOQ Item Form */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-bold text-sm mb-3">Add Custom Item to BOQ</h3>
        <form onSubmit={handleAddCustomItem} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Item (e.g. Electrical Conduit 25mm)"
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            className="sm:col-span-2 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={newItemQty}
            onChange={(e) => setNewItemQty(Number(e.target.value))}
            className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <input
            type="text"
            placeholder="Unit (m, kg, cft)"
            value={newItemUnit}
            onChange={(e) => setNewItemUnit(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Rate (₹)"
              value={newItemRate}
              onChange={(e) => setNewItemRate(Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MODULE 4: In-Context Project Calculators
// ─────────────────────────────────────────────────────────────────────────────
function ModuleProjectCalculators() {
  const project = useActiveProject();

  // Brick calculation state
  const [wallLength, setWallLength] = useState(30);
  const [wallHeight, setWallHeight] = useState(10);
  const [wallThick, setWallThick] = useState(9);

  // Concrete calculation state
  const [concreteVol, setConcreteVol] = useState(15);
  const [concreteGrade, setConcreteGrade] = useState("M20");

  // Steel calculation state
  const [barDia, setBarDia] = useState(12);
  const [barLength, setBarLength] = useState(100);

  if (!project) return null;

  // Real calculation formulas
  const wallArea = wallLength * wallHeight;
  const brickVolumeCum = wallArea * (wallThick / 12) * 0.0283168;
  const totalBricks = Math.round(brickVolumeCum * 500);
  const cementBagsForBrick = +(brickVolumeCum * 1.4).toFixed(1);

  const concreteCementBags = Math.round(concreteVol * (concreteGrade === "M25" ? 8.5 : 8.0));
  const concreteSandCft = Math.round(concreteVol * 0.45 * 35.315);
  const concreteAggCft = Math.round(concreteVol * 0.85 * 35.315);

  // D² / 162 rule for reinforcement steel weight
  const steelWeightKg = Math.round(((barDia * barDia) / 162) * (barLength * 0.3048));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Project-Specific Material Calculators</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Compute material requirements and add them directly into this project's BOQ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Brickwork Calculator */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🧱</span>
              <h3 className="font-bold text-sm">Brick & Mortar Calculator</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-muted-foreground">Wall Length (ft)</span>
                  <input
                    type="number"
                    value={wallLength}
                    onChange={(e) => setWallLength(Number(e.target.value))}
                    className="w-full mt-1 border border-input rounded p-1.5 bg-background font-semibold"
                  />
                </label>
                <label className="block">
                  <span className="text-muted-foreground">Wall Height (ft)</span>
                  <input
                    type="number"
                    value={wallHeight}
                    onChange={(e) => setWallHeight(Number(e.target.value))}
                    className="w-full mt-1 border border-input rounded p-1.5 bg-background font-semibold"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-muted-foreground">Wall Thickness</span>
                <select
                  value={wallThick}
                  onChange={(e) => setWallThick(Number(e.target.value))}
                  className="w-full mt-1 border border-input rounded p-1.5 bg-background font-semibold"
                >
                  <option value={9}>9" (External Wall)</option>
                  <option value={4.5}>4.5" (Internal Partition)</option>
                </select>
              </label>

              <div className="rounded-lg bg-secondary/50 p-3 mt-3">
                <div className="flex justify-between font-semibold">
                  <span>Bricks Required:</span>
                  <span className="text-primary font-bold">
                    {totalBricks.toLocaleString("en-IN")} pcs
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Mortar Cement:</span>
                  <span>{cementBagsForBrick} bags</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              upsertItem({
                slug: `calc_bricks_${Date.now()}`,
                label: `Modular Bricks (${wallLength}x${wallHeight} ft Wall)`,
                quantity: `${totalBricks} pcs`,
                rate: 10,
                unit: "pcs",
                cost: totalBricks * 10,
              });
              toast.success(`Added ${totalBricks} bricks to project BOQ!`);
            }}
            className="mt-4 w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            Add to Project BOQ
          </button>
        </div>

        {/* Concrete Calculator */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🏗</span>
              <h3 className="font-bold text-sm">Concrete Mix Calculator</h3>
            </div>
            <div className="space-y-2 text-xs">
              <label className="block">
                <span className="text-muted-foreground">Concrete Volume (m³)</span>
                <input
                  type="number"
                  value={concreteVol}
                  onChange={(e) => setConcreteVol(Number(e.target.value))}
                  className="w-full mt-1 border border-input rounded p-1.5 bg-background font-semibold"
                />
              </label>
              <label className="block">
                <span className="text-muted-foreground">Concrete Grade</span>
                <select
                  value={concreteGrade}
                  onChange={(e) => setConcreteGrade(e.target.value)}
                  className="w-full mt-1 border border-input rounded p-1.5 bg-background font-semibold"
                >
                  <option value="M20">M20 (1:1.5:3 - Slabs & Beams)</option>
                  <option value="M25">M25 (1:1:2 - Heavy Columns)</option>
                </select>
              </label>

              <div className="rounded-lg bg-secondary/50 p-3 mt-3">
                <div className="flex justify-between font-semibold">
                  <span>Cement:</span>
                  <span className="text-primary font-bold">{concreteCementBags} Bags (50kg)</span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Sand / Aggregate:</span>
                  <span>
                    {concreteSandCft} cft / {concreteAggCft} cft
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              upsertItem({
                slug: `calc_concrete_${Date.now()}`,
                label: `Structural Concrete (${concreteGrade} Grade)`,
                quantity: `${concreteVol} m³`,
                rate: 6800,
                unit: "m³",
                cost: concreteVol * 6800,
              });
              toast.success(`Added ${concreteVol} m³ concrete to project BOQ!`);
            }}
            className="mt-4 w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            Add to Project BOQ
          </button>
        </div>

        {/* Steel Calculator */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚙</span>
              <h3 className="font-bold text-sm">Steel Reinforcement (TMT)</h3>
            </div>
            <div className="space-y-2 text-xs">
              <label className="block">
                <span className="text-muted-foreground">Bar Diameter (mm)</span>
                <select
                  value={barDia}
                  onChange={(e) => setBarDia(Number(e.target.value))}
                  className="w-full mt-1 border border-input rounded p-1.5 bg-background font-semibold"
                >
                  {[8, 10, 12, 16, 20, 25].map((d) => (
                    <option key={d} value={d}>
                      {d} mm TMT Rebar
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-muted-foreground">Total Length (ft)</span>
                <input
                  type="number"
                  value={barLength}
                  onChange={(e) => setBarLength(Number(e.target.value))}
                  className="w-full mt-1 border border-input rounded p-1.5 bg-background font-semibold"
                />
              </label>

              <div className="rounded-lg bg-secondary/50 p-3 mt-3">
                <div className="flex justify-between font-semibold">
                  <span>Weight (D²/162):</span>
                  <span className="text-primary font-bold">{steelWeightKg} kg</span>
                </div>
                <div className="flex justify-between text-muted-foreground mt-1">
                  <span>Metric Tonnes:</span>
                  <span>{(steelWeightKg / 1000).toFixed(2)} MT</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              upsertItem({
                slug: `calc_steel_${Date.now()}`,
                label: `TMT Fe500 Reinforcement (${barDia}mm)`,
                quantity: `${steelWeightKg} kg`,
                rate: 72,
                unit: "kg",
                cost: steelWeightKg * 72,
              });
              toast.success(`Added ${steelWeightKg} kg steel to project BOQ!`);
            }}
            className="mt-4 w-full rounded-lg bg-primary py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            Add to Project BOQ
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MODULE 5: Cost & Analytics Module
// ─────────────────────────────────────────────────────────────────────────────
function ModuleCostAnalytics({
  materialCost,
  labourCost,
  contingency,
  grandTotal,
}: {
  materialCost: number;
  labourCost: number;
  contingency: number;
  grandTotal: number;
}) {
  const project = useActiveProject();
  if (!project) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Cost Estimate & Financial Analysis</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Comprehensive project budget model with material, labour, and contingency breakdown.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieChart size={20} className="text-primary" />
            <h3 className="font-bold text-base">Trade Cost Distribution</h3>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground font-medium">Material Cost (BOQ Total)</span>
              <span className="font-bold tabular-nums text-foreground">{inr(materialCost)}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground font-medium">Labour & Installation (40%)</span>
              <span className="font-bold tabular-nums text-foreground">{inr(labourCost)}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground font-medium">
                Subtotal (Direct Construction Cost)
              </span>
              <span className="font-bold tabular-nums text-foreground">
                {inr(materialCost + labourCost)}
              </span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground font-medium">
                Site Contingency & Overheads (5%)
              </span>
              <span className="font-bold tabular-nums text-foreground">{inr(contingency)}</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-base font-extrabold text-foreground">
                Grand Estimated Total
              </span>
              <span className="text-2xl font-extrabold text-primary tabular-nums">
                {inr(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Highest Cost Materials Ranking */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-bold text-base mb-4">Highest Cost Material Drivers</h3>
          {project.items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No material items in BOQ to analyze.</p>
          ) : (
            <div className="space-y-3">
              {[...project.items]
                .sort((a, b) => b.cost - a.cost)
                .slice(0, 5)
                .map((item) => {
                  const pct = materialCost > 0 ? (item.cost / materialCost) * 100 : 0;
                  return (
                    <div key={item.slug} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{item.label}</span>
                        <span className="tabular-nums">{inr(item.cost)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{item.quantity}</span>
                        <span>{pct.toFixed(1)}% of materials</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-MODULE 6: Reports & Version History
// ─────────────────────────────────────────────────────────────────────────────
function ModuleReportsVersions({ onSaveVersion }: { onSaveVersion: () => void }) {
  const project = useActiveProject();
  const paState = usePlanAnalysisStore(project?.id);
  if (!project) return null;

  // Derive unified BOQ items (either project saved items or plan-derived BOQ items)
  const reportItems: ProjectItem[] =
    project.items.length > 0
      ? project.items
      : paState.boqItems.map((b) => ({
          slug: b.id,
          label: b.label,
          quantity: `${b.quantity} ${b.unit}`,
          rate: b.rate,
          cost: Math.round((Number.isFinite(b.quantity) ? b.quantity : 0) * (b.rate || 0)),
          unit: b.unit,
        }));

  const carpetSqFt = paState.rooms.reduce((s, r) => s + r.areaSqFt, 0);
  const builtUpSqFt = carpetSqFt > 0 ? Math.round(carpetSqFt * 1.2) : 0;
  const materialCost = reportItems.reduce((s, i) => s + (i.cost || 0), 0);
  const labourCost = Math.round(materialCost * 0.4);
  const contingency = Math.round((materialCost + labourCost) * 0.05);
  const grandTotalCost = materialCost + labourCost + contingency;
  const costPerSqFt = builtUpSqFt > 0 ? Math.round(grandTotalCost / builtUpSqFt) : 0;

  // Primary Material Takeoffs
  const cementConstituent = paState.constituents.find((c) => c.label.includes("Cement"));
  const steelConstituent = paState.constituents.find((c) => c.label.includes("Steel"));
  const sandConstituent = paState.constituents.find((c) => c.label.includes("Sand"));
  const aggregateConstituent = paState.constituents.find((c) => c.label.includes("Aggregate"));
  const bricksConstituent = paState.constituents.find((c) => c.label.includes("Bricks"));

  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 45;
    const right = 550;
    const pageWidth = right - left;
    const formatRupee = (n: number) => `Rs. ${(n || 0).toLocaleString("en-IN")}`;
    let y = 45;

    // Header Background Band
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, 595, 80, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("EXECUTIVE QUANTITY SURVEY & COST ESTIMATE", left, 36);

    // Subtitle & Project Meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    doc.text(
      `Project: ${project.name}   |   Client: ${project.clientName || "Private Client"}   |   Site: ${project.location || "Site Location"}   |   Date: ${dateStr}`,
      left,
      56,
    );
    doc.text("Standard: IS 1200 / CPWD Method of Measurement of Building Works", left, 69);

    y = 105;

    // ─── 1. Scope & Physical Dimensions Box ───
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(left, y, pageWidth, 42, 4, 4, "F");

    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.setFont("helvetica", "bold");
    doc.text("CARPET AREA", left + 14, y + 16);
    doc.text("BUILT-UP PLINTH", left + 130, y + 16);
    doc.text("SPACES / ROOMS", left + 260, y + 16);
    doc.text("COST / SQ.FT", left + 390, y + 16);

    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text(`${carpetSqFt.toLocaleString("en-IN")} sq.ft`, left + 14, y + 32);
    doc.text(`${builtUpSqFt.toLocaleString("en-IN")} sq.ft`, left + 130, y + 32);
    doc.text(`${paState.rooms.length} spaces`, left + 260, y + 32);
    doc.text(
      costPerSqFt > 0 ? `${formatRupee(costPerSqFt)}/sq.ft` : "Calculated",
      left + 390,
      y + 32,
    );

    y += 58;

    // ─── 2. Core Constituent Materials Takeoff ───
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("1. Core Structural Materials Takeoff", left, y);

    y += 12;
    doc.setFillColor(249, 250, 251);
    doc.rect(left, y, pageWidth, 28, "F");
    doc.setDrawColor(229, 231, 235);
    doc.rect(left, y, pageWidth, 28, "S");

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    const cementText = `Cement: ${cementConstituent?.quantity || 0} Bags`;
    const steelText = `Steel: ${steelConstituent?.quantity || 0} kg (${((steelConstituent?.quantity || 0) / 1000).toFixed(2)} MT)`;
    const sandText = `Sand: ${sandConstituent?.quantity || 0} cft`;
    const aggText = `Aggregate: ${aggregateConstituent?.quantity || 0} cft`;
    const bricksText = `Bricks: ${(bricksConstituent?.quantity || 0).toLocaleString("en-IN")} pcs`;

    doc.text(cementText, left + 10, y + 17);
    doc.text(steelText, left + 110, y + 17);
    doc.text(sandText, left + 225, y + 17);
    doc.text(aggText, left + 320, y + 17);
    doc.text(bricksText, left + 420, y + 17);

    y += 42;

    // ─── 3. Itemized Bill of Quantities Table ───
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("2. Itemized Bill of Quantities (IS 1200)", left, y);

    y += 12;
    doc.setFillColor(243, 244, 246);
    doc.rect(left, y, pageWidth, 18, "F");

    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99);
    doc.text("ITEM / TRADE SPECIFICATION", left + 8, y + 12);
    doc.text("QUANTITY", 300, y + 12);
    doc.text("RATE (INR)", 395, y + 12);
    doc.text("AMOUNT (INR)", right - 8, y + 12, { align: "right" });

    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);

    reportItems.forEach((item, idx) => {
      if (y > 720) {
        doc.addPage();
        y = 50;
      }
      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(left, y, pageWidth, 16, "F");
      }
      doc.setTextColor(17, 24, 39);
      doc.text(item.label.substring(0, 48), left + 8, y + 11);
      doc.text(String(item.quantity), 300, y + 11);
      doc.text(formatRupee(item.rate || 0), 395, y + 11);
      doc.text(formatRupee(item.cost), right - 8, y + 11, { align: "right" });
      y += 16;
    });

    y += 12;

    // ─── 4. Financial Summary Breakdown Box ───
    if (y > 670) {
      doc.addPage();
      y = 50;
    }

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(left, y, pageWidth, 84, 4, 4, "F");
    doc.setDrawColor(209, 213, 219);
    doc.roundedRect(left, y, pageWidth, 84, 4, 4, "S");

    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text("Civil & Finishes Materials Subtotal:", left + 14, y + 18);
    doc.text(formatRupee(materialCost), right - 14, y + 18, { align: "right" });

    doc.text("Labor, Shuttering & Masonry Execution (~40%):", left + 14, y + 34);
    doc.text(formatRupee(labourCost), right - 14, y + 34, { align: "right" });

    doc.text("Site Contingency, Freight & Wastage Allowance (5%):", left + 14, y + 50);
    doc.text(formatRupee(contingency), right - 14, y + 50, { align: "right" });

    doc.setDrawColor(229, 231, 235);
    doc.line(left + 14, y + 58, right - 14, y + 58);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text("GRAND TOTAL ESTIMATED COST:", left + 14, y + 74);
    doc.text(formatRupee(grandTotalCost), right - 14, y + 74, { align: "right" });

    y += 98;

    // ─── 5. Legal & Technical Compliance Disclaimer ───
    if (y > 750) {
      doc.addPage();
      y = 50;
    }
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    const disclaimer =
      "Estimation & Compliance Disclaimer: This preliminary Bill of Quantities and financial estimate is compiled pursuant to IS 1200 measurement standards for building works. Quantities are computed from drawing dimensions and current benchmark material rates. Final construction expenditure remains subject to structural RCC engineering drawings, geotechnical soil bearing capacity reports, and local vendor material pricing at the time of procurement. Not a binding fixed-bid civil contract.";
    doc.text(doc.splitTextToSize(disclaimer, pageWidth), left, y);

    doc.save(`${project.name.replace(/[^\w\- ]+/g, "")}-Executive-Report.pdf`);
    toast.success("Executive PDF report generated successfully!");
  };

  const downloadCsv = () => {
    const headers = ["Trade / Item Specification", "Quantity", "Rate (INR)", "Amount (INR)"];
    const rows = reportItems.map((i) => [`"${i.label}"`, `"${i.quantity}"`, i.rate || 0, i.cost]);
    const csv =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n") +
      `\nCivil Materials Subtotal,,,${materialCost}` +
      `\nLabor Allowance (40%),,,${labourCost}` +
      `\nContingency Buffer (5%),,,${contingency}` +
      `\nGrand Total Estimated Budget,,,${grandTotalCost}`;
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `${project.name.replace(/[^\w\- ]+/g, "")}-BOQ-Schedule.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV spreadsheet exported successfully!");
  };

  return (
    <div className="space-y-6">
      {/* ─── Header Controls ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">
            Executive Report & Revision Snapshots
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Concise, itemized civil deliverables prepared in accordance with IS 1200 quantity
            takeoff standards.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadPdf}
            className="inline-flex items-center gap-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer"
          >
            <Download size={13} /> Download PDF Report
          </button>
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ─── FORMATTED CONCISE EXECUTIVE REPORT PREVIEW CARD ─── */}
      <div className="rounded-[28px] border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ecffe0] dark:bg-zinc-900 border border-[#00f0a0]/40 px-2.5 py-0.5 text-[10px] font-bold text-black dark:text-[#00f0a0] mb-2 font-display uppercase tracking-wider">
              IS 1200 Civil Deliverable
            </div>
            <h3 className="text-2xl font-bold font-display text-foreground">{project.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Client:{" "}
              <span className="font-semibold text-foreground">
                {project.clientName || "Private Client"}
              </span>{" "}
              • Location:{" "}
              <span className="font-semibold text-foreground">
                {project.location || "Site Location"}
              </span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block font-display">
              Grand Total Budget
            </span>
            <span className="text-2xl font-black font-display text-foreground tabular-nums">
              {inr(grandTotalCost)}
            </span>
            {costPerSqFt > 0 && (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 block font-mono">
                {inr(costPerSqFt)} / sq.ft built-up
              </span>
            )}
          </div>
        </div>

        {/* 1. Key Scope Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-2xl bg-secondary/30 border border-border p-3.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-display">
              Carpet Area
            </span>
            <span className="text-lg font-bold font-display text-foreground tabular-nums block mt-0.5">
              {carpetSqFt.toLocaleString("en-IN")} sq.ft
            </span>
            <span className="text-[10px] text-muted-foreground">Internal room sum</span>
          </div>

          <div className="rounded-2xl bg-secondary/30 border border-border p-3.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-display">
              Built-Up Plinth
            </span>
            <span className="text-lg font-bold font-display text-foreground tabular-nums block mt-0.5">
              {builtUpSqFt.toLocaleString("en-IN")} sq.ft
            </span>
            <span className="text-[10px] text-muted-foreground">+20% structural footprint</span>
          </div>

          <div className="rounded-2xl bg-secondary/30 border border-border p-3.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-display">
              Functional Spaces
            </span>
            <span className="text-lg font-bold font-display text-foreground tabular-nums block mt-0.5">
              {paState.rooms.length} Rooms
            </span>
            <span className="text-[10px] text-muted-foreground">Architectural schedule</span>
          </div>

          <div className="rounded-2xl bg-secondary/30 border border-border p-3.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block font-display">
              Wall Perimeter
            </span>
            <span className="text-lg font-bold font-display text-foreground tabular-nums block mt-0.5">
              {paState.walls.reduce((s, w) => s + w.lengthFt, 0)} ft
            </span>
            <span className="text-[10px] text-muted-foreground">Masonry envelope & internal</span>
          </div>
        </div>

        {/* 2. Core Material Requirements (Zero bloat) */}
        <div>
          <h4 className="text-xs font-bold font-display uppercase tracking-wider text-muted-foreground mb-2.5">
            Core Structural Materials Takeoff
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
            <div className="rounded-xl border border-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground block font-medium">Cement</span>
              <span className="font-bold text-sm text-foreground block mt-0.5">
                {cementConstituent?.quantity || 0} Bags
              </span>
              <span className="text-[10px] text-muted-foreground">PPC / OPC 50kg</span>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground block font-medium">TMT Rebar</span>
              <span className="font-bold text-sm text-foreground block mt-0.5">
                {steelConstituent?.quantity || 0} kg
              </span>
              <span className="text-[10px] text-muted-foreground">
                {((steelConstituent?.quantity || 0) / 1000).toFixed(2)} Metric Tonnes
              </span>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground block font-medium">
                River / M-Sand
              </span>
              <span className="font-bold text-sm text-foreground block mt-0.5">
                {sandConstituent?.quantity || 0} cft
              </span>
              <span className="text-[10px] text-muted-foreground">Zone II fine aggregate</span>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground block font-medium">
                Coarse Aggregate
              </span>
              <span className="font-bold text-sm text-foreground block mt-0.5">
                {aggregateConstituent?.quantity || 0} cft
              </span>
              <span className="text-[10px] text-muted-foreground">20mm / 10mm metal</span>
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground block font-medium">
                Modular Bricks
              </span>
              <span className="font-bold text-sm text-foreground block mt-0.5">
                {(bricksConstituent?.quantity || 0).toLocaleString("en-IN")} pcs
              </span>
              <span className="text-[10px] text-muted-foreground">IS 2212 Class 1</span>
            </div>
          </div>
        </div>

        {/* 3. Concise BOQ Table */}
        <div>
          <h4 className="text-xs font-bold font-display uppercase tracking-wider text-muted-foreground mb-2.5">
            Itemized Bill of Quantities Summary
          </h4>
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground font-display uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Trade Specification</th>
                  <th className="px-4 py-2.5 font-bold">Quantity</th>
                  <th className="px-4 py-2.5 font-bold">Market Rate (₹)</th>
                  <th className="px-4 py-2.5 font-bold text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reportItems.map((item) => (
                  <tr key={item.slug} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.label}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.quantity}</td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                      {inr(item.rate || 0)}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-bold text-foreground text-right">
                      {inr(item.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Financial Summary Breakdown */}
        <div className="rounded-2xl bg-secondary/30 border border-border p-4 sm:p-5 space-y-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Civil & Finishing Materials Subtotal:</span>
            <span className="font-mono font-semibold text-foreground">{inr(materialCost)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Labor & Skilled Masonry Execution Allowance (~40%):</span>
            <span className="font-mono font-semibold text-foreground">{inr(labourCost)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Site Contingency, Freight & Wastage Allowance (5%):</span>
            <span className="font-mono font-semibold text-foreground">{inr(contingency)}</span>
          </div>
          <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold text-foreground">
            <span className="font-display">Grand Total Estimated Project Budget:</span>
            <span className="text-base font-black font-display text-foreground">
              {inr(grandTotalCost)}
            </span>
          </div>
        </div>

        {/* 5. Legal & Technical Disclaimer */}
        <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border font-light">
          <strong className="font-semibold text-foreground">Estimation & Compliance Basis:</strong>{" "}
          This preliminary Bill of Quantities and cost report is compiled pursuant to IS 1200
          measurement conventions for building works. All quantities are derived from drawing
          geometry and current benchmark market rates. Final construction expenditure remains
          subject to structural RCC engineering drawings, geotechnical soil investigations, and
          local vendor material pricing at the time of procurement. Not a binding fixed-bid civil
          contract.
        </p>
      </div>

      {/* ─── Revision Snapshots Card ─── */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary" />
            <h3 className="font-bold text-sm font-display">Version History Snapshots</h3>
          </div>
          <button
            onClick={onSaveVersion}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Save size={13} /> Save Snapshot
          </button>
        </div>

        {!project.versions || project.versions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No version snapshots recorded yet. Click &quot;Save Snapshot&quot; to bookmark your
            current estimate.
          </p>
        ) : (
          <div className="divide-y divide-border text-xs">
            {project.versions.map((v, idx) => (
              <div key={v.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground font-display">Version {idx + 1}</span>
                  <span className="text-muted-foreground ml-3">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="font-bold tabular-nums text-primary font-mono">
                  {inr(v.totalCost)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
