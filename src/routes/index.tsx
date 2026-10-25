import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  FolderPlus,
  ArrowRight,
  Building2,
  MapPin,
  User,
  Calculator,
  IndianRupee,
  Layers,
  FileText,
  Trash2,
  Copy,
  Sparkles,
  CheckCircle2,
  Ruler,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Page } from "@/components/site-chrome";
import {
  useAppStore,
  createProject,
  setActiveProject,
  deleteProject,
  duplicateProject,
  totalCost,
  inr,
  updateActiveProject,
} from "@/lib/project-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildWise — Construction Cost Management & QS Monolith" },
      {
        name: "description",
        content:
          "Automate architectural plan extraction, quantity takeoffs under IS 1200, and live bill of quantities.",
      },
    ],
  }),
  component: IndexPage,
});

const LIVE_MATERIAL_TICKER = [
  { name: "OPC 53 Cement", rate: "₹385 / bag", delta: "+1.2%" },
  { name: "Fe550D TMT Steel", rate: "₹64.50 / kg", delta: "-0.8%" },
  { name: "Table-Moulded Red Bricks", rate: "₹9.50 / pc", delta: "0.0%" },
  { name: "Washed River M-Sand", rate: "₹48.00 / cft", delta: "+2.1%" },
  { name: "RMC Concrete M25", rate: "₹4,650 / m³", delta: "+0.5%" },
  { name: "Vitrified Floor Tiles (2x2)", rate: "₹55.00 / sq.ft", delta: "0.0%" },
  { name: "Exterior Emulsion Paint", rate: "₹320.00 / Ltr", delta: "-1.1%" },
  { name: "Skilled Mason / Barbender", rate: "₹1,150 / day", delta: "0.0%" },
];

function IndexPage() {
  const { projects } = useAppStore();
  const navigate = useNavigate();
  const creatorRef = useRef<HTMLDivElement>(null);

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [projectType, setProjectType] = useState("Residential Villa (G+1)");

  const handleCreateProject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = projectName.trim() || `Construction Project ${projects.length + 1}`;
    const id = createProject(finalName);
    updateActiveProject(
      {
        clientName: clientName.trim() || "Private Client",
        location: location.trim() || "Main Site",
        savedAt: new Date().toISOString(),
      },
      id,
    );
    toast.success(`Project "${finalName}" created & saved locally!`);
    navigate({ to: "/project", search: { tab: "plan", projectId: id } });
  };

  const scrollToCreator = () => {
    creatorRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Page fullWidth>
      {/* ─── 1. PALE-MINT HERO BAND (Jobright Signature Rhythm) ───────────────── */}
      <section className="bg-[#ecffe0] dark:bg-zinc-950 border-b border-[#e5e7eb] dark:border-zinc-800 py-16 sm:py-24 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white dark:bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-black dark:text-white uppercase tracking-wider mb-6 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#00f0a0] animate-pulse" />
            <span>AI-Driven Civil Estimation & QS Monolith</span>
          </div>

          {/* Display Headline (Titillium Web Bold Condensed) */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-display text-black dark:text-white tracking-tight leading-[1.06] max-w-4xl mx-auto">
            Civil Takeoff & Construction Cost Estimation,{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Automated.</span>
              <span className="absolute bottom-2 left-0 right-0 h-4 bg-[#00f0a0] -z-0 opacity-80 rounded-sm" />
            </span>
          </h1>

          {/* Light Airy Lead Copy */}
          <p className="mt-6 text-base sm:text-xl text-[#86909c] font-light max-w-2xl mx-auto leading-relaxed">
            Extract room dimensions, structural walls, and openings directly from blueprints.
            Calculate IS 1200 compliant bills of quantities and real-time material requirements in
            seconds.
          </p>

          {/* Dual Pill Button CTA System */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={scrollToCreator}
              className="btn-pill-black text-sm sm:text-base py-3.5 px-8 cursor-pointer"
            >
              Start New Project <ArrowRight size={16} />
            </button>
            <Link
              to="/project"
              search={{ tab: "plan" }}
              className="btn-pill-mint text-sm sm:text-base py-3.5 px-8"
            >
              <Sparkles size={16} /> Open Active Workspace
            </Link>
          </div>

          {/* Trust Metric Chips */}
          <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-medium text-black/80 dark:text-white/80">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-black dark:text-[#00f0a0]" />
              <span>IS 1200 / SMM Standard</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-black dark:text-[#00f0a0]" />
              <span>Zero Hallucinated Overlays</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-black dark:text-[#00f0a0]" />
              <span>Live India Market Rates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. SCROLLING BLACK JOB/MATERIAL TICKER (Signature Band) ─────────── */}
      <section className="bg-black text-white py-3.5 overflow-hidden select-none border-b border-black">
        <div className="animate-ticker flex items-center gap-8 whitespace-nowrap text-xs font-medium">
          {LIVE_MATERIAL_TICKER.concat(LIVE_MATERIAL_TICKER).map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="font-bold text-white tracking-wide">{m.name}</span>
              <span className="font-mono text-[#00f0a0] font-semibold">{m.rate}</span>
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/70">
                {m.delta}
              </span>
              <span className="text-white/30 text-sm">•</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 3. WHITE CANVAS: INTERACTIVE PROJECT CREATOR & HUB ─────────────── */}
      <section ref={creatorRef} className="py-16 sm:py-24 px-4 sm:px-8 bg-white dark:bg-black">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#86909c] font-display">
              Modular Monolith
            </span>
            <h2 className="text-3xl sm:text-5xl font-bold font-display text-black dark:text-white mt-1">
              Create or Launch a Project
            </h2>
            <p className="text-sm text-[#86909c] mt-2 max-w-xl mx-auto">
              Every project provides an end-to-end dedicated workspace: Blueprint upload, QS
              takeoff, BOQ rates, civil calculators, and report exports.
            </p>
          </div>

          {/* Project Creator Form Card (Jobright Feature-Card with Asymmetric Corner) */}
          <div className="feature-card feature-card-asymmetric border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-10 mb-16">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e7eb] dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#00f0a0] text-black border border-black font-bold text-xs">
                  +
                </span>
                <span className="text-base font-bold font-display text-black dark:text-white">
                  Project Onboarding Parameters
                </span>
              </div>
              <span className="text-xs text-[#86909c] hidden sm:inline">
                All fields remain blank until image upload or manual entry
              </span>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5 mb-2 font-display">
                    <Building2 size={14} className="text-[#00f0a0]" /> Project Name
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Modern Residential Villa G+1"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-5 py-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0] focus:bg-white transition-all font-medium"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5 mb-2 font-display">
                    <User size={14} className="text-[#00f0a0]" /> Client / Developer Name
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Skyline Infrastructure Ltd."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-5 py-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0] focus:bg-white transition-all font-medium"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5 mb-2 font-display">
                    <MapPin size={14} className="text-[#00f0a0]" /> Site Location & Zone
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Plot 42, Green Valley Enclave"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-5 py-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0] focus:bg-white transition-all font-medium"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-black dark:text-white flex items-center gap-1.5 mb-2 font-display">
                    <Layers size={14} className="text-[#00f0a0]" /> Structural Typology
                  </span>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-[#f2f4f5] dark:bg-zinc-900 px-5 py-3 text-sm text-black dark:text-white outline-none focus:border-black dark:focus:border-[#00f0a0] focus:bg-white transition-all font-medium cursor-pointer"
                  >
                    <option value="Residential Villa (G+1)">Residential Villa (G+1)</option>
                    <option value="Single Story Bungalow">Single Story Bungalow</option>
                    <option value="Commercial Complex (G+3)">Commercial Complex (G+3)</option>
                    <option value="Apartment / Multi-Unit">Apartment / Multi-Unit</option>
                    <option value="Interior Fitout & Renovation">
                      Interior Fitout & Renovation
                    </option>
                  </select>
                </label>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[#86909c]">
                  Once created, upload an architectural plan in the workspace to automatically
                  extract schedules.
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const id = createProject(`Quick Project ${projects.length + 1}`);
                      setActiveProject(id);
                      navigate({ to: "/project", search: { tab: "plan" } });
                    }}
                    className="btn-pill-white w-full sm:w-auto"
                  >
                    Quick Blank
                  </button>
                  <button type="submit" className="btn-pill-black w-full sm:w-auto">
                    <FolderPlus size={16} /> Create & Open Project <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Existing Active Projects Grid */}
          <div className="mt-14">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold font-display text-black dark:text-white">
                  Active Projects ({projects.length})
                </h3>
                <p className="text-xs text-[#86909c] mt-0.5">
                  Click any project to switch the sidebar into its dedicated workspace.
                </p>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-[#e5e7eb] dark:border-zinc-800 p-12 text-center bg-[#f2f4f5]/40 dark:bg-zinc-900/30">
                <Building2 size={36} className="mx-auto text-[#86909c] mb-3" />
                <h4 className="font-bold text-base font-display text-black dark:text-white">
                  No active projects yet
                </h4>
                <p className="text-xs text-[#86909c] mt-1 max-w-sm mx-auto">
                  Use the form above to initialize your first project and upload a blueprint
                  drawing.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => {
                  const currentTotal = totalCost(p.items);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col justify-between rounded-[28px] border border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold text-lg font-display text-black dark:text-white truncate group-hover:text-[#00f0a0] transition-colors">
                              {p.name}
                            </h4>
                            <p className="text-xs text-[#86909c] flex items-center gap-1 mt-1 truncate">
                              <MapPin size={12} className="shrink-0" />{" "}
                              {p.location || "Site location not set"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                duplicateProject(p.id);
                                toast.success("Project duplicated.");
                              }}
                              className="text-[#86909c] hover:text-black dark:hover:text-white p-1.5 transition-colors rounded-full hover:bg-[#f2f4f5]"
                              title="Duplicate Project"
                            >
                              <Copy size={13} />
                            </button>
                            <button
                              onClick={() => {
                                deleteProject(p.id);
                                toast.info("Project deleted.");
                              }}
                              className="text-[#86909c] hover:text-red-500 p-1.5 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-950/20"
                              title="Delete Project"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Financial Metric Box */}
                        <div className="mt-5 rounded-[20px] bg-[#ecffe0] dark:bg-zinc-900 p-4 border border-[#00f0a0]/20">
                          <span className="text-[10px] font-bold text-[#86909c] block uppercase tracking-wider font-display">
                            Estimated Material Budget
                          </span>
                          <span className="text-2xl font-black font-display text-black dark:text-white tabular-nums block mt-0.5">
                            {inr(currentTotal)}
                          </span>
                          <span className="text-xs text-[#86909c] mt-1 block">
                            {p.items.length} BOQ items recorded
                          </span>
                        </div>
                      </div>

                      {/* Card Action Pills */}
                      <div className="mt-6 pt-4 border-t border-[#e5e7eb] dark:border-zinc-800 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setActiveProject(p.id);
                            navigate({ to: "/project", search: { tab: "plan" } });
                          }}
                          className="btn-pill-white !py-2 !text-xs !px-2"
                        >
                          Plan & Takeoff
                        </button>
                        <button
                          onClick={() => {
                            setActiveProject(p.id);
                            navigate({ to: "/project", search: { tab: "boq" } });
                          }}
                          className="btn-pill-black !py-2 !text-xs !px-2"
                        >
                          Open BOQ <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 4. ALTERNATING FEATURE BAND 1: PALE-MINT WASH ──────────────────── */}
      <section className="bg-[#ecffe0] dark:bg-zinc-950 border-y border-[#e5e7eb] dark:border-zinc-800 py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-black text-white px-3 py-1 text-[11px] font-semibold mb-4">
              <Sparkles size={12} className="text-[#00f0a0]" /> Multimodal AI Vision
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-display text-black dark:text-white leading-tight">
              Blueprint Extraction With Zero Synthetic Hallucinations.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#86909c] font-light leading-relaxed">
              Upload your architectural floor plan, blueprint, or scan. Multimodal AI directly
              extracts room dimensions, structural wall lengths, carpet areas, and door/window
              openings — without generating inaccurate vector overlays.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/project" search={{ tab: "plan" }} className="btn-pill-black">
                Inspect Plan Viewer <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Floating Product Mockup Card */}
          <div className="feature-card feature-card-asymmetric bg-white dark:bg-zinc-900 border-[#e5e7eb] dark:border-zinc-800 p-6 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] dark:border-zinc-800 text-xs font-bold font-display">
              <span className="text-black dark:text-white flex items-center gap-1.5">
                <Ruler size={14} className="text-[#00f0a0]" /> Extracted Schedule
              </span>
              <span className="rounded-full bg-[#ecffe0] text-black px-2.5 py-0.5 text-[10px] font-semibold">
                IS 1200 Verified
              </span>
            </div>
            <div className="mt-4 space-y-2.5 text-xs">
              {[
                { room: "Living Room", dim: "16′ × 14′", area: "224 sq.ft" },
                { room: "Master Bedroom", dim: "14′ × 12′", area: "168 sq.ft" },
                { room: "Modular Kitchen", dim: "12′ × 10′", area: "120 sq.ft" },
                { room: "Guest Bedroom", dim: "12′ × 11′", area: "132 sq.ft" },
              ].map((r) => (
                <div
                  key={r.room}
                  className="flex items-center justify-between p-2.5 rounded-full bg-[#f2f4f5] dark:bg-zinc-800 font-medium"
                >
                  <span className="font-semibold text-black dark:text-white pl-2">{r.room}</span>
                  <div className="flex items-center gap-3 pr-2">
                    <span className="text-[#86909c] font-mono">{r.dim}</span>
                    <span className="font-bold text-black dark:text-[#00f0a0] font-mono">
                      {r.area}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. ALTERNATING FEATURE BAND 2: WHITE CANVAS BOQ ─────────────────── */}
      <section className="bg-white dark:bg-black py-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Floating Product Mockup Card */}
          <div className="feature-card border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-lg order-2 lg:order-1">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] dark:border-zinc-800 text-xs font-bold font-display">
              <span className="text-black dark:text-white flex items-center gap-1.5">
                <FileSpreadsheet size={14} className="text-[#00f0a0]" /> Live Bill of Quantities
              </span>
              <span className="text-[#00f0a0] font-mono font-bold">Auto-Sync</span>
            </div>
            <div className="mt-4 divide-y divide-[#e5e7eb] dark:divide-zinc-800 text-xs">
              {[
                { item: "Excavation in Earthwork", qty: "84 m³", rate: "₹280", cost: "₹23,520" },
                {
                  item: "PCC 1:4:8 Foundation Bed",
                  qty: "14.2 m³",
                  rate: "₹4,200",
                  cost: "₹59,640",
                },
                {
                  item: "RCC M25 Column & Beams",
                  qty: "26.5 m³",
                  rate: "₹6,800",
                  cost: "₹1,80,200",
                },
                { item: "Brick Masonry 230mm", qty: "42 m³", rate: "₹5,400", cost: "₹2,26,800" },
              ].map((row) => (
                <div key={row.item} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-black dark:text-white truncate">{row.item}</p>
                    <span className="text-[10px] text-[#86909c]">
                      {row.qty} @ {row.rate}
                    </span>
                  </div>
                  <span className="font-bold text-black dark:text-white font-mono">{row.cost}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#ecffe0] text-black px-3 py-1 text-[11px] font-semibold mb-4 border border-[#00f0a0]/40">
              <TrendingUp size={12} className="text-black" /> Quantity Surveying Standards
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-display text-black dark:text-white leading-tight">
              Synchronized Rates, Quantities, and Material Schedules.
            </h2>
            <p className="mt-4 text-sm sm:text-base text-[#86909c] font-light leading-relaxed">
              Every dimension extracted from the blueprint links directly into your Bill of
              Quantities. Sync with current Indian market prices or customize unit rates with
              instantaneous total budget recalculation.
            </p>
            <div className="mt-8">
              <Link to="/material-prices" className="btn-pill-mint">
                View Live Material Prices <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. FULL-BLACK BENCHMARK & PRECISION BAND ────────────────────────── */}
      <section className="bg-black text-white py-20 px-4 sm:px-8 border-y border-black">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[#00f0a0] font-mono font-bold text-xs uppercase tracking-widest block mb-4">
            Civil Engineering Rigor
          </span>
          <blockquote className="text-2xl sm:text-4xl font-bold font-display text-white leading-snug tracking-tight">
            “Standardized quantity surveying adhering strictly to IS 1200 conventions. Eliminates
            contractor ambiguity, rogue markups, and unverified estimations.”
          </blockquote>

          {/* Stat Numbers (Titillium Web Bold) */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-white/10 pt-10">
            <div>
              <span className="text-4xl sm:text-5xl font-black font-display text-[#00f0a0] block">
                IS 1200
              </span>
              <span className="text-xs text-white/70 mt-1 block uppercase tracking-wider font-medium">
                Civil Standard Compliance
              </span>
            </div>
            <div>
              <span className="text-4xl sm:text-5xl font-black font-display text-white block">
                6 Modules
              </span>
              <span className="text-xs text-white/70 mt-1 block uppercase tracking-wider font-medium">
                Figma-Style Monolith Suite
              </span>
            </div>
            <div>
              <span className="text-4xl sm:text-5xl font-black font-display text-[#00f0a0] block">
                ₹0 Mock
              </span>
              <span className="text-xs text-white/70 mt-1 block uppercase tracking-wider font-medium">
                100% Geometry Derived
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. PALE-MINT CLOSING CTA BAND ──────────────────────────────────── */}
      <section className="bg-[#ecffe0] dark:bg-zinc-950 py-20 px-4 sm:px-8 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-bold font-display text-black dark:text-white tracking-tight">
            Ready to Build With Verified Dimensions?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#86909c] font-light max-w-xl mx-auto">
            Create your project in seconds. Upload drawings, extract quantities, and generate
            client-ready estimates.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={scrollToCreator}
              className="btn-pill-black text-sm sm:text-base py-3.5 px-10 cursor-pointer"
            >
              Start Your Project <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </Page>
  );
}
