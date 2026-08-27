import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  createStage,
  gerarDescricao,
  listAssignableUsers,
  type BacklogCategoria,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projetos/novo")({
  head: () => ({ meta: [{ title: "Novo projeto — Planner" }] }),
  component: NewProject,
});

const TEMPLATE_STAGES = [
  { nome: "Análise de Requisitos", peso: 15 },
  { nome: "Mockup", peso: 10 },
  { nome: "ETL", peso: 45 },
  { nome: "Criação da Visualização", peso: 30 },
  { nome: "Publicação", peso: 0 },
  { nome: "Acompanhamento", peso: 0 },
];

function NewProject() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [descricaoAuto, setDescricaoAuto] = useState(true);
  const [useTemplate, setUseTemplate] = useState(true);
  const [analistaId, setAnalistaId] = useState<string>("none");
  const [categoria, setCategoria] = useState<BacklogCategoria>("dashboard");
  const [area, setArea] = useState("");

  const { data: people } = useQuery({ queryKey: ["team"], queryFn: listAssignableUsers });

  // Preenche a descrição automaticamente enquanto o usuário não escrever a sua.
  const autoFill = (next: { nome?: string; categoria?: BacklogCategoria; area?: string }) => {
    if (!descricaoAuto) return;
    const texto = gerarDescricao({
      nome: next.nome ?? nome,
      categoria: next.categoria ?? categoria,
      area: next.area ?? area,
    });
    setDescricao(texto);
  };

  const mut = useMutation({
    mutationFn: async () => {
      const project = await createProject({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        status: "backlog",
        analista_id: analistaId === "none" ? null : analistaId,
        categoria,
        area: area.trim() || null,
      });
      if (useTemplate) {
        await Promise.all(
          TEMPLATE_STAGES.map((s, i) =>
            createStage({ project_id: project.id, nome: s.nome, peso: s.peso, ordem: i }),
          ),
        );
      }
      return project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado no Backlog");
      navigate({ to: "/backlog" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome do projeto");
    mut.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold">Novo projeto</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O projeto entra no Backlog. As datas e o cronograma são definidos quando ele for movido
        para Em Classificação.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do projeto</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={(e) => autoFill({ nome: e.target.value })}
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={categoria}
                onValueChange={(v) => {
                  setCategoria(v as BacklogCategoria);
                  autoFill({ categoria: v as BacklogCategoria });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="melhoria">Melhoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Área solicitante</Label>
              <Input
                id="area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                onBlur={(e) => autoFill({ area: e.target.value })}
                placeholder="Ex.: Comercial, Marketing..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Analista responsável</Label>
              {user?.id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAnalistaId(user.id)}
                >
                  Atribuir a mim
                </Button>
              )}
            </div>
            <Select value={analistaId} onValueChange={setAnalistaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável (atribuir depois)</SelectItem>
                {(people ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome ?? a.id.slice(0, 8)}
                    {a.id === user?.id ? " (você)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setDescricaoAuto(false);
              }}
              rows={4}
              maxLength={1000}
              placeholder="Gerada automaticamente a partir do nome — você pode editar."
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
            <input
              type="checkbox"
              checked={useTemplate}
              onChange={(e) => setUseTemplate(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Usar template padrão (Dashboard)</div>
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {TEMPLATE_STAGES.map((s) => (
                  <li key={s.nome} className="tabular-nums">
                    • {s.nome} <span className="text-foreground">— peso {s.peso}</span>
                  </li>
                ))}
              </ul>
            </div>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/backlog" })}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Criando..." : "Criar no Backlog"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
