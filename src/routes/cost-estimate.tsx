import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, FileText, PieChart } from "lucide-react";
import { Page } from "@/components/site-chrome";
import { useActiveProject, totalCost, inr } from "@/lib/project-store";

export const Route = createFileRoute("/cost-estimate")({
  component: CostEstimatePage,
});

function CostEstimatePage() {
  const project = useActiveProject();
  const navigate = useNavigate();

  if (!project) {
    return (
            <Page>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">No Active Project</h2>
          <p className="mt-2 text-muted-foreground">
            Go to the dashboard to select or create a project.
          </p>
          <Link
            to="/dashboard"
            className="mt-6 inline-flex rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go to Dashboard
          </Link>
        </div>
      </Page>
    );
  }

  const materialCost = totalCost(project.items);
  // Example calculation logic for MVP
  const labourCost = materialCost * 0.4; // Assuming labour is 40% of material cost for MVP
  const contingency = (materialCost + labourCost) * 0.05; // 5% contingency
  const totalProjectCost = materialCost + labourCost + contingency;

  return (
    <Page>
      <header className="max-w-3xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Cost Estimate</h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Project: <span className="font-semibold text-foreground">{project.name}</span>
          </p>
        </div>
        <button
          onClick={() => navigate({ to: "/reports" })}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <FileText size={18} /> Generate Report
        </button>
      </header>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="text-primary" size={24} />
            <h2 className="text-xl font-semibold">Estimate Breakdown</h2>
          </div>

          <dl className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <dt className="text-muted-foreground font-medium">Material Cost</dt>
              <dd className="text-lg font-semibold tabular-nums">{inr(materialCost)}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <dt className="text-muted-foreground font-medium">Labour Cost (Est. 40%)</dt>
              <dd className="text-lg font-semibold tabular-nums">{inr(labourCost)}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <dt className="text-muted-foreground font-medium">Subtotal</dt>
              <dd className="text-lg font-semibold tabular-nums">
                {inr(materialCost + labourCost)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-b border-border pb-4">
              <dt className="text-muted-foreground font-medium">Contingency (5%)</dt>
              <dd className="text-lg font-semibold tabular-nums">{inr(contingency)}</dd>
            </div>
            <div className="flex items-center justify-between pt-2">
              <dt className="text-xl font-bold">Total Estimated Cost</dt>
              <dd className="text-3xl font-bold text-primary tabular-nums">
                {inr(totalProjectCost)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-card p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Major Materials</h2>
          <div className="space-y-4">
            {project.items
              .sort((a, b) => b.cost - a.cost)
              .slice(0, 5)
              .map((item) => (
                <div key={item.slug} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-semibold tabular-nums">{inr(item.cost)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(item.cost / materialCost) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{item.quantity}</span>
                    <span>{((item.cost / materialCost) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
