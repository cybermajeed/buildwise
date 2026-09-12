import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { UploadCloud, File, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Page } from "@/components/site-chrome";
import { useActiveProject } from "@/lib/project-store";

export const Route = createFileRoute("/plan-upload")({
  component: PlanUploadPage,
});

function PlanUploadPage() {
  const project = useActiveProject();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  if (!project) {
    return (
      <Page>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">No Active Project</h2>
          <p className="mt-2 text-muted-foreground">Please select a project from the dashboard.</p>
        </div>
      </Page>
    );
  }

  const handleSimulatedUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploadComplete(true);
    }, 2000); // simulate network request and processing
  };

  return (
    <Page>
      <header className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Plan Upload</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Upload your building plans (PDF, JPG, PNG). Our system will analyze the dimensions to
          automatically generate a quantity takeoff.
        </p>
      </header>

      <div className="mt-12 max-w-2xl">
        {!uploadComplete ? (
          <div className="rounded-lg border-2 border-dashed border-border bg-card p-12 text-center transition-colors hover:bg-secondary/50">
            <UploadCloud size={48} className="mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">Upload building plan</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Drag and drop your file here, or click to browse.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports PDF, JPG, JPEG, PNG (CAD formats coming soon)
            </p>

            <button
              onClick={handleSimulatedUpload}
              disabled={isUploading}
              className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Processing Plan..." : "Simulate Upload for MVP"}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="mt-4 text-xl font-semibold">Plan Processed Successfully</h3>
            <p className="mt-2 text-muted-foreground">
              We have extracted dimensions and measurable information from your plan. Please review
              the quantity takeoff.
            </p>
            <button
              onClick={() => navigate({ to: "/takeoff" })}
              className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Review Quantity Takeoff
            </button>
          </div>
        )}
      </div>
    </Page>
  );
}
