import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FolderPlus, FileText, Trash2, ArrowRight } from "lucide-react";
import { Page } from "@/components/site-chrome";
import {
  useAppStore,
  createProject,
  deleteProject,
  duplicateProject,
  setActiveProject,
  inr,
  totalCost,
} from "@/lib/project-store";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { projects } = useAppStore();
  const navigate = useNavigate();

  const handleCreateProject = () => {
    const id = createProject("New Project");
    navigate({ to: "/project" });
  };

  return (
    <Page>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Project Workspace</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Manage your projects, upload plans, and generate detailed BOQs.
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <FolderPlus size={18} /> New Project
        </button>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-border p-12 text-center">
            <FileText size={32} className="mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first project to start estimating costs.
            </p>
            <button
              onClick={handleCreateProject}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-secondary px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/80"
            >
              <FolderPlus size={18} /> Create Project
            </button>
          </div>
        ) : (
          projects.map((p) => {
            const currentTotal = totalCost(p.items);
            const prevVersion = p.versions?.[p.versions.length - 1];
            const prevTotal = prevVersion ? prevVersion.totalCost : currentTotal;
            const diff = currentTotal - prevTotal;

            return (
              <div
                key={p.id}
                className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.items.length} materials</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => duplicateProject(p.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Duplicate Project"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteProject(p.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="mt-6 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Estimated Cost</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{inr(currentTotal)}</p>

                  {prevVersion && diff !== 0 && (
                    <p
                      className={`mt-2 text-xs font-medium ${diff > 0 ? "text-destructive" : "text-green-600"}`}
                    >
                      {diff > 0 ? "↑" : "↓"} {inr(Math.abs(diff))} since last version
                    </p>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setActiveProject(p.id);
                      navigate({ to: "/plan-upload" });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/80"
                  >
                    Takeoff
                  </button>
                  <button
                    onClick={() => {
                      setActiveProject(p.id);
                      navigate({ to: "/project" });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Open <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Page>
  );
}
