import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
export default defineTool({
  name: "read_memory_notebook", title: "Consultar Caderno de Memória",
  description: "Consulta os aprendizados de uma trilha da sua conta, com filtros por tipo e favoritos e paginação.",
  inputSchema: {
    track_id: z.string().uuid().describe("ID da trilha retornado por list_study_tracks."),
    kind: z.enum(["rule", "trap", "mistake", "chat", "note"]).optional().describe("Filtrar tipo de aprendizado."),
    starred_only: z.boolean().default(false).describe("Mostrar somente favoritos."),
    offset: z.number().int().min(0).max(10000).default(0).describe("Quantidade de registros a pular para paginação."),
    limit: z.number().int().min(1).max(30).default(20).describe("Máximo de aprendizados retornados, de 1 a 30."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ track_id, kind, starred_only, offset, limit }, ctx) => {
    const db = supabaseForUser(ctx);
    let query = db.from("study_learnings").select("id,skill_id,topic,kind,title,detail,starred,created_at").eq("user_id", ctx.getUserId()).eq("track_id", track_id);
    if (kind) query = query.eq("kind", kind);
    if (starred_only) query = query.eq("starred", true);
    const { data, error } = await query.order("created_at", { ascending: false }).order("id").range(offset, offset + limit - 1);
    if (error) throw new ToolError("Não foi possível consultar o caderno.");
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
  },
});