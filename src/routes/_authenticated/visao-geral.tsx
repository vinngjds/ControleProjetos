import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { listAllProjects, type Project } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { FolderKanban, Clock, Timer, LayoutGrid } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/visao-geral")({
  head: () => ({ meta: [{ title: "Visão Geral — Planner" }] }),
  component: VisaoGeralPage,
});

const STATUS_LABEL: Record<string, string> = { backlog: "Backlog", ativo: "Em andamento" };
const STATUS_COLOR: Record<string, string> = { backlog: "#94a3b8", ativo: "#2563eb" };
const TIPO_COLOR: Record<string, string> = { novo: "#1e3a8a", melhoria: "#60a5fa" };
const SEM_AREA = "Sem área definida";

function VisaoGeralPage() {
  const { role } = useAuth();
  const isCoord = role === "coordenador";

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects-overview"],
    queryFn: listAllProjects,
    enabled: isCoord,
  });

  if (!isCoord) {
    return (
      <Card className="p-10 text-center text-muted-foreground">
        Acesso restrito ao coordenador.
      </Card>
    );
  }

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  }

  const all = projects ?? [];
  return <Overview projects={all} />;
}

function diasDesde(dateStr: string) {
  return Math.max(0, differenceInDays(new Date(), parseISO(dateStr)));
}

function Overview({ projects }: { projects: Project[] }) {
  const total = projects.length;
  const backlog = projects.filter((p) => p.status === "backlog");
  const andamento = projects.filter((p) => p.status !== "backlog");

  // Tempo total = dias em backlog (desde created_at) + dias em andamento (desde data_inicio)
  const tempoBacklog = backlog.reduce((acc, p) => acc + diasDesde(p.created_at), 0);
  const tempoAndamento = andamento.reduce(
    (acc, p) => acc + (p.data_inicio ? diasDesde(p.data_inicio) : 0),
    0,
  );
  const tempoTotal = tempoBacklog + tempoAndamento;

  const areas = useMemo(() => {
    const set = new Set(projects.map((p) => p.area?.trim() || SEM_AREA));
    return Array.from(set).sort();
  }, [projects]);

  const porArea = useMemo(() => {
    return areas
      .map((area) => {
        const row: Record<string, number | string> = { area };
        row.backlog = projects.filter(
          (p) => (p.area?.trim() || SEM_AREA) === area && p.status === "backlog",
        ).length;
        row.ativo = projects.filter(
          (p) => (p.area?.trim() || SEM_AREA) === area && p.status !== "backlog",
        ).length;
        row.total = (row.backlog as number) + (row.ativo as number);
        return row;
      })
      .sort((a, b) => (b.total as number) - (a.total as number));
  }, [areas, projects]);

  const melhorias = projects.filter((p) => p.categoria === "melhoria").length;
  const porTipo = [
    { name: "Novo", value: total - melhorias, key: "novo" },
    { name: "Melhoria", value: melhorias, key: "melhoria" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-2 font-display text-3xl font-semibold">
          <LayoutGrid className="h-7 w-7 text-muted-foreground" /> Visão Geral
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhamento macro de todos os projetos, de todas as áreas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          icon={<FolderKanban className="h-4 w-4" />}
          label="Total de projetos"
          value={String(total)}
          sub="todas as áreas"
        />
        <KPI
          icon={<Clock className="h-4 w-4" />}
          label="Em andamento"
          value={String(andamento.length)}
          sub={total ? `${Math.round((andamento.length / total) * 100)}% do total` : "—"}
        />
        <KPI
          icon={<FolderKanban className="h-4 w-4" />}
          label="Em backlog"
          value={String(backlog.length)}
          sub={total ? `${Math.round((backlog.length / total) * 100)}% do total` : "—"}
        />
        <KPI
          icon={<Timer className="h-4 w-4" />}
          label="Tempo total (andamento + backlog)"
          value={`${tempoTotal}d`}
          sub={`${tempoAndamento}d andamento · ${tempoBacklog}d backlog`}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-display text-base font-semibold">Volume por área</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Barras empilhadas por status, ordenadas pelo maior volume
          </p>
          <div className="mt-4">
            {porArea.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum projeto cadastrado ainda.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, porArea.length * 44)}>
                <BarChart data={porArea} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="area"
                    tick={{ fontSize: 12, fontWeight: 600 }}
                    width={120}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="backlog"
                    stackId="a"
                    fill={STATUS_COLOR.backlog}
                    name={STATUS_LABEL.backlog}
                  />
                  <Bar
                    dataKey="ativo"
                    stackId="a"
                    fill={STATUS_COLOR.ativo}
                    name={STATUS_LABEL.ativo}
                    radius={[0, 4, 4, 0]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-display text-base font-semibold">Projetos novos x melhorias</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Composição geral do portfólio</p>
          {total === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum projeto cadastrado ainda.
            </p>
          ) : (
            <div className="mt-4 flex items-center gap-6">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={porTipo}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {porTipo.map((entry) => (
                      <Cell key={entry.key} fill={TIPO_COLOR[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1">
                {porTipo.map((t) => (
                  <div key={t.key} className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: TIPO_COLOR[t.key] }}
                      />
                      {t.name}
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-semibold">{t.value}</div>
                      <div className="text-xs text-muted-foreground">
                        {total ? Math.round((t.value / total) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}
