import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/plan-upload")({
  beforeLoad: () => {
    throw redirect({ to: "/project", search: { tab: "plan" } });
  },
});
