import { Link } from "@tanstack/react-router";
import {
  axisScore,
  scoreLabel,
  isClassified,
  priorityScore,
  ESFORCO_QUESTIONS,
  IMPACTO_QUESTIONS,
  type Project,
} from "@/lib/api";
import { Card } from "@/components/ui/card";

function scoreToFraction(avg: number) {
  return 0.15 + ((avg - 1) / 2) * 0.7;
}

export function EffortImpactMatrix({ projects }: { projects: Project[] }) {
  const classified = projects.filter(isClassified);
  const unclassified = projects.filter((p) => !isClassified(p));

  const ranked = [...classified].sort((a, b) => priorityScore(b) - priorityScore(a));
  const rankOf = new Map(ranked.map((p, i) => [p.id, i + 1]));

  if (classified.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Nenhum projeto classificado ainda. Abra um projeto e responda Esforço x Impacto para vê-lo
        aqui.
      </Card>
    );
  }

  return (
    <div>
      <Card className="relative overflow-visible p-8 pb-12">
        <div className="relative mx-6 mt-2 h-[420px] border border-border sm:mx-10">
          <div className="absolute left-0 top-0 h-1/2 w-1/2 bg-[#F4FAFE]" />
          <div className="absolute right-0 top-0 h-1/2 w-1/2 bg-secondary" />
          <div className="absolute bottom-0 left-0 h-1/2 w-1/2 bg-[#FBFDFE]" />
          <div className="absolute bottom-0 right-0 h-1/2 w-1/2 bg-accent" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-primary" />

          <span className="absolute -top-5 left-0 text-[10px] text-muted-foreground">Baixo</span>
          <span className="absolute -top-5 right-0 text-[10px] text-muted-foreground">Alto</span>
          <span className="absolute -bottom-7 left-0 w-full text-center text-xs font-bold text-muted-foreground">
            ESFORÇO →
          </span>
          <span className="absolute -left-9 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-muted-foreground">
            IMPACTO →
          </span>

          {classified.map((p) => {
            const esf = axisScore(p, ESFORCO_QUESTIONS)!;
            const imp = axisScore(p, IMPACTO_QUESTIONS)!;
            const left = scoreToFraction(esf) * 100;
            const top = (1 - scoreToFraction(imp)) * 100;
            return (
              <Link
                key={p.id}
                to="/projetos/$id"
                params={{ id: p.id }}
                className="absolute z-10 flex w-44 -translate-x-1/2 -translate-y-1/2 items-start gap-2 rounded-lg border border-primary/30 bg-card p-2.5 text-xs shadow-md transition-all hover:z-20 hover:scale-105 hover:border-primary hover:shadow-lg"
                style={{ left: `${left}%`, top: `${top}%` }}
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {rankOf.get(p.id)}º
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.nome}</span>
                  <span className="text-muted-foreground">
                    Esforço {scoreLabel(esf)} · Impacto {scoreLabel(imp)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Card>
      {unclassified.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {unclassified.length} projeto{unclassified.length === 1 ? "" : "s"} ainda não aparece
          {unclassified.length === 1 ? "" : "m"} aqui por estar
          {unclassified.length === 1 ? "" : "em"} pendente
          {unclassified.length === 1 ? "" : "s"} de classificação.
        </p>
      )}
    </div>
  );
}
