import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { listOverdueCount } from "@/lib/api";
import {
  LayoutDashboard,
  Plus,
  LogOut,
  Users,
  BarChart3,
  ListChecks,
  AlertTriangle,
  FolderKanban,
  Target,
  Inbox,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const { session, loading, role, nome, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isPresenting = location.pathname.includes("/apresentar");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      window.location.replace("/redefinir-senha" + window.location.hash);
      return;
    }
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  const isCoord = role === "coordenador";

  const { data: overdue = 0 } = useQuery({
    queryKey: ["overdue-count", session?.user.id, role],
    queryFn: () => listOverdueCount(role === "coordenador" ? null : session!.user.id),
    enabled: !!session && !!role,
    refetchInterval: 60_000,
  });

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (isPresenting) return <Outlet />;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-semibold">Planner</div>
              <div className="text-xs text-muted-foreground">
                {isCoord ? "Coordenador" : "Analista"} · {nome ?? session.user.email}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {isCoord ? (
              <>
                <NavLink to="/" icon={<FolderKanban className="h-4 w-4" />}>
                  Projetos
                </NavLink>
                <NavLink to="/backlog" icon={<Inbox className="h-4 w-4" />}>
                  Backlog
                </NavLink>
                <NavLink to="/matriz" icon={<Target className="h-4 w-4" />}>
                  Matriz
                </NavLink>
                <NavLink to="/desempenho" icon={<BarChart3 className="h-4 w-4" />}>
                  Desempenho
                </NavLink>
                <NavLink to="/equipe" icon={<Users className="h-4 w-4" />}>
                  Equipe
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/minhas-tarefas" icon={<ListChecks className="h-4 w-4" />}>
                  Minhas tarefas
                </NavLink>
                <NavLink to="/" icon={<FolderKanban className="h-4 w-4" />}>
                  Meus projetos
                </NavLink>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {overdue > 0 && (
              <Link
                to={isCoord ? "/desempenho" : "/minhas-tarefas"}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/15"
                title={`${overdue} tarefa(s) atrasada(s)`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdue}
              </Link>
            )}
            {isCoord && (
              <Link
                to="/projetos/novo"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo projeto</span>
              </Link>
            )}
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      activeProps={{ className: "bg-accent text-foreground" }}
    >
      {icon}
      {children}
    </Link>
  );
}
