import { createFileRoute, Link } from "@tanstack/react-router";
import { calculators } from "@/lib/calculators";
import { Page } from "@/components/site-chrome";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/calculators/")({
  head: () => ({
    meta: [
      { title: "Civil Construction Calculators — BuildWise" },
      {
        name: "description",
        content:
          "Six professional civil engineering calculators: brick masonry, concrete mix, cement bags, paint coverage, tile layouts, and TMT reinforcement steel estimation.",
      },
      { property: "og:title", content: "BuildWise Civil Calculators" },
      {
        property: "og:description",
        content: "Engineering material calculation tools under Indian Standard conventions.",
      },
    ],
  }),
  component: Calculators,
});

function Calculators() {
  return (
    <Page>
      {/* ─── Pale-Mint Header Band ─────────────────────────────────────────── */}
      <div className="bg-[#ecffe0] dark:bg-zinc-950 border-b border-[#e5e7eb] dark:border-zinc-800 py-16 px-4 sm:px-8 -mx-4 sm:-mx-8 text-center mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white dark:bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-black dark:text-white uppercase tracking-wider mb-4 shadow-sm font-display">
            <Sparkles size={13} className="text-[#00f0a0]" /> IS Civil Standard Tools
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold font-display tracking-tight text-black dark:text-white">
            Modular Civil Calculators
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#86909c] font-light max-w-xl mx-auto">
            Choose a structural civil material to calculate exact quantities, dry volume conversion,
            wastage allowances, and live costs.
          </p>
        </div>
      </div>

      {/* ─── Calculators Asymmetric Cards Grid ───────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {calculators.map((c) => (
            <Link
              key={c.slug}
              to={c.to}
              className="group feature-card feature-card-asymmetric border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ecffe0] text-black border border-[#00f0a0]/40 transition-colors group-hover:bg-[#00f0a0]">
                  <c.icon size={22} />
                </span>
                <h2 className="mt-6 text-xl font-bold font-display text-black dark:text-white group-hover:text-[#00f0a0] transition-colors">
                  {c.title}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#86909c] font-light">
                  {c.short}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-[#e5e7eb] dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-black dark:text-white font-display">
                <span>Calculate Quantities</span>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-black text-white group-hover:bg-[#00f0a0] group-hover:text-black transition-colors">
                  <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Page>
  );
}
