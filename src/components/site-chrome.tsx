import { Link, useLocation } from "@tanstack/react-router";
import {
  HardHat,
  Menu,
  X,
  Home,
  Calculator,
  IndianRupee,
  PieChart,
  FileText,
  Crown,
  Settings,
  Sun,
  Moon,
  ArrowLeft,
  Building2,
  Layers,
  Ruler,
  FileSpreadsheet,
  Plus,
  Save,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import {
  useAppStore,
  useActiveProject,
  setActiveProject,
  saveVersion,
  totalCost,
  inr,
} from "@/lib/project-store";

// Global navigation for Hub / Outside active project
const globalNavLinks = [
  { to: "/" as const, label: "Projects Hub", icon: Home },
  { to: "/calculators" as const, label: "Civil Calculators", icon: Calculator },
  { to: "/material-prices" as const, label: "Live Material Rates", icon: IndianRupee },
  { to: "/subscription" as const, label: "Plans & Pricing", icon: Crown },
  { to: "/settings" as const, label: "Settings & AI Vision", icon: Settings },
] as const;

// Dedicated modules inside an open project (Figma / VS Code / Xcode model)
export const projectWorkflowModules = [
  { tab: "plan" as const, label: "1. Plan & Blueprint", icon: Layers, desc: "Upload Blueprint" },
  { tab: "takeoff" as const, label: "2. Dimensions & Takeoff", icon: Ruler, desc: "QS Quantities" },
  {
    tab: "boq" as const,
    label: "3. Bill of Quantities",
    icon: FileSpreadsheet,
    desc: "Rates & Amounts",
  },
  {
    tab: "calculators" as const,
    label: "4. Project Calculators",
    icon: Calculator,
    desc: "Add Materials",
  },
  { tab: "cost" as const, label: "5. Cost & Budget", icon: PieChart, desc: "Estimate Breakdown" },
  {
    tab: "reports" as const,
    label: "6. Reports & Versions",
    icon: FileText,
    desc: "PDF & Revisions",
  },
] as const;

export type ProjectModuleTab = (typeof projectWorkflowModules)[number]["tab"];

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      localStorage.getItem("theme") === "dark";
    setIsDark(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  const toggle = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      className="grid h-8 w-8 place-items-center rounded-full border border-border text-foreground transition-all hover:bg-secondary"
      title="Toggle theme"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

export function SiteSidebar() {
  const location = useLocation();
  const { projects } = useAppStore();
  const activeProject = useActiveProject() || projects[0];

  const isInProjectWorkspace = location.pathname.startsWith("/project");
  const currentTab =
    ((location.search as Record<string, unknown>)?.["tab"] as ProjectModuleTab) || "plan";

  const handleQuickSaveSnapshot = () => {
    saveVersion();
    toast.success("Project snapshot saved!");
  };

  return (
    <aside className="hidden w-64 flex-col border-r border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 sm:flex sticky top-0 h-screen z-30 select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-[#e5e7eb] dark:border-zinc-800">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#00f0a0] text-black border border-black shadow-sm font-display font-black text-sm">
            <HardHat size={16} className="text-black" />
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-bold font-display tracking-tight leading-none text-black dark:text-white">
              Build<span className="text-[#00f0a0]">Wise</span>
            </span>
            <span className="text-[10px] font-semibold text-[#86909c] uppercase tracking-wider mt-0.5">
              Cost & QS Platform
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </div>

      {/* Navigation Body */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col justify-between">
        {isInProjectWorkspace && activeProject ? (
          /* ─── DEDICATED PROJECT WORKSPACE SIDEBAR ─── */
          <div className="space-y-4">
            {/* Project Header Card & Back Navigation */}
            <div className="rounded-[20px] border border-[#e5e7eb] dark:border-zinc-800 bg-[#f2f4f5]/60 dark:bg-zinc-900/60 p-3.5">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#86909c] hover:text-black dark:hover:text-white mb-2 transition-colors"
              >
                <ArrowLeft size={12} /> Back to Projects Hub
              </Link>
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-white truncate font-display">
                    <Building2 size={13} className="text-black dark:text-[#00f0a0] shrink-0" />
                    <span className="truncate">{activeProject.name}</span>
                  </div>
                  <p className="text-[10px] text-[#86909c] truncate mt-0.5">
                    {activeProject.clientName || activeProject.location || "Active Workspace"}
                  </p>
                </div>
              </div>

              {/* Project Switcher if multiple projects exist */}
              {projects.length > 1 && (
                <div className="mt-2.5 pt-2 border-t border-[#e5e7eb] dark:border-zinc-800">
                  <select
                    value={activeProject.id}
                    onChange={(e) => {
                      setActiveProject(e.target.value);
                      const sel = projects.find((p) => p.id === e.target.value);
                      if (sel) toast.info(`Switched to ${sel.name}`);
                    }}
                    className="w-full rounded-full border border-[#e5e7eb] dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1 text-[11px] font-medium text-black dark:text-white outline-none cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Dedicated Project Modules List */}
            <div>
              <div className="px-2 pb-1.5 text-[10px] font-bold tracking-wider text-[#86909c] uppercase font-display">
                Project Modules
              </div>
              <nav className="space-y-1">
                {projectWorkflowModules.map((m) => {
                  const Icon = m.icon;
                  const isActive = currentTab === m.tab;
                  return (
                    <Link
                      key={m.tab}
                      to="/project"
                      search={{ tab: m.tab }}
                      className={`flex items-center justify-between gap-2.5 rounded-full px-3 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                          : "text-[#86909c] hover:bg-[#f2f4f5] dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          size={15}
                          className={isActive ? "text-[#00f0a0]" : "text-[#86909c]"}
                        />
                        <span className="truncate">{m.label}</span>
                      </div>
                      {isActive && <ChevronRight size={13} className="shrink-0 text-[#00f0a0]" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Project Quick KPI Snapshot */}
            <div className="rounded-[20px] border border-[#00f0a0]/30 bg-[#ecffe0] dark:bg-emerald-950/20 p-3.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#86909c] font-medium">BOQ Items:</span>
                <span className="font-bold text-black dark:text-white">
                  {activeProject.items.length} items
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] mt-1">
                <span className="text-[#86909c] font-medium">Est. Cost:</span>
                <span className="font-bold text-black dark:text-[#00f0a0] font-mono">
                  {inr(totalCost(activeProject.items))}
                </span>
              </div>
              <button
                type="button"
                onClick={handleQuickSaveSnapshot}
                className="btn-pill-black mt-2.5 w-full !py-2 !text-xs !px-3"
              >
                <Save size={12} /> Save Snapshot
              </button>
            </div>
          </div>
        ) : (
          /* ─── GLOBAL WORKSPACE SIDEBAR ─── */
          <div className="space-y-5">
            <nav className="space-y-1">
              {globalNavLinks.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    activeOptions={{ exact: l.to === "/" }}
                    activeProps={{
                      className:
                        "bg-black text-white dark:bg-white dark:text-black font-semibold shadow-sm",
                    }}
                    inactiveProps={{
                      className:
                        "text-[#86909c] hover:bg-[#f2f4f5] dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white",
                    }}
                    className="flex items-center gap-2.5 rounded-full px-3.5 py-2 text-xs font-medium transition-colors"
                  >
                    <Icon size={15} />
                    <span>{l.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Recent Active Projects List */}
            <div>
              <div className="flex items-center justify-between px-2 pb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-[#86909c] uppercase font-display">
                  Active Projects ({projects.length})
                </span>
                <Link
                  to="/"
                  className="text-[10px] font-semibold text-black dark:text-[#00f0a0] hover:underline flex items-center gap-0.5"
                >
                  <Plus size={11} /> New
                </Link>
              </div>

              {projects.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#e5e7eb] dark:border-zinc-800 p-3 text-center text-[11px] text-[#86909c]">
                  No projects yet. Create one to begin.
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {projects.map((p) => {
                    const cost = totalCost(p.items);
                    return (
                      <Link
                        key={p.id}
                        to="/project"
                        search={{ tab: "plan" }}
                        onClick={() => setActiveProject(p.id)}
                        className="group flex flex-col rounded-[14px] px-2.5 py-1.5 text-xs text-[#86909c] hover:bg-[#f2f4f5] dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-black dark:text-white truncate group-hover:text-[#00f0a0]">
                            {p.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#86909c]">
                            {cost > 0 ? inr(cost) : "Draft"}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#86909c] truncate">
                          {p.clientName || p.location || "Modular Project"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Secondary Links */}
        <div className="pt-3 border-t border-[#e5e7eb] dark:border-zinc-800 text-[11px] space-y-1 text-[#86909c]">
          {isInProjectWorkspace && (
            <Link
              to="/material-prices"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:text-black dark:hover:text-white hover:bg-[#f2f4f5] dark:hover:bg-zinc-900 transition-colors"
            >
              <IndianRupee size={13} /> Live Material Database
            </Link>
          )}
          <Link
            to="/settings"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full hover:text-black dark:hover:text-white hover:bg-[#f2f4f5] dark:hover:bg-zinc-900 transition-colors"
          >
            <Settings size={13} /> Settings & AI Vision
          </Link>
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { projects } = useAppStore();
  const activeProject = useActiveProject() || projects[0];

  const isInProjectWorkspace = location.pathname.startsWith("/project");
  const currentTab =
    ((location.search as Record<string, unknown>)?.["tab"] as ProjectModuleTab) || "plan";

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#e5e7eb] dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 px-4 backdrop-blur-md sm:hidden">
      <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#00f0a0] text-black border border-black shadow-sm font-display font-bold">
          <HardHat size={16} />
        </span>
        <span className="text-base font-bold font-display tracking-tight text-black dark:text-white">
          Build<span className="text-[#00f0a0]">Wise</span>
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="grid h-8 w-8 place-items-center rounded-full border border-[#e5e7eb] dark:border-zinc-800 text-foreground hover:bg-secondary"
        >
          {open ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-4 shadow-xl max-h-[85vh] overflow-y-auto">
          {isInProjectWorkspace && activeProject ? (
            <div className="space-y-3">
              <div className="rounded-[16px] bg-[#ecffe0] dark:bg-zinc-900 p-3 text-xs">
                <span className="text-[10px] font-semibold text-[#86909c] uppercase block">
                  Active Project Workspace
                </span>
                <span className="font-bold text-black dark:text-white text-sm font-display">
                  {activeProject.name}
                </span>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="mt-1 text-[11px] font-semibold text-black dark:text-[#00f0a0] flex items-center gap-1"
                >
                  <ArrowLeft size={11} /> Switch to Projects Hub
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {projectWorkflowModules.map((m) => {
                  const Icon = m.icon;
                  const isActive = currentTab === m.tab;
                  return (
                    <Link
                      key={m.tab}
                      to="/project"
                      search={{ tab: m.tab }}
                      onClick={() => setOpen(false)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-[16px] p-2.5 text-xs font-semibold text-center transition-all ${
                        isActive
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                          : "bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-zinc-800 text-[#86909c]"
                      }`}
                    >
                      <Icon size={17} className={isActive ? "text-[#00f0a0]" : "text-[#86909c]"} />
                      <span className="text-[11px]">{m.label.replace(/^\d+\.\s*/, "")}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <nav className="grid grid-cols-2 gap-2">
              {globalNavLinks.map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    activeOptions={{ exact: l.to === "/" }}
                    activeProps={{
                      className: "bg-black text-white dark:bg-white dark:text-black font-semibold",
                    }}
                    inactiveProps={{
                      className:
                        "bg-white dark:bg-zinc-900 border border-[#e5e7eb] dark:border-zinc-800 text-[#86909c] hover:bg-secondary",
                    }}
                    className="flex flex-col items-center justify-center gap-1 rounded-[16px] p-3 text-xs font-medium text-center"
                  >
                    <Icon size={18} />
                    <span>{l.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 mt-auto">
      <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6 py-8 text-xs text-[#86909c]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#00f0a0] text-black border border-black text-xs font-display font-bold">
            BW
          </span>
          <p>
            © {new Date().getFullYear()} BuildWise — Indian Standard Construction Cost & Takeoff
            Monolith
          </p>
        </div>
        <div className="flex items-center gap-6 font-medium">
          <Link to="/about" className="hover:text-black dark:hover:text-white transition-colors">
            About
          </Link>
          <Link to="/terms" className="hover:text-black dark:hover:text-white transition-colors">
            Terms of Service
          </Link>
          <Link to="/privacy" className="hover:text-black dark:hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link
            to="/subscription"
            className="hover:text-black dark:hover:text-white transition-colors"
          >
            Pricing
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function Page({
  children,
  className = "",
  fullWidth = false,
}: {
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}) {
  if (fullWidth) {
    return <main className={`w-full min-w-0 ${className}`}>{children}</main>;
  }
  return (
    <main
      className={`w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 ${className}`}
    >
      {children}
    </main>
  );
}
