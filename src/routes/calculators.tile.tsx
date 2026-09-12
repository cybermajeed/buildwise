import { createFileRoute } from "@tanstack/react-router";
import { Grid3x3 } from "lucide-react";
import { CalculatorPage, fmt } from "@/components/calculator-page";

export const Route = createFileRoute("/calculators/tile")({
  head: () => ({
    meta: [
      { title: "Tile Calculator — BuildWise" },
      {
        name: "description",
        content:
          "Calculate how many tiles and boxes you need for a floor or wall area, including wastage and cost.",
      },
      { property: "og:title", content: "Tile Calculator — BuildWise" },
      {
        property: "og:description",
        content: "Tile count, boxes and cost for floors and walls with wastage allowance.",
      },
    ],
  }),
  component: () => (
    <CalculatorPage
      title="Tile Calculator"
      description="Find the tile count, number of boxes and cost for any floor or wall surface."
      icon={Grid3x3}
      fields={[
        { key: "length", label: "Room length", unit: "m", default: 4 },
        { key: "width", label: "Room width", unit: "m", default: 3.5 },
        { key: "tw", label: "Tile width", unit: "mm", default: 600, step: 10 },
        { key: "th", label: "Tile height", unit: "mm", default: 600, step: 10 },
        { key: "wastage", label: "Wastage", unit: "%", default: 10, step: 1 },
        { key: "perBox", label: "Tiles per box", default: 4, step: 1 },
        { key: "rate", label: "Rate per tile", unit: "currency", default: 430, step: 10 },
      ]}
      compute={(n) => {
        const area = n("length") * n("width");
        const tileArea = (n("tw") / 1000) * (n("th") / 1000);
        const tiles = tileArea ? Math.ceil((area / tileArea) * (1 + n("wastage") / 100)) : 0;
        const perBox = n("perBox") || 1;
        return [
          { label: "Floor area", value: `${fmt(area)} m²` },
          { label: "Area per tile", value: `${fmt(tileArea, 3)} m²` },
          { label: "Tiles required", value: `${fmt(tiles, 0)} nos` },
          { label: "Boxes to order", value: `${fmt(Math.ceil(tiles / perBox), 0)} boxes` },
          { label: "Estimated cost", value: fmt(tiles * n("rate")), highlight: true },
        ];
      }}
      projectItem={{
        slug: "tile",
        label: "Tiles",
        summarize: (n) => {
          const area = n("length") * n("width");
          const tileArea = (n("tw") / 1000) * (n("th") / 1000);
          const tiles = tileArea ? Math.ceil((area / tileArea) * (1 + n("wastage") / 100)) : 0;
          return { quantity: `${fmt(tiles, 0)} Nos`, cost: tiles * n("rate") };
        },
      }}
      notes={[
        "10% wastage covers cuts at edges and breakage.",
        "Order full boxes from the same batch to keep shade consistent.",
      ]}
    />
  ),
});
