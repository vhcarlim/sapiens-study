import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
export default defineTool({
  name: "list_study_tracks", title: "Consultar trilhas de estudo",
  description: "Lista as trilhas da sua conta, incluindo banca, data da prova e arquivamento.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const db = supabaseForUser(ctx);
    const { data, error } = await db.from("study_tracks").select("id,name,exam_board,exam_date,archived").eq("user_id", ctx.getUserId()).order("position").limit(100);
    if (error) throw new ToolError("Não foi possível consultar suas trilhas.");
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
  },
});