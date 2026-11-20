import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
export default defineTool({
  name: "list_track_skills", title: "Consultar competências da trilha",
  description: "Lista matérias e tópicos da trilha selecionada, incluindo suas competências compartilhadas.",
  inputSchema: { track_id: z.string().uuid().describe("ID da trilha retornado por list_study_tracks.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ track_id }, ctx) => {
    const db = supabaseForUser(ctx);
    const { data: track, error: trackError } = await db.from("study_tracks").select("id").eq("id", track_id).eq("user_id", ctx.getUserId()).maybeSingle();
    if (trackError || !track) throw new ToolError("Trilha indisponível nesta conta.");
    const { data, error } = await db.from("skills").select("id,name,topics,shared,track_id").eq("user_id", ctx.getUserId()).or(`track_id.eq.${track_id},shared.eq.true`).order("name").limit(100);
    if (error) throw new ToolError("Não foi possível consultar as competências.");
    return { content: [{ type: "text", text: JSON.stringify(data ?? []) }] };
  },
});