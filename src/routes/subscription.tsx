import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Page } from "@/components/site-chrome";

export const Route = createFileRoute("/subscription")({
  component: SubscriptionPage,
});

const plans = [
  {
    name: "Free Starter",
    price: "₹0",
    period: "/forever",
    description: "Essential estimation tools for homeowners and single contractors.",
    features: [
      "Standard Civil Calculators",
      "Manual Room Dimension Entry",
      "Basic Material Requirement Summaries",
      "Local Storage Persistence",
    ],
    buttonText: "Active Plan",
    highlighted: false,
  },
  {
    name: "Pro Engineer",
    price: "₹999",
    period: "/month",
    description: "For professional contractors, civil engineers, and quantity surveyors.",
    features: [
      "Unlimited Construction Projects",
      "AI Blueprint Vision Extraction (Gemini / GPT-4o)",
      "IS 1200 Standard Quantity Takeoffs",
      "Dynamic Bill of Quantities (BOQ)",
      "Instant Material Constituent Breakdown",
      "Client PDF & Version Snapshot Exports",
    ],
    buttonText: "Upgrade to Pro",
    paymentLink: "upi://pay?pa=abdul.zxmajeed@okicici&pn=Majeed&am=999&cu=INR",
    highlighted: true,
  },
  {
    name: "Enterprise Firm",
    price: "₹2,499",
    period: "/month",
    description: "For architectural studios, developer teams, and large EPC contractors.",
    features: [
      "Everything in Pro Engineer",
      "High-Resolution Multi-page PDF Plans",
      "Multi-user Team Collaboration",
      "Custom Rate Schedule Templates",
      "Dedicated Technical & QS Support",
      "Priority AI Vision Processing",
    ],
    buttonText: "Upgrade to Enterprise",
    paymentLink: "upi://pay?pa=abdul.zxmajeed@okicici&pn=Majeed&am=2499&cu=INR",
    highlighted: false,
  },
];

function SubscriptionPage() {
  return (
    <Page>
      {/* ─── Pale-Mint Header Band ─────────────────────────────────────────── */}
      <div className="bg-[#ecffe0] dark:bg-zinc-950 border-b border-[#e5e7eb] dark:border-zinc-800 py-16 px-4 sm:px-8 -mx-4 sm:-mx-8 text-center mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white dark:bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-black dark:text-white uppercase tracking-wider mb-4 shadow-sm font-display">
            <Sparkles size={13} className="text-[#00f0a0]" /> Transparent QS Pricing
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold font-display tracking-tight text-black dark:text-white">
            Simple, Predictable Civil Pricing
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#86909c] font-light max-w-xl mx-auto">
            Choose the tier tailored to your project scale. Upgrade or downgrade anytime with zero
            lock-in.
          </p>
        </div>
      </div>

      {/* ─── Pricing Cards Grid (Jobright Tier System) ───────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid gap-8 md:grid-cols-3 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col justify-between rounded-[36px] p-8 transition-all ${
                plan.highlighted
                  ? "bg-black text-white dark:bg-zinc-900 shadow-xl border-2 border-[#00f0a0] relative"
                  : "bg-white dark:bg-zinc-950 border border-[#e5e7eb] dark:border-zinc-800 shadow-sm hover:shadow-md"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00f0a0] text-black font-bold text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full border border-black font-display">
                  Most Popular for Engineers
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-2xl font-bold font-display ${plan.highlighted ? "text-white" : "text-black dark:text-white"}`}
                  >
                    {plan.name}
                  </h3>
                </div>

                <p
                  className={`mt-2 text-xs leading-relaxed ${plan.highlighted ? "text-zinc-300" : "text-[#86909c]"}`}
                >
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span
                    className={`text-4xl sm:text-5xl font-black font-display tracking-tight ${plan.highlighted ? "text-white" : "text-black dark:text-white"}`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-xs font-semibold ${plan.highlighted ? "text-[#00f0a0]" : "text-[#86909c]"}`}
                  >
                    {plan.period}
                  </span>
                </div>

                <ul className="mt-8 space-y-3.5 text-xs font-medium">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full shrink-0 ${plan.highlighted ? "bg-[#00f0a0] text-black" : "bg-[#ecffe0] text-black"}`}
                      >
                        <Check size={12} />
                      </span>
                      <span
                        className={
                          plan.highlighted ? "text-zinc-200" : "text-zinc-700 dark:text-zinc-300"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 pt-6 border-t border-black/10 dark:border-white/10">
                {plan.paymentLink ? (
                  <a
                    href={plan.paymentLink}
                    className={`block w-full text-center cursor-pointer ${
                      plan.highlighted
                        ? "btn-pill-mint !w-full !py-3.5"
                        : "btn-pill-black !w-full !py-3.5"
                    }`}
                  >
                    {plan.buttonText}
                  </a>
                ) : (
                  <button
                    disabled
                    className="btn-pill-white !w-full !py-3.5 opacity-60 cursor-default"
                  >
                    {plan.buttonText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ─── Supplier Banner ────────────────────────────────────────────────── */}
        <div className="mt-20 feature-card bg-[#f2f4f5]/60 dark:bg-zinc-900 border-[#e5e7eb] dark:border-zinc-800 p-8 sm:p-10 text-center max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold font-display text-black dark:text-white">
            Are You a Certified Construction Material Supplier?
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-[#86909c] max-w-xl mx-auto leading-relaxed">
            We provide verified material listing integrations, real-time rate feeds, and contractor
            lead matching across active civil projects in India.
          </p>
          <div className="mt-6 flex justify-center">
            <a
              href="mailto:partners@buildwise.civil?subject=Supplier%20Partner%20Inquiry"
              className="btn-pill-black"
            >
              Contact Supplier Partnership Team
            </a>
          </div>
        </div>
      </div>
    </Page>
  );
}
