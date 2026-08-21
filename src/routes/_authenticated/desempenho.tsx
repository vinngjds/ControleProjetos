import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { listTeam, listProjects, getProject, type AppRole } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { differenceInDays, parseISO } from "date-fns";
import { BarChart3, CheckCircle2, AlertTriangle, Activity, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/desempenho")({
  head: () => ({ meta: [{ title: "Desempenho — Planner" }] }),
  component: PerformancePage,
});

type AnalystMetrics = {
  id: string;
  nome: string;
  role: AppRole;
  totalTasks: number;
  done: number;
  inProgress: number;
  overdue: number;
  totalEstimated: number;
  totalWorked: number;
  avgRatio: number; // worked/estimated for done tasks
  projectsCount: number;
};

function PerformancePage() {
  const { role } = useAuth();
  const isCoord = role === "coordenador";

  const { data: team } = useQuery({ queryKey: ["team"], queryFn: listTeam, enabled: isCoord });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: listProjects, enabled: isCoord });

  const projectIds = (projects ?? []).map((p) => p.id);
  const fulls = useQuery({
    queryKey: ["projects-full", projectIds],
    queryFn: async () => Promise.all(projectIds.map((id) => getProject(id))),
    enabled: isCoord && projectIds.length > 0,
  });

  if (!isCoord) {
    return <Card className="p-10 text-center text-muted-foreground">Acesso restrito ao coordenador.</Card>;
  }

  const today = new Date();
  const analysts = (team ?? []).filter((m) => m.role === "analista");

  const metrics: AnalystMetrics[] = analysts.map((a) => {
    const myProjects = (fulls.data ?? []).filter((p) => p && p.analista_id === a.id);
    let totalTasks = 0, done = 0, inProgress = 0, overdue = 0, totalEstimated = 0, totalWorked = 0;
    let doneSum = 0, doneCount = 0;
    for (const p of myProjects) {
      if (!p) continue;
      for (const s of p.stages) {
        const stageDue = s.data_prevista_fim ? parseISO(s.data_prevista_fim) : null;
        for (const t of s.tasks) {
          totalTasks++;
          totalEstimated += Number(t.dias_estimados);
          totalWorked += Number(t.dias_trabalhados);
          if (t.status === "feito") {
            done++;
            if (Number(t.dias_estimados) > 0) {
              doneSum += Number(t.dias_trabalhados) / Number(t.dias_estimados);
              doneCount++;
            }
          } else if (t.status === "fazendo") {
            inProgress++;
          }
          if (t.status !== "feito" && stageDue && stageDue < today) overdue++;
        }
      }
    }
    return {
      id: a.id,
      nome: a.nome ?? a.id.slice(0, 8),
      role: a.role,
      totalTasks,
      done,
      inProgress,
      overdue,
      totalEstimated,
      totalWorked,
      avgRatio: doneCount > 0 ? doneSum / doneCount : 0,
      projectsCount: myProjects.length,
    };
  });

  const totals = metrics.reduce(
    (acc, m) => ({
      done: acc.done + m.done,
      overdue: acc.overdue + m.overdue,
      inProgress: acc.inProgress + m.inProgress,
    }),
    { done: 0, overdue: 0, inProgress: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Desempenho</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acompanhe a carga e o ritmo de cada analista.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Analistas" value={metrics.length} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Tarefas concluídas" value={totals.done} />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Em andamento" value={totals.inProgress} />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Atrasadas" value={totals.overdue} tone={totals.overdue > 0 ? "destructive" : undefined} />
      </div>

      <div className="space-y-3">
        {metrics.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground">
            Nenhum analista cadastrado. Adicione pessoas em <Link to="/equipe" className="underline">Equipe</Link>.
          </Card>
        )}
        {metrics.map((m) => {
          const concluida = m.totalTasks > 0 ? (m.done / m.totalTasks) * 100 : 0;
          const ritmoOk = m.avgRatio > 0 && m.avgRatio <= 1.05;
          return (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-semibold">{m.nome}</div>
                  <div className="text-xs text-muted-foreground">{m.projectsCount} projeto(s)</div>
                </div>
                {m.overdue > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
                    <AlertTriangle className="h-3 w-3" /> {m.overdue} atrasada(s)
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Mini label="Concluídas" value={`${m.done}/${m.totalTasks}`} />
                <Mini label="Em andamento" value={m.inProgress} />
                <Mini
                  label="Esforço"
                  value={`${m.totalWorked.toFixed(0)}/${m.totalEstimated.toFixed(0)}d`}
                  hint="trabalhado / estimado"
                />
                <Mini
                  label="Ritmo médio"
                  value={m.avgRatio > 0 ? `${(m.avgRatio * 100).toFixed(0)}%` : "—"}
                  hint={m.avgRatio > 0 ? (ritmoOk ? "dentro da estimativa" : "acima da estimativa") : "sem tarefas concluídas"}
                  tone={m.avgRatio > 1.2 ? "destructive" : m.avgRatio > 1.05 ? "warning" : undefined}
                />
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">% concluído</span>
                  <span className="tabular-nums">{concluida.toFixed(0)}%</span>
                </div>
                <Progress value={concluida} className="h-1.5" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "destructive" }) {
  const cls = tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className={`mt-2 font-display text-2xl font-semibold ${cls}`}>{value}</div>
    </Card>
  );
}

function Mini({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: "destructive" | "warning" }) {
  const cls = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-lg font-semibold tabular-nums ${cls}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
