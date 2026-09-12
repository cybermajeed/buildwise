import { createFileRoute } from "@tanstack/react-router";
import { PaintRoller } from "lucide-react";
import { CalculatorPage, fmt } from "@/components/calculator-page";

export const Route = createFileRoute("/calculators/paint")({
  head: () => ({
    meta: [
      { title: "Paint Calculator — BuildWise" },
      {
        name: "description",
        content:
          "Estimate litres of paint and cost per coat for interior or exterior wall areas, minus doors and windows.",
      },
      { property: "og:title", content: "Paint Calculator — BuildWise" },
      {
        property: "og:description",
        content: "Litres of paint, number of coats and total painting cost.",
      },
    ],
  }),
  component: () => (
    <CalculatorPage
      title="Paint Calculator"
      description="Work out how much paint you need for a surface, allowing for openings and multiple coats."
      icon={PaintRoller}
      fields={[
        { key: "area", label: "Surface area", unit: "m²", default: 60 },
        { key: "openings", label: "Doors & windows area", unit: "m²", default: 6 },
        { key: "coats", label: "Number of coats", default: 2, step: 1 },
        { key: "coverage", label: "Coverage per litre", unit: "m²/L", default: 10 },
        { key: "rate", label: "Rate per litre", unit: "currency", default: 300, step: 10 },
      ]}
      compute={(n) => {
        const net = Math.max(n("area") - n("openings"), 0);
        const coverage = n("coverage") || 1;
        const litres = (net * n("coats")) / coverage;
        return [
          { label: "Net paintable area", value: `${fmt(net)} m²` },
          { label: "Total area (all coats)", value: `${fmt(net * n("coats"))} m²` },
          { label: "Paint required", value: `${fmt(litres)} L` },
          { label: "Buy (rounded up)", value: `${fmt(Math.ceil(litres), 0)} L` },
          { label: "Estimated cost", value: fmt(Math.ceil(litres) * n("rate")), highlight: true },
        ];
      }}
      projectItem={{
        slug: "paint",
        label: "Paint",
        summarize: (n) => {
          const net = Math.max(n("area") - n("openings"), 0);
          const litres = Math.ceil((net * n("coats")) / (n("coverage") || 1));
          return { quantity: `${fmt(litres, 0)} L`, cost: litres * n("rate") };
        },
      }}
      notes={[
        "Typical emulsion coverage is 9–12 m² per litre per coat.",
        "Rough or fresh plaster absorbs more — add a primer coat.",
      ]}
    />
  ),
});
