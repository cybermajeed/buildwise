import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, EyeOff, HardDrive, Shield } from "lucide-react";
import { Page } from "@/components/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BuildWise" },
      {
        name: "description",
        content:
          "Privacy Policy for BuildWise. Learn how your data and uploaded building plans remain completely private in local browser storage.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Page>
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 pb-6 border-b border-border">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3.5 py-1 text-xs font-semibold text-green-700 dark:text-green-400 mb-3">
            <Lock size={14} /> Zero Remote Telemetry
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Effective Date: October 2026 • Last Updated: October 2026
          </p>
        </header>

        {/* Core Privacy Promise Callout */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
              <HardDrive size={20} />
            </div>
            <h3 className="font-semibold text-sm">Local-First Storage</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Your plans, quantities, material rates, and BOQs are saved entirely in your local
              browser storage (<code>localStorage</code>).
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 mb-3">
              <EyeOff size={20} />
            </div>
            <h3 className="font-semibold text-sm">No Third-Party Trackers</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              We do not embed Google Analytics, Meta Pixel, tracking cookies, or advertising
              surveillance scripts.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3">
              <Shield size={20} />
            </div>
            <h3 className="font-semibold text-sm">Your Data, Your Control</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              You can export your workspace backup or wipe all stored data at any time via Settings
              or browser settings.
            </p>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
            <p>
              BuildWise ("we", "our", or "us") is dedicated to protecting your privacy. This
              Privacy Policy explains what information is collected, where it resides, and how you
              maintain sovereign control over your construction project data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">2. Information Handled by BuildWise</h2>
            <p>
              Because BuildWise operates on a client-side architecture without compulsory remote user
              accounts:
            </p>
            <div className="mt-3 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/60 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-semibold">Data Category</th>
                    <th className="p-3 font-semibold">Where It Resides</th>
                    <th className="p-3 font-semibold">Transmission / Sharing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 font-medium">Uploaded Floor Plans (PDF, PNG, JPG)</td>
                    <td className="p-3">Local browser session memory</td>
                    <td className="p-3 text-green-600 dark:text-green-400">
                      Never sent to remote servers
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Project Estimates, BOQ & Dimensions</td>
                    <td className="p-3">Browser <code>localStorage</code></td>
                    <td className="p-3 text-green-600 dark:text-green-400">
                      Stored strictly on your device
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Custom Material Rates</td>
                    <td className="p-3">Browser <code>localStorage</code></td>
                    <td className="p-3 text-green-600 dark:text-green-400">
                      Private to your browser
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Profile & Company Name</td>
                    <td className="p-3">Browser <code>localStorage</code></td>
                    <td className="p-3 text-green-600 dark:text-green-400">
                      Used only for PDF headers
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">3. Cookies & Local Storage</h2>
            <p>
              BuildWise does not use HTTP tracking cookies. We utilize your browser's standard{" "}
              <code>localStorage</code> API for the following essential operational keys:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <code>buildwise.appstate</code>: Stores your saved projects and item estimates.
              </li>
              <li>
                <code>buildwise.plananalysis.*</code>: Stores extracted room dimensions and BOQ
                calculations for each active project.
              </li>
              <li>
                <code>buildwise.materials</code>: Stores local material unit pricing overrides.
              </li>
              <li>
                <code>buildwise.settings.profile</code>: Stores user contact info for generated PDF
                reports.
              </li>
              <li>
                <code>theme</code>: Remembers your dark / light visual display preference.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">4. Progressive Web App (Offline Caching)</h2>
            <p>
              Our application uses a Service Worker to cache static application assets (HTML, CSS,
              JavaScript, and system fonts) so that you can open and run BuildWise in offline site
              environments. The Service Worker does not log your browsing activities or intercept
              personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">5. Your Data Rights & Deletion</h2>
            <p>
              Under global data protection standards (including GDPR and CCPA principles), you have
              absolute right of access, rectification, portability, and erasure:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Data Portability:</strong> You can export complete project estimates in PDF
                or CSV format at any time.
              </li>
              <li>
                <strong>Erasure:</strong> You can purge all stored projects, materials, and settings
                at any time by clearing your browser cache or using the "Clear All Projects" control
                in the{" "}
                <Link to="/settings" className="text-primary underline">
                  Settings Page
                </Link>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground">6. Contact & Privacy Officer</h2>
            <p>
              If you have questions about our data practices or privacy architecture, contact:
            </p>
            <div className="mt-2 rounded-lg bg-secondary/50 p-4 font-mono text-xs">
              BuildWise Privacy Desk
              <br />
              Email: privacy@buildwise.internal • contact@buildwise.internal
            </div>
          </section>
        </div>
      </div>
    </Page>
  );
}
