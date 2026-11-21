import { streamResponse, type ResponsesInputItem } from "@lovable.dev/ai-gateway";
import { z } from "zod";
import { ModelSchema, EffortSchema } from "@/lib/ai-settings";
const content = z.union([
  z.object({ type: z.literal("input_text"), text: z.string() }),
  z.object({ type: z.literal("input_image"), image_url: z.string(), detail: z.enum(["auto", "low", "high"]).optional() }),
]);
const request = z.object({
  model: ModelSchema, instructions: z.string(),
  input: z.union([z.string(), z.array(z.object({ role: z.enum(["user", "assistant", "system", "developer"]), content: z.union([z.string(), z.array(content)]) }))]),
  reasoning: z.object({ effort: EffortSchema }),
  text: z.object({ format: z.object({ type: z.literal("json_schema"), name: z.string(), strict: z.boolean(), schema: z.record(z.unknown()) }) }).optional(),
});
/** Tracked fetch resolves preferences/BYOK first; only Gateway-bound requests enter the SDK. */
export const gatewayTransport: typeof fetch = async (_input, init) => {
  if (typeof init?.body !== "string") throw new Error("Pedido de IA inválido");
  const payload = request.parse(JSON.parse(init.body));
  const input: string | ResponsesInputItem[] = typeof payload.input === "string" ? payload.input : payload.input.map((message): ResponsesInputItem => {
    if (typeof message.content === "string") return { role: message.role, content: message.content };
    if (message.role === "assistant") return { role: "assistant", content: message.content.map((part) => part.type === "input_text" ? part.text : "[imagem]").join("\n") };
    return { role: message.role, content: message.content.map((part) => part.type === "input_text" ? part : { type: "input_image" as const, image_url: part.image_url, detail: part.detail ?? "auto" }) };
  });
  const fields = { instructions: payload.instructions, input, reasoning: payload.reasoning, ...(payload.text ? { text: payload.text } : {}) };
  const options = { maxRetries: 0, ...(init.signal ? { signal: init.signal } : {}) };
  const stream = payload.model === "openai/gpt-6-astra" ? await streamResponse({ ...fields, model: "openai/gpt-6-astra" }, options)
    : payload.model === "openai/gpt-5.4" ? await streamResponse({ ...fields, model: "openai/gpt-5.4" }, options)
    : await streamResponse({ ...fields, model: "openai/gpt-5.4-mini" }, options);
  return stream.toResponse();
};