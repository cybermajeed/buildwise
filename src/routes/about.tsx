import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, HardHat, ClipboardList, Wrench, GraduationCap } from "lucide-react";
import { Page } from "@/components/site-chrome";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — BuildWise" },
      {
        name: "description",
        content:
          "BuildWise helps homeowners, engineers, surveyors, contractors and students estimate construction materials quickly and plan with confidence.",
      },
      { property: "og:title", content: "About BuildWise" },
      {
        property: "og:description",
        content: "Helping people plan construction with confidence.",
      },
    ],
  }),
  component: About,
});

const users = [
  { icon: Home, label: "Homeowners", text: "Sanity-check builder quotes before you commit." },
  {
    icon: HardHat,
    label: "Civil Engineers",
    text: "Quick site checks without opening a spreadsheet.",
  },
  {
    icon: ClipboardList,
    label: "Quantity Surveyors",
    text: "Fast preliminary take-offs and cross-checks.",
  },
  { icon: Wrench, label: "Contractors", text: "Order the right material volumes the first time." },
  { icon: GraduationCap, label: "Students", text: "Learn standard estimation formulas by doing." },
];

function About() {
  return (
    <Page>
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">About BuildWise</h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          BuildWise helps users estimate construction materials quickly. Instead of hunting for
          formulas or rebuilding the same spreadsheet on every project, you enter the dimensions you
          already have and get quantities, wastage allowance and an approximate cost in seconds.
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Every calculator follows the conventions used on real sites — bulking factors for dry
          volume, standard brick and bag sizes, and the D² / 162 rule for reinforcement — so the
          numbers translate directly into an order list.
        </p>
      </header>

      <section className="mt-14">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Who it's for
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <article
              key={u.label}
              className="rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
            >
              <span className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
                <u.icon size={19} />
              </span>
              <h3 className="mt-4 text-base font-semibold">{u.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{u.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-xl bg-primary px-8 py-14 text-center text-primary-foreground shadow-[var(--shadow-lift)]">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-75">Our mission</p>
        <p className="mx-auto mt-4 max-w-2xl text-2xl font-semibold leading-snug sm:text-3xl">
          “Helping people plan construction with confidence.”
        </p>
        <Link
          to="/calculators"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-background px-6 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
        >
          Open the calculators
        </Link>
      </section>
    </Page>
  );
}
