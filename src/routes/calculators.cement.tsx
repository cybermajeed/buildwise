import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { CalculatorPage, fmt } from "@/components/calculator-page";

export const Route = createFileRoute("/calculators/cement")({
  head: () => ({
    meta: [
      { title: "Cement Calculator — BuildWise" },
      {
        name: "description",
        content:
          "Calculate cement bags and sand volume required for plastering a given wall area and thickness.",
      },
      { property: "og:title", content: "Cement Calculator — BuildWise" },
      {
        property: "og:description",
        content: "Plastering cement bags and sand quantity with cost estimate.",
      },
    ],
  }),
  component: () => (
    <CalculatorPage
      title="Cement Calculator"
      description="Estimate cement bags and sand for plaster work based on area, thickness and mortar ratio."
      icon={Package}
      fields={[
        { key: "area", label: "Plaster area", unit: "m²", default: 40 },
        { key: "thickness", label: "Plaster thickness", unit: "mm", default: 12, step: 1 },
        { key: "cement", label: "Mortar part — cement", default: 1, step: 1 },
        { key: "sand", label: "Mortar part — sand", default: 6, step: 1 },
        { key: "rate", label: "Rate per cement bag", unit: "currency", default: 400, step: 10 },
      ]}
      compute={(n) => {
        const wet = n("area") * (n("thickness") / 1000);
        const dry = wet * 1.33;
        const parts = n("cement") + n("sand");
        const cementVol = parts ? (dry * n("cement")) / parts : 0;
        const bags = Math.ceil(cementVol / 0.0347);
        const sand = parts ? (dry * n("sand")) / parts : 0;
        return [
          { label: "Wet mortar volume", value: `${fmt(wet)} m³` },
          { label: "Dry mortar volume", value: `${fmt(dry)} m³` },
          { label: "Cement", value: `${fmt(bags, 0)} bags (50 kg)` },
          { label: "Sand", value: `${fmt(sand)} m³` },
          { label: "Cement cost", value: fmt(bags * n("rate")), highlight: true },
        ];
      }}
      projectItem={{
        slug: "cement",
        label: "Cement",
        summarize: (n) => {
          const dry = n("area") * (n("thickness") / 1000) * 1.33;
          const parts = n("cement") + n("sand");
          const bags = Math.ceil((parts ? (dry * n("cement")) / parts : 0) / 0.0347);
          return { quantity: `${fmt(bags, 0)} Bags`, cost: bags * n("rate") };
        },
      }}
      notes={[
        "Dry mortar volume uses a 1.33 bulking factor for plaster.",
        "Typical plaster thickness: 12 mm internal, 15–20 mm external.",
      ]}
    />
  ),
});
