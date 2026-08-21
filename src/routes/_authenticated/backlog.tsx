import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { BacklogBoard } from "@/components/BacklogBoard";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/backlog")({
  head: () => ({ meta: [{ title: "Backlog — Planner" }] }),
  component: BacklogPage,
});

function BacklogPage() {
  const { role } = useAuth();
  if (role !== "coordenador") {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Acesso restrito ao coordenador.
      </Card>
    );
  }
  return <BacklogBoard />;
}
