import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Page } from "@/components/site-chrome";

export const Route = createFileRoute("/subscription")({
  component: SubscriptionPage,
});

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "/forever",
    description: "Perfect for homeowners and simple estimates.",
    features: ["Basic calculators", "Limited projects (up to 3)", "Basic material estimates"],
    buttonText: "Current Plan",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month",
    description: "For professional contractors and quantity surveyors.",
    features: [
      "Unlimited projects",
      "Plan upload (PDF/Image)",
      "Quantity takeoff extraction",
      "BOQ generation & editing",
      "PDF/Excel reports",
      "Estimate history tracking",
    ],
    buttonText: "Upgrade to Pro",
    paymentLink: "upi://pay?pa=abdul.zxmajeed@okicici&pn=Majeed&am=999&cu=INR",
    highlighted: true,
  },
  {
    name: "Business",
    price: "₹2,499",
    period: "/month",
    description: "For large construction firms and engineering teams.",
    features: [
      "Everything in Pro",
      "Large plan processing",
      "Team members (up to 5)",
      "Advanced custom reports",
      "Project management features",
      "Dedicated support",
    ],
    buttonText: "Upgrade to Business",
    paymentLink: "upi://pay?pa=abdul.zxmajeed@okicici&pn=Majeed&am=2499&cu=INR",
    highlighted: false,
  },
];

function SubscriptionPage() {
  return (
    <Page>
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Choose the plan that fits your construction needs. Upgrade or downgrade at any time.
        </p>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-xl p-8 shadow-sm ${
              plan.highlighted
                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "border border-border bg-card text-card-foreground"
            }`}
          >
            <h3 className="text-2xl font-semibold">{plan.name}</h3>
            <p
              className={`mt-2 text-sm ${plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}
            >
              {plan.description}
            </p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
              <span
                className={`text-sm font-medium ${plan.highlighted ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              >
                {plan.period}
              </span>
            </div>

            {plan.paymentLink ? (
              <a
                href={plan.paymentLink}
                className={`mt-8 block w-full rounded-md px-4 py-3 text-sm font-semibold transition-colors text-center ${
                  plan.highlighted
                    ? "bg-background text-primary hover:bg-secondary"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {plan.buttonText}
              </a>
            ) : (
              <button
                className={`mt-8 w-full rounded-md px-4 py-3 text-sm font-semibold transition-colors border-2 border-border bg-background text-muted-foreground cursor-default`}
              >
                {plan.buttonText}
              </button>
            )}

            <ul className="mt-8 space-y-4 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check
                    size={20}
                    className={`shrink-0 ${plan.highlighted ? "text-primary-foreground" : "text-primary"}`}
                  />
                  <span
                    className={`text-sm ${plan.highlighted ? "text-primary-foreground/90" : "text-muted-foreground"}`}
                  >
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-20 max-w-3xl mx-auto text-center border-t border-border pt-12">
        <h2 className="text-2xl font-bold">Additional Opportunities</h2>
        <p className="mt-4 text-muted-foreground">
          Are you a construction material supplier? We offer premium listings and lead generation
          opportunities. Contact us to showcase your products to our network of professional
          builders and engineers.
        </p>
      </div>
    </Page>
  );
}
