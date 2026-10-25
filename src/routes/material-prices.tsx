import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Save, Sparkles, IndianRupee } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
import { useMaterialStore, updateMaterialPrice } from "@/lib/material-store";
import { inr } from "@/lib/project-store";

export const Route = createFileRoute("/material-prices")({
  head: () => ({
    meta: [
      { title: "Market Material Prices — BuildWise" },
      {
        name: "description",
        content:
          "Live Indian construction material rates and dynamic price synchronizer for BOQs.",
      },
    ],
  }),
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
      {/* ─── Pale-Mint Header Band ─────────────────────────────────────────── */}
      <div className="bg-[#ecffe0] dark:bg-zinc-950 border-b border-[#e5e7eb] dark:border-zinc-800 py-16 px-4 sm:px-8 -mx-4 sm:-mx-8 text-center mb-10">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white dark:bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-black dark:text-white uppercase tracking-wider mb-4 shadow-sm font-display">
            <Sparkles size={13} className="text-[#00f0a0]" /> Live Regional Feed
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold font-display tracking-tight text-black dark:text-white">
            Construction Material Prices
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#86909c] font-light max-w-xl mx-auto">
            Benchmark and modify market rates for civil items. Rate changes immediately sync to all project BOQs.
          </p>
        </div>
      </div>

      {/* ─── Price Table Container ──────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-20">
        <div className="feature-card border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 !p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f2f4f5] dark:bg-zinc-900 text-[#86909c] text-xs font-display uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-bold">Material Specification</th>
                  <th className="px-6 py-4 font-bold">Unit</th>
                  <th className="px-6 py-4 font-bold">Previous Rate</th>
                  <th className="px-6 py-4 font-bold">Current Market Rate (₹)</th>
                  <th className="px-6 py-4 font-bold text-right">Trend & Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb] dark:divide-zinc-800">
                {prices.map((item) => {
                  const isEdited = edits[item.id] !== undefined;
                  const currentVal = isEdited ? edits[item.id] : item.currentPrice;
                  const prevVal = item.previousPrice;
                  const diff = prevVal ? item.currentPrice - prevVal : 0;

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-[#f2f4f5]/50 dark:hover:bg-zinc-900/50">
                      <td className="px-6 py-4 font-bold text-black dark:text-white font-display">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-[#86909c] font-medium text-xs font-mono">
                        {item.unit}
                      </td>
                      <td className="px-6 py-4 text-[#86909c] tabular-nums font-mono text-xs">
                        {prevVal ? inr(prevVal) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-flex items-center">
                          <input
                            type="number"
                            value={currentVal}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            className={`w-32 rounded-full border px-4 py-1.5 text-xs font-bold font-mono outline-none transition-all ${
                              isEdited
                                ? "border-black dark:border-[#00f0a0] bg-[#ecffe0] text-black"
                                : "border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 text-black dark:text-white focus:bg-white"
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {diff !== 0 ? (
                          <div
                            className={`inline-flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                              diff > 0 ? "bg-red-50 text-red-600 dark:bg-red-950/40" : "bg-[#ecffe0] text-emerald-800"
                            }`}
                          >
                            {diff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {inr(Math.abs(diff))}
                          </div>
                        ) : (
                          <span className="text-[#86909c] text-xs font-mono font-medium">Steady</span>
                        )}
                        <p className="mt-1 text-[10px] text-[#86909c] font-mono">
                          Updated {new Date(item.lastUpdated).toLocaleDateString()}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#e5e7eb] dark:border-zinc-800 bg-[#f2f4f5]/60 dark:bg-zinc-900 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-[#86909c]">
              Modifications immediately update the linked active project estimates.
            </span>
            <button
              onClick={handleSavePrices}
              disabled={Object.keys(edits).length === 0}
              className="btn-pill-black disabled:opacity-40 cursor-pointer"
            >
              <Save size={15} /> Save New Market Prices
            </button>
          </div>
        </div>
      </div>
    </Page>
  );
}
