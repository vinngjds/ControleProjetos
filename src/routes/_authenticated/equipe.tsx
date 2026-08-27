import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createTeamUser } from "@/lib/admin-users.functions";
import { useAuth } from "@/lib/auth";
import { listTeam, setUserRole, type AppRole } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Equipe — Planner" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const isCoord = role === "coordenador";
  const [creating, setCreating] = useState(false);
  const { data: team, isLoading } = useQuery({ queryKey: ["team"], queryFn: listTeam, enabled: isCoord });

  const mut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) => setUserRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["analysts"] });
      toast.success("Papel atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isCoord) {
    return <Card className="p-10 text-center text-muted-foreground">Acesso restrito ao coordenador.</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Equipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie usuários e gerencie os papéis da equipe.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Novo usuário</Button>
      </div>

      <CreateUserDialog open={creating} onOpenChange={setCreating} />

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {(team ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${m.role === "coordenador" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {m.role === "coordenador" ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-medium">{m.nome ?? "(sem nome)"}{m.id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">{m.id.slice(0, 8)}</div>
                  </div>
                </div>
                <div className="w-44">
                  <Select
                    value={m.role}
                    onValueChange={(v) => mut.mutate({ userId: m.id, role: v as AppRole })}
                    disabled={m.id === user?.id}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="analista">Analista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </li>
            ))}
            {!team?.length && (
              <li className="p-10 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-2 h-6 w-6" /> Nenhum usuário ainda.
              </li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const createUser = useServerFn(createTeamUser);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [novoRole, setNovoRole] = useState<AppRole>("analista");

  const mut = useMutation({
    mutationFn: () =>
      createUser({ data: { nome: nome.trim(), email: email.trim(), senha, role: novoRole } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
      qc.invalidateQueries({ queryKey: ["analysts"] });
      toast.success("Usuário criado");
      onOpenChange(false);
      setNome("");
      setEmail("");
      setSenha("");
      setNovoRole("analista");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const invalido = !nome.trim() || !email.trim() || senha.length < 8;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="u-nome">Nome</Label>
            <Input id="u-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-email">E-mail</Label>
            <Input
              id="u-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="u-senha">Senha (mín. 8 caracteres)</Label>
            <Input
              id="u-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Papel</Label>
            <Select value={novoRole} onValueChange={(v) => setNovoRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analista">Analista</SelectItem>
                <SelectItem value="coordenador">Coordenador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={invalido || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Criando..." : "Criar usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
