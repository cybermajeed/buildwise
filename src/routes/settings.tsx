import { createFileRoute } from "@tanstack/react-router";
import { User, Sliders, Database, Download, Upload, Trash2, CheckCircle2 } from "lucide-react";
import { Page } from "@/components/site-chrome";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Preferences — BuildWise" },
      {
        name: "description",
        content:
          "Manage company profile, regional measurement units, and workspace backup data in BuildWise.",
      },
    ],
  }),
  component: SettingsPage,
});

type SettingsTab = "profile" | "preferences" | "data";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    firstName: "Engineer",
    lastName: "User",
    email: "builder@buildwise.internal",
    companyName: "Apex Construction & Engineering",
    phone: "+91 98765 43210",
  });

  const [preferences, setPreferences] = useState({
    currency: "₹",
    unitSystem: "imperial_metric", // imperial entry, metric output
    defaultFloorHeightFt: 10,
    defaultWallThicknessIn: 9,
    wastageAllowancePct: 5,
  });

  useEffect(() => {
    const savedProfile = localStorage.getItem("buildwise.settings.profile");
    if (savedProfile) {
      try {
        setProfile((prev) => ({ ...prev, ...JSON.parse(savedProfile) }));
      } catch {
        // keep defaults
      }
    }
    const savedPrefs = localStorage.getItem("buildwise.settings.preferences");
    if (savedPrefs) {
      try {
        setPreferences((prev) => ({ ...prev, ...JSON.parse(savedPrefs) }));
      } catch {
        // keep defaults
      }
    }
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem("buildwise.settings.profile", JSON.stringify(profile));
    toast.success("Profile details saved successfully.");
  };

  const handleSavePreferences = () => {
    localStorage.setItem("buildwise.settings.preferences", JSON.stringify(preferences));
    toast.success("Construction preferences saved successfully.");
  };

  const handleExportBackup = () => {
    const backup: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("buildwise.") || key === "theme")) {
        backup[key] = localStorage.getItem(key);
      }
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buildwise-workspace-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Workspace backup downloaded successfully!");
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);
        if (typeof data !== "object" || data === null) {
          throw new Error("Invalid backup format");
        }
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === "string") {
            localStorage.setItem(key, value);
          }
        });
        toast.success("Workspace backup restored! Reloading...");
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error("Failed to parse backup file. Please provide a valid JSON backup.");
      }
    };
    reader.readAsText(file);
  };

  const handleResetAllData = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("buildwise.")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    toast.success("All projects and local data cleared. Refreshing workspace...");
    setTimeout(() => window.location.reload(), 1000);
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ComponentType<{ size: number }> }[] = [
    { id: "profile", label: "Profile & Company", icon: User },
    { id: "preferences", label: "Measurement & Units", icon: Sliders },
    { id: "data", label: "Backup & Data", icon: Database },
  ];

  return (
    <Page>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Settings & Workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configure your organization details, estimation defaults, and local workspace data.
        </p>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[240px_1fr] max-w-5xl">
        <aside className="space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors text-left ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon size={17} /> {tab.label}
              </button>
            );
          })}
        </aside>

        <section className="space-y-6">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-lg font-semibold">Company & Profile Information</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  These details appear on your exported PDF reports and official client BOQs.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-foreground">First Name</span>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-foreground">Last Name</span>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-foreground">Company / Organization</span>
                  <input
                    type="text"
                    value={profile.companyName}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-foreground">Email Address</span>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-foreground">Phone Number</span>
                    <input
                      type="text"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <CheckCircle2 size={16} /> Save Profile
                </button>
              </div>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="border-b border-border pb-4 mb-6">
                <h2 className="text-lg font-semibold">Measurement & Regional Standards</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set default parameters for Quantity Takeoffs and Bill of Quantities.
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <label className="block">
                    <span className="text-xs font-semibold text-foreground">Default Currency</span>
                    <select
                      value={preferences.currency}
                      onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value="₹">₹ (INR - Indian Rupee)</option>
                      <option value="$">$ (USD - US Dollar)</option>
                      <option value="€">€ (EUR - Euro)</option>
                      <option value="£">£ (GBP - British Pound)</option>
                      <option value="AED">AED (UAE Dirham)</option>
                      <option value="SAR">SAR (Saudi Riyal)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-foreground">
                      Standard Floor Height (ft)
                    </span>
                    <select
                      value={preferences.defaultFloorHeightFt}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          defaultFloorHeightFt: Number(e.target.value),
                        })
                      }
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      {[9, 10, 11, 12].map((v) => (
                        <option key={v} value={v}>
                          {v} feet (standard residential)
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <label className="block">
                    <span className="text-xs font-semibold text-foreground">
                      External Wall Thickness (in)
                    </span>
                    <select
                      value={preferences.defaultWallThicknessIn}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          defaultWallThicknessIn: Number(e.target.value),
                        })
                      }
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value={9}>9 inches (Standard One Brick)</option>
                      <option value={4.5}>4.5 inches (Half Brick Partition)</option>
                      <option value={13.5}>13.5 inches (One & Half Brick)</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-foreground">
                      Site Wastage Allowance (%)
                    </span>
                    <select
                      value={preferences.wastageAllowancePct}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          wastageAllowancePct: Number(e.target.value),
                        })
                      }
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    >
                      <option value={3}>3% (Precise Construction)</option>
                      <option value={5}>5% (Recommended Standard)</option>
                      <option value={10}>10% (High Tolerance / Rough Site)</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSavePreferences}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <CheckCircle2 size={16} /> Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* DATA MANAGEMENT TAB */}
          {activeTab === "data" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="border-b border-border pb-4 mb-5">
                  <h2 className="text-lg font-semibold">Workspace Backup & Export</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Download a full JSON copy of all projects, material prices, and plan analyses.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleExportBackup}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Download size={16} /> Export Workspace Backup
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
                  >
                    <Upload size={16} /> Restore from Backup
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-sm">
                <div className="border-b border-destructive/20 pb-4 mb-4">
                  <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clear all locally cached projects and reset workspace state.
                  </p>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  This action will delete all locally stored projects, estimates, custom material
                  rates, and plan analysis records. Make sure you have exported a backup first.
                </p>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors">
                      <Trash2 size={15} /> Clear All Workspace Data
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset entire workspace?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. All your projects, takeoff records, and custom
                        rates will be purged from this browser.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResetAllData}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, delete everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
