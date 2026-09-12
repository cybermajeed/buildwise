import { createFileRoute } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { CalculatorPage, fmt } from "@/components/calculator-page";

export const Route = createFileRoute("/calculators/concrete")({
  head: () => ({
    meta: [
      { title: "Concrete Calculator — BuildWise" },
      {
        name: "description",
        content:
          "Work out dry volume, cement bags, sand and aggregate for a concrete pour from slab dimensions and mix ratio.",
      },
      { property: "og:title", content: "Concrete Calculator — BuildWise" },
      {
        property: "og:description",
        content: "Cement, sand and aggregate quantities for any concrete mix ratio.",
      },
    ],
  }),
  component: () => (
    <CalculatorPage
      title="Concrete Calculator"
      description="Estimate wet and dry concrete volume with the cement, sand and aggregate breakdown for your mix."
      icon={Layers}
      fields={[
        { key: "length", label: "Length", unit: "m", default: 5 },
        { key: "width", label: "Width", unit: "m", default: 4 },
        { key: "depth", label: "Depth / thickness", unit: "m", default: 0.15 },
        { key: "cement", label: "Mix part — cement", default: 1, step: 0.5 },
        { key: "sand", label: "Mix part — sand", default: 1.5, step: 0.5 },
        { key: "agg", label: "Mix part — aggregate", default: 3, step: 0.5 },
        { key: "rate", label: "Rate per cement bag", unit: "currency", default: 400, step: 10 },
      ]}
      compute={(n) => {
        const wet = n("length") * n("width") * n("depth");
        const dry = wet * 1.54;
        const parts = n("cement") + n("sand") + n("agg");
        const cementVol = parts ? (dry * n("cement")) / parts : 0;
        const bags = Math.ceil(cementVol / 0.0347);
        return [
          { label: "Wet volume", value: `${fmt(wet)} m³` },
          { label: "Dry volume", value: `${fmt(dry)} m³` },
          { label: "Cement", value: `${fmt(bags, 0)} bags (50 kg)` },
          {
            label: "Sand",
            value: `${fmt(parts ? (dry * n("sand")) / parts : 0)} m³`,
          },
          {
            label: "Aggregate",
            value: `${fmt(parts ? (dry * n("agg")) / parts : 0)} m³`,
          },
          { label: "Cement cost", value: fmt(bags * n("rate")), highlight: true },
        ];
      }}
      projectItem={{
        slug: "concrete",
        label: "Concrete (cement)",
        summarize: (n) => {
          const dry = n("length") * n("width") * n("depth") * 1.54;
          const parts = n("cement") + n("sand") + n("agg");
          const bags = Math.ceil((parts ? (dry * n("cement")) / parts : 0) / 0.0347);
          return { quantity: `${fmt(bags, 0)} Bags`, cost: bags * n("rate") };
        },
      }}
      notes={[
        "Dry volume uses the standard 1.54 bulking factor.",
        "One 50 kg cement bag is taken as 0.0347 m³.",
      ]}
    />
  ),
});
