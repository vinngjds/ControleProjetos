import { useMemo } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  updateTask,
  startTask,
  completeTask,
  listTeam,
  type ProjectFull,
  type Task,
  type Subtask,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, GripVertical, Play, CheckCircle2, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const COLUMNS: { id: Task["status"]; label: string; tone: string }[] = [
  { id: "a_fazer", label: "A fazer", tone: "bg-muted" },
  { id: "fazendo", label: "Fazendo", tone: "bg-warning/15" },
  { id: "feito", label: "Feito", tone: "bg-success/15" },
];

export function KanbanBoard({ project }: { project: ProjectFull }) {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { data: team } = useQuery({ queryKey: ["team"], queryFn: listTeam });
  const teamNameById = useMemo(() => new Map((team ?? []).map((m) => [m.id, m.nome])), [team]);

  const allTasks = useMemo(
    () => project.stages.flatMap((s) => s.tasks.map((t) => ({ ...t, stageName: s.nome }))),
    [project],
  );

  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const t = allTasks.find((x) => x.id === id);
      const dias = status === "feito" && t ? { dias_trabalhados: Number(t.dias_estimados) } : {};
      return updateTask(id, { status, ...dias });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", project.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const taskId = String(e.active.id);
    const newStatus = String(e.over.id);
    const task = allTasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    move.mutate({ id: taskId, status: newStatus });
  };

  if (project.stages.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Adicione etapas e tarefas na aba "Etapas" para usar o Kanban.
      </Card>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const tasks = allTasks.filter((t) => t.status === col.id);
          return <Column key={col.id} col={col} tasks={tasks} teamNameById={teamNameById} />;
        })}
      </div>
    </DndContext>
  );
}

function Column({
  col,
  tasks,
  teamNameById,
}: {
  col: { id: string; label: string; tone: string };
  tasks: (Task & { stageName: string; subtasks: Subtask[] })[];
  teamNameById: Map<string, string | null>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-border ${col.tone} p-3 transition-colors ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{col.label}</h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums">
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            assigneeName={t.assigned_to ? teamNameById.get(t.assigned_to) : null}
          />
        ))}
        {tasks.length === 0 && (
          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Solte tarefas aqui
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  assigneeName,
}: {
  task: Task & { stageName: string; subtasks: Subtask[] };
  assigneeName?: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  // Datas conforme o status: início aparece a partir de "fazendo", término só em "feito".
  const showInicio =
    (task.status === "fazendo" || task.status === "feito") && task.data_inicio_real;
  const showFim = task.status === "feito" && task.data_conclusao;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">{task.stageName}</div>
          <div className="mt-0.5 text-sm font-medium">{task.titulo}</div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              {Number(task.dias_trabalhados).toFixed(1)}/{Number(task.dias_estimados).toFixed(1)}d
            </span>
            {task.subtasks.length > 0 && (
              <span className="tabular-nums">
                ✓ {task.subtasks.filter((s) => s.concluida).length}/{task.subtasks.length}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            {assigneeName ? (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {assigneeName}
              </span>
            ) : (
              <span />
            )}
            <span>
              {showInicio && `Início ${format(parseISO(task.data_inicio_real!), "dd/MM")}`}
              {showFim && ` · Fim ${format(parseISO(task.data_conclusao!), "dd/MM")}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
