import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createUserSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido"),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres"),
  role: z.enum(["coordenador", "analista"]),
});

export const createTeamUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Somente coordenadores podem criar usuários.
    const { data: isCoord, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "coordenador",
    });
    if (roleError) throw new Error("Não foi possível verificar suas permissões.");
    if (!isCoord) throw new Error("Apenas o coordenador pode criar usuários.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        throw new Error("Já existe uma conta com este e-mail.");
      }
      throw new Error(error.message);
    }

    const userId = created.user?.id;
    if (!userId) throw new Error("Usuário criado, mas sem identificador retornado.");

    // O trigger handle_new_user já cria o perfil e um papel padrão;
    // aqui garantimos exatamente o papel escolhido pelo coordenador.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (roleInsertError) throw new Error(roleInsertError.message);

    // Garante o nome no perfil mesmo se o trigger tiver usado o e-mail.
    await supabaseAdmin.from("profiles").update({ nome: data.nome }).eq("id", userId);

    return { id: userId };
  });
