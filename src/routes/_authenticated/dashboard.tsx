import { PageSkeleton } from "@/components/PageTransition";
import { useTrack } from "@/lib/tracks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { recommendTopic } from "@/lib/arena";
import { computeExamWeights, examBlocksQuery, skillRulesQuery } from "@/lib/exam-rules";
import { Swords } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  subDays,
  subMonths,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, Clock, Flame, Layers, Plus } from "lucide-react";
import { openQuickLog } from "@/lib/quick-log";
import { MATERIALS, materialOf } from "@/lib/study-meta";
import { type Activity, activitiesQuery, allActivitiesQuery, allSkillsQuery, allSourcesQuery, fmtMinutes, skillsQuery, sourcesQuery } from "@/lib/data";
import { ActivityRow } from "@/components/ActivityRow";
import { cn } from "@/lib/utils";
import { allMasteryQuery, allResultsQuery, masteryQuery, resultsQuery } from "@/lib/reviews";
import { activityXp, dailyXp, masteryLevel, skillProgress, skillProgressWithShared, studyStreak } from "@/lib/gamification";
import { AnimatedNumber, DailyQuest, NeonProgress } from "@/components/Gamification";
import { SkillMissionMap } from "@/components/SkillMissionMap";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { studyDay, studyCalendarDate } from "@/lib/study-day";
import { protectionQuery } from "@/lib/engagement";
import { ExamCountdown, PriorityMission, StreakProtection, TrophyShelf, SoundToggle } from "@/components/StudyEngagement";
import { pastExamsQuery } from "@/lib/past-exams";
import { SkillMasteryViews } from "@/components/SkillMasteryViews";
import { CityCard } from "@/components/city/CityCard";
import { buildCityState } from "@/lib/contexts/progression";
import { TodayPlanCard } from "@/components/StudyPlanCard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Sapiens Study" }, { name: "description", content: "Acompanhe o tempo, XP, níveis e evolução da sua trilha de estudos." }, { property: "og:title", content: "Painel — Sapiens Study" }, { property: "og:description", content: "Acompanhe o tempo, XP, níveis e evolução da sua trilha de estudos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Dashboard,
});

type Range = "week" | "month" | "year" | "years";
type Metric = "quantity" | "minutes";

function Dashboard() {
  const { trackId, track } = useTrack();
  const [scope, setScope] = useState<"track" | "all">("track");
  const global = scope === "all";
  const trackActs = useQuery(activitiesQuery("approved", trackId));
  const trackSources = useQuery(sourcesQuery(trackId));
  const trackSkills = useQuery(skillsQuery(trackId));
  const trackMastery = useQuery(masteryQuery(trackId));
  const trackResults = useQuery(resultsQuery(trackId));
  const hasShared = (trackSkills.data ?? []).some((s) => s.shared);
  const gActs = useQuery({ ...allActivitiesQuery(), enabled: global || hasShared });
  const gSources = useQuery({ ...allSourcesQuery(), enabled: global });
  const gSkills = useQuery({ ...allSkillsQuery(), enabled: global });
  const gMastery = useQuery({ ...allMasteryQuery(), enabled: global || hasShared });
  const gResults = useQuery({ ...allResultsQuery(), enabled: global || hasShared });
  const isLoading = global ? gActs.isLoading : trackActs.isLoading;
  const sources = (global ? gSources.data : trackSources.data) ?? [];
  const reviewResults = (global ? gResults.data : trackResults.data) ?? [];
  // In the global view, skills with the same name across tracks merge into one lifetime skill.
  const { acts, skills, mastery } = useMemo(() => {
    if (!global) return { acts: trackActs.data ?? [], skills: trackSkills.data ?? [], mastery: trackMastery.data ?? [] };
    const canon = new Map<string, string>();
    const idMap = new Map<string, string>();
    const merged: NonNullable<typeof gSkills.data> = [];
    for (const s of gSkills.data ?? []) {
      const k = s.name.trim().toLowerCase();
      if (!canon.has(k)) { canon.set(k, s.id); merged.push(s); }
      idMap.set(s.id, canon.get(k)!);
    }
    const acts = (gActs.data ?? []).map((a) => ({ ...a, activity_skills: [...new Set(a.activity_skills.map((l) => idMap.get(l.skill_id) ?? l.skill_id))].map((skill_id) => ({ skill_id })) }));
    const byCanon = new Map<string, NonNullable<typeof gMastery.data>[number]>();
    for (const m of gMastery.data ?? []) {
      const id = idMap.get(m.skill_id) ?? m.skill_id;
      const prev = byCanon.get(id);
      if (!prev) byCanon.set(id, { ...m, skill_id: id });
      else byCanon.set(id, { ...prev, mastery: Math.round((prev.mastery * prev.reviews + m.mastery * m.reviews) / Math.max(1, prev.reviews + m.reviews)), review_xp: prev.review_xp + m.review_xp, reviews: prev.reviews + m.reviews });
    }
    return { acts, skills: merged, mastery: [...byCanon.values()] };
  }, [global, trackActs.data, trackSkills.data, trackMastery.data, gActs.data, gSkills.data, gMastery.data]);
  const { data: exams = [] } = useQuery(pastExamsQuery(trackId));
  const { data: blocks = [] } = useQuery(examBlocksQuery(trackId));
  const { data: rules = [] } = useQuery(skillRulesQuery(trackId));
  const { data: trackProtection } = useQuery(protectionQuery(trackId));
  const protection = global ? undefined : trackProtection;
  const [now, setNow] = useState(new Date());
  const [userId, setUserId] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const reviewXp = reviewResults.reduce((total, r) => total + r.xp, 0);
  const [range, setRange] = useState<Range>("week");
  const [metric, setMetric] = useState<Metric>("quantity");
  const [selected, setSelected] = useState<string>(studyDay());
  const [chartYear, setChartYear] = useState<string>("recent");
  const [heatYear, setHeatYear] = useState<number | null>(null);
  const years = useMemo(() => {
    const set = new Set(acts.map((a) => Number(a.date.slice(0, 4))).filter(Boolean));
    set.add(studyCalendarDate(now).getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [acts, now]);

  const byDay = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of acts) m.set(a.date, [...(m.get(a.date) ?? []), a]);
    return m;
  }, [acts]);

  const stats = useMemo(() => {
    const minutes = acts.reduce((s, a) => s + a.minutes, 0);
    const items = acts.reduce((s, a) => s + a.quantity, 0);
    const certs = acts.filter((a) => a.type === "certificate").length;
    const streak = studyStreak(acts, reviewResults, now, protection?.days);
    return { minutes, items, certs, streak };
  }, [acts, reviewResults, now, protection?.days]);

  const chartData = useMemo(() => {
    const val = (list: Activity[], key: string) =>
      list.filter((a) => materialOf(a.material).value === key).reduce((s, a) => s + a[metric], 0);
    const keys = MATERIALS.map((m) => m.value);
    const today = studyCalendarDate(now);
    if (range === "years") {
      const ys = years.length ? [...years].reverse() : [today.getFullYear()];
      return ys.map((y) => {
        const list = acts.filter((a) => a.date.startsWith(`${y}-`));
        const row: Record<string, number | string> = { label: String(y) };
        keys.forEach((k) => (row[k] = val(list, k)));
        return row;
      });
    }
    if (range === "year") {
      return Array.from({ length: 12 }, (_, i) => {
        const m = chartYear === "recent" ? startOfMonth(subMonths(today, 11 - i)) : new Date(Number(chartYear), i, 1);
        const key = format(m, "yyyy-MM");
        const list = acts.filter((a) => a.date.startsWith(key));
        const row: Record<string, number | string> = { label: format(m, "MMM", { locale: ptBR }) };
        keys.forEach((k) => (row[k] = val(list, k)));
        return row;
      });
    }
    const days = range === "week" ? 7 : 30;
    return eachDayOfInterval({ start: subDays(today, days - 1), end: today }).map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const list = byDay.get(key) ?? [];
      const row: Record<string, number | string> = {
        label: range === "week" ? format(d, "EEE dd", { locale: ptBR }) : format(d, "dd/MM"),
        date: key,
      };
      keys.forEach((k) => (row[k] = val(list, k)));
      return row;
    });
  }, [acts, byDay, range, metric, now, chartYear, years]);

  const skillData = useMemo(() => global ? skillProgress(skills, acts, mastery, reviewResults) : skillProgressWithShared(skills, acts, mastery, reviewResults, { activities: gActs.data ?? [], mastery: gMastery.data ?? [], results: gResults.data ?? [] }), [global, acts, skills, mastery, reviewResults, gActs.data, gMastery.data, gResults.data]);
  const totalXp = acts.reduce((sum, a) => sum + activityXp(a), 0) + reviewXp;
  const todayXp = dailyXp(acts, reviewResults, studyDay(now));
  const milestones = acts.filter((a) => a.type === "certificate" || a.type === "level").slice(0, 6);
  const dayList = byDay.get(selected) ?? [];
  const cityState = useMemo(() => {
    const lvl = masteryLevel(totalXp);
    const updated = new Map(mastery.map((m) => [m.skill_id, m.updated_at]));
    const scores = mastery.map((m) => m.last_score).filter((v): v is number => v != null);
    return buildCityState({
      level: lvl.level, xpToNext: lvl.xpToNext, streak: stats.streak,
      skills: skillData.map((s) => ({ id: s.id, name: s.name, mastery: s.mastery, reviewed: s.reviewed, fragile: s.fragile, updatedAt: updated.get(s.id) ?? null })),
      questionItems: acts.filter((a) => a.material === "questions").reduce((n, a) => n + a.quantity, 0),
      avgScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      examDate: global ? null : track?.exam_date ?? null, now,
    });
  }, [totalXp, mastery, stats.streak, skillData, acts, global, track?.exam_date, now]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-mono text-sm text-track-accent">// {format(studyCalendarDate(now), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        <h1 className="mt-1 text-3xl font-bold">{global ? "Visão global" : track?.name}</h1>
        {global && <p className="mt-1 text-sm text-muted-foreground">Todas as trilhas somadas · competências com o mesmo nome são unificadas</p>}</div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Seg value={scope} onChange={setScope} opts={[["track", "Esta trilha"], ["all", "Todas as trilhas"]]} />
            {userId && <SoundToggle userId={userId} trackId={trackId} />}
          </div>
          <span title={trackId ? "Registro rápido (Ctrl + K)" : "Selecione uma trilha específica para registrar atividades"}>
            <Button size="sm" disabled={!trackId} onClick={openQuickLog}>
              <Plus className="size-4" /> Registrar atividade <span className="kbd-cap ml-1">Ctrl K</span>
            </Button>
          </span>
        </div>
      </div>

      {(() => {
        const g = masteryLevel(totalXp);
        return (
          <div onPointerMove={spotlight} className="surface-pro aura-accent rounded-xl border px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">
                <span className="text-track-accent font-bold">NÍVEL {g.level}</span> · {g.name}
              </span>
              <span className="font-mono text-sm text-muted-foreground"><AnimatedNumber value={g.xp} /> XP</span>
            </div>
            <div className="mt-3"><NeonProgress progress={g.progress} label="Nível geral" /></div>
            <p className="mt-1 text-right font-mono text-[0.625rem] text-muted-foreground">
              {g.maxed ? "nível máximo" : `faltam ${g.xpToNext} XP para o nível ${g.level + 1}`}
            </p>
          </div>
        );
      })()}

      <CityCard state={cityState} />

      {!global && track?.exam_date && <ExamCountdown examDate={track.exam_date} name={track.name} now={now} />}
      {!global && <TodayPlanCard />}
      {!global && userId && <DailyQuest key={`daily-${trackId}`} xp={todayXp} streak={stats.streak} now={now} storageKey={`sapiens:goal:${userId}:${trackId}`} />}
      {!global && <ArenaSuggestion trackId={trackId} skills={trackSkills.data ?? []} activities={acts} mastery={trackMastery.data ?? []} />}
      {!global && <PriorityMission trackId={trackId} activities={acts} now={now} />}
      {!global && <StreakProtection trackId={trackId} activities={acts} results={reviewResults} now={now} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Flame} label="XP conquistado" value={`${totalXp.toLocaleString("pt-BR")} XP`} accent />
        <Stat icon={Clock} label="Tempo total" value={fmtMinutes(stats.minutes)} />
        <Stat icon={Layers} label="Itens concluídos" value={String(stats.items)} />
        <Stat icon={Award} label="Certificados" value={String(stats.certs)} />
      </div>

      <section className="surface-pro rounded-xl border p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{heatYear ? `Ano de ${heatYear}` : "Último ano"}</h2>
          <select aria-label="Ano do mapa" className="rounded-md border bg-background px-2 py-1 text-xs" value={heatYear ?? "recent"} onChange={(e) => setHeatYear(e.target.value === "recent" ? null : Number(e.target.value))}>
            <option value="recent">Últimos 12 meses</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

        </div>
        <Heatmap year={heatYear} byDay={byDay} selected={selected} onSelect={setSelected} />
        <div className="mt-5 border-t pt-4">
          <h3 className="mb-3 font-mono text-sm text-muted-foreground">
            {format(parseISO(selected), "dd 'de' MMMM yyyy", { locale: ptBR })} · {dayList.length} registro(s)
          </h3>
          <div className="space-y-2">
            {dayList.map((a) => (
              <ActivityRow key={a.id} a={a} sources={sources} skills={skills} showDate={false} />
            ))}
            {!dayList.length && <p className="text-sm text-muted-foreground">Nenhuma atividade neste dia.</p>}
          </div>
        </div>
      </section>

      <div className="grid gap-6">
        <section onPointerMove={spotlight} className="surface-pro rounded-xl border p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Atividade por período</h2>
            <div className="flex flex-wrap gap-2">
              <Seg value={metric} onChange={setMetric} opts={[["quantity", "Itens"], ["minutes", "Minutos"]]} />
              <Seg value={range} onChange={setRange} opts={[["week", "Semana"], ["month", "Mês"], ["year", "Ano"], ["years", "Todos os anos"]]} />
              {range === "year" && (
                <select aria-label="Ano do gráfico" className="rounded-md border bg-background px-2 py-1 text-xs" value={chartYear} onChange={(e) => setChartYear(e.target.value)}>
                  <option value="recent">Últimos 12 meses</option>
                  {years.map((y) => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              )}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                onClick={(e) => {
                  const p = e?.activePayload?.[0]?.payload as { date?: string } | undefined;
                  if (p?.date) setSelected(p.date);
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} allowDecimals={false} width={32} />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
                {MATERIALS.map((m, i) => (
                  <Bar key={m.value} dataKey={m.value} name={m.label} stackId="a" fill={m.color} radius={i === MATERIALS.length - 1 ? [3, 3, 0, 0] : 0} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {MATERIALS.map((m) => <span key={m.value} className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: m.color }} />{m.label}</span>)}
          </div>
        </section>

        <section className="surface-pro rounded-xl border p-5">
          <h2 className="mb-2 font-semibold">Domínio das competências</h2>
          <SkillMasteryViews skills={skillData} blocks={global ? [] : blocks} rules={global ? [] : rules} storageKey={`sapiens:mastery-view:${userId}`} />
        </section>
      </div>

      <JourneySection storageKey={`sapiens:journey-open:${userId}:${global ? "all" : trackId}`}>
      {!global && userId && <SkillMissionMap key={`map-${trackId}`} skills={skillData} storageKey={`sapiens:map:${userId}:${trackId}`} />}
      <TrophyShelf activities={acts} skills={skillData} exams={global ? [] : exams} />

      {milestones.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Marcos recentes</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {milestones.map((a) => (
              <ActivityRow key={a.id} a={a} sources={sources} skills={skills} />
            ))}
          </div>
        </section>
      )}
      </JourneySection>
    </div>
  );
}

function spotlight(e: import("react").PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Flame; label: string; value: string; accent?: boolean }) {
  return (
    <div onPointerMove={spotlight} className={cn("surface-pro rounded-xl border p-4", accent && "aura-accent border-track-accent/50")}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span className={cn("grid size-6 place-items-center rounded-md border bg-secondary/60", accent && "border-track-accent/40 text-track-accent")}><Icon className="size-3.5" /></span> {label}
      </div>
      <div className="mt-3 font-mono text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function Seg<T extends string>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: [T, string][] }) {
  return (
    <div className="flex rounded-md border p-0.5">
      {opts.map(([v, l]) => (
        <Button variant="ghost" size="sm"
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition-colors",
            value === v ? "bg-track-accent text-track-accent-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </Button>
      ))}
    </div>
  );
}

function Heatmap({
  year,
  byDay,
  selected,
  onSelect,
}: {
  year: number | null;
  byDay: Map<string, Activity[]>;
  selected: string;
  onSelect: (d: string) => void;
}) {
  const today = year ? new Date(year, 11, 31) : studyCalendarDate();
  const start = startOfWeek(year ? new Date(year, 0, 1) : subDays(today, 364), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end: today });
  const weeks: Date[][] = [];
  days.forEach((d, i) => {
    if (i % 7 === 0) weeks.push([]);
    weeks.at(-1)?.push(d);
  });
  const level = (k: string) => {
    const list = byDay.get(k);
    if (!list) return 0;
    const score = list.reduce((s, a) => s + a.quantity, 0) + list.reduce((s, a) => s + a.minutes, 0) / 30;
    return score >= 8 ? 4 : score >= 4 ? 3 : score >= 2 ? 2 : 1;
  };
  const opacity = [0.07, 0.3, 0.55, 0.8, 1];

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-[3px]">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {(w[0]?.getDate() ?? 32) <= 7 ? (
              <span className="h-3 text-[0.5625rem] leading-3 text-muted-foreground">{w[0] ? format(w[0], "MMM", { locale: ptBR }) : ""}</span>
            ) : (
              <span className="h-3" />
            )}
            {w.map((d) => {
              const k = format(d, "yyyy-MM-dd");
              const lv = level(k);
              return (
                <Button variant="ghost"
                  key={k}
                  title={`${format(d, "dd/MM/yyyy")} · ${byDay.get(k)?.length ?? 0} registro(s)`}
                  onClick={() => onSelect(k)}
                  className={cn(
                    "size-3 min-w-3 p-0 rounded-[3px]",
                    lv === 0 ? "bg-foreground" : "bg-track-accent",
                    selected === k && "ring-2 ring-accent ring-offset-1 ring-offset-card",
                  )}
                  style={{ opacity: lv === 0 ? 0.07 : opacity[lv] }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[0.625rem] text-muted-foreground">
        menos
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={cn("size-3 min-w-3 p-0 rounded-[3px]", l ? "bg-track-accent" : "bg-foreground")} style={{ opacity: l ? opacity[l] : 0.07 }} />
        ))}
        mais
      </div>
      <span className="hidden">{addDays(today, 0).toString()}</span>
    </div>
  );
}

function ArenaSuggestion({ trackId, skills, activities, mastery }: { trackId: string; skills: { id: string; name: string; topics: string[] }[]; activities: Activity[]; mastery: { skill_id: string; mastery: number }[] }) {
  const { data: blocks = [] } = useQuery(examBlocksQuery(trackId));
  const { data: rules = [] } = useQuery(skillRulesQuery(trackId));
  const rec = useMemo(() => {
    const w = computeExamWeights(skills.map((s) => s.id), blocks, rules);
    return recommendTopic(skills, activities.map((a) => ({ ...a, skill_ids: a.activity_skills?.map((x) => x.skill_id) })), {
      points: new Map(w.map((x) => [x.skillId, x.points])),
      difficulty: new Map(w.map((x) => [x.skillId, x.difficulty])),
      mastery: new Map(mastery.map((m) => [m.skill_id, m.mastery])),
      today: studyDay(),
    });
  }, [skills, activities, blocks, rules, mastery]);
  if (!rec) return null;
  return <section aria-label="Estudo recomendado" onPointerMove={spotlight} className="surface-pro aura-accent flex flex-wrap items-center justify-between gap-5 rounded-xl border border-track-accent/40 px-5 py-5">
    <div className="flex min-w-0 flex-1 items-start gap-4"><Swords className="mt-1 size-7 shrink-0 text-track-accent" /><div className="min-w-0"><p className="flex items-center gap-2 font-mono text-xs text-track-accent"><span className="pulse-dot size-1.5 rounded-full bg-track-accent" />HOJE RECOMENDAMOS</p><h2 className="mt-1 text-lg font-semibold">{rec.skillName}</h2><p className="mt-1 break-words text-sm text-muted-foreground">{rec.topic}</p><p className="mt-2 font-mono text-[0.6875rem] text-muted-foreground">{rec.why.join(" · ")}</p></div></div>
    <div className="flex gap-2"><Button variant="outline" asChild><Link to="/arena">Escolher outro</Link></Button><Button asChild className="cta-beam"><Link to="/arena" search={{ skill: rec.skillId, topic: rec.topic }}>Estudar na Arena</Link></Button></div>
  </section>;
}

function JourneySection({ storageKey, children }: { storageKey: string; children: import("react").ReactNode }) {
  const [open, setOpen] = useState(true);
  useEffect(() => { const v = localStorage.getItem(storageKey); if (v !== null) setOpen(v === "1"); }, [storageKey]);
  const toggle = () => setOpen((o) => { localStorage.setItem(storageKey, o ? "0" : "1"); return !o; });
  return <section className="space-y-6 border-t border-border pt-5">
    <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center justify-between rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span><span className="block font-mono text-xs text-track-accent">JORNADA</span><span className="font-semibold">Missões, conquistas e marcos</span></span>
      <span className="font-mono text-xs text-muted-foreground">{open ? "Recolher ▲" : "Mostrar ▼"}</span>
    </button>
    {open && children}
  </section>;
}
