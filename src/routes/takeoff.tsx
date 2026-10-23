import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/takeoff")({
  beforeLoad: () => {
    throw redirect({ to: "/plan-upload" });
  },
});
