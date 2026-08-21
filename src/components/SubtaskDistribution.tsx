import { useMemo } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateSubtask, listTeam, type ProjectFull } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { GripVertical, Users2 } from "lucide-react";
import { toast } from "sonner";

const UNASSIGNED = "unassigned";

type FlatSubtask = {
  id: string;
  titulo: string;
  concluida: boolean;
  assigned_to: string | null;
  stageName: string;
  taskName: string;
};

export function SubtaskDistribution({ project }: { project: ProjectFull }) {
  const { role } = useAuth();

  if (role !== "coordenador") {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
          <Users2 className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Em construção</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Essa visão ainda vai ser reformulada para analistas.
          </p>
        </div>
      </Card>
    );
  }

  return <DistributionBoard project={project} />;
}

function DistributionBoard({ project }: { project: ProjectFull }) {
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { data: team } = useQuery({ queryKey: ["team"], queryFn: listTeam });
  const analysts = useMemo(() => (team ?? []).filter((m) => m.role === "analista"), [team]);

  const flatSubtasks = useMemo<FlatSubtask[]>(
    () =>
      project.stages.flatMap((s) =>
        s.tasks.flatMap((t) =>
          t.subtasks.map((st) => ({
            id: st.id,
            titulo: st.titulo,
            concluida: st.concluida,
            assigned_to: st.assigned_to,
            stageName: s.nome,
            taskName: t.titulo,
          })),
        ),
      ),
    [project],
  );

  const assign = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string | null }) =>
      updateSubtask(id, { assigned_to: userId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", project.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const subtaskId = String(e.active.id);
    const columnId = String(e.over.id);
    const sub = flatSubtasks.find((s) => s.id === subtaskId);
    if (!sub) return;
    const newAssignee = columnId === UNASSIGNED ? null : columnId;
    if ((sub.assigned_to ?? UNASSIGNED) === columnId) return;
    assign.mutate({ id: subtaskId, userId: newAssignee });
  };

  if (flatSubtasks.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Adicione subtarefas na aba "Etapas e tarefas" para distribuí-las aqui.
      </Card>
    );
  }

  if (analysts.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Nenhum analista na equipe ainda. Convide analistas na página "Equipe" para distribuir
        subtarefas.
      </Card>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_repeat(auto-fit,minmax(220px,1fr))]">
        <DistColumn
          id={UNASSIGNED}
          label="Não atribuído"
          subtasks={flatSubtasks.filter((s) => !s.assigned_to)}
        />
        {analysts.map((a) => (
          <DistColumn
            key={a.id}
            id={a.id}
            label={a.nome ?? a.id.slice(0, 8)}
            subtasks={flatSubtasks.filter((s) => s.assigned_to === a.id)}
          />
        ))}
      </div>
    </DndContext>
  );
}

function DistColumn({
  id,
  label,
  subtasks,
}: {
  id: string;
  label: string;
  subtasks: FlatSubtask[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border border-border bg-muted p-3 transition-colors ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="truncate font-display text-sm font-semibold uppercase tracking-wider">
          {label}
        </h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums">
          {subtasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {subtasks.map((s) => (
          <SubtaskCard key={s.id} subtask={s} />
        ))}
        {subtasks.length === 0 && (
          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Solte subtarefas aqui
          </div>
        )}
      </div>
    </div>
  );
}

function SubtaskCard({ subtask }: { subtask: FlatSubtask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: subtask.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "opacity-50" : ""
      } ${subtask.concluida ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-muted-foreground">
            {subtask.stageName} · {subtask.taskName}
          </div>
          <div className={`mt-0.5 text-sm font-medium ${subtask.concluida ? "line-through" : ""}`}>
            {subtask.titulo}
          </div>
        </div>
      </div>
    </div>
  );
}
