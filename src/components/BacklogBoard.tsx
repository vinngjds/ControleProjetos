import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  listBacklog,
  createBacklogItem,
  updateProject,
  deleteProject,
  promoteFromBacklog,
  listAnalysts,
  listProjects,
  type Project,
  type BacklogCategoria,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { LayoutDashboard, Wrench, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: { id: BacklogCategoria; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboards", icon: LayoutDashboard },
  { id: "melhoria", label: "Melhorias", icon: Wrench },
  { id: "app", label: "Apps", icon: Smartphone },
];

export function BacklogBoard() {
  const [tab, setTab] = useState<BacklogCategoria>("dashboard");
  const [editing, setEditing] = useState<Project | null>(null);
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({ queryKey: ["backlog"], queryFn: listBacklog });

  const remove = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog"] });
      toast.success("Item excluído");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const byCategory = (cat: BacklogCategoria) => (items ?? []).filter((p) => p.categoria === cat);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Backlog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ideias e pedidos organizados por categoria, antes de entrar em Classificação.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as BacklogCategoria)}>
        <TabsList>
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c.id} value={c.id}>
              {c.label} ({byCategory(c.id).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((c) => (
          <TabsContent key={c.id} value={c.id} className="mt-4">
            {isLoading ? (
              <div className="h-40 animate-pulse rounded-xl bg-muted" />
            ) : byCategory(c.id).length === 0 ? (
              <Card className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
                <c.icon className="h-6 w-6" />
                Nenhum item em {c.label} ainda.
              </Card>
            ) : (
              <Card className="divide-y divide-border overflow-hidden p-0">
                {byCategory(c.id).map((p) => (
                  <div
                    key={p.id}
                    className="flex cursor-pointer items-center justify-between gap-4 p-4 hover:bg-accent"
                    onClick={() => setEditing(p)}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{p.nome}</div>
                      {p.descricao && (
                        <div className="truncate text-xs text-muted-foreground">{p.descricao}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove.mutate(p.id);
                      }}
                      className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Excluir item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {editing && (
        <EditBacklogDialog
          project={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

function EditBacklogDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [nome, setNome] = useState(project.nome);
  const [descricao, setDescricao] = useState(project.descricao ?? "");
  const today = format(new Date(), "yyyy-MM-dd");
  const [dataInicio, setDataInicio] = useState(today);

  const save = useMutation({
    mutationFn: () =>
      updateProject(project.id, { nome: nome.trim(), descricao: descricao.trim() || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog"] });
      toast.success("Item atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const promote = useMutation({
    mutationFn: () => promoteFromBacklog(project.id, { data_inicio: dataInicio }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto movido para Em Classificação");
      onOpenChange(false);
      navigate({ to: "/projetos/$id", params: { id: project.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição / observação</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>

          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">Pronto para começar?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Mover para Em Classificação torna este item um projeto de verdade: você vai responder
              Esforço × Impacto e ajustar o Cronograma antes de aprovar o início.
            </p>
            <div className="mt-3 space-y-1">
              <Label className="text-xs">Data de início prevista</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <Button
              className="mt-3 w-full"
              disabled={promote.isPending}
              onClick={() => promote.mutate()}
            >
              {promote.isPending ? "Movendo..." : "→ Mover para Em Classificação"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
