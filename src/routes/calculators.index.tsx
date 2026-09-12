import { createFileRoute, Link } from "@tanstack/react-router";
import { calculators } from "@/lib/calculators";
import { Page } from "@/components/site-chrome";

export const Route = createFileRoute("/calculators/")({
  head: () => ({
    meta: [
      { title: "Calculators — BuildWise" },
      {
        name: "description",
        content:
          "Six professional construction calculators: brick, concrete, cement, paint, tile and steel quantity and cost estimation.",
      },
      { property: "og:title", content: "BuildWise Calculators" },
      {
        property: "og:description",
        content: "Brick, concrete, cement, paint, tile and steel estimation tools.",
      },
    ],
  }),
  component: Calculators,
});

function Calculators() {
  return (
    <Page>
      <header id="all" className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Calculators</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Pick a material to estimate quantities, wastage and approximate cost. Each calculator
          opens on its own page with its own inputs.
        </p>
      </header>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {calculators.map((c) => (
          <Link
            key={c.slug}
            to={c.to}
            className="group rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-ring/40 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-md bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <c.icon size={20} />
            </span>
            <h2 className="mt-5 text-lg font-semibold">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.short}</p>
          </Link>
        ))}
      </div>
    </Page>
  );
}
