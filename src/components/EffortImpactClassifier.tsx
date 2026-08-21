import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateProject,
  axisScore,
  scoreLabel,
  ESFORCO_QUESTIONS,
  IMPACTO_QUESTIONS,
  type Project,
  type EffortImpactKey,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

type Axis = "esforco" | "impacto";

export function EffortImpactClassifier({ project }: { project: Project }) {
  const qc = useQueryClient();
  const [active, setActive] = useState<Axis>("esforco");

  const patch = useMutation({
    mutationFn: (fields: Partial<Project>) => updateProject(project.id, fields),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", project.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const esf = axisScore(project, ESFORCO_QUESTIONS);
  const imp = axisScore(project, IMPACTO_QUESTIONS);
  const questions = active === "esforco" ? ESFORCO_QUESTIONS : IMPACTO_QUESTIONS;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <AxisToggleButton
          title="Esforço"
          score={esf}
          active={active === "esforco"}
          onClick={() => setActive("esforco")}
        />
        <AxisToggleButton
          title="Impacto"
          score={imp}
          active={active === "impacto"}
          onClick={() => setActive("impacto")}
        />
      </div>

      <Card className="divide-y divide-border p-0">
        {questions.map((q) => {
          const key = q.key as EffortImpactKey;
          const current = project[key];
          return (
            <div
              key={q.key}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm">{q.label}</span>
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={current ? String(current) : undefined}
                onValueChange={(v) => {
                  if (!v) return;
                  patch.mutate({ [key]: Number(v) } as Partial<Project>);
                }}
              >
                {q.levels.map((label, idx) => (
                  <ToggleGroupItem key={label} value={String(idx + 1)} className="text-xs">
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function AxisToggleButton({
  title,
  score,
  active,
  onClick,
}: {
  title: string;
  score: number | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent"
      }`}
    >
      <div className="font-display text-xs font-bold uppercase tracking-wider">{title}</div>
      <div className={`text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {score !== null ? `${scoreLabel(score)} · ${score.toFixed(1)}` : "Incompleto"}
      </div>
    </button>
  );
}
