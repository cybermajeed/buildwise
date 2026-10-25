import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reports")({
  beforeLoad: () => {
    throw redirect({ to: "/project", search: { tab: "reports" } });
  },
});
