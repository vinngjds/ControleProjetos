import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro — Planner" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return toast.error("A senha precisa de pelo menos 8 caracteres");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail para confirmar antes de entrar.");
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold">Criar conta</h1>
            <p className="text-sm text-muted-foreground">
              O primeiro cadastro vira coordenador automaticamente.
            </p>
          </div>
        </div>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha (mín. 8 caracteres)</Label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Criando..." : "Criar conta"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
