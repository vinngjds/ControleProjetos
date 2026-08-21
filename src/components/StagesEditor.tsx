import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  applyStageDistribution,
  attachmentUrl,
  createStage,
  createSubtask,
  createTask,
  deleteAttachment,
  deleteStage,
  deleteSubtask,
  deleteTask,
  updateStage,
  updateSubtask,
  updateTask,
  uploadAttachment,
  type Attachment,
  type ProjectFull,
  type Subtask,
  type TaskWithSubtasks,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Pencil,
  CalendarDays,
  Wand2,
  ImagePlus,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

function isMockupStage(nome: string) {
  return /mockup/i.test(nome);
}

export function StagesEditor({ project }: { project: ProjectFull }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project", project.id] });

  const addStage = useMutation({
    mutationFn: (nome: string) =>
      createStage({ project_id: project.id, nome, ordem: project.stages.length }),
    onSuccess: () => {
      invalidate();
      toast.success("Etapa criada");
    },
  });

  const recalc = useMutation({
    mutationFn: () => applyStageDistribution(project),
    onSuccess: () => {
      invalidate();
      toast.success("Cronograma recalculado pelos pesos");
    },
  });

  const [newStageName, setNewStageName] = useState("");
  const totalPeso = project.stages.reduce((a, s) => a + (s.peso || 0), 0);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newStageName.trim()) return;
            addStage.mutate(newStageName.trim());
            setNewStageName("");
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Nome da nova etapa (ex.: Levantamento)"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            maxLength={100}
          />
          <Button type="submit" disabled={addStage.isPending}>
            <Plus className="h-4 w-4" /> Adicionar etapa
          </Button>
        </form>
        {project.stages.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Soma dos pesos: <span className="font-medium tabular-nums text-foreground">{totalPeso}</span>
              {totalPeso > 0 && " (normalizado para 100%)"}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => recalc.mutate()}
              disabled={recalc.isPending || totalPeso === 0}
            >
              <Wand2 className="h-3.5 w-3.5" /> Recalcular datas pelos pesos
            </Button>
          </div>
        )}
      </Card>

      {project.stages.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Nenhuma etapa criada. Comece adicionando uma etapa acima.
        </Card>
      ) : (
        <div className="space-y-3">
          {project.stages.map((stage) => (
            <StageItem key={stage.id} stage={stage} projectId={project.id} totalPeso={totalPeso} />
          ))}
        </div>
      )}
    </div>
  );
}

function StageItem({
  stage,
  projectId,
  totalPeso,
}: {
  stage: ProjectFull["stages"][number];
  projectId: string;
  totalPeso: number;
}) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project", projectId] });
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(stage.nome);
  const [peso, setPeso] = useState(String(stage.peso ?? 0));
  const [ini, setIni] = useState(stage.data_prevista_inicio ?? "");
  const [fim, setFim] = useState(stage.data_prevista_fim ?? "");

  const saveStage = useMutation({
    mutationFn: () =>
      updateStage(stage.id, {
        nome,
        peso: Number(peso) || 0,
        data_prevista_inicio: ini || null,
        data_prevista_fim: fim || null,
      }),
    onSuccess: () => {
      invalidate();
      setEditing(false);
      toast.success("Etapa atualizada");
    },
  });

  const removeStage = useMutation({
    mutationFn: () => deleteStage(stage.id),
    onSuccess: () => {
      invalidate();
      toast.success("Etapa removida");
    },
  });

  const totalEst = stage.tasks.reduce((a, t) => a + Number(t.dias_estimados), 0);
  const done = stage.tasks.filter((t) => t.status === "feito").length;
  const pesoPct = totalPeso > 0 ? Math.round(((stage.peso || 0) / totalPeso) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={() => setOpen(!open)} className="text-muted-foreground hover:text-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 font-medium">
            {stage.nome}
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">
              peso {stage.peso ?? 0}{pesoPct ? ` · ${pesoPct}%` : ""}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {done}/{stage.tasks.length} tarefas · {totalEst.toFixed(1)}d estimados
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm("Remover esta etapa e todas as suas tarefas?")) removeStage.mutate();
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {open && (
        <div className="border-t border-border bg-muted/30 px-4 py-3">
          <div className="space-y-2">
            {stage.tasks.map((task) => (
              <TaskRow key={task.id} task={task} projectId={projectId} />
            ))}
          </div>
          <NewTaskForm stageId={stage.id} ordem={stage.tasks.length} projectId={projectId} />

          {isMockupStage(stage.nome) && (
            <MockupAttachments
              stageId={stage.id}
              attachments={stage.attachments}
              projectId={projectId}
            />
          )}
        </div>
      )}

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label>Peso (proporção da etapa no projeto)</Label>
              <Input
                type="number"
                min={0}
                step={1}
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Valores relativos. Ex: 15, 10, 45, 30 — somam 100 mas pode usar qualquer escala.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início previsto</Label>
                <Input type="date" value={ini} onChange={(e) => setIni(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim previsto</Label>
                <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveStage.mutate()} disabled={saveStage.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function NewTaskForm({
  stageId,
  ordem,
  projectId,
}: {
  stageId: string;
  ordem: number;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [dias, setDias] = useState("1");
  const add = useMutation({
    mutationFn: () =>
      createTask({
        stage_id: stageId,
        titulo: titulo.trim(),
        dias_estimados: Number(dias) || 0,
        ordem,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setTitulo("");
      setDias("1");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!titulo.trim()) return;
        add.mutate();
      }}
      className="mt-3 flex gap-2"
    >
      <Input
        placeholder="Nova tarefa..."
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={200}
        className="flex-1"
      />
      <Input
        type="number"
        min={0}
        step={0.5}
        value={dias}
        onChange={(e) => setDias(e.target.value)}
        className="w-24"
        placeholder="dias"
      />
      <Button type="submit" size="sm" disabled={add.isPending}>
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}

function TaskRow({ task, projectId }: { task: TaskWithSubtasks; projectId: string }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project", projectId] });
  const [editing, setEditing] = useState(false);
  const [showSubs, setShowSubs] = useState(task.subtasks.length > 0);

  const toggleDone = useMutation({
    mutationFn: () =>
      updateTask(task.id, {
        status: task.status === "feito" ? "a_fazer" : "feito",
        dias_trabalhados:
          task.status === "feito" ? task.dias_trabalhados : Number(task.dias_estimados),
      }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: () => deleteTask(task.id),
    onSuccess: invalidate,
  });

  const subDone = task.subtasks.filter((s) => s.concluida).length;

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-center gap-3 px-3 py-2">
        <input
          type="checkbox"
          checked={task.status === "feito"}
          onChange={() => toggleDone.mutate()}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <div className="flex-1">
          <div className={task.status === "feito" ? "text-muted-foreground line-through" : ""}>
            {task.titulo}
          </div>
          {task.subtasks.length > 0 && (
            <button
              onClick={() => setShowSubs(!showSubs)}
              className="mt-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {showSubs ? <ChevronDown className="inline h-3 w-3" /> : <ChevronRight className="inline h-3 w-3" />}
              {" "}✓ {subDone}/{task.subtasks.length} subtarefas
            </button>
          )}
          {task.subtasks.length === 0 && (
            <button
              onClick={() => setShowSubs(!showSubs)}
              className="mt-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              {showSubs ? "Ocultar" : "+ Adicionar subtarefas"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3 w-3" />
          {Number(task.dias_trabalhados).toFixed(1)}/{Number(task.dias_estimados).toFixed(1)}d
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => remove.mutate()}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>

        <EditTaskDialog task={task} open={editing} onOpenChange={setEditing} projectId={projectId} />
      </div>

      {showSubs && (
        <div className="space-y-1 border-t border-border bg-muted/40 px-3 py-2 pl-10">
          {task.subtasks.map((s) => (
            <SubtaskRow key={s.id} subtask={s} projectId={projectId} />
          ))}
          <NewSubtaskForm taskId={task.id} ordem={task.subtasks.length} projectId={projectId} />
        </div>
      )}
    </div>
  );
}

function SubtaskRow({ subtask, projectId }: { subtask: Subtask; projectId: string }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project", projectId] });
  const toggle = useMutation({
    mutationFn: () => updateSubtask(subtask.id, { concluida: !subtask.concluida }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => deleteSubtask(subtask.id),
    onSuccess: invalidate,
  });
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={subtask.concluida}
        onChange={() => toggle.mutate()}
        className="h-3.5 w-3.5 rounded border-border accent-primary"
      />
      <span className={`flex-1 ${subtask.concluida ? "text-muted-foreground line-through" : ""}`}>
        {subtask.titulo}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => remove.mutate()}
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}

function NewSubtaskForm({
  taskId,
  ordem,
  projectId,
}: {
  taskId: string;
  ordem: number;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const add = useMutation({
    mutationFn: () => createSubtask({ task_id: taskId, titulo: titulo.trim(), ordem }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setTitulo("");
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!titulo.trim()) return;
        add.mutate();
      }}
      className="flex gap-2 pt-1"
    >
      <Input
        placeholder="Nova subtarefa..."
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        maxLength={200}
        className="h-8 flex-1 text-sm"
      />
      <Button type="submit" size="sm" variant="outline" className="h-8" disabled={add.isPending}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}

function EditTaskDialog({
  task,
  open,
  onOpenChange,
  projectId,
}: {
  task: TaskWithSubtasks;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState(task.titulo);
  const [descricao, setDescricao] = useState(task.descricao ?? "");
  const [diasEst, setDiasEst] = useState(String(task.dias_estimados));
  const [diasTrab, setDiasTrab] = useState(String(task.dias_trabalhados));
  const [status, setStatus] = useState(task.status);

  const save = useMutation({
    mutationFn: () =>
      updateTask(task.id, {
        titulo,
        descricao: descricao || null,
        dias_estimados: Number(diasEst) || 0,
        dias_trabalhados: Number(diasTrab) || 0,
        status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      onOpenChange(false);
      toast.success("Tarefa atualizada");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tarefa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dias estimados</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={diasEst}
                onChange={(e) => setDiasEst(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Dias trabalhados</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={diasTrab}
                onChange={(e) => setDiasTrab(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="a_fazer">A fazer</option>
              <option value="fazendo">Fazendo</option>
              <option value="feito">Feito</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MockupAttachments({
  stageId,
  attachments,
  projectId,
}: {
  stageId: string;
  attachments: Attachment[];
  projectId: string;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Attachment | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => uploadAttachment(stageId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Imagem adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (att: Attachment) => deleteAttachment(att),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name}: máximo 5 MB`);
        return;
      }
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: apenas imagens`);
        return;
      }
      upload.mutate(f);
    });
  };

  return (
    <div className="mt-4 rounded-lg border border-dashed border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ImageIcon className="h-4 w-4" /> Imagens do mockup
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={upload.isPending}
        >
          <ImagePlus className="h-3.5 w-3.5" /> Adicionar imagem
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {attachments.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Nenhuma imagem ainda. Anexe PNG, JPG ou WebP (até 5 MB).
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {attachments.map((att) => (
            <div key={att.id} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
              <img
                src={attachmentUrl(att.storage_path)}
                alt={att.nome}
                className="h-full w-full cursor-zoom-in object-cover transition-transform group-hover:scale-105"
                onClick={() => setPreview(att)}
              />
              <button
                onClick={() => {
                  if (confirm("Remover esta imagem?")) remove.mutate(att);
                }}
                className="absolute right-1 top-1 rounded-md bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">{preview?.nome}</DialogTitle>
          </DialogHeader>
          {preview && (
            <img
              src={attachmentUrl(preview.storage_path)}
              alt={preview.nome}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
