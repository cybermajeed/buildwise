import { createFileRoute } from "@tanstack/react-router";
import { User, Bell, Shield, Key } from "lucide-react";
import { Page } from "@/components/site-chrome";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const handleSave = () => {
    toast.success("Settings saved successfully.");
  };

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
          <button className="flex w-full items-center gap-3 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary">
            <User size={18} /> Profile
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
            <Shield size={18} /> Security
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
            <Bell size={18} /> Notifications
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary">
            <Key size={18} /> API Keys
          </button>
        </aside>

        <section className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium">First Name</span>
                  <input
                    type="text"
                    defaultValue="John"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium">Last Name</span>
                  <input
                    type="text"
                    defaultValue="Doe"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-medium">Email Address</span>
                <input
                  type="email"
                  defaultValue="john.doe@example.com"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Company Name</span>
                <input
                  type="text"
                  defaultValue="BuildWise Engineering"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Save Changes
            </button>
          </div>
        </section>
      </div>
    </Page>
  );
}
