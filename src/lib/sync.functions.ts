import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

type NewActivity = {
  title: string;
  type: string;
  quantity: number;
  minutes: number;
  xp: number;
  external_key: string;
  notes?: string;
  skill?: string;
};

async function readDuolingo(username: string) {
  const url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}&fields=users,username,streak,totalXp,courses`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Duolingo respondeu ${res.status}`);
  const json = (await res.json()) as {
    users?: { totalXp?: number; streak?: number; courses?: { id: string; title: string; xp: number }[] }[];
  };
  const u = json.users?.[0];
  if (!u) throw new Error("Usuário do Duolingo não encontrado (o perfil precisa ser público).");
  const courses: Record<string, { title: string; xp: number }> = {};
  for (const c of u.courses ?? []) courses[c.id] = { title: c.title, xp: c.xp };
  return { totalXp: u.totalXp ?? 0, streak: u.streak ?? 0, courses };
}

type DuoSnap = Awaited<ReturnType<typeof readDuolingo>>;

function diffDuolingo(prev: DuoSnap, next: DuoSnap, today: string): NewActivity[] {
  const out: NewActivity[] = [];
  for (const [id, c] of Object.entries(next.courses)) {
    const before = prev.courses?.[id]?.xp ?? 0;
    const gained = c.xp - before;
    if (gained <= 0) continue;
    out.push({
      title: `+${gained} XP em ${c.title}`,
      type: "lesson",
      quantity: Math.max(1, Math.round(gained / 15)),
      minutes: Math.max(1, Math.round(gained * 0.25)),
      xp: gained,
      external_key: `duo:${id}:${c.xp}:${today}`,
      notes: `Estimativa: ~1 lição a cada 15 XP. Ajuste os minutos se quiser.`,
      skill: "Idiomas",
    });
  }
  return out;
}

async function readTryHackMe(username: string) {
  const headers = { "User-Agent": UA, Accept: "application/json" };
  const res = await fetch(
    `https://tryhackme.com/api/v2/public-profile/completed-rooms?username=${encodeURIComponent(username)}&limit=100&page=1`,
    { headers },
  );
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      "O TryHackMe bloqueou a leitura automática do perfil público. Registre suas salas manualmente por enquanto.",
    );
  }
  const root = json as { data?: { docs?: unknown[] } | unknown[] };
  const list = (Array.isArray(root.data) ? root.data : (root.data?.docs ?? [])) as {
    code?: string;
    title?: string;
    roomCode?: string;
  }[];
  const rooms: Record<string, string> = {};
  for (const r of list) {
    const code = r.code ?? r.roomCode;
    if (code) rooms[code] = r.title ?? code;
  }
  return { rooms };
}

type ThmSnap = Awaited<ReturnType<typeof readTryHackMe>>;

function diffTryHackMe(prev: ThmSnap, next: ThmSnap): NewActivity[] {
  return Object.entries(next.rooms)
    .filter(([code]) => !prev.rooms?.[code])
    .map(([code, title]) => ({
      title: `Sala concluída: ${title}`,
      type: "room",
      quantity: 1,
      minutes: 60,
      xp: 0,
      external_key: `thm:${code}`,
      notes: "Tempo estimado em 60 min. Ajuste antes de aprovar.",
    }));
}

export const syncSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ sourceId: z.string().uuid(), today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: source, error } = await supabase
      .from("sources")
      .select("*")
      .eq("id", data.sourceId)
      .single();
    if (error || !source) return { ok: false, message: "Fonte não encontrada", created: 0 };
    if (!source.username) return { ok: false, message: "Informe o nome de usuário público primeiro.", created: 0 };
    if (source.kind !== "duolingo" && source.kind !== "tryhackme")
      return { ok: false, message: "Esta fonte é manual.", created: 0 };

    const { data: snapRow } = await supabase
      .from("import_snapshots")
      .select("data")
      .eq("source_id", source.id)
      .maybeSingle();
    const prev = snapRow?.data as Record<string, unknown> | undefined;

    let next: DuoSnap | ThmSnap;
    let items: NewActivity[] = [];
    try {
      if (source.kind === "duolingo") {
        next = await readDuolingo(source.username);
        if (prev) items = diffDuolingo(prev as DuoSnap, next, data.today);
      } else {
        next = await readTryHackMe(source.username);
        if (prev) items = diffTryHackMe(prev as ThmSnap, next);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha ao ler o perfil";
      console.error("sync failed", source.kind, message);
      await supabase.from("sources").update({ last_sync_error: message }).eq("id", source.id);
      return { ok: false, message, created: 0 };
    }

    let created = 0;
    if (items.length) {
      const { data: skills } = await supabase.from("skills").select("id,name");
      for (const it of items) {
        const { skill, ...row } = it;
        const { data: ins, error: insErr } = await supabase
          .from("activities")
          .insert({ ...row, source_id: source.id, date: data.today, status: "pending", user_id: userId })
          .select("id")
          .single();
        if (insErr || !ins) continue;
        created++;
        const sk = skills?.find((s) => s.name === skill);
        if (sk) await supabase.from("activity_skills").insert({ activity_id: ins.id, skill_id: sk.id });
      }
    }

    await supabase
      .from("import_snapshots")
      .upsert({ source_id: source.id, user_id: userId, data: next as never, updated_at: new Date().toISOString() });
    await supabase
      .from("sources")
      .update({ last_synced_at: new Date().toISOString(), last_sync_error: null })
      .eq("id", source.id);

    return {
      ok: true,
      created,
      message: !prev
        ? "Ponto de partida salvo. A partir da próxima sincronização, o que mudar vira atividade para revisão."
        : created
          ? `${created} atividade(s) aguardando revisão.`
          : "Nada novo desde a última leitura.",
    };
  });
