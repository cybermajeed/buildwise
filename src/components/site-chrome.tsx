import { Link } from "@tanstack/react-router";
import {
  HardHat,
  Menu,
  X,
  Home,
  Calculator,
  LayoutDashboard,
  UploadCloud,
  Ruler,
  ListOrdered,
  IndianRupee,
  PieChart,
  FileText,
  Crown,
  Settings,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";

const navLinks = [
  { to: "/", label: "Home", icon: Home },
  { to: "/calculators", label: "Calculator", icon: Calculator },
  { to: "/dashboard", label: "Project Workspace", icon: LayoutDashboard },
  { to: "/plan-upload", label: "Plan Upload", icon: UploadCloud },
  { to: "/takeoff", label: "Takeoff", icon: Ruler },
  { to: "/boq", label: "BOQ", icon: ListOrdered },
  { to: "/material-prices", label: "Prices", icon: IndianRupee },
  { to: "/cost-estimate", label: "Estimate", icon: PieChart },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/subscription", label: "Subscription", icon: Crown },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

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
      className="grid h-9 w-9 place-items-center rounded-md border border-border text-foreground transition-colors hover:bg-secondary"
      title="Toggle theme"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function SiteSidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-card sm:flex sticky top-0 h-screen">
      <div className="flex h-16 items-center justify-between px-6 border-b border-border/50">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <HardHat size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight">BuildWise</span>
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {navLinks.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
                inactiveProps={{
                  className: "text-muted-foreground hover:bg-secondary hover:text-foreground",
                }}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              >
                <Icon size={18} />
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-md sm:hidden">
      <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
        <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
          <HardHat size={18} />
        </span>
        <span className="text-lg font-bold tracking-tight">BuildWise</span>
      </Link>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="grid h-9 w-9 place-items-center rounded-md border border-border text-foreground"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-border bg-background px-4 py-4 shadow-lg">
          <nav className="grid grid-cols-2 gap-2">
            {navLinks.map((l) => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: l.to === "/" }}
                  activeProps={{ className: "bg-primary/10 text-primary font-semibold" }}
                  inactiveProps={{
                    className: "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  }}
                  className="flex flex-col items-center justify-center gap-1 rounded-md p-3 text-xs font-medium transition-colors text-center"
                >
                  <Icon size={20} className="mb-1" />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-secondary/30 mt-auto">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
        <p>© BuildWise</p>
        <p>Version 1.0</p>
      </div>
    </footer>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12 sm:px-8">{children}</main>;
}
