import { createFileRoute } from "@tanstack/react-router";
import { Ruler } from "lucide-react";
import { CalculatorPage, fmt } from "@/components/calculator-page";

export const Route = createFileRoute("/calculators/steel")({
  head: () => ({
    meta: [
      { title: "Steel Calculator — BuildWise" },
      {
        name: "description",
        content:
          "Calculate reinforcement steel weight in kg and tonnes from bar diameter, length and count, plus cost.",
      },
      { property: "og:title", content: "Steel Calculator — BuildWise" },
      {
        property: "og:description",
        content: "Rebar weight and cost using the D²/162 formula.",
      },
    ],
  }),
  component: () => (
    <CalculatorPage
      title="Steel Calculator"
      description="Estimate reinforcement bar weight and cost from diameter, length and number of bars."
      icon={Ruler}
      fields={[
        { key: "dia", label: "Bar diameter", unit: "mm", default: 12, step: 1 },
        { key: "len", label: "Length per bar", unit: "m", default: 12 },
        { key: "count", label: "Number of bars", default: 25, step: 1 },
        { key: "wastage", label: "Wastage", unit: "%", default: 3, step: 1 },
        { key: "rate", label: "Rate per kg", unit: "currency", default: 70, step: 1 },
      ]}
      compute={(n) => {
        const perM = (n("dia") * n("dia")) / 162;
        const total = perM * n("len") * n("count") * (1 + n("wastage") / 100);
        return [
          { label: "Unit weight", value: `${fmt(perM, 3)} kg/m` },
          { label: "Total length", value: `${fmt(n("len") * n("count"))} m` },
          { label: "Total weight", value: `${fmt(total)} kg` },
          { label: "In tonnes", value: `${fmt(total / 1000, 3)} t` },
          { label: "Estimated cost", value: fmt(total * n("rate")), highlight: true },
        ];
      }}
      projectItem={{
        slug: "steel",
        label: "Steel",
        summarize: (n) => {
          const total =
            ((n("dia") * n("dia")) / 162) * n("len") * n("count") * (1 + n("wastage") / 100);
          return { quantity: `${fmt(total, 0)} kg`, cost: total * n("rate") };
        },
      }}
      notes={[
        "Unit weight uses the standard D² / 162 formula for TMT bars.",
        "Add extra for laps, hooks and stirrup bends where applicable.",
      ]}
    />
  ),
});
