import { Link } from "@tanstack/react-router";
import { ArrowLeft, FolderPlus } from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
import { inr, upsertItem } from "@/lib/project-store";

export type Field = {
  key: string;
  label: string;
  unit?: string;
  default: number;
  step?: number;
};

export type ResultRow = { label: string; value: string; highlight?: boolean };

type Props = {
  title: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
  fields: Field[];
  compute: (n: (key: string) => number) => ResultRow[];
  notes?: string[];
  projectItem?: {
    slug: string;
    label: string;
    summarize: (n: (key: string) => number) => { quantity: string; cost: number };
  };
};

export function CalculatorPage({
  title,
  description,
  icon: Icon,
  fields,
  compute,
  notes,
  projectItem,
}: Props) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.default])),
  );

  const num = useMemo(() => (k: string) => Number(values[k]) || 0, [values]);

  const results = useMemo(() => {
    try {
      return compute(num);
    } catch {
      return [];
    }
  }, [num, compute]);

  return (
    <Page>
      <Link
        to="/calculators"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} /> All calculators
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Inputs
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {fields.map((f) => (
              <label key={f.key} className="block">
                <span className="text-sm font-medium text-foreground">
                  {f.label}
                  {f.unit ? <span className="text-muted-foreground"> ({f.unit})</span> : null}
                </span>
                <input
                  type="number"
                  min={0}
                  step={f.step ?? 0.01}
                  value={Number.isFinite(values[f.key]) ? values[f.key] : ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-ring focus:ring-4 focus:ring-ring/15"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Estimate
          </h2>
          <dl className="mt-6 space-y-3">
            {results.map((r) => (
              <div
                key={r.label}
                className={`flex items-baseline justify-between gap-4 rounded-md px-4 py-3 ${
                  r.highlight ? "bg-primary text-primary-foreground" : "bg-secondary"
                }`}
              >
                <dt className="text-sm font-medium opacity-90">{r.label}</dt>
                <dd className="text-right text-base font-semibold tabular-nums">{r.value}</dd>
              </div>
            ))}
          </dl>

          {projectItem ? (
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => {
                  const s = projectItem.summarize(num);
                  upsertItem({
                    slug: projectItem.slug,
                    label: projectItem.label,
                    quantity: s.quantity,
                    cost: s.cost,
                  });
                  toast.success(`${projectItem.label} added to your project`, {
                    description: `${s.quantity} · ${inr(s.cost)}`,
                  });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <FolderPlus size={16} /> Add to project
              </button>
              <Link
                to="/project"
                className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                View project
              </Link>
            </div>
          ) : null}

          {notes?.length ? (
            <ul className="mt-6 space-y-2 text-xs leading-relaxed text-muted-foreground">
              {notes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </Page>
  );
}

export const fmt = (n: number, digits = 2) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: digits }) : "—";
