import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  text: z.string().trim().min(1).max(30000),
  source_id: z.string().uuid().nullable(),
  default_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const TYPES = ["lesson", "room", "course", "certificate", "level", "other"];

/** Sends pasted raw history to the AI, creates pending activities for review. */
export const importPastedText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("IA não configurada");

    const [{ data: skills }, { data: source }] = await Promise.all([
      supabase.from("skills").select("id,name"),
      data.source_id
        ? supabase.from("sources").select("name").eq("id", data.source_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const skillNames = (skills ?? []).map((s) => s.name);

    const system = `Você extrai atividades de estudo de textos colados (históricos, listas de aulas, JSON, CSV) de plataformas como ${source?.name ?? "Alura, Coursera, TryHackMe, PortSwigger, Duolingo"}.
Regras: uma atividade por item concluído (ou agrupe itens idênticos no mesmo dia usando quantity). Datas em YYYY-MM-DD; se ausente use ${data.default_date}. Datas relativas ("há 2 dias") calcule a partir de ${data.default_date}.
minutes: use a duração informada; se ausente, estime de forma conservadora (aula ~10, sala/lab ~45, curso inteiro: duração informada ou 0). xp: só se informado, senão 0. Ignore menus, navegação e texto irrelevante.
skills: escolha só dentre [${skillNames.join(", ")}]. Títulos curtos mantendo nomes originais das aulas. notes: null se nada relevante. Responda no máximo 200 atividades.`;

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["activities"],
      properties: {
        activities: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "date", "type", "quantity", "minutes", "xp", "skills", "notes"],
            properties: {
              title: { type: "string" },
              date: { type: "string" },
              type: { type: "string", enum: TYPES },
              quantity: { type: "integer" },
              minutes: { type: "integer" },
              xp: { type: "integer" },
              skills: { type: "array", items: { type: "string" } },
              notes: { type: ["string", "null"] },
            },
          },
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: system,
        input: [{ role: "user", content: data.text }],
        text: { format: { type: "json_schema", name: "activities", strict: true, schema } },
      }),
    });
    if (res.status === 429) throw new Error("Muitas requisições, tente em instantes.");
    if (res.status === 402) throw new Error("Créditos de IA esgotados.");
    if (!res.ok || !res.body) {
      console.error("AI error", res.status, await res.text());
      throw new Error("Falha ao interpretar o texto.");
    }

    // Consume the SSE stream, accumulating output text.
    let out = "";
    let finalText = "";
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type?: string; delta?: string; text?: string; response?: { error?: unknown } };
          if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
          else if (ev.type === "response.output_text.done" && ev.text) finalText = ev.text;
          else if (ev.type === "response.failed" || ev.type === "error") {
            console.error("AI stream error", payload);
            throw new Error("Falha ao interpretar o texto.");
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith("Falha")) throw e;
        }
      }
    }

    let items: {
      title: string; date: string; type: string; quantity: number; minutes: number;
      xp?: number; skills?: string[]; notes?: string | null;
    }[] = [];
    try {
      items = JSON.parse(finalText || out).activities ?? [];
    } catch {
      throw new Error("A IA devolveu um formato inválido.");
    }
    items = items.slice(0, 200);
    if (!items.length) return { count: 0 };

    const clampInt = (n: unknown, max: number) => Math.min(max, Math.max(0, Math.round(Number(n) || 0)));
    const rows = items.map((a) => ({
      title: String(a.title).slice(0, 200) || "Atividade importada",
      date: /^\d{4}-\d{2}-\d{2}$/.test(a.date) ? a.date : data.default_date,
      type: TYPES.includes(a.type) ? a.type : "other",
      quantity: clampInt(a.quantity, 10000) || 1,
      minutes: clampInt(a.minutes, 100000),
      xp: clampInt(a.xp, 10000000),
      notes: ["Importado por texto colado", a.notes].filter(Boolean).join(" · ").slice(0, 2000),
      source_id: data.source_id,
      status: "pending",
    }));
    const { data: inserted, error } = await supabase.from("activities").insert(rows).select("id");
    if (error) throw new Error("Não foi possível salvar as atividades.");

    const byName = new Map((skills ?? []).map((s) => [s.name.toLowerCase(), s.id]));
    const links = inserted.flatMap((row, i) =>
      [...new Set((items[i]?.skills ?? []).map((n) => byName.get(String(n).toLowerCase())).filter(Boolean))].map(
        (skill_id) => ({ activity_id: row.id, skill_id: skill_id! }),
      ),
    );
    if (links.length) await supabase.from("activity_skills").insert(links);
    return { count: inserted.length };
  });
