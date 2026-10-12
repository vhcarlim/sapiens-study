import { useEffect, useRef, useState } from "react";
import { Award, Check, Flame, Settings2, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_DAILY_GOAL } from "@/lib/gamification";
import { minutesUntilStudyMidnight } from "@/lib/study-day";
import { supabase } from "@/integrations/supabase/client";

export function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; }
    const start = performance.now();
    let frame = 0;
    const update = (time: number) => {
      const progress = Math.min(1, (time - start) / 850);
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <span className="inline-block tabular-nums" key={value}><span className="xp-counter inline-block">{display.toLocaleString("pt-BR")}</span></span>;
}
export function NeonProgress({ progress, label }: { progress: number; label: string }) {
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="h-2 overflow-hidden rounded-full bg-secondary"><div className="neon-progress h-full rounded-full bg-primary transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }} /></div>;
}
export function RewardOverlay({ trackId }: { trackId: string }) {
  const [reward, setReward] = useState<{ xp: number; title: string; id: number } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let audio: AudioContext | undefined;
    let soundEnabled = false;
    void supabase.auth.getUser().then(({ data }) => { if (data.user) { try { soundEnabled = localStorage.getItem(`sapiens:sound:${data.user.id}:${trackId}`)==="true"; } catch { /* optional */ } } });
    const soundChange = (event: Event) => { const detail = (event as CustomEvent<{ trackId: string; enabled: boolean }>).detail; if (detail.trackId === trackId) soundEnabled = detail.enabled; };
    const onReward = (event: Event) => {
      const detail = (event as CustomEvent<{ trackId: string; xp: number; title: string }>).detail;
      if (detail.trackId !== trackId) return;
      clearTimeout(timer);
      if (soundEnabled) {
        try {
          audio ??= new AudioContext();
          void audio.resume().then(() => {
            if (!audio) return;
            const start = audio.currentTime;
            [880,1320].forEach((frequency,i) => { if (!audio) return; const tone=audio.createOscillator(); const gain=audio.createGain(); tone.frequency.value=frequency; gain.gain.setValueAtTime(0.035,start+i*0.08); gain.gain.exponentialRampToValueAtTime(0.001,start+0.35+i*0.08); tone.connect(gain); gain.connect(audio.destination); tone.start(start+i*0.08); tone.stop(start+0.4+i*0.08); });
          }).catch(() => {});
        } catch { /* Audio is optional and cannot block a reward. */ }
      }
      setReward({ ...detail, id: Date.now() });
      timer = setTimeout(() => setReward(null), 4500);
    };
    window.addEventListener("sapiens:reward", onReward);
    window.addEventListener("sapiens:sound", soundChange);
    return () => { clearTimeout(timer); window.removeEventListener("sapiens:reward", onReward); window.removeEventListener("sapiens:sound",soundChange); void audio?.close(); };
  }, [trackId]);
  if (!reward) return null;
  return <div key={reward.id} role="status" className="reward-burst fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-4 rounded-lg border border-primary bg-popover p-5 shadow-lg">
    <Trophy className="size-10 shrink-0 text-primary" />
    <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{reward.title}</p><p className="font-mono text-3xl font-bold text-primary">+<AnimatedNumber value={reward.xp} /> <span className="text-sm">XP</span></p></div>
    <Button size="icon-sm" variant="ghost" aria-label="Fechar recompensa" onClick={() => setReward(null)}><X /></Button>
  </div>;
}
export function DailyQuest({ xp, streak, storageKey, now }: { xp: number; streak: number; storageKey: string; now: Date }) {
  const [goal, setGoal] = useState(DEFAULT_DAILY_GOAL);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(DEFAULT_DAILY_GOAL));
  useEffect(() => {
    try { const saved = Number(localStorage.getItem(storageKey)); if (saved >= 10 && saved <= 10000) { setGoal(saved); setDraft(String(saved)); } } catch { /* Preferences are optional. */ }
  }, [storageKey]);
  const done = xp >= goal;
  const minutesLeft = minutesUntilStudyMidnight(now);
  function save() {
    const value = Number(draft);
    if (!Number.isInteger(value) || value < 10 || value > 10000) return;
    setGoal(value); setEditing(false);
    try { localStorage.setItem(storageKey, String(value)); } catch { /* Keep usable without storage. */ }
  }
  return <section className="grid gap-6 border-y border-border py-6 sm:grid-cols-[auto_1fr]">
    <div className="flex items-center gap-3 sm:border-r sm:pr-8"><Flame className={cn("size-12 text-warning", streak > 0 && "streak-flame")} /><div><p className="font-mono text-3xl font-bold"><AnimatedNumber value={streak} /> <span className="text-sm font-normal text-muted-foreground">dias</span></p><p className="text-sm text-muted-foreground">Ofensiva de estudos</p></div></div>
    <div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-semibold">{done ? <Check className="size-4 text-primary" /> : <Award className="size-4 text-primary" />}{done ? "Missão diária cumprida" : "Missão diária"}</h2><div className="flex items-center gap-2"><span className="font-mono text-sm"><AnimatedNumber value={xp} /> / {goal} XP</span><Button size="icon-sm" variant="ghost" title="Ajustar meta diária" aria-label="Ajustar meta diária" onClick={() => setEditing(!editing)}><Settings2 /></Button></div></div>
    <NeonProgress progress={xp / goal} label="Meta diária de XP" />
    {editing ? <form onSubmit={e => { e.preventDefault(); save(); }} className="flex items-center gap-2"><Input aria-label="Meta diária em XP" type="number" min={10} max={10000} step={1} value={draft} onChange={e => setDraft(e.target.value)} className="w-28" /><Button size="sm" type="submit">Salvar meta</Button></form> : <p className="text-xs text-muted-foreground">{done ? "Mais um dia de evolução. Missão renovada à meia-noite." : `${Math.max(0, goal - xp)} XP restantes · ${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}min até meia-noite`}</p>}
    </div>
  </section>;
}