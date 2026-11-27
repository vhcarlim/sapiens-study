import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { resolveAIChoice, responseUsage } from "@/lib/ai-settings";
import { communityCapReached, dailyLimit, quotaExceeded, type BYOKProvider } from "@/lib/ai-quota";

export type AIIdentity = { userId: string; supabase: SupabaseClient<Database> };

/** Identity is supplied only after the caller's server authentication. Logs contain no prompts. */
export async function createTrackedAiFetch(identity: AIIdentity, feature: string, upstream: typeof fetch = fetch, opts: { simpleStream?: boolean; gateway?: typeof fetch } = {}): Promise<typeof fetch> {
  const { data: prefs, error } = await identity.supabase.from("ai_preferences").select("study_model,study_effort,document_model,document_effort,monthly_token_goal").eq("user_id", identity.userId).maybeSingle();
  if (error) throw new Error("Não foi possível consultar suas preferências de IA.");
  const choice = resolveAIChoice(prefs, feature);
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: keyRow } = await admin.from("user_ai_keys").select("provider,model,key_cipher,key_iv").eq("user_id", identity.userId).maybeSingle();
  const byok = await import("@/lib/ai/byok.server");
  const ownKey = keyRow ? { provider: keyRow.provider as BYOKProvider, model: keyRow.model, apiKey: await byok.decryptKey(keyRow.key_cipher, keyRow.key_iv) } : null;
  const usesOwnKey = !!ownKey && (ownKey.provider === "openai" || ownKey.provider === "openrouter" || !!opts.simpleStream);
  if (!usesOwnKey) {
    const [{ data: ent }, { count }, { count: globalCount }] = await Promise.all([
      admin.from("ai_entitlements").select("plan").eq("user_id", identity.userId).maybeSingle(),
      admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", identity.userId).eq("byok", false).gte("created_at", saoPauloMidnightIso()),
      admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("byok", false).gte("created_at", saoPauloMidnightIso()),
    ]);
    if (ent?.plan !== "ilimitado" && communityCapReached(globalCount ?? 0)) throw new Error("A IA comunitária do Sapiens Study esgotou por hoje. O site é gratuito e sem fins lucrativos: continue com as questões reais do banco, volte amanhã ou conecte sua própria chave (há opções gratuitas) em Configurações › IA.");
    if (quotaExceeded(ent?.plan, count ?? 0)) throw new Error(`Sua cota diária da IA comunitária acabou (${dailyLimit(ent?.plan)} usos). Continue com questões do banco, volte amanhã ou conecte sua própria chave em Configurações › IA.`);
  }
  return async (input, init) => {
    if (typeof init?.body !== "string") throw new Error("Pedido de IA inválido.");
    const body = JSON.parse(init.body);
    body.model = choice.model;
    body.reasoning = { ...body.reasoning, effort: choice.effort };
    const logModel = usesOwnKey && ownKey ? `${ownKey.provider}:${ownKey.model}`.slice(0, 100) : choice.model;
    const { data: log, error: insertError } = await admin.from("ai_usage").insert({ user_id: identity.userId, feature, model: logModel, effort: choice.effort, byok: usesOwnKey }).select("id").single();
    if (insertError || !log) throw new Error("Não foi possível registrar o uso da IA. Nenhuma chamada foi enviada.");
    let finished = false;
    let usage = responseUsage(null);
    let status: "completed" | "incomplete" | "failed" | "aborted" = "incomplete";
    let runId: string | null = null;
    const finish = async () => {
      if (finished) return;
      finished = true;
      const { error: updateError } = await admin.from("ai_usage").update({ ...usage, status, run_id: runId, finished_at: new Date().toISOString() }).eq("id", log.id).eq("user_id", identity.userId);
      if (updateError) console.error("AI usage finalization failed", updateError.code);
    };
    try {
      const routed = usesOwnKey && ownKey ? byok.routeOwnKey(ownKey, body, !!opts.simpleStream, upstream, init?.signal) : null;
      const response = await (routed ?? (opts.gateway ?? upstream)(input, { ...init, body: JSON.stringify(body) }));
      if (routed && (response.status === 401 || response.status === 403)) { status = "failed"; await finish(); throw new Error("Sua chave de IA foi recusada pelo provedor. Confira-a em Configurações › IA."); }
      if (routed && response.status === 429) { status = "failed"; await finish(); throw new Error("Sua chave de IA atingiu o limite do provedor. Tente mais tarde ou remova a chave para usar a IA do site."); }
      runId = response.headers.get("X-Lovable-AIG-Run-ID");
      if (!response.ok || !response.body) { status = "failed"; await finish(); return response; }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const observe = (text: string) => {
        buffer += text;
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          let event;
          try { event = JSON.parse(line.slice(5).trim()); } catch { continue; }
          if (event.type === "response.completed" || event.type === "response.incomplete" || event.type === "response.failed") {
            usage = responseUsage(event);
            status = event.type === "response.completed" ? "completed" : event.type === "response.failed" ? "failed" : "incomplete";
          } else if (event.type === "error") status = "failed";
        }
      };
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const chunk = await reader.read();
            if (chunk.done) { observe(decoder.decode() + "\n"); await finish(); controller.close(); return; }
            observe(decoder.decode(chunk.value, { stream: true }));
            controller.enqueue(chunk.value);
          } catch (e) { status = init?.signal?.aborted ? "aborted" : "failed"; await finish(); controller.error(e); }
        },
        async cancel(reason) { status = "aborted"; try { await reader.cancel(reason); } finally { await finish(); } },
      });
      return new Response(stream, { status: response.status, statusText: response.statusText, headers: response.headers });
    } catch (e) { status = init?.signal?.aborted ? "aborted" : "failed"; await finish(); throw e; }
  };
}

function saoPauloMidnightIso() {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  return new Date(`${day}T00:00:00-03:00`).toISOString();
}
