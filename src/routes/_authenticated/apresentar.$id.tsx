import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getProject, computeProgress } from "@/lib/api";
import { GanttChart } from "@/components/GanttChart";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/apresentar/$id")({
  head: () => ({ meta: [{ title: "Apresentação — Planner" }] }),
  component: PresentMode,
});

function PresentMode() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: project } = useQuery({ queryKey: ["project", id], queryFn: () => getProject(id) });
  const [slide, setSlide] = useState(0);
  const totalSlides = 4;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ")
        setSlide((s) => Math.min(totalSlides - 1, s + 1));
      if (e.key === "ArrowLeft") setSlide((s) => Math.max(0, s - 1));
      if (e.key === "Escape") navigate({ to: "/projetos/$id", params: { id } });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [id, navigate]);

  if (!project)
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  if (!project.data_entrega) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          Este item está no Backlog e ainda não pode ser apresentado.
        </p>
        <Link to="/backlog" className="text-primary underline">
          Ir para o Backlog
        </Link>
      </div>
    );
  }

  const progress = computeProgress(project);
  const dataEntrega = parseISO(project.data_entrega);
  const diasRestantes = differenceInDays(dataEntrega, new Date());

  const slides = [
    <div key="cover" className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
        Acompanhamento de projeto
      </div>
      <h1 className="mt-6 font-display text-7xl font-semibold leading-tight">{project.nome}</h1>
      {project.descricao && (
        <p className="mt-6 max-w-3xl text-xl text-muted-foreground">{project.descricao}</p>
      )}
      <div className="mt-12 text-sm text-muted-foreground">
        Atualizado em {format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
      </div>
    </div>,
    <div key="kpis" className="flex h-full flex-col justify-center">
      <h2 className="font-display text-4xl font-semibold">Visão geral</h2>
      <div className="mt-12 grid grid-cols-2 gap-6">
        <BigKPI
          label="Progresso"
          value={`${Math.round(progress.pct)}%`}
          sub={`${progress.diasFeitos.toFixed(1)} de ${progress.totalDias.toFixed(1)} dias`}
        />
        <BigKPI
          label="Tarefas concluídas"
          value={`${progress.tarefasFeitas}/${progress.totalTarefas}`}
          sub={`${progress.totalTarefas - progress.tarefasFeitas} restantes`}
        />
        <BigKPI
          label="Prazo de entrega"
          value={format(dataEntrega, "dd MMM yyyy", { locale: ptBR })}
          sub={
            diasRestantes < 0
              ? `${Math.abs(diasRestantes)} dias atrasado`
              : `${diasRestantes} dias restantes`
          }
          tone={diasRestantes < 0 ? "destructive" : diasRestantes <= 7 ? "warning" : undefined}
        />
        <BigKPI
          label="Dias restantes"
          value={`${progress.diasRestantes.toFixed(1)}d`}
          sub="estimativa para conclusão"
        />
      </div>
    </div>,
    <div key="gantt" className="flex h-full flex-col justify-center">
      <h2 className="font-display text-4xl font-semibold">Cronograma</h2>
      <div className="mt-8">
        <GanttChart project={project} />
      </div>
    </div>,
    <div key="stages" className="flex h-full flex-col justify-center">
      <h2 className="font-display text-4xl font-semibold">Status por etapa</h2>
      <div className="mt-8 space-y-3">
        {project.stages.map((s) => {
          const totalD = s.tasks.reduce((a, t) => a + Number(t.dias_estimados), 0);
          const doneD = s.tasks.reduce(
            (a, t) =>
              a + (t.status === "feito" ? Number(t.dias_estimados) : Number(t.dias_trabalhados)),
            0,
          );
          const done = s.tasks.filter((t) => t.status === "feito").length;
          const pct = totalD > 0 ? (doneD / totalD) * 100 : 0;
          return (
            <div key={s.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="font-display text-xl font-semibold">{s.nome}</div>
                <div className="text-sm text-muted-foreground">
                  {done}/{s.tasks.length} tarefas · {doneD.toFixed(1)}/{totalD.toFixed(1)}d
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>,
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {project.nome}
        </div>
        <Link
          to="/projetos/$id"
          params={{ id }}
          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" /> Sair
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 px-12 py-8">
        <div className="flex-1">{slides[slide]}</div>
      </div>
      <div className="flex items-center justify-between px-8 py-4">
        <button
          onClick={() => setSlide((s) => Math.max(0, s - 1))}
          disabled={slide === 0}
          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm hover:bg-accent disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <div className="flex gap-2">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 w-8 rounded-full transition-colors ${i === slide ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <button
          onClick={() => setSlide((s) => Math.min(totalSlides - 1, s + 1))}
          disabled={slide === totalSlides - 1}
          className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm hover:bg-accent disabled:opacity-30"
        >
          Próximo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function BigKPI({
  label,
  value,
  sub,
  tone,
}: {
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
    <div className="rounded-2xl border border-border bg-card p-8">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-3 font-display text-5xl font-semibold ${valueClass}`}>{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}
