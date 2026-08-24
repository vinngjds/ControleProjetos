import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  approveScheduleFromDurations,
  diasUteisDecorridos,
  formatDurationAsWeeks,
  formatDurationShort,
  GANTT_AXIS_DAYS,
  GANTT_AXIS_WEEKS,
  GANTT_DAYS_PER_WEEK,
  updateStage,
  type ProjectFull,
} from "@/lib/api";
import { toast } from "sonner";

const LABEL_W = 150;
const FORECAST_W = 96;

export function GanttChart({ project }: { project: ProjectFull }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["project", project.id] });

  const orderedStages = useMemo(
    () => [...project.stages].sort((a, b) => a.ordem - b.ordem),
    [project.stages],
  );

  // Estado local de duração por etapa, para o arraste ficar fluido sem esperar o servidor.
  const [durations, setDurations] = useState<Record<string, number>>(() =>
    Object.fromEntries(orderedStages.map((s) => [s.id, Math.max(1, s.duracao_dias || 5)])),
  );

  const persistDuration = useMutation({
    mutationFn: ({ id, duracao_dias }: { id: string; duracao_dias: number }) =>
      updateStage(id, { duracao_dias }),
    onSuccess: invalidate,
  });

  const approve = useMutation({
    mutationFn: () =>
      approveScheduleFromDurations({
        ...project,
        stages: orderedStages.map((s) => ({
          ...s,
          duracao_dias: durations[s.id] ?? s.duracao_dias,
        })),
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Cronograma aprovado — datas calculadas a partir do início do projeto");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ticksRef = useRef<HTMLDivElement>(null);

  if (orderedStages.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Crie etapas para visualizar o cronograma.
      </Card>
    );
  }

  // Offset acumulado (em dias) de cada etapa: uma começa onde a anterior termina.
  let cursor = 0;
  const rows = orderedStages.map((stage) => {
    const dur = durations[stage.id] ?? stage.duracao_dias;
    const offset = cursor;
    cursor += dur;
    return { stage, dur, offset };
  });
  const totalDays = cursor;

  // Marcador de "hoje": só faz sentido quando o cronograma já foi aprovado
  // (existe uma data de início real) e o projeto não está mais no backlog.
  const showToday = project.status !== "backlog" && !!project.data_inicio;
  const diasDecorridos = project.data_inicio ? diasUteisDecorridos(project.data_inicio) : 0;
  const todayPct = showToday ? Math.min(100, (diasDecorridos / GANTT_AXIS_DAYS) * 100) : null;

  function handleDrag(stageId: string, startClientX: number, originalDuration: number) {
    const axisPxWidth = ticksRef.current?.getBoundingClientRect().width ?? 1;
    const dayPx = axisPxWidth / GANTT_AXIS_DAYS;

    function onMove(ev: PointerEvent) {
      const deltaPx = ev.clientX - startClientX;
      const deltaDays = Math.round(deltaPx / dayPx);
      let newDur = Math.max(1, originalDuration + deltaDays);
      const otherTotal = orderedStages.reduce(
        (sum, s) => (s.id === stageId ? sum : sum + (durations[s.id] ?? s.duracao_dias)),
        0,
      );
      if (otherTotal + newDur > GANTT_AXIS_DAYS) newDur = Math.max(1, GANTT_AXIS_DAYS - otherTotal);
      setDurations((prev) => ({ ...prev, [stageId]: newDur }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDurations((prev) => {
        const finalDur = prev[stageId] ?? originalDuration;
        persistDuration.mutate({ id: stageId, duracao_dias: finalDur });
        return prev;
      });
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <Card className="p-5">
      {project.status === "backlog" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary p-4">
          <p className="max-w-md text-sm text-secondary-foreground">
            Cronograma pronto? Aprove para definir a data de início e calcular a previsão de entrega
            automaticamente.
          </p>
          <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
            Aprovar Cronograma
          </Button>
        </div>
      ) : (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary p-4">
          <p className="max-w-md text-sm text-secondary-foreground">
            {diasDecorridos} de {totalDays} dias úteis decorridos
            {project.data_inicio ? ` · início ${project.data_inicio}` : ""}
          </p>
          <Button onClick={() => approve.mutate()} disabled={approve.isPending} variant="outline">
            Reaprovar cronograma
          </Button>
        </div>
      )}

      <div className="mb-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        Arraste a alça no canto direito de cada barra para ajustar a duração, dia a dia (1 semana ={" "}
        {GANTT_DAYS_PER_WEEK} dias úteis). {showToday && "O marcador azul mostra o dia de hoje. "}A
        &quot;Previsão&quot; e a duração total se recalculam sozinhas.
      </div>

      <div
        className="relative grid items-center gap-x-3.5 gap-y-2.5"
        style={{ gridTemplateColumns: `${LABEL_W}px 1fr ${FORECAST_W}px` }}
      >
        <div />
        <div ref={ticksRef} className="relative h-4">
          {Array.from({ length: GANTT_AXIS_WEEKS + 1 }, (_, w) => (
            <span
              key={w}
              className="absolute -translate-x-1/2 text-[9px] text-muted-foreground"
              style={{ left: `${(w / GANTT_AXIS_WEEKS) * 100}%` }}
            >
              {w}
            </span>
          ))}
        </div>
        <div className="pb-1 text-center text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
          Previsão
        </div>

        {rows.map(({ stage, dur, offset }) => (
          <StageRow
            key={stage.id}
            nome={stage.nome}
            duracao={dur}
            offsetDays={offset}
            onHandlePointerDown={(clientX) => handleDrag(stage.id, clientX, dur)}
          />
        ))}

        {showToday && todayPct !== null && (
          <div
            className="pointer-events-none absolute bottom-0 top-4 w-px bg-primary"
            style={{
              left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px - ${FORECAST_W}px - 28px) * ${todayPct / 100})`,
            }}
          >
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">
              HOJE
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">
        <span>
          Duração total estimada: {formatDurationAsWeeks(totalDays)} ({totalDays} dias)
        </span>
        <em className="text-[11px] font-normal not-italic text-primary-foreground/70">
          Somatória automática das etapas acima
        </em>
      </div>
    </Card>
  );
}

function StageRow({
  nome,
  duracao,
  offsetDays,
  onHandlePointerDown,
}: {
  nome: string;
  duracao: number;
  offsetDays: number;
  onHandlePointerDown: (clientX: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const leftPct = (offsetDays / GANTT_AXIS_DAYS) * 100;
  const widthPct = Math.max((duracao / GANTT_AXIS_DAYS) * 100, 2.4);

  return (
    <>
      <div className="truncate text-sm font-bold" title={nome}>
        {nome}
      </div>
      <div className="relative h-[26px] rounded-md bg-muted">
        <div
          className="absolute top-0 h-full rounded-md bg-primary transition-[width] duration-150"
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        >
          <div
            className="absolute right-[-6px] top-0 z-10 h-full w-3 cursor-ew-resize touch-none"
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              setDragging(true);
              onHandlePointerDown(e.clientX);
              const clear = () => {
                setDragging(false);
                window.removeEventListener("pointerup", clear);
              };
              window.addEventListener("pointerup", clear);
            }}
          >
            <span
              className={`absolute right-[3px] top-1/2 h-3.5 w-1 -translate-y-1/2 rounded-sm ${
                dragging ? "bg-accent" : "bg-white/90"
              }`}
            />
          </div>
        </div>
      </div>
      <div className="text-center text-xs font-bold text-primary">
        {formatDurationShort(duracao)}
      </div>
    </>
  );
}
