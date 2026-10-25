import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cost-estimate")({
  beforeLoad: () => {
    throw redirect({ to: "/project", search: { tab: "cost" } });
  },
});
