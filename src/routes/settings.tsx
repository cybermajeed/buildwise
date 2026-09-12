import { createFileRoute } from "@tanstack/react-router";
import { User, Bell, Shield, Key } from "lucide-react";
import { Page } from "@/components/site-chrome";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  
  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    companyName: "BuildWise Engineering"
  });

  useEffect(() => {
    const saved = localStorage.getItem("buildwise.settings.profile");
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        // use defaults
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("buildwise.settings.profile", JSON.stringify(profile));
    toast.success("Settings saved successfully.");
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "api-keys", label: "API Keys", icon: Key },
  ];

  return (
    <Page>
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Profile & Settings</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Manage your account details, preferences, and subscription information.
        </p>
      </header>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_3fr] max-w-5xl">
        <aside className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 font-semibold text-primary"
                    : "font-medium text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </aside>

        <section className="space-y-6">
          {activeTab === "profile" && (
            <div className="rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-sm font-medium">First Name</span>
                    <input
                      type="text"
                      value={profile.firstName}
                      onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Last Name</span>
                    <input
                      type="text"
                      value={profile.lastName}
                      onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-medium">Email Address</span>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Company Name</span>
                  <input
                    type="text"
                    value={profile.companyName}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </label>
              </div>

              <div className="mt-8 flex justify-end gap-4">
                <button
                  onClick={handleSave}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab !== "profile" && (
            <div className="rounded-lg border border-dashed border-border p-12 text-center">
              <h2 className="text-xl font-semibold">Coming Soon</h2>
              <p className="mt-2 text-muted-foreground">
                We are actively building the {tabs.find(t => t.id === activeTab)?.label} section.
              </p>
            </div>
          )}
        </section>
      </div>
    </Page>
  );
}
