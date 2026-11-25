import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const trackInput = z.object({ trackId: z.string().uuid() });
export const listDocuments = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => trackInput.parse(d)).handler(async ({ data, context }) => {
    const { data: docs, error } = await context.supabase.from("source_documents").select("id,name,source_id,created_at").eq("user_id", context.userId).eq("track_id", data.trackId).order("created_at", { ascending: false });
    if (error) throw new Error("Não foi possível consultar seus materiais.");
    return docs ?? [];
  });
export const saveDocument = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => trackInput.extend({ name: z.string().trim().min(1).max(200), content: z.string().trim().min(20).max(500000), sourceId: z.string().uuid().nullable().default(null) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase.from("source_documents").insert({ user_id: context.userId, track_id: data.trackId, source_id: data.sourceId, name: data.name, content: data.content }).select("id,name").single();
    if (error || !doc) throw new Error("Não foi possível guardar o material nesta trilha.");
    return doc;
  });
export const deleteDocument = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => trackInput.extend({ id: z.string().uuid() }).parse(d)).handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("source_documents").delete().eq("id", data.id).eq("user_id", context.userId).eq("track_id", data.trackId);
    if (error) throw new Error("Não foi possível excluir o material.");
    return { ok: true };
  });
const OFFICIAL_SUFFIXES = [".gov.br", ".leg.br", ".jus.br", ".mp.br", ".def.br", ".tc.br", ".mil.br"];
/** Only official Brazilian public-sector hosts may be fetched, so the importer cannot be used to probe arbitrary sites. */
export function isOfficialHost(host: string) {
  const h = host.toLowerCase().replace(/\.$/, "");
  return OFFICIAL_SUFFIXES.some((s) => h.endsWith(s) || h === s.slice(1));
}
function blockedHost(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "metadata" || h.endsWith(".metadata") || h.endsWith(".corp") || h.endsWith(".lan") || h.endsWith(".home") || !h.includes(".") || /^(100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])|198\.1[89]|22[4-9]|2[3-5]\d)\./.test(h) || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local") || /^(0|10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(h) || /^\d+$/.test(h) || h.includes(":");
}
function htmlToText(html: string) {
  return html
    .replace(/<(script|style|noscript|head|nav|footer|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<strike[\s\S]*?<\/strike>/gi, " ")
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}
/** Fetches a public law/material page, keeps its text and stores it as a private track document. */
export const importDocumentFromUrl = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => trackInput.extend({ url: z.string().trim().url().max(500), name: z.string().trim().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let u: URL;
    try { u = new URL(data.url); } catch { throw new Error("Link inválido."); }
    const allowed = (x: URL) => ["http:", "https:"].includes(x.protocol) && !x.username && !x.password && (x.port === "" || x.port === "80" || x.port === "443") && !blockedHost(x.hostname) && isOfficialHost(x.hostname);
    if (!allowed(u)) throw new Error("Use um link de site oficial (gov.br, leg.br, jus.br, mp.br…). Para outros sites, envie o arquivo ou cole o texto.");
    let res: Response | undefined;
    for (let hop = 0; hop <= 3; hop++) {
      try {
        res = await fetch(u.toString(), { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 SapiensStudy", Accept: "text/html,text/plain" }, signal: AbortSignal.timeout(15000) });
      } catch { throw new Error("Não foi possível acessar o link."); }
      const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
      if (!loc) break;
      if (hop === 3) throw new Error("O link redireciona vezes demais.");
      try { u = new URL(loc, u); } catch { throw new Error("Redirecionamento inválido."); }
      if (!allowed(u)) throw new Error("O link redireciona para um endereço não permitido.");
    }
    if (!res) throw new Error("Não foi possível acessar o link.");
    if (!res.ok) throw new Error(`O site respondeu com erro (${res.status}).`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|xhtml/i.test(type)) throw new Error("O link precisa abrir uma página de texto (para PDF, use o envio de arquivo).");
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 6_000_000) throw new Error("Página grande demais.");
    let charset = /charset=([\w-]+)/i.exec(type)?.[1];
    if (!charset) charset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(new TextDecoder("latin1").decode(buf.slice(0, 4000)))?.[1];
    let raw: string;
    try { raw = new TextDecoder(charset || "utf-8").decode(buf); } catch { raw = new TextDecoder("utf-8").decode(buf); }
    const title = htmlToText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw)?.[1] ?? "");
    const content = (/html/i.test(type) ? htmlToText(raw) : raw.trim()).slice(0, 500000);
    if (content.length < 200) throw new Error("A página não tem texto suficiente para usar como material.");
    const name = (data.name || title || u.hostname).slice(0, 200);
    const { data: doc, error } = await context.supabase.from("source_documents").insert({ user_id: context.userId, track_id: data.trackId, source_id: null, name, content }).select("id,name").single();
    if (error || !doc) throw new Error("Não foi possível guardar o material nesta trilha.");
    return doc;
  });
