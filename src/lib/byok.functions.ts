import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SaveKeySchema } from "@/lib/ai-quota";

export const saveOwnAIKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveKeySchema.parse(d))
  .handler(async ({ data, context }) => {
    const byok = await import("@/lib/ai/byok.server");
    if (!(await byok.verifyProviderKey(data.provider, data.apiKey))) throw new Error("O provedor recusou essa chave. Confira se copiou a chave completa e se ela tem saldo/permissão.");
    const enc = await byok.encryptKey(data.apiKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_ai_keys").upsert({ user_id: context.userId, provider: data.provider, model: data.model, ...enc, updated_at: new Date().toISOString() });
    if (error) throw new Error("Não foi possível salvar sua chave.");
    return { ok: true };
  });

export const removeOwnAIKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_ai_keys").delete().eq("user_id", context.userId);
    if (error) throw new Error("Não foi possível remover sua chave.");
    return { ok: true };
  });
