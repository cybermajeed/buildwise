import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/boq")({
  beforeLoad: () => {
    throw redirect({ to: "/plan-upload" });
  },
});
