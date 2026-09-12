import { createFileRoute } from "@tanstack/react-router";
import { Blocks } from "lucide-react";
import { CalculatorPage, fmt } from "@/components/calculator-page";

export const Route = createFileRoute("/calculators/brick")({
  head: () => ({
    meta: [
      { title: "Brick Calculator — BuildWise" },
      {
        name: "description",
        content:
          "Calculate the number of bricks, mortar volume and total brickwork cost from wall dimensions.",
      },
      { property: "og:title", content: "Brick Calculator — BuildWise" },
      {
        property: "og:description",
        content: "Bricks, mortar and cost for any wall area, including wastage.",
      },
    ],
  }),
  component: () => (
    <CalculatorPage
      title="Brick Calculator"
      description="Estimate brick quantity, mortar volume and cost for masonry walls."
      icon={Blocks}
      fields={[
        { key: "length", label: "Wall length", unit: "m", default: 6 },
        { key: "height", label: "Wall height", unit: "m", default: 3 },
        { key: "thickness", label: "Wall thickness", unit: "m", default: 0.23 },
        { key: "wastage", label: "Wastage", unit: "%", default: 5, step: 1 },
        { key: "rate", label: "Rate per brick", unit: "currency", default: 8, step: 0.5 },
      ]}
      compute={(n) => {
        const volume = n("length") * n("height") * n("thickness");
        const brickWithMortar = 0.2 * 0.1 * 0.1; // 190x90x90 + 10mm joint
        const base = volume / brickWithMortar;
        const bricks = Math.ceil(base * (1 + n("wastage") / 100));
        const mortar = volume * 0.3;
        return [
          { label: "Wall volume", value: `${fmt(volume)} m³` },
          { label: "Bricks (with wastage)", value: `${fmt(bricks, 0)} nos` },
          { label: "Mortar volume", value: `${fmt(mortar)} m³` },
          { label: "Estimated cost", value: fmt(bricks * n("rate")), highlight: true },
        ];
      }}
      projectItem={{
        slug: "brick",
        label: "Bricks",
        summarize: (n) => {
          const volume = n("length") * n("height") * n("thickness");
          const bricks = Math.ceil((volume / (0.2 * 0.1 * 0.1)) * (1 + n("wastage") / 100));
          return { quantity: `${fmt(bricks, 0)} Nos`, cost: bricks * n("rate") };
        },
      }}
      notes={[
        "Based on standard 190 × 90 × 90 mm bricks with 10 mm mortar joints.",
        "Mortar is taken as roughly 30% of the wall volume.",
      ]}
    />
  ),
});
