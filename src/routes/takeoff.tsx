import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Edit2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Page } from "@/components/site-chrome";
import { useActiveProject, upsertItem } from "@/lib/project-store";
import { useMaterialStore } from "@/lib/material-store";

export const Route = createFileRoute("/takeoff")({
  component: TakeoffPage,
});

function TakeoffPage() {
  const project = useActiveProject();
  const navigate = useNavigate();
  const { prices } = useMaterialStore();

  // Simulated extracted quantities
  const [quantities, setQuantities] = useState([
    { id: "cement", label: "Cement", value: 350, unit: "bags" },
    { id: "steel", label: "Steel", value: 4500, unit: "kg" },
    { id: "sand", label: "Sand", value: 1200, unit: "cft" },
    { id: "aggregate", label: "Aggregate", value: 1500, unit: "cft" },
    { id: "bricks", label: "Bricks", value: 25000, unit: "pcs" },
  ]);

  if (!project) {
    return (
      <Page>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">No Active Project</h2>
        </div>
      </Page>
    );
  }

  const handleGenerateBOQ = () => {
    // Convert takeoff quantities to project items (BOQ items)
    quantities.forEach((q) => {
      const priceItem = prices.find((p) => p.id === q.id);
      const rate = priceItem ? priceItem.currentPrice : 0;
      upsertItem({
        slug: q.id,
        label: q.label,
        quantity: `${q.value} ${q.unit}`,
        rate: rate,
        unit: q.unit,
        cost: q.value * rate,
      });
    });

    navigate({ to: "/boq" });
  };

  return (
    <Page>
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Quantity Takeoff</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Review the quantities extracted from your uploaded plan. You can edit these values before
          generating the final BOQ.
        </p>
      </header>

      <div className="mt-10 rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Material / Component</th>
                <th className="px-6 py-4 font-medium">Extracted Quantity</th>
                <th className="px-6 py-4 font-medium">Unit</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quantities.map((item, index) => (
                <tr key={item.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium">{item.label}</td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={item.value}
                      onChange={(e) => {
                        const newQ = [...quantities];
                        newQ[index] = { ...newQ[index], value: Number(e.target.value) };
                        setQuantities(newQ);
                      }}
                      className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{item.unit}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-muted-foreground hover:text-foreground">
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border bg-secondary/30 px-6 py-4 flex justify-end">
          <button
            onClick={handleGenerateBOQ}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Approve & Generate BOQ <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Page>
  );
}
