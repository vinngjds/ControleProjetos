import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha — Planner" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("E-mail de recuperação enviado");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-semibold">Recuperar senha</h1>
            <p className="text-sm text-muted-foreground">Enviaremos um link para o seu e-mail</p>
          </div>
        </div>
        <Card className="p-6">
          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Se existir uma conta com <strong>{email}</strong>, você receberá um link para redefinir a senha em instantes.
              </p>
              <Link to="/login" className="inline-block text-sm font-medium text-primary hover:underline">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Lembrou a senha?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
