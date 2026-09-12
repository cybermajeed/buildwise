import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Zap, MousePointerClick, BadgeCheck, ArrowRight } from "lucide-react";
import { Page } from "@/components/site-chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildWise — Construction Cost Management Calculator" },
      {
        name: "description",
        content:
          "Estimate construction materials and approximate costs quickly with BuildWise's professional calculators for brick, concrete, cement, paint, tile and steel.",
      },
      { property: "og:title", content: "BuildWise — Construction Cost Calculator" },
      {
        property: "og:description",
        content:
          "Professional material and cost estimation calculators for homeowners, engineers and contractors.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Target,
    title: "Accurate Estimation",
    text: "Industry-standard formulas with wastage allowance for dependable quantities.",
  },
  {
    icon: Zap,
    title: "Fast Calculations",
    text: "Results update instantly as you type — no submit buttons, no waiting.",
  },
  {
    icon: MousePointerClick,
    title: "Easy to Use",
    text: "Clear inputs and plain-language outputs anyone on site can follow.",
  },
  {
    icon: BadgeCheck,
    title: "Professional Results",
    text: "Material breakdowns and cost totals ready to drop into your estimate.",
  },
];

function Index() {
  return (
    <Page>
      <section className="mx-auto max-w-3xl text-center">
        <span className="inline-flex items-center rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Estimation Toolkit
        </span>
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl">BuildWise</h1>
        <p className="mt-4 text-xl font-medium text-accent-foreground sm:text-2xl">
          Construction Cost Management Calculator
        </p>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          Estimate construction materials and approximate costs quickly using professional
          calculators.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/calculators"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5 sm:w-auto"
          >
            Start Calculating <ArrowRight size={16} />
          </Link>
          <Link
            to="/calculators"
            hash="all"
            className="inline-flex w-full items-center justify-center rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary sm:w-auto"
          >
            Explore Calculators
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <article
            key={f.title}
            className="rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
              <f.icon size={19} />
            </span>
            <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
          </article>
        ))}
      </section>
    </Page>
  );
}
