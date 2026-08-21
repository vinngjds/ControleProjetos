import { useMemo } from "react";
import { differenceInDays, parseISO, format, max, min, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProjectFull } from "@/lib/api";

export function GanttChart({ project }: { project: ProjectFull }) {
  const data = useMemo(() => {
    const projStart = parseISO(project.data_inicio);
    const projEnd = parseISO(project.data_entrega ?? project.data_inicio);

    const stagesWithDates = project.stages.map((stage, i) => {
      const total = project.stages.length || 1;
      const span = Math.max(1, differenceInDays(projEnd, projStart));
      const fallbackStart = new Date(projStart);
      fallbackStart.setDate(projStart.getDate() + Math.floor((span * i) / total));
      const fallbackEnd = new Date(projStart);
      fallbackEnd.setDate(projStart.getDate() + Math.floor((span * (i + 1)) / total));

      const start = stage.data_prevista_inicio
        ? parseISO(stage.data_prevista_inicio)
        : fallbackStart;
      const end = stage.data_prevista_fim ? parseISO(stage.data_prevista_fim) : fallbackEnd;

      const totalD = stage.tasks.reduce((a, t) => a + Number(t.dias_estimados), 0);
      const doneD = stage.tasks.reduce(
        (a, t) =>
          a + (t.status === "feito" ? Number(t.dias_estimados) : Number(t.dias_trabalhados)),
        0,
      );
      const pct = totalD > 0 ? (doneD / totalD) * 100 : 0;
      return { stage, start, end, pct };
    });

    const allDates = stagesWithDates.flatMap((s) => [s.start, s.end]);
    const rangeStart = allDates.length ? min([projStart, ...allDates]) : projStart;
    const rangeEnd = allDates.length ? max([projEnd, ...allDates]) : projEnd;
    const totalDays = Math.max(1, differenceInDays(rangeEnd, rangeStart));

    return { stagesWithDates, rangeStart, rangeEnd, totalDays };
  }, [project]);

  const today = new Date();
  const todayOffset = differenceInDays(today, data.rangeStart);
  const todayPct = (todayOffset / data.totalDays) * 100;
  const showToday = todayPct >= 0 && todayPct <= 100;

  // Weekend bands (subtle background stripes)
  const weekends = useMemo(() => {
    const out: { left: number; width: number }[] = [];
    const cursor = new Date(data.rangeStart);
    while (cursor <= data.rangeEnd) {
      const w = cursor.getDay();
      if (w === 6) {
        const off = differenceInDays(cursor, data.rangeStart);
        out.push({
          left: (off / data.totalDays) * 100,
          width: (2 / data.totalDays) * 100,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [data.rangeStart, data.rangeEnd, data.totalDays]);

  if (project.stages.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Crie etapas para visualizar o cronograma.
      </Card>
    );
  }

  // Build month markers
  const months: { label: string; pct: number }[] = [];
  const cursor = new Date(data.rangeStart);
  cursor.setDate(1);
  while (cursor <= data.rangeEnd) {
    const off = differenceInDays(cursor, data.rangeStart);
    const pct = (off / data.totalDays) * 100;
    if (pct >= 0) months.push({ label: format(cursor, "MMM yy", { locale: ptBR }), pct });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const LABEL_W = 176; // px reservado para o nome da etapa

  return (
    <Card className="overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">
          {format(data.rangeStart, "dd MMM yyyy", { locale: ptBR })}
        </span>
        <span className="tabular-nums">
          {format(data.rangeEnd, "dd MMM yyyy", { locale: ptBR })}
        </span>
      </div>

      <div className="relative" style={{ paddingLeft: LABEL_W }}>
        {/* Track background com gradiente sutil + faixas de fim de semana */}
        <div className="pointer-events-none absolute inset-y-0 left-[176px] right-0">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-muted/20 via-muted/10 to-muted/20" />
          {weekends.map((w, i) => (
            <div
              key={i}
              className="absolute inset-y-0 bg-foreground/[0.035]"
              style={{ left: `${w.left}%`, width: `${w.width}%` }}
            />
          ))}
          {months.map((m, i) => (
            <div
              key={`g-${i}`}
              className="absolute inset-y-0 w-px bg-border/40"
              style={{ left: `${m.pct}%` }}
            />
          ))}
        </div>

        {/* Cabeçalho de meses */}
        <div className="relative mb-3 h-6 border-b border-border/60">
          {months.map((m, i) => (
            <div
              key={i}
              className="absolute top-0 h-full pl-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
              style={{ left: `${m.pct}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Linhas das etapas */}
        <TooltipProvider delayDuration={150}>
          <div className="space-y-2.5">
            {data.stagesWithDates.map(({ stage, start, end, pct }) => {
              const startOffset = differenceInDays(start, data.rangeStart);
              const duration = Math.max(1, differenceInDays(addDays(end, 1), start));
              const left = (startOffset / data.totalDays) * 100;
              const width = (duration / data.totalDays) * 100;
              const widthFrac = width / 100;
              const showFull = widthFrac >= 0.18;
              const showShort = !showFull && widthFrac >= 0.09;
              const showOnlyPct = !showFull && !showShort;
              const datesLabel = `${format(start, "dd/MM")} – ${format(end, "dd/MM")}`;
              return (
                <div key={stage.id} className="relative flex items-center">
                  <div
                    className="shrink-0 truncate pr-3 text-sm font-medium"
                    style={{ width: LABEL_W, marginLeft: -LABEL_W }}
                    title={stage.nome}
                  >
                    {stage.nome}
                  </div>
                  <div className="relative h-9 flex-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="group absolute top-1/2 h-7 -translate-y-1/2 cursor-default overflow-hidden rounded-full border border-primary/30 bg-primary/10 shadow-sm transition-all duration-300 hover:h-8 hover:shadow-md"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-500 ease-out"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/15 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-between gap-1.5 px-2 text-[10px] font-semibold leading-none">
                            <span className="shrink-0 tabular-nums text-foreground">
                              {Math.round(pct)}%
                            </span>
                            {showFull && (
                              <span className="truncate tabular-nums text-foreground/70">
                                {datesLabel}
                              </span>
                            )}
                            {showShort && (
                              <span className="truncate tabular-nums text-foreground/70">
                                {format(end, "dd/MM")}
                              </span>
                            )}
                            {showOnlyPct && null}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="font-medium">{stage.nome}</div>
                        <div className="mt-0.5 tabular-nums text-muted-foreground">
                          {datesLabel}
                        </div>
                        <div className="tabular-nums text-muted-foreground">
                          {duration} dia(s) · {Math.round(pct)}% concluído
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Linha de hoje */}
        {showToday && (
          <div
            className="pointer-events-none absolute top-0 bottom-0"
            style={{ left: `${todayPct}%` }}
          >
            <div className="absolute inset-y-0 w-px bg-gradient-to-b from-destructive/0 via-destructive to-destructive/0" />
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold tracking-wide text-destructive-foreground shadow-md">
              hoje
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
