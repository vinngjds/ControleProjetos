import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { listAnalystTasks, startTask, completeTask, type AnalystTask } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, CheckCircle2, AlertTriangle, Calendar, FolderKanban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/minhas-tarefas")({
  head: () => ({ meta: [{ title: "Minhas tarefas — Planner" }] }),
  component: MyTasks,
});

function MyTasks() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["analyst-tasks", user?.id],
    queryFn: () => listAnalystTasks(user!.id),
    enabled: !!user,
  });

  const start = useMutation({
    mutationFn: (id: string) => startTask(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analyst-tasks"] });
      qc.invalidateQueries({ queryKey: ["overdue-count"] });
      toast.success("Tarefa iniciada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const done = useMutation({
    mutationFn: (t: AnalystTask) => completeTask(t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analyst-tasks"] });
      qc.invalidateQueries({ queryKey: ["overdue-count"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      toast.success("Tarefa concluída");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // group by project
  const byProject = (tasks ?? []).reduce<Record<string, { name: string; items: AnalystTask[] }>>((acc, t) => {
    if (!acc[t.projectId]) acc[t.projectId] = { name: t.projectName, items: [] };
    acc[t.projectId].items.push(t);
    return acc;
  }, {});

  const today = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Minhas tarefas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tarefas dos projetos atribuídos a você cujo prazo já começou.
        </p>
      </div>

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : !tasks?.length ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-muted-foreground">Nenhuma tarefa pendente. Bom trabalho!</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(byProject).map(([pid, group]) => (
            <Card key={pid} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <Link to="/projetos/$id" params={{ id: pid }} className="font-display text-base font-semibold hover:underline">
                    {group.name}
                  </Link>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{group.items.length} tarefa(s)</span>
              </div>
              <ul className="divide-y divide-border">
                {group.items.map((t) => {
                  const prazo = t.stageEnd ? parseISO(t.stageEnd) : null;
                  const diasParaPrazo = prazo ? differenceInDays(prazo, today) : null;
                  const atrasada = diasParaPrazo !== null && diasParaPrazo < 0;
                  const decorridos = t.data_inicio_real
                    ? differenceInDays(today, parseISO(t.data_inicio_real))
                    : 0;
                  return (
                    <li key={t.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">{t.stageName}</span>
                          {atrasada && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                              <AlertTriangle className="h-3 w-3" /> atrasada
                            </span>
                          )}
                          {t.status === "fazendo" && (
                            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-medium text-warning">em andamento</span>
                          )}
                        </div>
                        <div className="mt-1 font-medium">{t.titulo}</div>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {prazo ? `prazo ${format(prazo, "dd MMM", { locale: ptBR })}` : "sem prazo"}
                          </span>
                          <span className="tabular-nums">
                            {Number(t.dias_trabalhados).toFixed(0)}/{Number(t.dias_estimados).toFixed(0)}d
                            {t.data_inicio_real && ` · ${decorridos}d decorridos`}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {t.status === "a_fazer" && !t.data_inicio_real && (
                          <Button size="sm" variant="outline" onClick={() => start.mutate(t.id)}>
                            <Play className="mr-1 h-3.5 w-3.5" /> Iniciar
                          </Button>
                        )}
                        <Button size="sm" onClick={() => done.mutate(t)}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Concluir
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
