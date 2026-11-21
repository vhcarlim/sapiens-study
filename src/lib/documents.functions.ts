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