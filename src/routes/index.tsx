import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  FolderPlus,
  ArrowRight,
  Building2,
  MapPin,
  User,
  Calculator,
  IndianRupee,
  Layers,
  FileText,
  Trash2,
  Copy,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
import {
  useAppStore,
  createProject,
  setActiveProject,
  deleteProject,
  duplicateProject,
  totalCost,
  inr,
  updateActiveProject,
} from "@/lib/project-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Project Creation & Hub — BuildWise" },
      {
        name: "description",
        content:
          "Start your construction project, manage architectural plans, extract takeoffs and compute bills of quantities.",
      },
    ],
  }),
  component: IndexPage,
});

export function IndexPage() {
  const { projects } = useAppStore();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [projectType, setProjectType] = useState("Residential Villa (G+1)");

  const handleCreateProject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = projectName.trim() || `Construction Project ${projects.length + 1}`;
    const id = createProject(finalName);
    updateActiveProject({
      clientName: clientName.trim() || "Private Client",
      location: location.trim() || "Main Site",
    });
    toast.success(`Project "${finalName}" created! Opening workspace.`);
    navigate({ to: "/project" });
  };

  return (
    <Page>
      {/* ─── Hero & Project Creation Section ─────────────────────────────────── */}
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
            <Sparkles size={13} /> Construction Workspace Hub
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
            Start a New Project
          </h1>
          <p className="mt-2 text-base text-muted-foreground max-w-xl mx-auto">
            Create your construction project to unlock integrated plan analysis, quantity takeoffs,
            BOQ generation, and modular calculators.
          </p>
        </header>

        {/* Project Creation Form Card */}
        <div className="rounded-2xl border border-primary/20 bg-card p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleCreateProject} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="block">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <Building2 size={14} className="text-primary" /> Project Name
                </span>
                <input
                  type="text"
                  placeholder="e.g. Modern Residential Villa"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <User size={14} className="text-primary" /> Client / Owner Name
                </span>
                <input
                  type="text"
                  placeholder="e.g. Dr. K. Sharma"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <label className="block">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <MapPin size={14} className="text-primary" /> Site Location
                </span>
                <input
                  type="text"
                  placeholder="e.g. Plot 45, North Extension"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                  <Layers size={14} className="text-primary" /> Structure Type
                </span>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-medium outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                >
                  <option value="Residential Villa (G+1)">Residential Villa (G+1)</option>
                  <option value="Single Story Bungalow">Single Story Bungalow</option>
                  <option value="Commercial Complex">Commercial Complex</option>
                  <option value="Apartment / Multi-Unit">Apartment / Multi-Unit</option>
                  <option value="Interior Renovation">Interior Renovation</option>
                </select>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">
                Plan drawings and calculations will be organized inside this project module.
              </span>
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
              >
                <FolderPlus size={18} /> Create & Open Project <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>

        {/* ─── Existing Projects Section ────────────────────────────────────────── */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Your Projects</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select an existing project module to open its full estimation suite.
              </p>
            </div>
            <button
              onClick={() => {
                const id = createProject(`Project ${projects.length + 1}`);
                setActiveProject(id);
                navigate({ to: "/project" });
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <FolderPlus size={14} /> Quick Blank Project
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center bg-secondary/10">
              <Building2 size={32} className="mx-auto text-muted-foreground/60 mb-3" />
              <p className="font-semibold text-sm">No projects created yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Use the form above to start your first project and begin extracting takeoffs.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const currentTotal = totalCost(p.items);
                return (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-bold text-base text-foreground truncate">{p.name}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {p.location || "Site location not set"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              duplicateProject(p.id);
                              toast.success("Project duplicated.");
                            }}
                            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                            title="Duplicate Project"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => {
                              deleteProject(p.id);
                              toast.info("Project deleted.");
                            }}
                            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                            title="Delete Project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 rounded-lg bg-secondary/50 p-3">
                        <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
                          Estimated Material Cost
                        </span>
                        <span className="text-2xl font-extrabold text-foreground tabular-nums block mt-0.5">
                          {inr(currentTotal)}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {p.items.length} BOQ items recorded
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-border/70 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setActiveProject(p.id);
                          navigate({ to: "/plan-upload" });
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                      >
                        Plan & Takeoff
                      </button>
                      <button
                        onClick={() => {
                          setActiveProject(p.id);
                          navigate({ to: "/project" });
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                      >
                        Workspace <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Standalone Modular Tools Section ────────────────────────────────── */}
        <div className="mt-16 border-t border-border pt-10">
          <h2 className="text-base font-bold text-foreground mb-4">
            Standalone Calculation Modules
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/calculators/brick"
              className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
            >
              <span className="text-2xl block mb-2">🧱</span>
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block">
                Brick Calculator
              </span>
              <span className="text-[11px] text-muted-foreground">Bricks & mortar bags</span>
            </Link>

            <Link
              to="/calculators/concrete"
              className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
            >
              <span className="text-2xl block mb-2">🏗</span>
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block">
                Concrete Mix
              </span>
              <span className="text-[11px] text-muted-foreground">M15, M20, M25 ratios</span>
            </Link>

            <Link
              to="/calculators/steel"
              className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
            >
              <span className="text-2xl block mb-2">⚙</span>
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block">
                Steel Calculator
              </span>
              <span className="text-[11px] text-muted-foreground">D² / 162 rule weight</span>
            </Link>

            <Link
              to="/material-prices"
              className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors group"
            >
              <span className="text-2xl block mb-2">💰</span>
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block">
                Material Prices
              </span>
              <span className="text-[11px] text-muted-foreground">Local market rates</span>
            </Link>
          </div>
        </div>
      </div>
    </Page>
  );
}
