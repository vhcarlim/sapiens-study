import { createFileRoute } from "@tanstack/react-router";
import { CANONICAL_SUBJECTS, originLabel } from "@/lib/subjects";
import { bankKeys, decide, IngestBody, IngestQuestion, safeEqual, toPayload } from "@/lib/question-ingest";

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Ingests enriched official exam questions from the owner's Colab script into the shared bank. */
export const Route = createFileRoute("/api/public/question-bank")({
  server: {
    handlers: {
      // Public, non-sensitive: the canonical subject list the Colab importer must classify into.
      GET: async () => json({ subjects: CANONICAL_SUBJECTS }),
      POST: async ({ request }) => {
        const secret = process.env['QUESTION_INGEST_TOKEN'];
        if (!secret || secret.length < 24) return json({ error: "Ingestão desativada no servidor" }, 403);
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!token || !safeEqual(token, secret)) return json({ error: "Não autorizado" }, 401);

        const raw = await request.text();
        if (raw.length > 2_000_000) return json({ error: "Lote grande demais (máx. 50 questões)" }, 413);
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { return json({ error: "JSON inválido" }, 400); }
        const body = IngestBody.safeParse(parsed);
        if (!body.success) return json({ error: "Envie { questions: [...] } com 1 a 50 itens" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: { index: number; status: "inserted" | "replaced" | "skipped_duplicate" | "invalid" | "error"; id?: string; detail?: string }[] = [];

        for (const [index, item] of body.data.questions.entries()) {
          const q = IngestQuestion.safeParse(item);
          if (!q.success) { results.push({ index, status: "invalid", detail: q.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 500) }); continue; }
          const keys = bankKeys(q.data);
          if (!keys) { results.push({ index, status: "invalid", detail: `subject: "${q.data.subject.slice(0, 80)}" fora da lista oficial (GET neste endereço)` }); continue; }
          const origin_label = originLabel(q.data.board, q.data.origin);
          const payload = toPayload(q.data);
          try {
            const { data: existing, error } = await supabaseAdmin.from("question_bank").select("id,payload")
              .eq("board_key", keys.board_key).eq("subject_key", keys.subject_key).limit(5000);
            if (error) throw error;
            const d = decide(payload, (existing ?? []).map((r) => ({ id: r.id, payload: r.payload as never })));
            if (d.action === "skip") { results.push({ index, status: "skipped_duplicate", id: d.id }); continue; }
            if (d.action === "replace") {
              const { error: e } = await supabaseAdmin.from("question_bank").update({ ...keys, fingerprint: payload.fingerprint, payload: payload as never, source: "official_exam", origin_label, status: "pending" }).eq("id", d.id);
              if (e) throw e;
              results.push({ index, status: "replaced", id: d.id });
              continue;
            }
            const { data: row, error: e } = await supabaseAdmin.from("question_bank").insert({ ...keys, fingerprint: payload.fingerprint, payload: payload as never, source: "official_exam", created_by: null, origin_label, status: "pending" }).select("id").single();
            if (e) throw e;
            results.push({ index, status: "inserted", id: row.id });
          } catch (e) {
            console.error("question ingest failed", (e as Error)?.message);
            results.push({ index, status: "error", detail: "Falha ao gravar no banco" });
          }
        }
        const count = (s: string) => results.filter((r) => r.status === s).length;
        return json({ inserted: count("inserted"), replaced: count("replaced"), skipped: count("skipped_duplicate"), invalid: count("invalid"), errors: count("error"), results });
      },
    },
  },
});
