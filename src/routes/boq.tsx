import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
import { useActiveProject, upsertItem, totalCost, inr, saveVersion } from "@/lib/project-store";
import { useMaterialStore } from "@/lib/material-store";

export const Route = createFileRoute("/boq")({
  component: BoqPage,
});

function BoqPage() {
  const project = useActiveProject();
  const navigate = useNavigate();
  const { prices } = useMaterialStore();

  if (!project) {
    return (
      <Page>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">No Active Project</h2>
        </div>
      </Page>
    );
  }

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

  const syncLatestPrices = () => {
    project.items.forEach((item) => {
      const latestPrice = prices.find((p) => p.id === item.slug);
      if (latestPrice && latestPrice.currentPrice !== item.rate) {
        handleUpdateItem(item.slug, "rate", latestPrice.currentPrice);
      }
    });
    toast.success("Prices synced with latest market rates.");
  };

  return (
    <Page>
      <header className="max-w-3xl flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Bill of Quantities (BOQ)
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Project: <span className="font-semibold text-foreground">{project.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={syncLatestPrices}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <RefreshCw size={16} /> Sync Prices
          </button>
        </div>
      </header>

      <div className="mt-10 overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="px-6 py-4 font-medium">Item Description</th>
              <th className="px-6 py-4 font-medium">Quantity</th>
              <th className="px-6 py-4 font-medium">Unit</th>
              <th className="px-6 py-4 font-medium">Rate (₹)</th>
              <th className="px-6 py-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {project.items.map((item) => (
              <tr key={item.slug} className="transition-colors hover:bg-muted/50">
                <td className="px-6 py-4 font-medium">{item.label}</td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    value={parseFloat(item.quantity) || 0}
                    onChange={(e) =>
                      handleUpdateItem(item.slug, "quantity", Number(e.target.value))
                    }
                    className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </td>
                <td className="px-6 py-4 text-muted-foreground">{item.unit || "-"}</td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    value={item.rate || 0}
                    onChange={(e) => handleUpdateItem(item.slug, "rate", Number(e.target.value))}
                    className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </td>
                <td className="px-6 py-4 text-right font-semibold tabular-nums">
                  {inr(item.cost)}
                </td>
              </tr>
            ))}
            <tr className="bg-primary/5">
              <td colSpan={4} className="px-6 py-5 text-right font-bold text-lg">
                Total Material Cost:
              </td>
              <td className="px-6 py-5 text-right font-bold text-lg text-primary tabular-nums">
                {inr(totalCost(project.items))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <button
          onClick={() => {
            saveVersion();
            toast.success("BOQ saved successfully.");
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Save size={18} /> Save & Continue to Estimate
        </button>
      </div>
    </Page>
  );
}
