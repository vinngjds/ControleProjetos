import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  listProjects,
  getProject,
  computeProgress,
  listTeam,
  type BacklogCategoria,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, FolderKanban, ArrowRight, Plus, User } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Projetos — Planner" }] }),
  component: Dashboard,
});

const CATEGORIA_LABEL: Record<BacklogCategoria, string> = {
  dashboard: "Dashboard",
  app: "App",
  melhoria: "Melhoria",
};

function Dashboard() {
  const { role } = useAuth();
  const isCoord = role === "coordenador";
  const [categoriaFiltro, setCategoriaFiltro] = useState<BacklogCategoria | "todos">("todos");
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });
  const { data: team } = useQuery({ queryKey: ["team"], queryFn: listTeam, enabled: isCoord });

  const filtered = (projects ?? []).filter(
    (p) => categoriaFiltro === "todos" || p.categoria === categoriaFiltro,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">
            {isCoord ? "Todos os projetos" : "Meus projetos"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCoord
              ? "Visão macro de todos os projetos da equipe."
              : "Projetos atribuídos a você."}
          </p>
        </div>
      </div>

      {!isLoading && !!projects?.length && (
        <div className="flex flex-wrap gap-2">
          <FiltroPill
            active={categoriaFiltro === "todos"}
            onClick={() => setCategoriaFiltro("todos")}
          >
            Todos
          </FiltroPill>
          {(Object.keys(CATEGORIA_LABEL) as BacklogCategoria[]).map((c) => (
            <FiltroPill
              key={c}
              active={categoriaFiltro === c}
              onClick={() => setCategoriaFiltro(c)}
            >
              {CATEGORIA_LABEL[c]}
            </FiltroPill>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : !projects?.length ? (
        <EmptyState isCoord={isCoord} />
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhum projeto nessa categoria.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              projectId={p.id}
              nome={p.nome}
              descricao={p.descricao}
              dataEntrega={p.data_entrega!}
              categoria={p.categoria as BacklogCategoria | null}
              analystName={team?.find((t) => t.id === p.analista_id)?.nome ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FiltroPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-accent text-accent-foreground hover:bg-accent/70"
      }`}
    >
      {children}
    </button>
  );
}

const CATEGORIA_COLOR: Record<BacklogCategoria, string> = {
  dashboard: "bg-primary text-primary-foreground",
  app: "bg-[#0891b2] text-white",
  melhoria: "bg-[#60a5fa] text-white",
};

function ProjectCard({
  projectId,
  nome,
  descricao,
  dataEntrega,
  categoria,
  analystName,
}: {
  projectId: string;
  nome: string;
  descricao: string | null;
  dataEntrega: string;
  categoria: BacklogCategoria | null;
  analystName: string | null;
}) {
  const { data: full } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });

  const progress = full ? computeProgress(full) : null;
  const diasRestantes = differenceInDays(parseISO(dataEntrega), new Date());
  const prazoColor =
    diasRestantes < 0
      ? "text-destructive"
      : diasRestantes <= 7
        ? "text-warning"
        : "text-muted-foreground";

  return (
    <Link to="/projetos/$id" params={{ id: projectId }}>
      <Card className="group h-full p-5 transition-all hover:border-primary/40 hover:shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {categoria && (
              <span
                className={`mb-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORIA_COLOR[categoria]}`}
              >
                {CATEGORIA_LABEL[categoria]}
              </span>
            )}
            <h3 className="truncate font-display text-lg font-semibold">{nome}</h3>
            {descricao && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{descricao}</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium tabular-nums">
              {progress ? Math.round(progress.pct) : 0}%
            </span>
          </div>
          <Progress value={progress?.pct ?? 0} className="h-1.5" />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs">
          <div className={`flex items-center gap-1.5 ${prazoColor}`}>
            <Calendar className="h-3.5 w-3.5" />
            {diasRestantes < 0
              ? `${Math.abs(diasRestantes)}d atrasado`
              : diasRestantes === 0
                ? "Entrega hoje"
                : `${diasRestantes}d restantes`}
          </div>
          {progress && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {progress.diasRestantes.toFixed(1)}d restantes
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(parseISO(dataEntrega), "dd 'de' MMM, yyyy", { locale: ptBR })}</span>
          {analystName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5">
              <User className="h-3 w-3" />
              {analystName}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}

function EmptyState({ isCoord }: { isCoord: boolean }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <FolderKanban className="h-7 w-7" />
      </div>
      <div>
        <h3 className="font-display text-xl font-semibold">
          {isCoord ? "Nenhum projeto ainda" : "Você ainda não tem projetos atribuídos"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {isCoord
            ? "Crie seu primeiro projeto para começar."
            : "Peça ao coordenador para te atribuir a um projeto."}
        </p>
      </div>
      {isCoord && (
        <Link
          to="/projetos/novo"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Criar projeto
        </Link>
      )}
    </Card>
  );
}
