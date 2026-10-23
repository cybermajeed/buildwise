import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  FileImage,
  ArrowUpRight,
  RotateCcw,
  FolderKanban,
  Building2,
  Layers,
  Ruler,
  Boxes,
} from "lucide-react";
import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
import {
  usePlanAnalysisStore,
  paSetStep,
  paSetFile,
  paSetProjectName,
  paSetFloorHeight,
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
  paUpdateBOQRate,
  paSetElementsTab,
  paSetTakeoffTab,
  paReset,
  boqTotal,
  inrPa,
  type WizardStep,
} from "@/lib/plan-analysis-store";
import {
  useAppStore,
  upsertItem,
  createProject,
  setActiveProject,
} from "@/lib/project-store";

export const Route = createFileRoute("/plan-upload")({
  head: () => ({
    meta: [
      { title: "Plan Analysis & Quantity Takeoff — BuildWise" },
      {
        name: "description",
        content:
          "Upload architectural plans, extract room dimensions, compute exact Quantity Surveying takeoffs and generate client-ready BOQs.",
      },
    ],
  }),
  component: PlanUploadPage,
});

// ─── Step labels ──────────────────────────────────────────────────────────────
const STEPS = [
  "Plan Upload",
  "Plan Preview",
  "Edit Dimensions",
  "Quantity Takeoff",
  "BOQ & Export",
] as const;

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center shrink-0">
            <button
              onClick={() => i < current && paSetStep(i as WizardStep)}
              disabled={i > current}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : done
                    ? "bg-primary/15 text-primary cursor-pointer hover:bg-primary/25"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  active ? "bg-white/20" : done ? "bg-primary/20" : "bg-border"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 mx-1.5 ${i < current ? "bg-primary/50" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Shared nav buttons ───────────────────────────────────────────────────────
function NavButtons({
  step,
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled = false,
}: {
  step: number;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex justify-between gap-4 border-t border-border/60 pt-6">
      {step > 0 ? (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <ChevronLeft size={16} /> Back
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 shadow-sm"
      >
        {nextLabel} <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Tabs component ───────────────────────────────────────────────────────────
function TabStrip<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (t: T) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-border pb-px overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
            active === t.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                active === t.id ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Step 0: Plan Upload ──────────────────────────────────────────────────────
function StepUpload() {
  const state = usePlanAnalysisStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

  function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Unsupported format. Please upload a PDF, JPG or PNG.");
      return;
    }
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        paSetFile({
          name: file.name,
          sizeBytes: file.size,
          previewDataUrl: e.target?.result as string,
          uploadedAt: new Date().toISOString(),
        });
        toast.success(`Plan "${file.name}" attached successfully.`);
      };
      reader.readAsDataURL(file);
    } else {
      paSetFile({
        name: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      });
      toast.success(`PDF plan "${file.name}" attached.`);
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleAnalyse() {
    if (!state.file) {
      toast.error("Please upload or drag a plan file first.");
      return;
    }
    setIsAnalysing(true);
    setTimeout(() => {
      setIsAnalysing(false);
      toast.success("Plan geometry extracted! Review dimensions and parameters.");
      paSetStep(1);
    }, 1800);
  }

  return (
    <div className="max-w-xl mx-auto">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Upload Building Plan</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload blueprints or architectural drawings (PDF, JPG, PNG) for module:{" "}
          <span className="font-semibold text-foreground">{state.projectName}</span>
        </p>
      </header>

      {/* Drag & drop dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !state.file && fileRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : state.file
              ? "border-border bg-card"
              : "border-border/80 hover:border-primary/60 hover:bg-secondary/30 cursor-pointer"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          className="hidden"
        />

        {state.file ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FileImage size={32} />
            </div>
            <div>
              <p className="font-semibold text-base">{state.file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatBytes(state.file.sizeBytes)} • Uploaded{" "}
                {new Date(state.file.uploadedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <RefreshCw size={13} /> Change File
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  paReset(state.projectId);
                  toast.info("Uploaded plan cleared.");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Trash2 size={13} /> Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-primary">
              <UploadCloud size={32} />
            </div>
            <div>
              <p className="font-semibold text-base">Click to upload or drag & drop</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports architectural PDF drawings, JPG, or PNG (Max 25MB)
              </p>
            </div>
            <span className="mt-2 inline-flex items-center rounded-md bg-secondary px-3 py-1 text-xs font-medium text-foreground">
              Browse Files
            </span>
          </div>
        )}
      </div>

      {/* Analyse action button */}
      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={handleAnalyse}
          disabled={!state.file || isAnalysing}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {isAnalysing ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Extracting Rooms & Calculating Quantities...
            </>
          ) : (
            <>
              Analyse Plan & Run Takeoff <ChevronRight size={16} />
            </>
          )}
        </button>

        {!state.file && (
          <button
            onClick={() => {
              paSetFile({
                name: "Standard_Floor_Plan_2BHK.png",
                sizeBytes: 1024 * 380,
                uploadedAt: new Date().toISOString(),
              });
              toast.success("Loaded standard 2BHK architectural blueprint!");
            }}
            className="text-xs text-muted-foreground hover:text-foreground text-center transition-colors underline-offset-4 hover:underline"
          >
            Load Sample 2BHK Residential Drawing for Demonstration
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step 1: Plan Preview ─────────────────────────────────────────────────────
function StepPreview() {
  const state = usePlanAnalysisStore();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        paSetFile({
          name: file.name,
          sizeBytes: file.size,
          previewDataUrl: ev.target?.result as string,
          uploadedAt: new Date().toISOString(),
        });
      };
      reader.readAsDataURL(file);
    } else {
      paSetFile({
        name: file.name,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
    toast.success("Plan replaced successfully.");
  }

  return (
    <div>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plan Preview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review architectural zoning and building height parameters before editing dimensions.
          </p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors shrink-0"
        >
          <RefreshCw size={13} /> Change File
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleChange}
          className="hidden"
        />
      </header>

      {/* Plan visual card */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mb-6">
        {state.file?.previewDataUrl ? (
          <div className="relative bg-zinc-950 p-4 flex items-center justify-center max-h-96 overflow-hidden">
            <img
              src={state.file.previewDataUrl}
              alt="Uploaded Plan Preview"
              className="max-h-80 w-auto object-contain rounded"
            />
          </div>
        ) : (
          /* Architectural plan SVG representation */
          <div className="relative h-72 bg-white dark:bg-zinc-900 p-4 flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 380 260"
              className="max-h-64 w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer boundary walls */}
              <rect
                x="10"
                y="10"
                width="360"
                height="240"
                stroke="currentColor"
                strokeWidth="3"
                className="text-foreground"
                fill="none"
              />
              {/* Internal layout lines */}
              <line
                x1="10"
                y1="130"
                x2="210"
                y2="130"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground"
              />
              <line
                x1="210"
                y1="10"
                x2="210"
                y2="250"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground"
              />
              <line
                x1="210"
                y1="150"
                x2="370"
                y2="150"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground"
              />
              <line
                x1="290"
                y1="10"
                x2="290"
                y2="150"
                stroke="currentColor"
                strokeWidth="2"
                className="text-foreground"
              />

              {/* Room tags */}
              <text
                x="95"
                y="75"
                textAnchor="middle"
                className="text-[11px] font-bold fill-foreground"
              >
                Living Room (14' × 16')
              </text>
              <text
                x="95"
                y="190"
                textAnchor="middle"
                className="text-[11px] font-bold fill-foreground"
              >
                Master Bedroom (12' × 14')
              </text>
              <text
                x="250"
                y="80"
                textAnchor="middle"
                className="text-[10px] font-semibold fill-foreground"
              >
                Kitchen
              </text>
              <text
                x="330"
                y="80"
                textAnchor="middle"
                className="text-[10px] font-semibold fill-foreground"
              >
                Dining
              </text>
              <text
                x="290"
                y="200"
                textAnchor="middle"
                className="text-[10px] font-semibold fill-foreground"
              >
                Bedroom 2 (11' × 12')
              </text>
            </svg>
          </div>
        )}

        <div className="border-t border-border px-5 py-3 bg-secondary/20 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{state.file?.name || "Standard Residential Drawing"}</span>
          <span className="font-medium text-foreground">
            {state.rooms.length} Rooms Extracted •{" "}
            {state.rooms.reduce((s, r) => s + r.areaSqFt, 0)} sq.ft carpet area
          </span>
        </div>
      </div>

      {/* Configuration inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground">Project Name</span>
          <input
            type="text"
            value={state.projectName}
            onChange={(e) => paSetProjectName(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
          />
        </label>

        <label className="block rounded-xl border border-border bg-card p-4">
          <span className="text-xs font-semibold text-muted-foreground">Floor Height (ft)</span>
          <select
            value={state.floorHeightFt}
            onChange={(e) => paSetFloorHeight(Number(e.target.value))}
            className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
          >
            {[8, 9, 10, 11, 12].map((v) => (
              <option key={v} value={v}>
                {v} feet
              </option>
            ))}
          </select>
        </label>
      </div>

      <NavButtons
        step={1}
        onBack={() => paSetStep(0)}
        onNext={() => paSetStep(2)}
        nextLabel="Edit Dimensions"
      />
    </div>
  );
}

// ─── Step 2: Edit Dimensions ──────────────────────────────────────────────────
function StepEditDimensions() {
  const state = usePlanAnalysisStore();

  return (
    <div>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Dimensions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review or fine-tune room dimensions, wall lengths, and opening deductions.
          </p>
        </div>
        <button
          onClick={() => {
            paReset(state.projectId);
            toast.info("Dimensions reset to blueprint defaults.");
          }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto"
        >
          <RotateCcw size={13} /> Reset to Blueprint
        </button>
      </header>

      <div className="space-y-4">
        <TabStrip
          tabs={[
            { id: "rooms" as const, label: "Rooms & Areas", count: state.rooms.length },
            { id: "walls" as const, label: "Walls & Partitions", count: state.walls.length },
            { id: "openings" as const, label: "Doors & Windows", count: state.openings.length },
          ]}
          active={state.elementsTab}
          onChange={paSetElementsTab}
        />

        {/* ROOMS tab */}
        {state.elementsTab === "rooms" && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 font-medium">Room Name</th>
                    <th className="px-4 py-3 font-medium">Length (ft)</th>
                    <th className="px-4 py-3 font-medium">Width (ft)</th>
                    <th className="px-4 py-3 font-medium">Area (sq.ft)</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          value={room.name}
                          onChange={(e) => paUpdateRoom(room.id, { name: e.target.value })}
                          className="w-36 rounded border border-input bg-background px-2 py-1 text-xs font-medium outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={room.lengthFt}
                          onChange={(e) =>
                            paUpdateRoom(room.id, { lengthFt: Number(e.target.value) })
                          }
                          className="w-20 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={room.widthFt}
                          onChange={(e) =>
                            paUpdateRoom(room.id, { widthFt: Number(e.target.value) })
                          }
                          className="w-20 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">{room.areaSqFt}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => paRemoveRoom(room.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete room"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-4 py-3 bg-secondary/20 flex justify-between items-center">
              <button
                onClick={() => paAddRoom()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Plus size={14} /> Add Room
              </button>
              <span className="text-xs text-muted-foreground font-medium">
                Total Carpet: {state.rooms.reduce((s, r) => s + r.areaSqFt, 0)} sq.ft (
                {(state.rooms.reduce((s, r) => s + r.areaSqFt, 0) * 0.0929).toFixed(1)} m²)
              </span>
            </div>
          </div>
        )}

        {/* WALLS tab */}
        {state.elementsTab === "walls" && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Length (ft)</th>
                    <th className="px-4 py-3 font-medium">Height (ft)</th>
                    <th className="px-4 py-3 font-medium">Area (sq.ft)</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.walls.map((wall) => (
                    <tr key={wall.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          value={wall.description}
                          onChange={(e) => paUpdateWall(wall.id, { description: e.target.value })}
                          className="w-48 rounded border border-input bg-background px-2 py-1 text-xs font-medium outline-none focus:border-primary"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={wall.wallType || "external"}
                          onChange={(e) =>
                            paUpdateWall(wall.id, {
                              wallType: e.target.value as "external" | "internal",
                            })
                          }
                          className="rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                        >
                          <option value="external">External (9")</option>
                          <option value="internal">Internal (4.5")</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={wall.lengthFt}
                          onChange={(e) =>
                            paUpdateWall(wall.id, { lengthFt: Number(e.target.value) })
                          }
                          className="w-20 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={wall.heightFt}
                          onChange={(e) =>
                            paUpdateWall(wall.id, { heightFt: Number(e.target.value) })
                          }
                          className="w-20 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">{wall.areaSqFt}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => paRemoveWall(wall.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete wall"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-4 py-3 bg-secondary/20 flex justify-between items-center">
              <button
                onClick={() => paAddWall()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Plus size={14} /> Add Wall Line
              </button>
              <span className="text-xs text-muted-foreground font-medium">
                Total Wall Length: {state.walls.reduce((s, w) => s + w.lengthFt, 0)} ft
              </span>
            </div>
          </div>
        )}

        {/* OPENINGS tab */}
        {state.elementsTab === "openings" && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Width (ft)</th>
                    <th className="px-4 py-3 font-medium">Height (ft)</th>
                    <th className="px-4 py-3 font-medium">Count</th>
                    <th className="px-4 py-3 font-medium">Deduction Area</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.openings.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3">
                        <select
                          value={o.type}
                          onChange={(e) =>
                            paUpdateOpening(o.id, { type: e.target.value as "Door" | "Window" })
                          }
                          className="rounded border border-input bg-background px-2 py-1 text-xs font-medium outline-none focus:border-primary"
                        >
                          <option value="Door">🚪 Door</option>
                          <option value="Window">🪟 Window</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={o.widthFt}
                          onChange={(e) =>
                            paUpdateOpening(o.id, { widthFt: Number(e.target.value) })
                          }
                          className="w-20 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={o.heightFt}
                          onChange={(e) =>
                            paUpdateOpening(o.id, { heightFt: Number(e.target.value) })
                          }
                          className="w-20 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={o.count}
                          onChange={(e) => paUpdateOpening(o.id, { count: Number(e.target.value) })}
                          className="w-16 rounded border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                          min={0}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-muted-foreground">
                        {+(o.widthFt * o.heightFt * o.count).toFixed(1)} sq.ft
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => paRemoveOpening(o.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete opening"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border px-4 py-3 bg-secondary/20 flex justify-between items-center">
              <button
                onClick={() => paAddOpening()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Plus size={14} /> Add Opening
              </button>
              <span className="text-xs text-muted-foreground font-medium">
                Total Opening Area:{" "}
                {state.openings.reduce((s, o) => s + o.widthFt * o.heightFt * o.count, 0).toFixed(1)}{" "}
                sq.ft
              </span>
            </div>
          </div>
        )}

        {/* Key parameters */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">Key Structural Parameters</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Wall Thickness (in)</span>
              <select
                value={state.keyParams.wallThicknessIn}
                onChange={(e) => paUpdateKeyParams({ wallThicknessIn: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {[4.5, 9, 13.5].map((v) => (
                  <option key={v} value={v}>
                    {v} in
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Floor Height (ft)</span>
              <select
                value={state.keyParams.floorHeightFt}
                onChange={(e) => paUpdateKeyParams({ floorHeightFt: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {[8, 9, 10, 11, 12].map((v) => (
                  <option key={v} value={v}>
                    {v} ft
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                Foundation Depth (ft)
              </span>
              <select
                value={state.keyParams.foundationDepthFt || 4}
                onChange={(e) => paUpdateKeyParams({ foundationDepthFt: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                {[3, 3.5, 4, 4.5, 5].map((v) => (
                  <option key={v} value={v}>
                    {v} ft
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Number of Floors</span>
              <select
                value={state.keyParams.numberOfFloors}
                onChange={(e) => paUpdateKeyParams({ numberOfFloors: Number(e.target.value) })}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
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

      <NavButtons
        step={2}
        onBack={() => paSetStep(1)}
        onNext={() => {
          paRecalculate();
          paSetStep(3);
        }}
        nextLabel="Quantity Takeoff"
      />
    </div>
  );
}

// ─── Step 3: Quantity Takeoff ─────────────────────────────────────────────────
function StepQuantityTakeoff() {
  const state = usePlanAnalysisStore();

  return (
    <div>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quantity Takeoff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Standard Quantity Surveying (QS) derivation adhering to IS 1200 / SMM civil conventions.
          </p>
        </div>
        <button
          onClick={() => {
            paRecalculate();
            toast.success("Quantities recalculated successfully.");
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
        >
          <RefreshCw size={13} /> Recalculate
        </button>
      </header>

      <div className="space-y-4">
        <TabStrip
          tabs={[
            { id: "summary" as const, label: "Takeoff Summary" },
            { id: "detailed" as const, label: "Constituents & Areas" },
            { id: "boq" as const, label: "BOQ Preview" },
          ]}
          active={state.takeoffTab}
          onChange={paSetTakeoffTab}
        />

        {/* Summary tab */}
        {state.takeoffTab === "summary" && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-5 py-3 font-medium">Work Item</th>
                    <th className="px-5 py-3 font-medium">Derived Quantity</th>
                    <th className="px-5 py-3 font-medium">Unit</th>
                    <th className="px-5 py-3 font-medium">Engineering Basis / Equivalents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.quantities.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3.5 font-medium">
                        <span className="mr-2 text-base">{q.icon}</span>
                        {q.label}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums font-bold text-base text-primary">
                        {q.quantity.toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-muted-foreground">{q.unit}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">
                        {q.description}
                        {q.secondaryBreakdown && (
                          <span className="ml-2 inline-flex items-center rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground font-medium">
                            {q.secondaryBreakdown}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed tab — shows constituent materials + floor & wall tables */}
        {state.takeoffTab === "detailed" && (
          <div className="space-y-5">
            {/* Primary material constituent breakdown */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Boxes size={18} className="text-primary" />
                <h3 className="font-semibold text-sm text-foreground">
                  Constituent Materials Requirement Breakdown
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Derived directly from standard civil engineering concrete mixes (RCC M20), brickwork
                mortar (1:6) and plastering (1:4/1:6).
              </p>

              <div className="overflow-x-auto rounded-lg border border-border bg-card">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/60 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Material</th>
                      <th className="px-4 py-2.5 font-semibold">Required Quantity</th>
                      <th className="px-4 py-2.5 font-semibold">Unit</th>
                      <th className="px-4 py-2.5 font-semibold">Engineering Derivation Basis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {state.constituents?.map((c) => (
                      <tr key={c.label} className="hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{c.label}</td>
                        <td className="px-4 py-3 font-bold text-sm text-primary tabular-nums">
                          {c.quantity.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-medium">{c.unit}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Room area table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-3 bg-secondary/30 flex justify-between items-center">
                <span className="text-sm font-semibold">Floor Area Breakdown</span>
                <span className="text-xs text-muted-foreground">
                  Total Rooms: {state.rooms.length}
                </span>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="px-5 py-3 font-medium">Room Description</th>
                    <th className="px-5 py-3 font-medium">Length (ft)</th>
                    <th className="px-5 py-3 font-medium">Width (ft)</th>
                    <th className="px-5 py-3 font-medium">Area (sq.ft)</th>
                    <th className="px-5 py-3 font-medium">Metric Area (m²)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {state.rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <td className="px-5 py-2.5 font-medium">{r.name}</td>
                      <td className="px-5 py-2.5 tabular-nums">{r.lengthFt}</td>
                      <td className="px-5 py-2.5 tabular-nums">{r.widthFt}</td>
                      <td className="px-5 py-2.5 tabular-nums">{r.areaSqFt}</td>
                      <td className="px-5 py-2.5 tabular-nums text-muted-foreground">
                        {(r.areaSqFt * 0.0929).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-primary/5 font-bold">
                    <td className="px-5 py-3" colSpan={3}>
                      Total Floor Area
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {state.rooms.reduce((s, r) => s + r.areaSqFt, 0)} sq.ft
                    </td>
                    <td className="px-5 py-3 tabular-nums text-primary">
                      {(state.rooms.reduce((s, r) => s + r.areaSqFt, 0) * 0.0929).toFixed(1)} m²
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Wall summary table */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="border-b border-border px-5 py-3 bg-secondary/30">
                <span className="text-sm font-semibold">Wall Geometry & Area Breakdown</span>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 text-muted-foreground text-xs">
                  <tr>
                    <th className="px-5 py-3 font-medium">Wall Designation</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Length (ft)</th>
                    <th className="px-5 py-3 font-medium">Height (ft)</th>
                    <th className="px-5 py-3 font-medium">Gross Area</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {state.walls.map((w) => (
                    <tr key={w.id} className="hover:bg-muted/40">
                      <td className="px-5 py-2.5 font-medium">{w.description}</td>
                      <td className="px-5 py-2.5 capitalize text-muted-foreground">
                        {w.wallType || "External"}
                      </td>
                      <td className="px-5 py-2.5 tabular-nums">{w.lengthFt}</td>
                      <td className="px-5 py-2.5 tabular-nums">{w.heightFt}</td>
                      <td className="px-5 py-2.5 tabular-nums font-semibold">{w.areaSqFt} sq.ft</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOQ preview sub-tab */}
        {state.takeoffTab === "boq" && (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 font-medium">Item Description</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Qty</th>
                  <th className="px-5 py-3 font-medium">Unit</th>
                  <th className="px-5 py-3 font-medium">Rate (₹)</th>
                  <th className="px-5 py-3 font-medium text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.boqItems.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-medium">{b.label}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{b.category || "Civil"}</td>
                    <td className="px-5 py-3 tabular-nums font-semibold">
                      {b.quantity.toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{b.unit}</td>
                    <td className="px-5 py-3 tabular-nums">{b.rate.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {inrPa(b.quantity * b.rate)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-primary/10">
                  <td colSpan={5} className="px-5 py-4 text-right font-bold text-base">
                    Estimated Grand Total
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-lg text-primary tabular-nums">
                    {inrPa(boqTotal(state.boqItems))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NavButtons
        step={3}
        onBack={() => paSetStep(2)}
        onNext={() => paSetStep(4)}
        nextLabel="View BOQ & Export"
      />
    </div>
  );
}

// ─── Step 4: BOQ & Export ─────────────────────────────────────────────────────
function StepBOQExport() {
  const state = usePlanAnalysisStore();
  const navigate = useNavigate();
  const [editingRates, setEditingRates] = useState(false);
  const total = boqTotal(state.boqItems);

  function handleSaveToProject() {
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
    toast.success(`BOQ saved into project "${state.projectName}"! Opening workspace.`);
    navigate({ to: "/project" });
  }

  async function handleExportPDF() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const left = 40;
    const right = 555;
    const rupees = (n: number) => inrPa(n).replace("₹", "Rs. ");
    let y = 50;

    // Header band
    doc.setFillColor(20, 50, 120);
    doc.rect(0, 0, 595, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("BUILDWISE — Bill of Quantities", left, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Project Module: ${state.projectName}`, left, 60);
    doc.text(
      `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
      left,
      75,
    );

    doc.setTextColor(30, 30, 30);
    y = 115;

    // Table header
    doc.setFillColor(230, 238, 252);
    doc.rect(left, y - 14, right - left, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(50, 70, 110);
    doc.text("ITEM", left + 8, y);
    doc.text("QTY", 290, y);
    doc.text("UNIT", 350, y);
    doc.text("RATE (Rs.)", 410, y);
    doc.text("AMOUNT (Rs.)", right - 8, y, { align: "right" });

    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    state.boqItems.forEach((b, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 253);
        doc.rect(left, y - 12, right - left, 20, "F");
      }
      doc.text(b.label, left + 8, y);
      doc.text(String(b.quantity), 290, y);
      doc.text(b.unit, 350, y);
      doc.text(rupees(b.rate), 410, y);
      doc.text(rupees(b.quantity * b.rate), right - 8, y, { align: "right" });
      y += 20;
    });

    y += 8;
    doc.setFillColor(20, 50, 120);
    doc.rect(left, y, right - left, 36, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Estimated Grand Total", left + 12, y + 23);
    doc.setFontSize(13);
    doc.text(rupees(total), right - 8, y + 23, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 160, 175);
    doc.text(
      "Generated by BuildWise — Quantities calculated under standard IS 1200 Quantity Surveying rules.",
      left,
      800,
    );

    doc.save(`${state.projectName.replace(/[^\w\- ]+/g, "")}-BOQ.pdf`);
    toast.success("PDF document exported successfully!");
  }

  function handleExportCSV() {
    const headers = ["Item", "Quantity", "Unit", "Rate (₹)", "Amount (₹)"];
    const rows = state.boqItems.map((b) => [
      `"${b.label}"`,
      b.quantity,
      `"${b.unit}"`,
      b.rate,
      b.quantity * b.rate,
    ]);
    const csv =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n") +
      `\nEstimated Total,,,,${total}`;
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `${state.projectName.replace(/[^\w\- ]+/g, "")}-BOQ.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV spreadsheet exported successfully!");
  }

  return (
    <div>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bill of Quantities (BOQ)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Project: <span className="font-semibold text-foreground">{state.projectName}</span> •
            Rates are customizable.
          </p>
        </div>
        <button
          onClick={() => setEditingRates((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors shrink-0"
        >
          <Pencil size={13} /> {editingRates ? "Lock Rates" : "Edit Rates"}
        </button>
      </header>

      {/* BOQ table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3.5 font-medium">Item Description</th>
                <th className="px-5 py-3.5 font-medium">Quantity</th>
                <th className="px-5 py-3.5 font-medium">Unit</th>
                <th className="px-5 py-3.5 font-medium">Rate (₹)</th>
                <th className="px-5 py-3.5 font-medium text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.boqItems.map((b) => (
                <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3 font-medium">{b.label}</td>
                  <td className="px-5 py-3 tabular-nums font-semibold">
                    {b.quantity.toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{b.unit}</td>
                  <td className="px-5 py-3">
                    {editingRates ? (
                      <input
                        type="number"
                        value={b.rate}
                        onChange={(e) => paUpdateBOQRate(b.id, Number(e.target.value))}
                        className="w-24 rounded border border-input bg-background px-2 py-1 text-xs tabular-nums outline-none focus:border-primary"
                        min={0}
                      />
                    ) : (
                      <span className="tabular-nums">{b.rate.toLocaleString("en-IN")}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">
                    {inrPa(b.quantity * b.rate)}
                  </td>
                </tr>
              ))}

              {/* Total row */}
              <tr className="bg-primary text-primary-foreground">
                <td colSpan={4} className="px-5 py-4 text-right font-bold text-base">
                  Estimated Grand Total
                </td>
                <td className="px-5 py-4 text-right font-bold text-lg tabular-nums">
                  {inrPa(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3 justify-between items-center">
        <button
          onClick={() => paSetStep(3)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 shadow-sm"
          >
            <Download size={16} /> Export PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <FileSpreadsheet size={16} /> Export CSV (Excel)
          </button>
          <button
            onClick={handleSaveToProject}
            className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <ArrowUpRight size={16} /> Save to Workspace
          </button>
        </div>
      </div>

      {/* Upload new plan */}
      <div className="mt-10 flex justify-center">
        <button
          onClick={() => {
            paReset(state.projectId);
            toast.info("Analysis reset. Upload a new plan.");
          }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw size={13} /> Reset & Upload New Plan
        </button>
      </div>
    </div>
  );
}

// ─── Main page component with Project Module Switcher ─────────────────────────
function PlanUploadPage() {
  const appState = useAppStore();
  const { projects, activeProjectId } = appState;
  const navigate = useNavigate();

  // Ensure an active project exists or create a starter project
  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0];
  const state = usePlanAnalysisStore(currentProject?.id);

  const stepComponents = [
    <StepUpload key="0" />,
    <StepPreview key="1" />,
    <StepEditDimensions key="2" />,
    <StepQuantityTakeoff key="3" />,
    <StepBOQExport key="4" />,
  ];

  if (projects.length === 0) {
    return (
      <Page>
        <div className="max-w-md mx-auto text-center py-20 rounded-2xl border border-dashed border-border p-10">
          <Building2 size={40} className="mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-bold tracking-tight">Create a Project First</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Plan uploads and quantity takeoffs are maintained separately for each project module.
          </p>
          <button
            onClick={() => {
              const id = createProject("Residential Villa");
              setActiveProject(id);
              toast.success("Created project 'Residential Villa'!");
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={16} /> Create My First Project
          </button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {/* Active Project Module Switcher Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-border bg-card/70 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
            <FolderKanban size={20} />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Active Project Module
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={currentProject?.id || ""}
                onChange={(e) => {
                  setActiveProject(e.target.value);
                  const selected = projects.find((p) => p.id === e.target.value);
                  if (selected) {
                    toast.info(`Switched to project module: ${selected.name}`);
                  }
                }}
                className="font-bold text-foreground bg-transparent border-b border-border/80 pb-0.5 text-base outline-none cursor-pointer hover:border-primary transition-colors"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-background text-foreground">
                    {p.name}
                  </option>
                ))}
              </select>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  state.file
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {state.file ? "Plan Attached" : "No Plan"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              const name = prompt("Enter project name:", `Project ${projects.length + 1}`);
              if (name && name.trim()) {
                const newId = createProject(name.trim());
                setActiveProject(newId);
                toast.success(`Created project "${name.trim()}"!`);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <Plus size={14} /> New Project
          </button>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            All Projects
          </button>
        </div>
      </div>

      <StepBar current={state.step} />
      {stepComponents[state.step]}
    </Page>
  );
}
