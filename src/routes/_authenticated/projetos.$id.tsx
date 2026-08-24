import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getProject, computeProgress, deleteProject, listAnalysts, updateProject } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StagesEditor } from "@/components/StagesEditor";
import { KanbanBoard } from "@/components/KanbanBoard";
import { GanttChart } from "@/components/GanttChart";
import { EffortImpactClassifier } from "@/components/EffortImpactClassifier";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Presentation,
  Trash2,
  TrendingUp,
  CheckCircle2,
  User,
} from "lucide-react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projetos/$id")({
  head: () => ({ meta: [{ title: "Projeto — Planner" }] }),
  component: ProjectPage,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role } = useAuth();
  const isCoord = role === "coordenador";
  const [tab, setTab] = useState("overview");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
  });
  const { data: analysts } = useQuery({
    queryKey: ["analysts"],
    queryFn: listAnalysts,
    enabled: isCoord,
  });

  const remove = useMutation({
    mutationFn: () => deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto excluído");
      navigate({ to: "/" });
    },
  });

  const reassign = useMutation({
    mutationFn: (analistaId: string | null) => updateProject(id, { analista_id: analistaId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Analista atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;
  if (!project) {
    return (
      <Card className="p-10 text-center">
        <p>Projeto não encontrado</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Voltar
        </Link>
      </Card>
    );
  }
  const isBacklog = project.status === "backlog" || !project.data_entrega;
  const progress = computeProgress(project);
  const dataEntrega = project.data_entrega ? parseISO(project.data_entrega) : null;
  const dataInicio = project.data_inicio ? parseISO(project.data_inicio) : null;
  const diasRestantes = dataEntrega ? differenceInDays(dataEntrega, new Date()) : null;
  const diasTotais =
    dataEntrega && dataInicio ? Math.max(1, differenceInDays(dataEntrega, dataInicio)) : null;
  const diasDecorridos = dataInicio ? Math.max(0, differenceInDays(new Date(), dataInicio)) : 0;
  const ritmoD = diasDecorridos > 0 ? progress.diasFeitos / diasDecorridos : 0;
  const projecaoEntrega =
    ritmoD > 0 ? addDays(new Date(), Math.ceil(progress.diasRestantes / ritmoD)) : null;

  const analystName = analysts?.find((a) => a.id === project.analista_id)?.nome;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Projetos
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold">{project.nome}</h1>
          {project.descricao && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.descricao}</p>
          )}
          {analystName && !isCoord && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Responsável: {analystName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/apresentar/$id"
            params={{ id }}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Presentation className="h-4 w-4" /> Apresentar
          </Link>
          {isCoord && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm("Excluir este projeto e todos os dados?")) remove.mutate();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {isCoord && (
        <Card className="flex items-center gap-3 p-4">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Analista responsável</span>
          <div className="ml-auto w-64">
            <Select
              value={project.analista_id ?? "none"}
              onValueChange={(v) => reassign.mutate(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem analista</SelectItem>
                {(analysts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome ?? a.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI
          icon={<TrendingUp className="h-4 w-4" />}
          label="Progresso"
          value={`${Math.round(progress.pct)}%`}
          sub={`${progress.diasFeitos.toFixed(1)} / ${progress.totalDias.toFixed(1)}d`}
        />
        <KPI
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Tarefas"
          value={`${progress.tarefasFeitas}/${progress.totalTarefas}`}
          sub={`${progress.totalTarefas - progress.tarefasFeitas} restantes`}
        />
        <KPI
          icon={<Calendar className="h-4 w-4" />}
          label="Prazo"
          value={
            diasRestantes === null
              ? "—"
              : diasRestantes < 0
                ? `${Math.abs(diasRestantes)}d atrasado`
                : `${diasRestantes}d restantes`
          }
          sub={
            dataEntrega ? format(dataEntrega, "dd MMM yyyy", { locale: ptBR }) : "Ainda em backlog"
          }
          tone={
            diasRestantes !== null && diasRestantes < 0
              ? "destructive"
              : diasRestantes !== null && diasRestantes <= 7
                ? "warning"
                : undefined
          }
        />
        <KPI
          icon={<Clock className="h-4 w-4" />}
          label="Projeção"
          value={projecaoEntrega ? format(projecaoEntrega, "dd MMM", { locale: ptBR }) : "—"}
          sub={
            projecaoEntrega && dataEntrega
              ? differenceInDays(projecaoEntrega, dataEntrega) <= 0
                ? "Dentro do prazo"
                : `${differenceInDays(projecaoEntrega, dataEntrega)}d além do prazo`
              : "Sem dados"
          }
          tone={
            projecaoEntrega && dataEntrega && differenceInDays(projecaoEntrega, dataEntrega) > 0
              ? "warning"
              : undefined
          }
        />
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wider text-muted-foreground">
            Andamento geral
          </span>
          <span className="tabular-nums">
            {diasTotais ? Math.round((diasDecorridos / diasTotais) * 100) : 0}% do tempo decorrido
          </span>
        </div>
        <Progress value={progress.pct} className="h-2" />
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="classificacao">Classificação</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="stages">Etapas e tarefas</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <GanttChart project={project} />
        </TabsContent>
        <TabsContent value="classificacao" className="mt-4">
          <EffortImpactClassifier project={project} />
        </TabsContent>
        <TabsContent value="kanban" className="mt-4">
          <KanbanBoard project={project} />
        </TabsContent>
        <TabsContent value="stages" className="mt-4">
          <StagesEditor project={project} />
        </TabsContent>
      </Tabs>
      {isBacklog && (
        <p className="text-center text-xs text-muted-foreground">
          Este projeto ainda está no Backlog. Classifique-o e ajuste o cronograma; ao aprovar, as
          datas reais são calculadas a partir do início definido.
        </p>
      )}
    </div>
  );
}

function KPI({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "destructive" | "warning";
}) {
  const valueClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`mt-2 font-display text-2xl font-semibold ${valueClass}`}>{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}
