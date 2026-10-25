import { createFileRoute } from "@tanstack/react-router";
import {
  User,
  Sliders,
  Database,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  Sparkles,
  Key,
  Cpu,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Page } from "@/components/site-chrome";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import {
  getStoredAIConfig,
  saveAIConfig,
  clearAIConfig,
  testVisionConnection,
  type VisionProvider,
} from "@/lib/plan-vision-service";
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

type SettingsTab = "profile" | "preferences" | "ai" | "data";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Vision settings state
  const [aiProvider, setAiProvider] = useState<VisionProvider>("gemini");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("gemini-1.5-flash");
  const [isTestingKey, setIsTestingKey] = useState(false);

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
    const savedAI = getStoredAIConfig();
    if (savedAI) {
      setAiProvider(savedAI.provider);
      setAiApiKey(savedAI.apiKey);
      setAiModel(savedAI.model || (savedAI.provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o"));
    }
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem("buildwise.settings.profile", JSON.stringify(profile));
    toast.success("Profile details saved successfully.");
  };

  const handleSaveAIConfig = () => {
    if (!aiApiKey.trim()) {
      toast.error("Please enter an API key.");
      return;
    }
    saveAIConfig({
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      model: aiModel,
    });
    toast.success("AI Vision configuration saved.");
  };

  const handleTestKey = async () => {
    if (!aiApiKey.trim()) {
      toast.error("Please enter an API key to test.");
      return;
    }
    setIsTestingKey(true);
    try {
      const res = await testVisionConnection({
        provider: aiProvider,
        apiKey: aiApiKey.trim(),
        model: aiModel,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleClearAIConfig = () => {
    clearAIConfig();
    setAiApiKey("");
    toast.info("AI Vision configuration cleared.");
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

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: React.ComponentType<{ size: number; className?: string }>;
  }[] = [
    { id: "profile", label: "Profile & Company", icon: User },
    { id: "preferences", label: "Measurement & Units", icon: Sliders },
    { id: "ai", label: "AI Vision & Extraction", icon: Sparkles },
    { id: "data", label: "Backup & Data", icon: Database },
  ];

  return (
    <Page>
      {/* ─── Pale-Mint Header Band ─────────────────────────────────────────── */}
      <div className="bg-[#ecffe0] dark:bg-zinc-950 border-b border-[#e5e7eb] dark:border-zinc-800 py-16 px-4 sm:px-8 -mx-4 sm:-mx-8 text-center mb-10">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white dark:bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-black dark:text-white uppercase tracking-wider mb-4 shadow-sm font-display">
            <Sparkles size={13} className="text-[#00f0a0]" /> Configuration Hub
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold font-display tracking-tight text-black dark:text-white">
            Settings & Workspace
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[#86909c] font-light max-w-xl mx-auto">
            Configure your company profile, IS civil measurement units, AI Vision keys, and project
            backups.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-full px-5 py-3 text-xs font-bold font-display transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                      : "text-[#86909c] hover:bg-[#f2f4f5] dark:hover:bg-zinc-900 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <Icon size={16} className={isActive ? "text-[#00f0a0]" : "text-[#86909c]"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          <section className="space-y-6">
            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="feature-card border-[#e5e7eb] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 sm:p-8">
                <div className="border-b border-[#e5e7eb] dark:border-zinc-800 pb-4 mb-6">
                  <h2 className="text-xl font-bold font-display text-black dark:text-white">
                    Company & Profile Information
                  </h2>
                  <p className="text-xs text-[#86909c] mt-0.5">
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
                    <span className="text-xs font-semibold text-foreground">
                      Company / Organization
                    </span>
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
                      <span className="text-xs font-semibold text-foreground">
                        Default Currency
                      </span>
                      <select
                        value={preferences.currency}
                        onChange={(e) =>
                          setPreferences({ ...preferences, currency: e.target.value })
                        }
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

            {/* AI VISION TAB */}
            {activeTab === "ai" && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="border-b border-border pb-4 mb-5">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-primary" />
                    <h2 className="text-lg font-semibold">AI Vision Blueprint Extraction</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Configure Google Gemini 1.5 or OpenAI GPT-4o Vision to extract exact room
                    schedules, wall dimensions, and openings from uploaded architectural drawings.
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-2">
                      AI Vision Model Provider
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setAiProvider("gemini");
                          setAiModel("gemini-1.5-flash");
                        }}
                        className={`flex flex-col items-start p-3 rounded-xl border text-xs font-semibold transition-all ${
                          aiProvider === "gemini"
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-sm font-bold">
                          <Cpu size={16} /> Google Gemini Vision
                        </div>
                        <span className="text-[11px] font-normal text-muted-foreground mt-1">
                          Gemini 1.5 Flash (Fast, high-accuracy, free tier available)
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiProvider("openai");
                          setAiModel("gpt-4o");
                        }}
                        className={`flex flex-col items-start p-3 rounded-xl border text-xs font-semibold transition-all ${
                          aiProvider === "openai"
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-sm font-bold">
                          <Sparkles size={16} /> OpenAI Vision
                        </div>
                        <span className="text-[11px] font-normal text-muted-foreground mt-1">
                          GPT-4o Multimodal Vision
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="max-w-lg">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Key size={13} />{" "}
                        {aiProvider === "gemini" ? "Google AI Studio API Key" : "OpenAI API Key"}
                      </label>
                      {aiProvider === "gemini" ? (
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          Get free key <ExternalLink size={11} />
                        </a>
                      ) : (
                        <a
                          href="https://platform.openai.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary hover:underline flex items-center gap-1"
                        >
                          Get OpenAI key <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder={aiProvider === "gemini" ? "AIzaSy..." : "sk-..."}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-green-500" />
                      Key is saved strictly in your local browser storage. Required for live
                      multi-pass OCR and exact dimension extraction.
                    </p>
                  </div>

                  <div className="pt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSaveAIConfig}
                      className="btn-pill-black !py-2 !px-4 !text-xs cursor-pointer"
                    >
                      <CheckCircle2 size={14} /> Save AI Vision Key
                    </button>
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={isTestingKey || !aiApiKey.trim()}
                      className="btn-pill-white !py-2 !px-4 !text-xs cursor-pointer disabled:opacity-50"
                    >
                      {isTestingKey ? "Testing..." : "Test Connection"}
                    </button>
                    {aiApiKey && (
                      <button
                        onClick={handleClearAIConfig}
                        className="text-xs text-destructive hover:underline font-semibold ml-auto"
                      >
                        Remove Key
                      </button>
                    )}
                  </div>
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
      </div>
    </Page>
  );
}
