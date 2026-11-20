import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

function runtimeEnv(name: string) {
  const runtime = globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } };
  return runtime.process?.env?.[name];
}
function configuredEnv(names: string[]) {
  for (const name of names) { const value = runtimeEnv(name)?.trim(); if (value) return value; }
  return undefined;
}
function supabaseProjectUrl() {
  const value = configuredEnv(["SUPABASE_URL", "VITE_SUPABASE_URL"]) ?? import.meta.env['VITE_SUPABASE_URL'];
  if (!value) throw new Error("Configuração de conexão indisponível.");
  return value;
}
function supabasePublishableKey() {
  const direct = configuredEnv(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (direct) return direct;
  const keyset = runtimeEnv("SUPABASE_PUBLISHABLE_KEYS");
  if (keyset) {
    try {
      const parsed: unknown = JSON.parse(keyset);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const keys = parsed as Record<string, unknown>;
        const key = [keys['default'], ...Object.values(keys)].find((v): v is string => typeof v === "string" && v.trim().startsWith("sb_publishable_"));
        if (key) return key.trim();
      }
    } catch { /* Try the remaining configured public keys. */ }
  }
  const legacy = configuredEnv(["SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"]) ?? import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  if (!legacy) throw new Error("Configuração de conexão indisponível.");
  return legacy;
}
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token || !ctx.isAuthenticated()) throw new Error("Entre na sua conta para continuar.");
  return createClient<Database>(supabaseProjectUrl(), supabasePublishableKey(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}