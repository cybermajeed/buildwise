import { Blocks, Layers, Package, PaintRoller, Grid3x3, Ruler } from "lucide-react";

export const calculators = [
  {
    slug: "brick",
    to: "/calculators/brick",
    title: "Brick Calculator",
    short: "Number of bricks, mortar volume and cost for any wall area.",
    icon: Blocks,
  },
  {
    slug: "concrete",
    to: "/calculators/concrete",
    title: "Concrete Calculator",
    short: "Wet and dry volume with cement, sand and aggregate split by mix.",
    icon: Layers,
  },
  {
    slug: "cement",
    to: "/calculators/cement",
    title: "Cement Calculator",
    short: "Cement bags and sand required for plastering work.",
    icon: Package,
  },
  {
    slug: "paint",
    to: "/calculators/paint",
    title: "Paint Calculator",
    short: "Litres of paint per coat for interior or exterior surfaces.",
    icon: PaintRoller,
  },
  {
    slug: "tile",
    to: "/calculators/tile",
    title: "Tile Calculator",
    short: "Tile count including wastage for floors and walls.",
    icon: Grid3x3,
  },
  {
    slug: "steel",
    to: "/calculators/steel",
    title: "Steel Calculator",
    short: "Reinforcement bar weight and cost from diameter and length.",
    icon: Ruler,
  },
] as const;
