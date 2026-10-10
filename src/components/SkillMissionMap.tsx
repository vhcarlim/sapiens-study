import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, LockKeyhole, Map, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { NeonProgress, AnimatedNumber } from "@/components/Gamification";
import { missionStates, type SkillProgress } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export function SkillMissionMap({ skills, storageKey }: { skills: SkillProgress[]; storageKey: string }) {
  const [enabled, setEnabled] = useState(false);
  const [order, setOrder] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null"); if (saved) { setEnabled(saved.enabled === true); setOrder(Array.isArray(saved.order) ? saved.order.filter((id: unknown) => typeof id === "string") : []); } } catch { /* Optional view preference. */ }
  }, [storageKey]);
  function persist(nextEnabled: boolean, nextOrder: string[]) {
    setEnabled(nextEnabled); setOrder(nextOrder);
    try { localStorage.setItem(storageKey, JSON.stringify({ enabled: nextEnabled, order: nextOrder })); } catch { /* View remains usable. */ }
  }
  const ids = [...order.filter(id => skills.some(s => s.id === id)), ...skills.filter(s => !order.includes(s.id)).map(s => s.id)];
  const missions = missionStates(ids.flatMap(id => { const skill = skills.find(s => s.id === id); return skill ? [skill] : []; }));
  const active = missions.find(s => s.id === selected) ?? missions.find(s => s.unlocked && !s.completed) ?? missions[0];
  function move(index: number, direction: number) {
    const next = [...ids]; const other = next[index + direction]; const current = next[index];
    if (!other || !current) return;
    next[index] = other; next[index + direction] = current; persist(enabled, next);
  }
  return <section className="space-y-5 border-t border-border pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><Map className="size-5 text-primary" />Mapa de maestria</h2><Button variant={enabled ? "secondary" : "outline"} size="sm" role="switch" aria-checked={enabled} onClick={() => persist(!enabled, ids)}>{enabled ? "Mapa ativado" : "Ativar mapa"}</Button></div>
    {enabled && (!missions.length ? <Button asChild variant="outline"><Link to="/skills">Adicionar competências</Link></Button> : <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <ol className="mission-path grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
        {missions.map((s, i) => <li key={s.id} className="relative flex min-h-36 items-center gap-3 py-4">
          <Button variant="outline" aria-label={`Missão ${i + 1}: ${s.name}`} aria-pressed={active?.id === s.id} onClick={() => setSelected(s.id)} className={cn("mission-node relative size-14 shrink-0 rounded-full border-2 p-0", s.completed ? "border-primary bg-primary text-primary-foreground" : s.unlocked ? "border-primary text-primary" : "border-border text-muted-foreground", active?.id === s.id && "ring-2 ring-primary/30 ring-offset-4 ring-offset-background")}>
            {s.completed ? <Check /> : !s.unlocked ? <LockKeyhole /> : <Sparkles />}
          </Button>
          <div className="min-w-0 flex-1"><p className="font-mono text-[10px] text-muted-foreground">MISSÃO {String(i + 1).padStart(2, "0")}</p><p className="break-words text-sm font-semibold">{s.name}</p><p className="mt-1 font-mono text-xs text-primary">NV {s.level} · {s.mastery}% domínio</p><p className="mt-1 text-[10px] text-muted-foreground">{s.completed ? "Dominada" : s.unlocked ? "Em exploração" : `Requer 70% em ${missions[i - 1]?.name}`}</p></div>
          <div className="flex shrink-0 flex-col"><Button size="icon-xs" variant="ghost" disabled={i === 0} title="Mover missão para antes" aria-label={`Mover ${s.name} para antes`} onClick={() => move(i, -1)}><ArrowUp /></Button><Button size="icon-xs" variant="ghost" disabled={i === missions.length - 1} title="Mover missão para depois" aria-label={`Mover ${s.name} para depois`} onClick={() => move(i, 1)}><ArrowDown /></Button></div>
        </li>)}
      </ol>
      {active && <div className="space-y-4 border-l-2 border-primary pl-5"><p className="font-mono text-xs text-primary">{active.completed ? "MISSÃO DOMINADA" : active.unlocked ? "MISSÃO ATUAL" : "PRÓXIMA FRONTEIRA"}</p><h3 className="break-words text-xl font-semibold">{active.name}</h3><p className="text-sm">Nível {active.level} / 10 · {active.name && active.level ? skills.find(s => s.id === active.id)?.name && active.name : ""}</p><p className="font-mono text-xl text-primary"><AnimatedNumber value={active.xp} /> XP</p><NeonProgress progress={active.progress} label={`Progresso de ${active.name}`} /><p className="text-xs text-muted-foreground">{active.maxed ? "Maestria máxima alcançada" : `${active.xpToNext} XP para o nível ${active.level + 1}`}</p><p className="text-sm text-muted-foreground">Domínio avaliado: {active.mastery}% · alvo: 70%</p><Button asChild variant="outline" size="sm"><Link to="/review">Ir à arguição</Link></Button></div>}
    </div>)}
  </section>;
}