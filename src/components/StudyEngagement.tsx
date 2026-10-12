import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, ArrowRight, ShieldCheck, Swords, Trophy, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { threadsQuery } from "@/lib/reviews";
import { reviewEligible, STUDY_TIME_ZONE, studyDay } from "@/lib/study-day";
import { canProtect, FREEZE_COST, MONTHLY_FREEZE_LIMIT, protectionQuery } from "@/lib/engagement";
import { supabase } from "@/integrations/supabase/client";
import type { Activity } from "@/lib/data";
import type { SkillProgress } from "@/lib/gamification";
import type { Tables } from "@/integrations/supabase/types";

export function PriorityMission({ trackId, activities, now }: { trackId: string; activities: Activity[]; now: Date }) {
  const { data: threads = [], error } = useQuery(threadsQuery(trackId));
  const eligible = threads.filter(t => activities.some(a => a.id === t.activity_id && reviewEligible(a.knowledge_summary)));
  const ready = eligible.filter(t => t.question_open || new Date(t.next_review_at).getTime() <= now.getTime());
  const next = eligible.find(t => new Date(t.next_review_at).getTime() > now.getTime());
  const first = ready[0];
  const names = ready.slice(0,2).map(t => activities.find(a => a.id === t.activity_id)?.title).filter(Boolean).join(" · ");
  const minutes = next ? Math.max(1,Math.ceil((new Date(next.next_review_at).getTime()-now.getTime())/60000)) : 0;
  return <section aria-label="Missão prioritária" className="flex flex-wrap items-center justify-between gap-5 border-l-2 border-track-accent bg-secondary/40 px-5 py-5">
    <div className="flex min-w-0 flex-1 items-start gap-4"><Swords className="mt-1 size-7 shrink-0 text-track-accent" /><div className="min-w-0"><p className="font-mono text-xs text-track-accent">MISSÃO PRIORITÁRIA</p><h2 className="mt-1 text-lg font-semibold">{error ? "Revisões indisponíveis no momento" : first ? `${ready.length} arguição${ready.length>1 ? "ões" : ""} pronta${ready.length>1 ? "s" : ""} para praticar` : "Seu domínio está em dia"}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{first ? names : next ? `Próxima missão em ${Math.floor(minutes/60)}h ${minutes%60}min · ${new Date(next.next_review_at).toLocaleDateString("pt-BR", { timeZone: STUDY_TIME_ZONE })}` : "Nenhuma arguição pendente"}</p></div></div>
    {first ? <Button asChild><Link to="/arguicao/$threadId" params={{ threadId: first.id }}>{first.question_open ? "Continuar arguição" : "Defender meu domínio"}<ArrowRight className="size-4" /></Link></Button> : <Button variant="outline" asChild><Link to="/review">Ver revisões<ArrowRight className="size-4" /></Link></Button>}
  </section>;
}

export function StreakProtection({ trackId, activities, results, now }: { trackId: string; activities: Activity[]; results: Tables<"review_results">[]; now: Date }) {
  const qc = useQueryClient();
  const { data: state, error } = useQuery(protectionQuery(trackId));
  const [busy,setBusy] = useState(false);
  const available = !!state && canProtect(state,activities,results,now);
  async function purchase() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("purchase_streak_freeze", { p_track: trackId });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["streak-protection",trackId] });
      toast.success("Ontem protegido. Sua ofensiva continua!");
    } catch(e) { toast.error(e && typeof e === "object" && "message" in e ? String(e.message) : "Não foi possível resgatar o protetor"); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
    <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-track-accent" /><div><p className="text-sm font-semibold">Protetor de ofensiva</p><p className="text-xs text-muted-foreground">{error ? "Saldo indisponível" : `${state?.balance ?? "…"} XP disponíveis · ${state?.used ?? 0}/${MONTHLY_FREEZE_LIMIT} resgates neste mês`}</p></div></div>
    <Button variant="outline" size="sm" disabled={!available || busy} onClick={purchase} title="Protege o dia de ontem sem estudos, preservando uma ofensiva recente. Não adiciona XP nem dias estudados.">{busy ? "Resgatando…" : `Proteger ontem · ${FREEZE_COST} XP`}</Button>
  </div>;
}

export function TrophyShelf({ activities, skills }: { activities: Activity[]; skills: SkillProgress[] }) {
  const trophies = [
    ...activities.filter(a => a.type === "certificate").map(a => ({ id: a.id, name: a.title, detail: `Diploma · ${new Date(`${a.date}T12:00:00`).toLocaleDateString("pt-BR")}`, mastery: false })),
    ...skills.filter(s => s.level === 10).map(s => ({ id: s.id, name: s.name, detail: "Maestria · Nível 10", mastery: true })),
  ];
  return <section className="border-t pt-5"><div className="mb-4 flex items-center gap-2"><Trophy className="size-5 text-warning" /><h2 className="font-semibold">Insígnias e Diplomas</h2><span className="ml-auto font-mono text-xs text-muted-foreground">{trophies.length} conquistas</span></div>
    {trophies.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{trophies.map(t => <article key={t.id} className="flex items-center gap-4 rounded-lg border bg-card p-5">{t.mastery ? <Trophy className="size-9 shrink-0 text-warning" /> : <Award className="size-9 shrink-0 text-track-accent" />}<div className="min-w-0"><h3 className="break-words text-sm font-semibold">{t.name}</h3><p className="mt-1 text-xs text-muted-foreground">{t.detail}</p></div></article>)}</div> : <p className="text-sm text-muted-foreground">Seus certificados e competências no nível 10 terão lugar aqui.</p>}
  </section>;
}

export function SoundToggle({ userId, trackId }: { userId: string; trackId: string }) {
  const key = `sapiens:sound:${userId}:${trackId}`;
  const [enabled,setEnabled] = useState(false);
  useEffect(() => { try { setEnabled(localStorage.getItem(key)==="true"); } catch { /* optional */ } }, [key]);
  return <Button variant="ghost" size="icon-sm" role="switch" aria-checked={enabled} aria-label="Som de recompensas" title={enabled ? "Desativar som de recompensas" : "Ativar som de recompensas"} onClick={() => { const value = !enabled; setEnabled(value); try { localStorage.setItem(key,String(value)); } catch { /* optional */ } window.dispatchEvent(new CustomEvent("sapiens:sound",{ detail: { trackId,enabled:value } })); }}>{enabled ? <Volume2 /> : <VolumeX />}</Button>;
}