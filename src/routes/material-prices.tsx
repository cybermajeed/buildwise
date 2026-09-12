import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
import { useMaterialStore, updateMaterialPrice } from "@/lib/material-store";
import { inr } from "@/lib/project-store";

export const Route = createFileRoute("/material-prices")({
  component: MaterialPricesPage,
});

function MaterialPricesPage() {
  const { prices } = useMaterialStore();

  // Local state to manage edits before saving
  const [edits, setEdits] = useState<Record<string, number>>({});

  const handlePriceChange = (id: string, value: string) => {
    setEdits({ ...edits, [id]: Number(value) });
  };

  const handleSavePrices = () => {
    Object.entries(edits).forEach(([id, newPrice]) => {
      updateMaterialPrice(id, newPrice);
    });
    setEdits({});
    toast.success(
      "Material prices updated successfully. Affected projects will reflect these changes.",
    );
  };

  return (
    <Page>
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Material Prices</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Update the current market rates for construction materials. Price changes will
          automatically affect related project estimates.
        </p>
      </header>

      <div className="mt-10 rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Material</th>
                <th className="px-6 py-4 font-medium">Unit</th>
                <th className="px-6 py-4 font-medium">Previous Rate</th>
                <th className="px-6 py-4 font-medium">Current Rate (₹)</th>
                <th className="px-6 py-4 font-medium text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prices.map((item) => {
                const isEdited = edits[item.id] !== undefined;
                const currentVal = isEdited ? edits[item.id] : item.currentPrice;
                const prevVal = item.previousPrice;
                const diff = prevVal ? item.currentPrice - prevVal : 0;

                return (
                  <tr key={item.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium">{item.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{item.unit}</td>
                    <td className="px-6 py-4 text-muted-foreground tabular-nums">
                      {prevVal ? inr(prevVal) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        value={currentVal}
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        className={`w-32 rounded-md border px-3 py-1.5 text-sm ${
                          isEdited
                            ? "border-primary ring-1 ring-primary/20"
                            : "border-input bg-background"
                        }`}
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {diff !== 0 ? (
                        <div
                          className={`inline-flex items-center gap-1 text-xs font-medium ${diff > 0 ? "text-destructive" : "text-green-600"}`}
                        >
                          {diff > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {inr(Math.abs(diff))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground opacity-70">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-secondary/30 px-6 py-4 flex justify-end">
          <button
            onClick={handleSavePrices}
            disabled={Object.keys(edits).length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save size={16} /> Save New Prices
          </button>
        </div>
      </div>
    </Page>
  );
}
