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
} from "lucide-react";
import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
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
  inrPa,
  boqTotal,
} from "@/lib/plan-analysis-store";
import { useMaterialStore } from "@/lib/material-store";

export const Route = createFileRoute("/project")({
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

type ProjectTab = "plan" | "takeoff" | "boq" | "calculators" | "cost" | "reports";

export function ProjectModularWorkspace() {
  const { projects } = useAppStore();
  const project = useActiveProject() || projects[0];
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ProjectTab>("plan");
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerName, setHeaderName] = useState(project?.name || "");
  const [headerClient, setHeaderClient] = useState(project?.clientName || "");
  const [headerLocation, setHeaderLocation] = useState(project?.location || "");

  // Update local header state if project changes
  const lastProjectIdRef = useRef(project?.id);
  if (project && project.id !== lastProjectIdRef.current) {
    lastProjectIdRef.current = project.id;
    setHeaderName(project.name);
    setHeaderClient(project.clientName || "");
    setHeaderLocation(project.location || "");
  }

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
    updateActiveProject({
      name: headerName.trim() || project.name,
      clientName: headerClient.trim(),
      location: headerLocation.trim(),
      savedAt: new Date().toISOString(),
    });
    setIsEditingHeader(false);
    toast.success("Project details saved successfully!");
  };

  const handleSaveVersion = () => {
    saveVersion();
    updateActiveProject({ savedAt: new Date().toISOString() });
    toast.success("Project version snapshot saved!");
  };

  const materialCost = totalCost(project.items);
  const labourCost = materialCost * 0.4;
  const contingency = (materialCost + labourCost) * 0.05;
  const grandTotalCost = materialCost + labourCost + contingency;

  return (
    <Page>
      {/* ─── Top Project Command Header ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Project Details / Inline Editor */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <FolderOpen size={14} /> Modular Project Workspace
            </div>

            {isEditingHeader ? (
              <div className="mt-2 space-y-3 max-w-lg">
                <input
                  type="text"
                  value={headerName}
                  onChange={(e) => setHeaderName(e.target.value)}
                  placeholder="Project Name"
                  className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-base font-bold outline-none focus:border-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={headerClient}
                    onChange={(e) => setHeaderClient(e.target.value)}
                    placeholder="Client Name"
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium outline-none focus:border-primary"
                  />
                  <input
                    type="text"
                    value={headerLocation}
                    onChange={(e) => setHeaderLocation(e.target.value)}
                    placeholder="Site Location"
                    className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium outline-none focus:border-primary"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveHeaderDetails}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
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
                    className="rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
                    {project.name}
                  </h1>
                  <button
                    onClick={() => setIsEditingHeader(true)}
                    className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                    title="Edit project details"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User size={13} /> {project.clientName || "Client Not Specified"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> {project.location || "Site Location Not Specified"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions & Project Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Switcher Dropdown */}
            {projects.length > 1 && (
              <select
                value={project.id}
                onChange={(e) => {
                  setActiveProject(e.target.value);
                  const selected = projects.find((p) => p.id === e.target.value);
                  if (selected) toast.info(`Switched to ${selected.name}`);
                }}
                className="rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer hover:bg-secondary transition-colors"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* Save New Project / Save Changes Button (ALWAYS ENABLED) */}
            <button
              type="button"
              onClick={handleSaveVersion}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              title="Save project snapshot and record version"
            >
              <Save size={15} /> Save Project Snapshot
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <Plus size={14} /> New Project
            </Link>
          </div>
        </div>

        {/* Financial KPI Banner */}
        <div className="mt-6 pt-5 border-t border-border/70 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-secondary/40 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Material Cost (BOQ)
            </span>
            <span className="text-lg font-bold text-foreground tabular-nums block mt-0.5">
              {inr(materialCost)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {project.items.length} materials included
            </span>
          </div>

          <div className="rounded-lg bg-secondary/40 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Estimated Labour
            </span>
            <span className="text-lg font-bold text-foreground tabular-nums block mt-0.5">
              {inr(labourCost)}
            </span>
            <span className="text-[11px] text-muted-foreground">~40% industry thumb-rule</span>
          </div>

          <div className="rounded-lg bg-secondary/40 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Contingency (5%)
            </span>
            <span className="text-lg font-bold text-foreground tabular-nums block mt-0.5">
              {inr(contingency)}
            </span>
            <span className="text-[11px] text-muted-foreground">Overheads & site variance</span>
          </div>

          <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
              Total Project Budget
            </span>
            <span className="text-xl font-extrabold text-primary tabular-nums block mt-0.5">
              {inr(grandTotalCost)}
            </span>
            <span className="text-[11px] text-muted-foreground">All construction trades</span>
          </div>
        </div>
      </div>

      {/* ─── Modular Monolith Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto mb-8">
        {[
          { id: "plan" as const, label: "📐 Plan & Drawings", desc: "Upload Blueprint" },
          { id: "takeoff" as const, label: "📏 Dimensions & Takeoff", desc: "QS Quantities" },
          { id: "boq" as const, label: "📋 Bill of Quantities", desc: "Rates & Amounts" },
          { id: "calculators" as const, label: "🧮 Project Calculators", desc: "Add Materials" },
          { id: "cost" as const, label: "📊 Cost & Analytics", desc: "Budget Breakdown" },
          { id: "reports" as const, label: "📄 Reports & Versions", desc: "PDF & Revisions" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-start px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-all whitespace-nowrap rounded-t-lg ${
              activeTab === tab.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[10px] font-normal text-muted-foreground mt-0.5">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: Plan & Blueprint Upload Module ────────────────────────────── */}
      {activeTab === "plan" && <ModulePlanDrawings projectId={project.id} />}

      {/* ─── TAB 2: Dimensions & Quantity Takeoff Module ──────────────────────── */}
      {activeTab === "takeoff" && (
        <ModuleDimensionsTakeoff projectId={project.id} onSyncToBOQ={() => setActiveTab("boq")} />
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
// SUB-MODULE 1: Plan Drawings & Blueprint Upload
// ─────────────────────────────────────────────────────────────────────────────
function ModulePlanDrawings({ projectId }: { projectId: string }) {
  const state = usePlanAnalysisStore(projectId);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
        toast.success(`Plan image "${file.name}" loaded successfully!`);
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

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Architectural Plan & Drawings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attach blueprints (JPG, PNG, PDF) to derive room dimensions and quantity takeoffs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <UploadCloud size={15} /> Upload Plan File
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
        </div>
      </div>

      {/* Plan Preview & Upload Zone */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {state.file?.previewDataUrl ? (
          <div className="relative bg-zinc-950 p-6 flex flex-col items-center justify-center min-h-[360px] max-h-[500px] overflow-hidden">
            <img
              src={state.file.previewDataUrl}
              alt="Architectural Plan Blueprint"
              className="max-h-[460px] w-auto object-contain rounded-lg shadow-lg"
            />
          </div>
        ) : (
          /* SVG Blueprint Visualizer */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative min-h-[300px] bg-white dark:bg-zinc-900 p-8 flex flex-col items-center justify-center text-center transition-all ${
              isDragging ? "bg-primary/10 border-2 border-dashed border-primary" : ""
            }`}
          >
            <svg
              viewBox="0 0 400 240"
              className="max-h-56 w-full text-foreground/80 mb-4"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="20" y="20" width="360" height="200" stroke="currentColor" strokeWidth="3" />
              <line x1="20" y1="120" x2="220" y2="120" stroke="currentColor" strokeWidth="2" />
              <line x1="220" y1="20" x2="220" y2="220" stroke="currentColor" strokeWidth="2" />
              <line x1="220" y1="140" x2="380" y2="140" stroke="currentColor" strokeWidth="2" />
              <text
                x="120"
                y="75"
                textAnchor="middle"
                className="text-[12px] font-bold fill-foreground"
              >
                Living Hall (14' × 16')
              </text>
              <text
                x="120"
                y="175"
                textAnchor="middle"
                className="text-[12px] font-bold fill-foreground"
              >
                Master Bed (12' × 14')
              </text>
              <text
                x="300"
                y="80"
                textAnchor="middle"
                className="text-[11px] font-semibold fill-foreground"
              >
                Kitchen & Dining
              </text>
              <text
                x="300"
                y="185"
                textAnchor="middle"
                className="text-[11px] font-semibold fill-foreground"
              >
                Bed 2 (11' × 12')
              </text>
            </svg>
            <p className="text-xs font-semibold text-foreground">
              Drag and drop an image or blueprint here, or click Upload Plan File above.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Supports high-resolution architectural JPG, PNG, and PDF drawings.
            </p>
          </div>
        )}

        <div className="border-t border-border px-5 py-3.5 bg-secondary/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <FileImage size={15} className="text-primary" />
            <span className="font-semibold text-foreground">
              {state.file?.name || "Standard Architectural Blueprint (Extracted)"}
            </span>
            {state.file && (
              <span className="text-muted-foreground">
                ({(state.file.sizeBytes / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                paSetFile(
                  {
                    name: "Sample_Architectural_FloorPlan.png",
                    sizeBytes: 1024 * 450,
                    uploadedAt: new Date().toISOString(),
                  },
                  projectId,
                );
                toast.success("Loaded blueprint template.");
              }}
              className="text-primary hover:underline font-semibold"
            >
              Load Sample Blueprint
            </button>
            {state.file && (
              <button
                onClick={() => {
                  paReset(projectId);
                  toast.info("Cleared plan drawing.");
                }}
                className="text-destructive hover:underline font-semibold ml-2"
              >
                Clear Plan
              </button>
            )}
          </div>
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
}: {
  projectId: string;
  onSyncToBOQ: () => void;
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
        </div>
      </div>

      {/* Derived Quantities Summary Cards */}
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
              {state.constituents?.map((c) => (
                <tr key={c.label} className="hover:bg-muted/40 transition-colors">
                  <td className="p-3 font-semibold text-foreground">{c.label}</td>
                  <td className="p-3 font-bold text-sm text-primary tabular-nums">
                    {c.quantity.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3 text-muted-foreground font-medium">{c.unit}</td>
                  <td className="p-3 text-muted-foreground">{c.basis}</td>
                </tr>
              ))}
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
                  <th className="p-2 font-medium">L (ft)</th>
                  <th className="p-2 font-medium">W (ft)</th>
                  <th className="p-2 font-medium">Area (sq.ft)</th>
                  <th className="p-2 font-medium text-right">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.rooms.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2 tabular-nums">
                      <input
                        type="number"
                        value={r.lengthFt}
                        onChange={(e) =>
                          paUpdateRoom(r.id, { lengthFt: Number(e.target.value) }, projectId)
                        }
                        className="w-14 rounded border border-input bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary"
                      />
                    </td>
                    <td className="p-2 tabular-nums">
                      <input
                        type="number"
                        value={r.widthFt}
                        onChange={(e) =>
                          paUpdateRoom(r.id, { widthFt: Number(e.target.value) }, projectId)
                        }
                        className="w-14 rounded border border-input bg-background px-1.5 py-0.5 text-xs outline-none focus:border-primary"
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
                ))}
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
  if (!project) return null;

  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 50;
    const right = 545;
    const rupees = (n: number) => inr(n).replace("₹", "Rs. ");
    let y = 60;

    doc.setFillColor(20, 50, 120);
    doc.rect(0, 0, 595, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("BUILDWISE CONSTRUCTION REPORT", left, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Project: ${project.name} • Location: ${project.location || "Site"}`, left, 68);

    doc.setTextColor(30, 30, 30);
    y = 120;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Itemized Bill of Quantities", left, y);

    y += 18;
    doc.setFillColor(235, 242, 255);
    doc.rect(left, y - 12, right - left, 22, "F");
    doc.setFontSize(9);
    doc.setTextColor(50, 70, 100);
    doc.text("ITEM", left + 8, y + 2);
    doc.text("QTY", 280, y + 2);
    doc.text("RATE", 370, y + 2);
    doc.text("AMOUNT", right - 8, y + 2, { align: "right" });

    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);

    project.items.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 253);
        doc.rect(left, y - 12, right - left, 20, "F");
      }
      doc.text(item.label, left + 8, y + 2);
      doc.text(item.quantity, 280, y + 2);
      doc.text(rupees(item.rate || 0), 370, y + 2);
      doc.text(rupees(item.cost), right - 8, y + 2, { align: "right" });
      y += 20;
    });

    y += 10;
    doc.setFillColor(20, 50, 120);
    doc.rect(left, y, right - left, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Total Material Cost:", left + 10, y + 20);
    doc.text(rupees(totalCost(project.items)), right - 10, y + 20, { align: "right" });

    doc.save(`${project.name.replace(/[^\w\- ]+/g, "")}-Estimate.pdf`);
    toast.success("PDF report downloaded successfully!");
  };

  const downloadCsv = () => {
    const headers = ["Item", "Quantity", "Rate (₹)", "Cost (₹)"];
    const rows = project.items.map((i) => [`"${i.label}"`, `"${i.quantity}"`, i.rate || 0, i.cost]);
    const csv =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n") +
      `\nTotal Material Cost,,,${totalCost(project.items)}`;
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `${project.name.replace(/[^\w\- ]+/g, "")}-BOQ.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV spreadsheet exported successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Reports & Revision Snapshots</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Export professional deliverables and preserve version snapshots for this project.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadPdf}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Download size={14} /> Download PDF Report
          </button>
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <FileSpreadsheet size={14} /> Export CSV / Excel
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-primary" />
            <h3 className="font-bold text-sm">Version History Snapshots</h3>
          </div>
          {/* ALWAYS ENABLED SAVE BUTTON */}
          <button
            onClick={onSaveVersion}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save size={13} /> Save New Version Snapshot
          </button>
        </div>

        {!project.versions || project.versions.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No version snapshots recorded yet. Click "Save New Version Snapshot" to bookmark your
            current estimate.
          </p>
        ) : (
          <div className="divide-y divide-border text-xs">
            {project.versions.map((v, idx) => (
              <div key={v.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground">Version {idx + 1}</span>
                  <span className="text-muted-foreground ml-3">
                    {new Date(v.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="font-bold tabular-nums text-primary">{inr(v.totalCost)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
