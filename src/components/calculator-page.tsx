import { Link } from "@tanstack/react-router";
import { ArrowLeft, FolderPlus, ArrowRight } from "lucide-react";
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

export function fmt(n: number, maxDecimals = 2): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-IN", { maximumFractionDigits: maxDecimals });
}

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
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
        <Link
          to="/calculators"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#86909c] transition-colors hover:text-black dark:hover:text-white mb-6"
        >
          <ArrowLeft size={14} /> Back to all calculators
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 pb-8 border-b border-[#e5e7eb] dark:border-zinc-800">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#ecffe0] text-black border border-[#00f0a0]">
            <Icon size={26} />
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-5xl font-bold font-display text-black dark:text-white tracking-tight">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[#86909c] font-light max-w-2xl">{description}</p>
          </div>
        </div>

        {/* Inputs and Output Cards */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Inputs Feature Card */}
          <section className="feature-card border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#86909c] font-display">
              Input Parameters
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-xs font-semibold text-black dark:text-white block mb-1.5 font-display">
                    {f.label}
                    {f.unit ? <span className="text-[#86909c] font-mono"> ({f.unit})</span> : null}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={f.step ?? 0.01}
                    value={Number.isFinite(values[f.key]) ? values[f.key] : ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-4 py-2.5 text-sm font-semibold font-mono text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0] focus:bg-white"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Estimate Breakdown Feature Card */}
          <section className="feature-card border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#86909c] font-display">
                Derived Quantities
              </h2>
              <dl className="mt-6 space-y-3">
                {results.map((r) => (
                  <div
                    key={r.label}
                    className={`flex items-baseline justify-between gap-4 rounded-full px-5 py-3 ${
                      r.highlight
                        ? "bg-[#ecffe0] dark:bg-zinc-900 border border-[#00f0a0]/40 text-black dark:text-[#00f0a0]"
                        : "bg-[#f2f4f5] dark:bg-zinc-900 text-black dark:text-white"
                    }`}
                  >
                    <dt className="text-xs font-semibold opacity-90">{r.label}</dt>
                    <dd className="text-right text-sm font-bold font-mono tabular-nums">
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {projectItem ? (
              <div className="mt-8 pt-6 border-t border-[#e5e7eb] dark:border-zinc-800 flex flex-col sm:flex-row gap-3">
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
                    toast.success(`${projectItem.label} added to your active project`, {
                      description: `${s.quantity} · ${inr(s.cost)}`,
                    });
                  }}
                  className="btn-pill-black cursor-pointer flex-1"
                >
                  <FolderPlus size={15} /> Add to Project BOQ
                </button>
                <Link
                  to="/project"
                  search={{ tab: "boq" }}
                  className="btn-pill-white text-center cursor-pointer"
                >
                  View BOQ <ArrowRight size={13} />
                </Link>
              </div>
            ) : null}
          </section>
        </div>

        {notes && notes.length > 0 && (
          <div className="mt-8 rounded-[24px] bg-[#f2f4f5]/60 dark:bg-zinc-900/60 p-6 border border-[#e5e7eb] dark:border-zinc-800 text-xs text-[#86909c]">
            <h3 className="font-bold text-black dark:text-white uppercase tracking-wider mb-2 font-display">
              IS Standard Civil Engineering Notes:
            </h3>
            <ul className="list-disc list-inside space-y-1">
              {notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Page>
  );
}
