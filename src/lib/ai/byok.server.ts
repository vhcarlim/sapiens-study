import type { BYOKProvider } from "@/lib/ai-quota";

async function aesKey() {
  const secret = process.env["BYOK_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Chaves próprias indisponíveis no momento.");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptKey(plain: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), new TextEncoder().encode(plain));
  return { key_cipher: b64(cipher), key_iv: b64(iv) };
}
export async function decryptKey(cipher: string, iv: string) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv) }, await aesKey(), unb64(cipher));
  return new TextDecoder().decode(plain);
}

/** Cheap authenticated call that confirms the key works without spending tokens. */
export async function verifyProviderKey(provider: BYOKProvider, apiKey: string) {
  const req: Record<BYOKProvider, [string, Record<string, string>]> = {
    openai: ["https://api.openai.com/v1/models", { Authorization: `Bearer ${apiKey}` }],
    openrouter: ["https://openrouter.ai/api/v1/key", { Authorization: `Bearer ${apiKey}` }],
    gemini: [`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {}],
    anthropic: ["https://api.anthropic.com/v1/models", { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }],
  };
  const [url, headers] = req[provider];
  const res = await fetch(url, { headers }).catch(() => null);
  return !!res?.ok;
}

export type UserKey = { provider: BYOKProvider; model: string; apiKey: string };

/** Routes a Responses-API request body to the student's own provider. Returns null when this call must use the built-in model. */
export function routeOwnKey(key: UserKey, body: Record<string, unknown>, simpleStream: boolean, upstream: typeof fetch, signal?: AbortSignal | null): Promise<Response> | null {
  if (key.provider === "openai" || key.provider === "openrouter") {
    const next: Record<string, unknown> = { ...body, model: key.model };
    if (key.provider === "openai" && !/^(gpt-5|o\d)/.test(key.model)) delete next["reasoning"];
    delete next["include"];
    const url = key.provider === "openai" ? "https://api.openai.com/v1/responses" : "https://openrouter.ai/api/v1/responses";
    return upstream(url, { method: "POST", signal: signal ?? null, headers: { Authorization: `Bearer ${key.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(next) });
  }
  if (!simpleStream) return null;
  const url = key.provider === "gemini"
    ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    : "https://api.anthropic.com/v1/chat/completions";
  return upstream(url, { method: "POST", signal: signal ?? null, headers: { Authorization: `Bearer ${key.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(toChat(body, key)) })
    .then((res) => (res.ok && res.body ? new Response(chatToResponsesStream(res.body), { status: 200, headers: { "Content-Type": "text/event-stream" } }) : res));
}

type Part = { type?: string; text?: string; image_url?: string; file_data?: string };
function convertContent(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return String(content ?? "");
  return (content as Part[]).map((p) => {
    if (p.type === "input_image" && p.image_url) return { type: "image_url", image_url: { url: p.image_url } };
    if (p.type === "input_file" && p.file_data?.startsWith("data:")) return { type: "image_url", image_url: { url: p.file_data } };
    return { type: "text", text: p.text ?? "" };
  });
}

export function toChat(body: Record<string, unknown>, key: UserKey) {
  const messages: { role: string; content: unknown }[] = [];
  const format = (body["text"] as { format?: { type?: string; name?: string; schema?: object } } | undefined)?.format;
  let system = typeof body["instructions"] === "string" ? (body["instructions"] as string) : "";
  if (format?.type === "json_schema") system += `\nResponda SOMENTE com um JSON válido (sem markdown) que siga exatamente este JSON Schema:\n${JSON.stringify(format.schema)}`;
  if (system) messages.push({ role: "system", content: system });
  const input = body["input"];
  if (typeof input === "string") messages.push({ role: "user", content: input });
  else if (Array.isArray(input)) for (const m of input as { role?: string; content?: unknown }[]) messages.push({ role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user", content: convertContent(m.content) });
  const out: Record<string, unknown> = { model: key.model, messages, stream: true, stream_options: { include_usage: true } };
  if (format?.type === "json_schema" && key.provider === "gemini") out["response_format"] = { type: "json_schema", json_schema: { name: format.name ?? "out", schema: format.schema } };
  if (key.provider === "anthropic") out["max_tokens"] = 8000;
  return out;
}

/** Converts Chat Completions SSE into the minimal Responses events our callers read (text deltas + final usage). */
export function chatToResponsesStream(source: ReadableStream<Uint8Array>) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const reader = source.getReader();
  let buffer = "";
  let usage: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } } | null = null;
  const emit = (obj: unknown) => enc.encode(`data: ${JSON.stringify(obj)}\n\n`);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(emit({ type: "response.completed", response: { usage: usage ? {
          input_tokens: usage.prompt_tokens ?? null, output_tokens: usage.completion_tokens ?? null,
          output_tokens_details: { reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? null } } : null } }));
        controller.close();
        return;
      }
      buffer += dec.decode(value, { stream: true });
      const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.usage) usage = ev.usage;
          const delta = ev.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) controller.enqueue(emit({ type: "response.output_text.delta", delta }));
          if (ev.error) controller.enqueue(emit({ type: "error" }));
        } catch { /* ignore partial */ }
      }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
}
