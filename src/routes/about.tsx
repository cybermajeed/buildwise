import { createFileRoute, Link } from "@tanstack/react-router";
import { Home, HardHat, ClipboardList, Wrench, GraduationCap, Sparkles, ArrowRight } from "lucide-react";
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
        content: "Helping civil engineers and builders plan construction with confidence.",
      },
    ],
  }),
  component: About,
});

const users = [
  { icon: Home, label: "Homeowners", text: "Sanity-check contractor quotes against IS standards before committing capital." },
  {
    icon: HardHat,
    label: "Civil Engineers",
    text: "Conduct on-site material reconciliations and takeoff verifications without manual spreadsheets.",
  },
  {
    icon: ClipboardList,
    label: "Quantity Surveyors",
    text: "Generate preliminary takeoffs, dry mix conversions, and automated BOQ draft schedules.",
  },
  { icon: Wrench, label: "General Contractors", text: "Order exact material batches, accounting for regional bulking and cutting wastage." },
  { icon: GraduationCap, label: "Civil Students", text: "Master standard estimation formulas: dry volume ratios, D² / 162 steel rules, and IS 1200 conventions." },
];

function About() {
  return (
    <Page>
      {/* ─── Pale-Mint Header Band ─────────────────────────────────────────── */}
      <div className="bg-[#ecffe0] dark:bg-zinc-950 border-b border-[#e5e7eb] dark:border-zinc-800 py-16 px-4 sm:px-8 -mx-4 sm:-mx-8 text-center mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white dark:bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-black dark:text-white uppercase tracking-wider mb-4 shadow-sm font-display">
            <Sparkles size={13} className="text-[#00f0a0]" /> Civil Engineering Monolith
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold font-display tracking-tight text-black dark:text-white">
            About BuildWise
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#86909c] font-light max-w-2xl mx-auto leading-relaxed">
            Eliminating guesswork and rogue contractor margins through automated blueprint vision extraction
            and Indian Standard Quantity Surveying formulas.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-20 space-y-16">
        {/* Core Methodology Feature Card */}
        <div className="feature-card feature-card-asymmetric border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 sm:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-black dark:text-white">
            Built on Real Site Conventions
          </h2>
          <div className="mt-4 space-y-4 text-sm text-[#86909c] font-light leading-relaxed">
            <p>
              Instead of hunting for formulas or rebuilding the same fragile spreadsheet on every project,
              BuildWise derives quantities directly from architectural plan geometry. Bulking factors for dry volume
              (1.54× for concrete, 1.33× for mortar), standard modular brick dimensions, and the universal D² / 162 rule
              for reinforcement steel are hardcoded into the calculation core.
            </p>
            <p>
              The result is a unified platform where drawing uploads, quantity takeoffs, market prices, and client
              reports live together in one seamless offline-capable system.
            </p>
          </div>
        </div>

        {/* User Personas Grid */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#86909c] font-display block mb-2">
            Target Professionals
          </span>
          <h2 className="text-3xl font-bold font-display text-black dark:text-white mb-8">
            Engineered For The Construction Ecosystem
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <div
                key={u.label}
                className="feature-card border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ecffe0] text-black border border-[#00f0a0]">
                    <u.icon size={20} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold font-display text-black dark:text-white">
                    {u.label}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#86909c] font-light">
                    {u.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Featured Black Quote Band */}
        <section className="rounded-[40px] bg-black text-white p-10 sm:p-14 text-center border border-black shadow-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#00f0a0] font-mono">
            Our Core Mission
          </p>
          <blockquote className="mx-auto mt-4 max-w-2xl text-2xl sm:text-4xl font-bold font-display leading-tight tracking-tight">
            “Helping builders and engineers plan construction with absolute mathematical confidence.”
          </blockquote>
          <div className="mt-8 flex justify-center">
            <Link to="/project" className="btn-pill-mint">
              Explore Active Workspace <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </Page>
  );
}
