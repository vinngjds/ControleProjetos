import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "coordenador" | "analista";

type AuthCtx = {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  nome: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  role: null,
  nome: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      // Quando o usuário clica no link de recuperação, força a tela de redefinir senha
      if (event === "PASSWORD_RECOVERY" && typeof window !== "undefined") {
        if (window.location.pathname !== "/redefinir-senha") {
          window.location.replace("/redefinir-senha");
          return;
        }
      }
      setSession(s);
      if (!s) {
        setRole(null);
        setNome(null);
        setLoading(false);
      } else {
        // defer DB reads to avoid deadlock per supabase guidance
        setTimeout(() => loadRoleAndProfile(s.user.id), 0);
      }
    });

    // Se o link de recuperação aterrissou em outra rota, redireciona preservando o hash
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("type=recovery") && window.location.pathname !== "/redefinir-senha") {
        window.location.replace("/redefinir-senha" + hash);
        return;
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadRoleAndProfile(data.session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadRoleAndProfile(userId: string) {
    const [{ data: roleRow }, { data: prof }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("nome").eq("id", userId).maybeSingle(),
    ]);
    setRole((roleRow?.role as AppRole) ?? "analista");
    setNome(prof?.nome ?? null);
    setLoading(false);
  }

  const value: AuthCtx = {
    session,
    user: session?.user ?? null,
    role,
    nome,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
