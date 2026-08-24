import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  createStage,
  distributeStageDates,
  updateStage,
  listAnalysts,
  type BacklogCategoria,
} from "@/lib/api";
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
import { format, addDays } from "date-fns";

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
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const today = format(new Date(), "yyyy-MM-dd");
  const [dataInicio, setDataInicio] = useState(today);
  const [dataEntrega, setDataEntrega] = useState(format(addDays(new Date(), 30), "yyyy-MM-dd"));
  const [useTemplate, setUseTemplate] = useState(true);
  const [analistaId, setAnalistaId] = useState<string>("none");
  const [categoria, setCategoria] = useState<BacklogCategoria>("dashboard");
  const [area, setArea] = useState("");

  const { data: analysts } = useQuery({ queryKey: ["analysts"], queryFn: listAnalysts });

  const mut = useMutation({
    mutationFn: async () => {
      const project = await createProject({
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        data_inicio: dataInicio,
        data_entrega: dataEntrega,
        analista_id: analistaId === "none" ? null : analistaId,
        categoria,
        area: area.trim() || null,
      });
      if (useTemplate) {
        const created = await Promise.all(
          TEMPLATE_STAGES.map((s, i) =>
            createStage({ project_id: project.id, nome: s.nome, peso: s.peso, ordem: i }),
          ),
        );
        const dist = distributeStageDates(
          dataInicio,
          dataEntrega,
          created.map((s, i) => ({ id: s.id, peso: TEMPLATE_STAGES[i].peso, ordem: i })),
        );
        await Promise.all(Object.entries(dist).map(([id, d]) => updateStage(id, d)));
      }
      return project;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projeto criado");
      navigate({ to: "/projetos/$id", params: { id: p.id } });
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
        Defina os dados básicos. Você adicionará etapas e tarefas no próximo passo.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do projeto</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ini">Data de início</Label>
              <Input
                id="ini"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ent">Data de entrega</Label>
              <Input
                id="ent"
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as BacklogCategoria)}>
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
                placeholder="Ex.: Comercial, Marketing..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Analista responsável</Label>
            <Select value={analistaId} onValueChange={setAnalistaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um analista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem analista (atribuir depois)</SelectItem>
                {(analysts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome ?? a.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="button" variant="outline" onClick={() => navigate({ to: "/" })}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Criando..." : "Criar projeto"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
