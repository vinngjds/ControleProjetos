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

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Planner" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold">Planner</h1>
            <p className="text-sm text-muted-foreground">Acompanhamento de projetos</p>
          </div>
        </div>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <Link to="/esqueci-senha" className="text-xs font-medium text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/cadastro" className="font-medium text-primary hover:underline">
              Cadastre-se
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
