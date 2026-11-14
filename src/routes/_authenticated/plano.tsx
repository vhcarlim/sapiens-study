import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarRange, ChevronLeft, ChevronRight, CheckCircle2, Circle, Pin, EyeOff, Sparkles, Swords, Inbox, FileText, Plane, BookOpen, Target, RotateCcw, Shuffle, Hourglass, Download, MoreHorizontal, Scale, History } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fmtMinutes } from "@/lib/data";
import { fmtNum } from "@/lib/exam-rules";
import { shiftStudyDay } from "@/lib/study-day";
import { useStudyPlan } from "@/components/StudyPlanCard";
import { extraMinutesPerWeek, studyBalance, weekAdherence, weekToIcs, type DayAdjust, type PlanBlock, type PlanDay } from "@/lib/study-plan";
import { capacityMinutes, daysBetween, neededMinutes, PHASE_INFO, phaseFor, phaseTimeline, projectCoverage, syllabusCoverage, WEEKDAYS, weekStartOf, type PlanPhase } from "@/lib/study-plan";
import { commentStudyPlan } from "@/lib/study-plan.functions";

const TITLE = "Plano de estudos — Sapiens Study";
const DESC = "Plano de voo até a prova: semana calibrada pelo peso do edital, seu domínio e sua disponibilidade.";
export const Route = createFileRoute("/_authenticated/plano")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PlanPage,
});

const PHASE_TONE: Record<PlanPhase, string> = { base: "bg-track-accent/30", deep: "bg-track-accent/60", final: "bg-track-accent" };
const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });

function PlanPage() {
  const [weekStart, setWeekStart] = useState(() => weekStartOf(new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })));
  const plan = useStudyPlan(weekStart);
  const { trackId, track, today, week, weekly, skills, planActs, points, overrides, loading } = plan;
  const qc = useQueryClient();
  const daysLeft = track?.exam_date ? daysBetween(today, track.exam_date) : null;
  const phase = phaseFor(daysLeft);
  const coverage = useMemo(() => syllabusCoverage(skills, planActs, points).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)), [skills, planActs, points]);
  const proj = useMemo(() => projectCoverage(skills, planActs, today, daysLeft ?? 0), [skills, planActs, today, daysLeft]);
  const capacity = daysLeft != null && daysLeft > 0 ? capacityMinutes(weekly, today, track!.exam_date!) : null;
  const need = neededMinutes(coverage);
  const maxPts = Math.max(1, ...coverage.map((c) => c.points));
  const pinned = overrides?.pinned ?? [];
  const skipped = overrides?.skipped ?? [];

  async function setOverride(skillId: string, kind: "pinned" | "skipped") {
    const cur = new Set(kind === "pinned" ? pinned : skipped);
    if (cur.has(skillId)) cur.delete(skillId); else cur.add(skillId);
    const other = (kind === "pinned" ? skipped : pinned).filter((id) => id !== skillId);
    await saveRow({ pinned: kind === "pinned" ? [...cur] : other, skipped: kind === "skipped" ? [...cur] : other });
  }

  const dayAdjust = (overrides?.day_adjust ?? {}) as DayAdjust;
  async function saveRow(patch: { pinned?: string[]; skipped?: string[]; day_adjust?: DayAdjust }) {
    const row = { track_id: trackId, week_start: weekStart, pinned, skipped, day_adjust: dayAdjust, ...patch, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("study_plan_overrides").upsert(row, { onConflict: "track_id,week_start" });
    if (error) { toast.error("Não foi possível ajustar a semana."); return; }
    qc.invalidateQueries({ queryKey: ["plan-overrides", trackId, weekStart] });
  }
  function skipToday(date: string, skillId: string) {
    const cur = dayAdjust[date] ?? {};
    saveRow({ day_adjust: { ...dayAdjust, [date]: { ...cur, skip: [...new Set([...(cur.skip ?? []), skillId])] } } });
  }
  function toggleBusy(d: PlanDay, defaultCap: number) {
    const cur = dayAdjust[d.date] ?? {};
    const { minutes, ...rest } = cur;
    const next = minutes != null ? rest : { ...rest, minutes: Math.max(0, Math.round(defaultCap / 2 / 10) * 10) };
    saveRow({ day_adjust: { ...dayAdjust, [d.date]: next } });
  }
  function resetDay(date: string) { const { [date]: _, ...rest } = dayAdjust; saveRow({ day_adjust: rest }); }
  function exportIcs() {
    const blob = new Blob([weekToIcs(week, track?.name ?? "Sapiens Study")], { type: "text/calendar" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `plano-${weekStart}.ics`; a.click(); URL.revokeObjectURL(a.href);
  }

  if (loading) return <p className="text-muted-foreground">Montando seu plano…</p>;
  const thisWeek = weekStartOf(today);
  const weekTotal = week.reduce((n, d) => n + d.blocks.reduce((m, b) => m + (d.isPast ? 0 : b.minutes), 0), 0);
  const weekDone = week.reduce((n, d) => n + d.studied, 0);

  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-mono text-xs text-track-accent">PLANO DE VOO</p><h1 className="mt-1 text-3xl font-bold">Plano de estudos</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Sua semana se recalcula a cada atividade: peso no edital, facilidade, domínio, percepção e dias sem praticar. Nada aqui bloqueia — estude fora do plano quando quiser.</p></div>
    </header>

    {skills.filter((s) => s.topics?.length).length === 0 && <section className="flex flex-wrap items-center justify-between gap-3 border border-dashed p-5"><p className="text-sm text-muted-foreground">Seu plano precisa de matérias com tópicos. Importe o edital ou adicione tópicos às competências.</p><Button variant="outline" asChild><Link to="/skills">Ir a Competências</Link></Button></section>}
    {!plan.settings && <p className="border-l-2 border-track-accent bg-secondary/40 px-4 py-2 text-sm">Usando horários padrão. Ajuste sua <b>disponibilidade semanal</b> ao lado para o plano caber na sua rotina.</p>}

    {weekStart === thisWeek && <TodayFocus day={week.find((d) => d.isToday)} />}
    {weekStart === thisWeek && <LastWeekSummary weekStart={shiftStudyDay(thisWeek, -7)} />}

    <Timeline examDate={track?.exam_date ?? null} daysLeft={daysLeft} phase={phase} />

    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section aria-label="Semana" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" aria-label="Semana anterior" onClick={() => setWeekStart(shiftStudyDay(weekStart, -7))}><ChevronLeft className="size-4" /></Button>
            <h2 className="font-semibold">Semana de {fmtDay(weekStart)} a {fmtDay(shiftStudyDay(weekStart, 6))}</h2>
            <Button size="icon" variant="outline" aria-label="Próxima semana" onClick={() => setWeekStart(shiftStudyDay(weekStart, 7))}><ChevronRight className="size-4" /></Button>
            {weekStart !== thisWeek && <Button size="sm" variant="ghost" onClick={() => setWeekStart(thisWeek)}>Hoje</Button>}
          </div>
          <div className="flex items-center gap-2"><p className="font-mono text-xs text-muted-foreground">feito {fmtMinutes(weekDone)} · planejado {fmtMinutes(weekTotal)}</p>
            <Button size="sm" variant="ghost" onClick={exportIcs} title="Baixar os blocos para Google Agenda, Outlook ou celular"><Download className="size-4" />Agenda</Button></div>
        </div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
          {week.map((d, i) => { const adj = dayAdjust[d.date]; const def = weekly[i] ?? 0; const fill = d.isPast ? (def ? Math.min(1, d.studied / def) : 0) : d.capacity ? Math.min(1, d.studied / d.capacity) : 0;
          return <article key={d.date} className={cn("w-[82vw] shrink-0 snap-start border bg-card p-3 sm:w-auto", d.isToday && "border-track-accent", d.isPast && "opacity-75")}>
            <header className="flex items-baseline justify-between gap-2"><h3 className="font-semibold">{d.weekday} <span className="font-mono text-xs text-muted-foreground">{fmtDay(d.date)}</span></h3>
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">{d.isPast ? `${fmtMinutes(d.studied)} estudados` : d.capacity ? fmtMinutes(d.capacity) : "livre"}
                {!d.isPast && def > 0 && <Button size="icon" variant={adj ? "default" : "ghost"} className="size-6" title={adj ? "Restaurar o dia ao padrão" : "Dia corrido: metade do tempo, só nesta semana"} aria-label={adj ? "Restaurar dia" : "Marcar dia corrido"} onClick={() => (adj ? resetDay(d.date) : toggleBusy(d, def))}>{adj ? <RotateCcw className="size-3" /> : <Hourglass className="size-3" />}</Button>}</span></header>
            <div className="mb-2 mt-1 h-1 bg-secondary" title={d.isPast ? "Estudado x disponível" : "Já estudado hoje x planejado"}><div className="h-full bg-track-accent" style={{ width: `${fill * 100}%` }} /></div>
            {d.blocks.length === 0 ? <p className="text-xs text-muted-foreground">{d.isPast ? "Sem estudo registrado." : "Dia livre."}</p> : <ul className="space-y-2">
              {d.blocks.map((b, j) => <li key={j} className="border-l-2 border-track-accent/50 pl-2" title={b.why.length ? `Por que esta matéria? ${b.why.join(" · ")}` : undefined}>
                <div className="flex items-start gap-1.5">{b.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-track-accent" /> : <KindIcon kind={b.kind} phase={b.phase} />}
                  <div className="min-w-0 flex-1"><p className={cn("text-sm font-medium", b.done && "line-through text-muted-foreground")}>{b.skillName}</p>
                    {b.topic && <p className="break-words text-xs text-muted-foreground">{b.topic}</p>}
                    <p className="font-mono text-[10px] text-muted-foreground">{b.phaseLabel} · {fmtMinutes(b.minutes)}{b.why.length ? ` · ${b.why.slice(0, 2).join(" · ")}` : ""}</p>
                    {!d.isPast && !b.done && <BlockAction kind={b.kind} skillId={b.skillId} topic={b.topic} />}
                  </div>
                  {!d.isPast && !b.done && b.kind === "study" && b.skillId && <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="size-6 shrink-0" aria-label={`Ajustar ${b.skillName}`}><MoreHorizontal className="size-3.5" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => skipToday(d.date, b.skillId!)}><Shuffle className="size-4" />Trocar matéria neste dia</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOverride(b.skillId!, "pinned")}><Pin className="size-4" />{pinned.includes(b.skillId) ? "Desafixar da semana" : "Fixar na semana"}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setOverride(b.skillId!, "skipped")}><EyeOff className="size-4" />Pular na semana</DropdownMenuItem>
                    </DropdownMenuContent></DropdownMenu>}
                </div>
              </li>)}
            </ul>}
            {adj?.skip?.length ? <button className="mt-2 text-[11px] text-muted-foreground underline" onClick={() => resetDay(d.date)}>Desfazer trocas deste dia</button> : null}
          </article>; })}
        </div>
      </section>

      <aside className="space-y-6">
        <Availability key={trackId} trackId={trackId} weekly={weekly} blockMinutes={plan.blockMinutes} />
        <section aria-label="Ajustes da semana" className="border bg-card p-4">
          <h2 className="font-semibold">Ajustes desta semana</h2>
          <p className="mt-1 text-xs text-muted-foreground">Fixe uma matéria para abrir cada dia, ou pule-a (ex.: já domina). Vale só para esta semana.</p>
          <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
            {skills.filter((s) => s.topics?.length).map((s) => <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <span className={cn("min-w-0 truncate", skipped.includes(s.id) && "line-through text-muted-foreground")}>{s.name}</span>
              <span className="flex shrink-0 gap-1">
                <Button size="icon" variant={pinned.includes(s.id) ? "default" : "ghost"} className="size-7" aria-label={`Fixar ${s.name}`} title="Fixar" onClick={() => setOverride(s.id, "pinned")}><Pin className="size-3.5" /></Button>
                <Button size="icon" variant={skipped.includes(s.id) ? "default" : "ghost"} className="size-7" aria-label={`Pular ${s.name}`} title="Pular" onClick={() => setOverride(s.id, "skipped")}><EyeOff className="size-3.5" /></Button>
              </span></li>)}
          </ul>
        </section>
      </aside>
    </div>

    <section aria-label="Cobertura do edital" className="border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-semibold">Cobertura do edital</h2>
          <p className="text-sm text-muted-foreground">Tópicos já estudados ao menos uma vez: <b>{Math.round(proj.now * 100)}%</b>{daysLeft != null && daysLeft > 0 && <> · no ritmo atual ({fmtNum(proj.pacePerWeek)} tópicos novos/semana) você chega a <b>{Math.round(proj.projected * 100)}%</b> até a prova</>}</p></div>
        {capacity != null && <p className={cn("font-mono text-xs", capacity < need ? "text-warning" : "text-track-accent")}>Você tem ~{fmtMinutes(capacity)} até a prova · o edital pede ~{fmtMinutes(need)}{capacity < need ? ` — +${fmtMinutes(extraMinutesPerWeek(need, capacity, daysLeft!))}/semana fecharia a conta` : ""}</p>}
      </div>
      {coverage.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Adicione tópicos às suas competências (ou importe o edital) para ver a cobertura.</p> : <ul className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
        {coverage.map((c) => { const pct = c.seen / c.total; const risk = c.points >= maxPts * 0.6 && pct < 0.4; return <li key={c.skillId}>
          <div className="flex justify-between gap-2 text-sm"><span className={cn("truncate", risk && "text-destructive font-medium")}>{c.name}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">{c.seen}/{c.total}{c.points ? ` · ${fmtNum(c.points)} pts` : ""}</span></div>
          <div className="mt-1 h-1.5 bg-secondary"><div className={cn("h-full", risk ? "bg-destructive" : "bg-track-accent")} style={{ width: `${pct * 100}%` }} /></div>
        </li>; })}
      </ul>}
    </section>

    <BalanceSection skills={skills} acts={planActs} points={points} today={today} />

    <AiComment trackId={trackId} summary={() => [
      `Fase atual: ${PHASE_INFO[phase].label}. Dias até a prova: ${daysLeft ?? "sem data"}.`,
      `Disponibilidade semanal (min, seg–dom): ${weekly.join(", ")}. Capacidade até a prova: ${capacity ?? "?"} min; necessidade estimada: ${need} min.`,
      `Cobertura atual: ${Math.round(proj.now * 100)}%, projetada: ${Math.round(proj.projected * 100)}%.`,
      `Matérias (pontos no edital | tópicos vistos/total): ${coverage.slice(0, 25).map((c) => `${c.name} (${fmtNum(c.points)} | ${c.seen}/${c.total})`).join("; ")}.`,
      `Semana planejada: ${week.filter((d) => !d.isPast).map((d) => `${d.weekday}: ${d.blocks.map((b) => b.skillName).join(", ") || "livre"}`).join(" / ")}.`,
    ].join("\n")} />
  </div>;
}

function BlockAction({ kind, skillId, topic, big }: { kind: string; skillId: string | null; topic: string | null; big?: boolean }) {
  if (big) { if (kind === "review") return <Button asChild><Link to="/review"><Inbox className="size-4" />Revisar agora</Link></Button>; if (kind === "mock") return <Button asChild><Link to="/provas"><FileText className="size-4" />Fazer simulado</Link></Button>; if (!skillId || !topic) return null; return <Button asChild><Link to="/arena" search={{ skill: skillId, topic }}><Swords className="size-4" />Começar o próximo bloco</Link></Button>; }
  if (kind === "review") return <Button size="sm" variant="link" className="h-auto p-0 text-xs" asChild><Link to="/review"><Inbox className="size-3" />Revisar</Link></Button>;
  if (kind === "mock") return <Button size="sm" variant="link" className="h-auto p-0 text-xs" asChild><Link to="/provas"><FileText className="size-3" />Abrir provas</Link></Button>;
  if (!skillId || !topic) return null;
  return <Button size="sm" variant="link" className="h-auto p-0 text-xs" asChild><Link to="/arena" search={{ skill: skillId, topic }}><Swords className="size-3" />Iniciar na Arena</Link></Button>;
}

function Timeline({ examDate, daysLeft, phase }: { examDate: string | null; daysLeft: number | null; phase: PlanPhase }) {
  if (!examDate || daysLeft == null) return <section className="flex flex-wrap items-center justify-between gap-3 border border-dashed p-5"><div className="flex items-center gap-3"><Plane className="size-6 text-track-accent" /><p className="text-sm text-muted-foreground">Defina a data da prova nesta trilha para ver as fases da preparação (Base → Aprofundamento → Reta final).</p></div><Button variant="outline" asChild><Link to="/dashboard">Ir ao Painel</Link></Button></section>;
  if (daysLeft < 0) return <section className="border p-5 text-sm text-muted-foreground">A prova de {fmtDay(examDate)} já passou. Atualize a data se houver uma nova prova.</section>;
  const segs = phaseTimeline(daysLeft);
  return <section aria-label="Linha do tempo" className="border bg-card p-5">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm"><CalendarRange className="mr-1 inline size-4 text-track-accent" />Fase atual: <b>{PHASE_INFO[phase].label}</b> — {PHASE_INFO[phase].hint}</p><p className="font-mono text-xs text-muted-foreground">{daysLeft} dias · prova em {fmtDay(examDate)}</p></div>
    <div className="mt-3 flex h-3 w-full overflow-hidden">{segs.map((s) => <div key={s.phase} className={PHASE_TONE[s.phase]} style={{ flex: s.days }} title={`${PHASE_INFO[s.phase].label}: ${s.days} dias`} />)}</div>
    <div className="mt-2 flex text-[11px] text-muted-foreground">{segs.map((s) => <span key={s.phase} style={{ flex: s.days }} className="truncate pr-2">{PHASE_INFO[s.phase].label} · {s.days}d</span>)}</div>
  </section>;
}

function Availability({ trackId, weekly, blockMinutes }: { trackId: string; weekly: number[]; blockMinutes: number }) {
  const qc = useQueryClient();
  const [hours, setHours] = useState(weekly.map((m) => String(m / 60)));
  const [block, setBlock] = useState(String(blockMinutes));
  useEffect(() => { setHours(weekly.map((m) => String(m / 60))); setBlock(String(blockMinutes)); }, [weekly, blockMinutes]);
  const [saving, setSaving] = useState(false);
  async function save() {
    const mins = hours.map((h) => Math.round(Math.min(16, Math.max(0, Number(h.replace(",", ".")) || 0)) * 60));
    const b = Math.min(180, Math.max(20, Math.round(Number(block) || 50)));
    setSaving(true);
    const { error } = await supabase.from("study_plan_settings").upsert({ track_id: trackId, weekly_minutes: mins, block_minutes: b, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error("Não foi possível salvar a disponibilidade."); return; }
    toast.success("Disponibilidade salva — plano recalculado.");
    qc.invalidateQueries({ queryKey: ["plan-settings", trackId] });
  }
  return <section aria-label="Disponibilidade" className="border bg-card p-4">
    <h2 className="font-semibold">Disponibilidade semanal</h2>
    <p className="mt-1 text-xs text-muted-foreground">Horas por dia nesta trilha.</p>
    <div className="mt-3 grid grid-cols-7 gap-1">{WEEKDAYS.map((w, i) => <label key={w} className="text-center text-[11px] text-muted-foreground">{w}<Input inputMode="decimal" aria-label={`Horas ${w}`} className="mt-1 h-8 px-1 text-center" value={hours[i]} onChange={(e) => setHours(hours.map((h, j) => (j === i ? e.target.value : h)))} /></label>)}</div>
    <label className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">Duração do bloco (min)<Input inputMode="numeric" className="h-8 w-20 text-center" value={block} onChange={(e) => setBlock(e.target.value)} /></label>
    <Button size="sm" className="mt-3 w-full" disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar e replanejar"}</Button>
  </section>;
}

function AiComment({ trackId, summary }: { trackId: string; summary: () => string }) {
  const fn = useServerFn(commentStudyPlan);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try { const r = await fn({ data: { trackId, summary: summary().slice(0, 6000) } }); setText(r.text); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível comentar o plano."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Comentário da IA" className="border-l-2 border-track-accent bg-secondary/40 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Mentor de estratégia</h2><p className="text-xs text-muted-foreground">Opcional · usa o modelo econômico · lê só os números do seu plano.</p></div>
      <Button variant="outline" disabled={busy} onClick={run}><Sparkles className="size-4" />{busy ? "Analisando…" : text ? "Comentar de novo" : "Comentar meu plano"}</Button></div>
    {text && <div className="mt-3 whitespace-pre-wrap text-sm">{text}</div>}
  </section>;
}

function KindIcon({ kind, phase }: { kind: PlanBlock["kind"]; phase: string }) {
  const I = kind === "review" ? Inbox : kind === "mock" ? FileText : phase === "theory" ? BookOpen : phase === "review" ? RotateCcw : Target;
  return <I className="mt-0.5 size-4 shrink-0 text-muted-foreground" />;
}

function TodayFocus({ day }: { day: PlanDay | undefined }) {
  if (!day) return null;
  const planned = day.blocks.reduce((n, b) => n + b.minutes, 0);
  const next = day.blocks.find((b) => !b.done);
  const doneN = day.blocks.filter((b) => b.done).length;
  return <section aria-label="Seu dia" className="border border-track-accent bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><p className="font-mono text-xs text-track-accent">SEU DIA · {doneN}/{day.blocks.length} BLOCOS · {fmtMinutes(day.studied)} DE {fmtMinutes(planned)}</p>
        <h2 className="mt-1 text-xl font-semibold">{day.blocks.length === 0 ? "Dia livre — descanso também é estratégia." : next ? `Próximo: ${next.skillName}` : "Plano de hoje cumprido!"}</h2>
        {next?.topic && <p className="text-sm text-muted-foreground">{next.topic} · {next.phaseLabel} · {fmtMinutes(next.minutes)}</p>}
        {next?.why.length ? <p className="mt-1 text-xs text-muted-foreground">Por quê: {next.why.join(" · ")}</p> : null}</div>
      {next && <div className="shrink-0"><BlockAction kind={next.kind} skillId={next.skillId} topic={next.topic} big /></div>}
    </div>
    <div className="mt-3 h-1.5 bg-secondary"><div className="h-full bg-track-accent" style={{ width: `${planned ? Math.min(100, (day.studied / planned) * 100) : 0}%` }} /></div>
  </section>;
}

function LastWeekSummary({ weekStart }: { weekStart: string }) {
  const { week, loading } = useStudyPlan(weekStart);
  if (loading) return null;
  const r = weekAdherence(week);
  if (!r.planned && !r.studied) return null;
  return <details className="border bg-card px-5 py-3">
    <summary className="cursor-pointer text-sm"><History className="mr-1 inline size-4 text-track-accent" />Semana passada: <b>{Math.round(r.pct * 100)}%</b> do planejado</summary>
    <ul className="mt-2 grid gap-1 font-mono text-xs text-muted-foreground sm:grid-cols-3">
      <li>{fmtMinutes(r.studied)} de {fmtMinutes(r.planned)}</li><li>{r.activeDays}/{r.elapsedDays} dias com estudo</li><li>{r.skillsStudied} matérias praticadas</li>
    </ul>
  </details>;
}

function BalanceSection({ skills, acts, points, today }: { skills: { id: string; name: string }[]; acts: Parameters<typeof studyBalance>[1]; points: Map<string, number>; today: string }) {
  const rows = useMemo(() => studyBalance(skills, acts, points, today).sort((a, b) => b.plannedShare - b.actualShare - (a.plannedShare - a.actualShare)), [skills, acts, points, today]);
  if (!rows.some((r) => r.plannedShare > 0)) return null;
  return <section aria-label="Termômetro" className="border bg-card p-5">
    <h2 className="font-semibold"><Scale className="mr-1 inline size-4 text-track-accent" />Termômetro: edital x seu estudo</h2>
    <p className="text-sm text-muted-foreground">Peso de cada matéria na prova comparado ao seu tempo nas últimas 4 semanas. No topo, quem está ficando para trás.</p>
    <ul className="mt-4 grid gap-x-8 gap-y-3 md:grid-cols-2">{rows.map((r) => { const gap = r.plannedShare - r.actualShare; return <li key={r.skillId}>
      <div className="flex justify-between gap-2 text-sm"><span className={cn("truncate", gap > 0.1 && "font-medium text-warning")}>{r.name}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">prova {Math.round(r.plannedShare * 100)}% · você {Math.round(r.actualShare * 100)}%</span></div>
      <div className="mt-1 h-1 bg-secondary"><div className="h-full bg-track-accent/40" style={{ width: `${r.plannedShare * 100}%` }} /></div>
      <div className="mt-0.5 h-1 bg-secondary"><div className="h-full bg-track-accent" style={{ width: `${r.actualShare * 100}%` }} /></div>
    </li>; })}</ul>
  </section>;
}
