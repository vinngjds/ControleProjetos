import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Stage = Database["public"]["Tables"]["stages"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Subtask = Database["public"]["Tables"]["subtasks"]["Row"];
export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

export type TaskStatus = "a_fazer" | "fazendo" | "feito";

export type TaskWithSubtasks = Task & { subtasks: Subtask[] };

export type ProjectFull = Project & {
  stages: (Stage & { tasks: TaskWithSubtasks[]; attachments: Attachment[] })[];
};

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .neq("status", "backlog")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Usado pela Visão Geral: traz TODOS os projetos, incluindo os que ainda
// estão no Backlog, para os KPIs e gráficos de portfólio.
export async function listAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProject(id: string): Promise<ProjectFull | null> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  if (!project) return null;

  const { data: stages, error: sErr } = await supabase
    .from("stages")
    .select("*")
    .eq("project_id", id)
    .order("ordem");
  if (sErr) throw sErr;

  const stageIds = (stages ?? []).map((s) => s.id);
  let tasks: Task[] = [];
  let attachments: Attachment[] = [];
  if (stageIds.length) {
    const [tRes, aRes] = await Promise.all([
      supabase.from("tasks").select("*").in("stage_id", stageIds).order("ordem"),
      supabase.from("attachments").select("*").in("stage_id", stageIds).order("created_at"),
    ]);
    if (tRes.error) throw tRes.error;
    if (aRes.error) throw aRes.error;
    tasks = tRes.data ?? [];
    attachments = aRes.data ?? [];
  }

  const taskIds = tasks.map((t) => t.id);
  let subtasks: Subtask[] = [];
  if (taskIds.length) {
    const { data, error: stErr } = await supabase
      .from("subtasks")
      .select("*")
      .in("task_id", taskIds)
      .order("ordem");
    if (stErr) throw stErr;
    subtasks = data ?? [];
  }

  return {
    ...project,
    stages: (stages ?? []).map((s) => ({
      ...s,
      tasks: tasks
        .filter((t) => t.stage_id === s.id)
        .map((t) => ({ ...t, subtasks: subtasks.filter((st) => st.task_id === t.id) })),
      attachments: attachments.filter((a) => a.stage_id === s.id),
    })),
  };
}

export async function createProject(input: {
  nome: string;
  descricao?: string;
  data_inicio?: string;
  data_entrega?: string;
  analista_id?: string | null;
  status?: string;
  categoria?: string | null;
  area?: string | null;
  projeto_relacionado_id?: string | null;
}) {
  const { data, error } = await supabase.from("projects").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, patch: Partial<Project>) {
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Backlog ----------
export type BacklogCategoria = "dashboard" | "melhoria" | "app";

export async function listBacklog(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "backlog")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBacklogItem(input: {
  nome: string;
  descricao?: string;
  categoria: BacklogCategoria;
  area?: string | null;
  analista_id?: string | null;
  projeto_relacionado_id?: string | null;
}) {
  return createProject({ ...input, status: "backlog" });
}

export async function promoteFromBacklog(id: string, dates: { data_inicio: string }) {
  await updateProject(id, { status: "classificacao", ...dates });
}

export async function createStage(input: {
  project_id: string;
  nome: string;
  ordem: number;
  peso?: number;
  data_prevista_inicio?: string | null;
  data_prevista_fim?: string | null;
}) {
  const { data, error } = await supabase.from("stages").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateStage(id: string, patch: Partial<Stage>) {
  const { error } = await supabase.from("stages").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteStage(id: string) {
  const { error } = await supabase.from("stages").delete().eq("id", id);
  if (error) throw error;
}

export async function createTask(input: {
  stage_id: string;
  titulo: string;
  descricao?: string;
  dias_estimados: number;
  ordem: number;
}) {
  const { data, error } = await supabase.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, patch: Partial<Task>) {
  const { error } = await supabase
    .from("tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function createSubtask(input: { task_id: string; titulo: string; ordem: number }) {
  const { data, error } = await supabase.from("subtasks").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateSubtask(id: string, patch: Partial<Subtask>) {
  const { error } = await supabase.from("subtasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteSubtask(id: string) {
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Attachments ----------
export async function uploadAttachment(stageId: string, file: File): Promise<Attachment> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${stageId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("mockups").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("attachments")
    .insert({
      stage_id: stageId,
      nome: file.name,
      storage_path: path,
      mime_type: file.type,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAttachment(att: Attachment) {
  await supabase.storage.from("mockups").remove([att.storage_path]);
  const { error } = await supabase.from("attachments").delete().eq("id", att.id);
  if (error) throw error;
}

export function attachmentUrl(path: string): string {
  return supabase.storage.from("mockups").getPublicUrl(path).data.publicUrl;
}

// ---------- Users / Roles ----------
export type AppRole = "coordenador" | "analista";

export type TeamMember = { id: string; nome: string | null; role: AppRole };

export async function listTeam(): Promise<TeamMember[]> {
  const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
    supabase.from("profiles").select("*").order("nome"),
    supabase.from("user_roles").select("*"),
  ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;
  return (profiles ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    role: ((roles ?? []).find((r) => r.user_id === p.id)?.role as AppRole) ?? "analista",
  }));
}

export async function listAnalysts(): Promise<TeamMember[]> {
  const team = await listTeam();
  return team.filter((m) => m.role === "analista");
}

export async function setUserRole(userId: string, role: AppRole) {
  // remove existing roles, add the new one
  await supabase.from("user_roles").delete().eq("user_id", userId);
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
  if (error) throw error;
}

// ---------- Task lifecycle (start / complete) ----------
function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
export function diasUteisDecorridos(dataInicio: string): number {
  return Math.max(0, businessDaysBetweenInclusive(dataInicio, isoDate()) - 1);
}
function businessDaysBetweenInclusive(start: string, endIso: string) {
  let count = 0;
  const cur = new Date(start + "T00:00:00Z");
  const end = new Date(endIso + "T00:00:00Z");
  while (cur.getTime() <= end.getTime()) {
    const w = cur.getUTCDay();
    if (w !== 0 && w !== 6) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}

export async function startTask(taskId: string) {
  const today = isoDate();
  await updateTask(taskId, { status: "fazendo", data_inicio_real: today, dias_trabalhados: 0 });
}

export async function completeTask(task: Task) {
  const today = isoDate();
  const inicio = task.data_inicio_real ?? today;
  const trabalhados = businessDaysBetweenInclusive(inicio, today);
  await updateTask(task.id, {
    status: "feito",
    data_inicio_real: inicio,
    data_conclusao: today,
    dias_trabalhados: trabalhados,
  });
}

export async function reopenTask(taskId: string) {
  await updateTask(taskId, { status: "fazendo", data_conclusao: null });
}

// ---------- My tasks (analyst inbox) ----------
export type AnalystTask = Task & {
  stageName: string;
  projectId: string;
  projectName: string;
  stageStart: string | null;
  stageEnd: string | null;
};

export async function listAnalystTasks(userId: string): Promise<AnalystTask[]> {
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, nome, analista_id")
    .eq("analista_id", userId)
    .neq("status", "backlog");
  if (error) throw error;
  if (!projects?.length) return [];
  const projIds = projects.map((p) => p.id);
  const { data: stages } = await supabase.from("stages").select("*").in("project_id", projIds);
  const stageIds = (stages ?? []).map((s) => s.id);
  if (!stageIds.length) return [];
  const today = isoDate();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .in("stage_id", stageIds)
    .neq("status", "feito");
  const out: AnalystTask[] = [];
  for (const t of tasks ?? []) {
    const stage = (stages ?? []).find((s) => s.id === t.stage_id);
    if (!stage) continue;
    // Only show tasks whose stage has started (or no date set)
    if (stage.data_prevista_inicio && stage.data_prevista_inicio > today) continue;
    const proj = projects.find((p) => p.id === stage.project_id)!;
    out.push({
      ...t,
      stageName: stage.nome,
      projectId: proj.id,
      projectName: proj.nome,
      stageStart: stage.data_prevista_inicio,
      stageEnd: stage.data_prevista_fim,
    });
  }
  return out.sort((a, b) => (a.stageEnd ?? "").localeCompare(b.stageEnd ?? ""));
}

export async function listOverdueCount(forUserId: string | null): Promise<number> {
  const today = isoDate();
  let query = supabase.from("projects").select("id, analista_id").neq("status", "backlog");
  if (forUserId) query = query.eq("analista_id", forUserId);
  const { data: projects } = await query;
  if (!projects?.length) return 0;
  const { data: stages } = await supabase
    .from("stages")
    .select("id, project_id, data_prevista_fim")
    .in(
      "project_id",
      projects.map((p) => p.id),
    );
  const stageIds = (stages ?? [])
    .filter((s) => s.data_prevista_fim && s.data_prevista_fim < today)
    .map((s) => s.id);
  if (!stageIds.length) return 0;
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .in("stage_id", stageIds)
    .neq("status", "feito");
  return count ?? 0;
}

// ---------- Date distribution by weight (business days) ----------
function isWeekend(d: Date) {
  const w = d.getUTCDay();
  return w === 0 || w === 6;
}
function nextBusinessDay(d: Date) {
  const r = new Date(d);
  while (isWeekend(r)) r.setUTCDate(r.getUTCDate() + 1);
  return r;
}
function prevBusinessDay(d: Date) {
  const r = new Date(d);
  while (isWeekend(r)) r.setUTCDate(r.getUTCDate() - 1);
  return r;
}
function addBusinessDays(d: Date, n: number) {
  const r = new Date(d);
  let left = n;
  while (left > 0) {
    r.setUTCDate(r.getUTCDate() + 1);
    if (!isWeekend(r)) left--;
  }
  return r;
}
function businessDaysBetween(start: Date, end: Date) {
  let count = 0;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    if (!isWeekend(cur)) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function distributeStageDates(
  projectStart: string,
  projectEnd: string,
  stages: { id: string; peso: number; ordem: number }[],
): Record<string, { data_prevista_inicio: string; data_prevista_fim: string }> {
  const start = nextBusinessDay(new Date(projectStart + "T00:00:00Z"));
  const end = prevBusinessDay(new Date(projectEnd + "T00:00:00Z"));
  const totalBdays = Math.max(1, businessDaysBetween(start, end));
  const ordered = [...stages].sort((a, b) => a.ordem - b.ordem);
  const totalPeso = ordered.reduce((a, s) => a + (s.peso || 0), 0);
  const result: Record<string, { data_prevista_inicio: string; data_prevista_fim: string }> = {};

  const raw = ordered.map((s) =>
    totalPeso > 0 ? (totalBdays * (s.peso || 0)) / totalPeso : totalBdays / ordered.length,
  );
  const days = raw.map((v) => Math.max(1, Math.floor(v)));
  let diff = totalBdays - days.reduce((a, b) => a + b, 0);
  const remainders = raw.map((v, i) => ({ i, r: v - Math.floor(v) })).sort((a, b) => b.r - a.r);
  for (let k = 0; diff > 0 && k < remainders.length; k++, diff--) {
    days[remainders[k].i]++;
  }

  let cursor = start;
  ordered.forEach((s, i) => {
    const dur = days[i];
    const sd = nextBusinessDay(cursor);
    const ed = addBusinessDays(sd, dur - 1);
    result[s.id] = { data_prevista_inicio: iso(sd), data_prevista_fim: iso(ed) };
    cursor = addBusinessDays(ed, 1);
  });
  return result;
}

export async function applyStageDistribution(project: ProjectFull) {
  const dist = distributeStageDates(
    project.data_inicio,
    project.data_entrega ?? project.data_inicio,
    project.stages.map((s) => ({ id: s.id, peso: s.peso, ordem: s.ordem })),
  );
  await Promise.all(Object.entries(dist).map(([id, d]) => updateStage(id, d)));
}

/**
 * Reconcilia o status do projeto com o estado real das tarefas: se todas as tarefas de
 * todas as etapas estiverem "feito", marca o projeto como "finalizado" automaticamente.
 * Se o projeto estava "finalizado" e alguma tarefa deixou de estar concluída (reaberta),
 * volta para "ativo". Não mexe em projetos em "backlog" ou "classificacao".
 * Chamada após qualquer mutação que altere o status de uma tarefa.
 */
export async function reconcileProjectStatus(
  projectId: string,
): Promise<"finalizado" | "reaberto" | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  if (project.status !== "ativo" && project.status !== "finalizado") return null;

  const allTasks = project.stages.flatMap((s) => s.tasks);
  const allDone = allTasks.length > 0 && allTasks.every((t) => t.status === "feito");

  if (allDone && project.status !== "finalizado") {
    await updateProject(projectId, { status: "finalizado" });
    return "finalizado";
  }
  if (!allDone && project.status === "finalizado") {
    await updateProject(projectId, { status: "ativo" });
    return "reaberto";
  }
  return null;
}

// ---------- Gantt por duração (eixo fixo, arrastável) ----------
export const GANTT_AXIS_WEEKS = 10;
export const GANTT_DAYS_PER_WEEK = 5;
export const GANTT_AXIS_DAYS = GANTT_AXIS_WEEKS * GANTT_DAYS_PER_WEEK; // 50

export function formatDurationShort(days: number) {
  const weeks = Math.floor(days / GANTT_DAYS_PER_WEEK);
  const rem = days % GANTT_DAYS_PER_WEEK;
  if (weeks > 0 && rem > 0) return `${weeks}s e ${rem}d`;
  if (weeks > 0) return `${weeks}s`;
  return `${rem}d`;
}

export function formatDurationAsWeeks(days: number) {
  const weeks = Math.floor(days / GANTT_DAYS_PER_WEEK);
  const rem = days % GANTT_DAYS_PER_WEEK;
  if (weeks > 0 && rem > 0)
    return `${weeks} ${weeks === 1 ? "semana" : "semanas"} e ${rem} ${rem === 1 ? "dia" : "dias"}`;
  if (weeks > 0) return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
  return `${rem} ${rem === 1 ? "dia" : "dias"}`;
}

/**
 * Calcula as datas reais (data_prevista_inicio/fim) de cada etapa a partir de uma
 * data de início do projeto e da duração (em dias úteis) de cada etapa, posicionando-as
 * sequencialmente (uma começa no dia útil seguinte ao fim da anterior).
 */
export function distributeStageDatesFromDurations(
  projectStart: string,
  stages: { id: string; duracao_dias: number; ordem: number }[],
): Record<string, { data_prevista_inicio: string; data_prevista_fim: string }> {
  const ordered = [...stages].sort((a, b) => a.ordem - b.ordem);
  const result: Record<string, { data_prevista_inicio: string; data_prevista_fim: string }> = {};

  let cursor = nextBusinessDay(new Date(projectStart + "T00:00:00Z"));
  ordered.forEach((s) => {
    const dur = Math.max(1, s.duracao_dias);
    const sd = nextBusinessDay(cursor);
    const ed = addBusinessDays(sd, dur - 1);
    result[s.id] = { data_prevista_inicio: iso(sd), data_prevista_fim: iso(ed) };
    cursor = addBusinessDays(ed, 1);
  });
  return result;
}

/**
 * Aprova o cronograma: calcula e persiste as datas reais de cada etapa a partir das
 * durações definidas no Gantt (arrastáveis) e da data de início do projeto, e move o
 * projeto de "Em Classificação" para "Em Andamento".
 */
export async function approveScheduleFromDurations(project: ProjectFull) {
  const dist = distributeStageDatesFromDurations(
    project.data_inicio,
    project.stages.map((s) => ({ id: s.id, duracao_dias: s.duracao_dias, ordem: s.ordem })),
  );
  await Promise.all(Object.entries(dist).map(([id, d]) => updateStage(id, d)));
  if (project.status === "classificacao") {
    await updateProject(project.id, { status: "ativo" });
  }
}

// ---------- Esforço x Impacto ----------
export const ESFORCO_QUESTIONS = [
  { key: "esforco_estrutura", label: "Estrutura dos Dados", levels: ["Baixa", "Moderada", "Alta"] },
  { key: "esforco_tempo", label: "Tempo de Estudo da Base", levels: ["Baixo", "Moderado", "Alto"] },
  { key: "esforco_etl", label: "Complexidade ETL", levels: ["Baixa", "Moderada", "Alta"] },
  { key: "esforco_visual", label: "Complexidade Visual", levels: ["Baixa", "Moderada", "Alta"] },
] as const;

export const IMPACTO_QUESTIONS = [
  {
    key: "impacto_decisao",
    label: "Influência na Tomada de Decisão",
    levels: ["Baixa", "Moderada", "Alta"],
  },
  {
    key: "impacto_abrangencia",
    label: "Abrangência Organizacional",
    levels: ["Baixa", "Moderada", "Alta"],
  },
  {
    key: "impacto_criticidade",
    label: "Criticidade do Problema Resolvido",
    levels: ["Baixa", "Moderada", "Alta"],
  },
  {
    key: "impacto_eficiencia",
    label: "Ganho de Eficiência / Redução de Trabalho Manual",
    levels: ["Baixo", "Moderado", "Alto"],
  },
] as const;

export type EffortImpactKey =
  (typeof ESFORCO_QUESTIONS)[number]["key"] | (typeof IMPACTO_QUESTIONS)[number]["key"];

export function axisScore(
  project: Project,
  questions: readonly { key: EffortImpactKey }[],
): number | null {
  const vals = questions
    .map((q) => project[q.key])
    .filter((v): v is number => v !== null && v !== undefined);
  if (vals.length < questions.length) return null;
  return vals.reduce((a, b) => a + b, 0) / questions.length;
}

export function scoreLabel(avg: number | null): string {
  if (avg === null) return "—";
  if (avg < 1.67) return "Baixo";
  if (avg < 2.34) return "Médio";
  return "Alto";
}

export function isClassified(project: Project): boolean {
  return (
    axisScore(project, ESFORCO_QUESTIONS) !== null && axisScore(project, IMPACTO_QUESTIONS) !== null
  );
}

export function priorityScore(project: Project): number {
  const esf = axisScore(project, ESFORCO_QUESTIONS) ?? 0;
  const imp = axisScore(project, IMPACTO_QUESTIONS) ?? 0;
  return imp - esf;
}

// ---------- Computed metrics ----------
export function computeProgress(project: ProjectFull) {
  const allTasks = project.stages.flatMap((s) => s.tasks);
  const totalEst = allTasks.reduce((acc, t) => acc + Number(t.dias_estimados), 0);
  const totalDone = allTasks.reduce(
    (acc, t) =>
      acc + (t.status === "feito" ? Number(t.dias_estimados) : Number(t.dias_trabalhados)),
    0,
  );
  const pct = totalEst > 0 ? Math.min(100, (totalDone / totalEst) * 100) : 0;
  const diasRestantes = Math.max(0, totalEst - totalDone);
  const tarefasFeitas = allTasks.filter((t) => t.status === "feito").length;
  return {
    totalTarefas: allTasks.length,
    tarefasFeitas,
    totalDias: totalEst,
    diasFeitos: totalDone,
    diasRestantes,
    pct,
  };
}
