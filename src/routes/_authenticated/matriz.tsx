import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { listProjects } from "@/lib/api";
import { EffortImpactMatrix } from "@/components/EffortImpactMatrix";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/matriz")({
  head: () => ({ meta: [{ title: "Matriz — Planner" }] }),
  component: MatrizPage,
});

function MatrizPage() {
  const { role } = useAuth();
  const isCoord = role === "coordenador";
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: isCoord,
  });

  if (!isCoord) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Acesso restrito ao coordenador.
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Matriz Esforço × Impacto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panorama dos projetos já classificados. Clique num projeto para abrir Cronograma ou
          Classificação.
        </p>
      </div>
      {isLoading ? (
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      ) : (
        <EffortImpactMatrix projects={projects ?? []} />
      )}
    </div>
  );
}
