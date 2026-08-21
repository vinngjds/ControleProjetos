import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({ meta: [{ title: "Redefinir senha — Planner" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Aceita: evento PASSWORD_RECOVERY, hash com type=recovery, ou sessão já ativa
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setReady(true);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) return toast.error("A senha deve ter ao menos 6 caracteres");
    if (senha !== confirma) return toast.error("As senhas não coincidem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold">Definir nova senha</h1>
          </div>
        </div>
        <Card className="p-6">
          {!ready ? (
            <div className="space-y-4 text-center text-sm text-muted-foreground">
              <p>Abra esta página pelo link enviado para o seu e-mail.</p>
              <Link to="/esqueci-senha" className="inline-block font-medium text-primary hover:underline">
                Reenviar link
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">Nova senha</Label>
                <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoFocus minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirma">Confirmar senha</Label>
                <Input id="confirma" type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
