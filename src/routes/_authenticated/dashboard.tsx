import { useTrack } from "@/lib/tracks";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Award, Clock, Flame, Layers } from "lucide-react";
import { type Activity, activitiesQuery, fmtMinutes, levelInfo, skillsQuery, sourcesQuery } from "@/lib/data";
import { ActivityRow } from "@/components/ActivityRow";
import { cn } from "@/lib/utils";
import { masteryQuery, resultsQuery } from "@/lib/reviews";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — sapiens" }, { name: "description", content: "Acompanhe o tempo, XP, níveis e evolução da sua trilha de estudos." }, { property: "og:title", content: "Painel — sapiens" }, { property: "og:description", content: "Acompanhe o tempo, XP, níveis e evolução da sua trilha de estudos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Dashboard,
});

type Range = "week" | "month" | "year";
type Metric = "quantity" | "minutes";

function Dashboard() {
  const { trackId, track } = useTrack();
  const { data: acts = [], isLoading } = useQuery(activitiesQuery("approved", trackId));
  const { data: sources = [] } = useQuery(sourcesQuery(trackId));
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const { data: mastery = [] } = useQuery(masteryQuery(trackId));
  const { data: reviewResults = [] } = useQuery(resultsQuery(trackId));
  const reviewXp = reviewResults.reduce((total, r) => total + r.xp, 0);
  const [range, setRange] = useState<Range>("week");
  const [metric, setMetric] = useState<Metric>("quantity");
  const [selected, setSelected] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const byDay = useMemo(() => {
    const m = new Map<string, Activity[]>();
    for (const a of acts) m.set(a.date, [...(m.get(a.date) ?? []), a]);
    return m;
  }, [acts]);

  const stats = useMemo(() => {
    const minutes = acts.reduce((s, a) => s + a.minutes, 0);
    const items = acts.reduce((s, a) => s + a.quantity, 0);
    const certs = acts.filter((a) => a.type === "certificate").length;
    let streak = 0;
    let d = new Date();
    if (!byDay.has(format(d, "yyyy-MM-dd"))) d = subDays(d, 1);
    while (byDay.has(format(d, "yyyy-MM-dd"))) {
      streak++;
      d = subDays(d, 1);
    }
    return { minutes, items, certs, streak };
  }, [acts, byDay]);

  const chartData = useMemo(() => {
    const val = (list: Activity[], sid: string) =>
      list.filter((a) => (a.source_id ?? "none") === sid).reduce((s, a) => s + a[metric], 0);
    const keys = [...sources.map((s) => s.id), "none"];
    const today = new Date();
    if (range === "year") {
      return Array.from({ length: 12 }, (_, i) => {
        const m = startOfMonth(subMonths(today, 11 - i));
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
  }, [acts, byDay, sources, range, metric]);

  const skillData = useMemo(
    () =>
      skills
        .map((s) => {
          const list = acts.filter((a) => a.activity_skills.some((x) => x.skill_id === s.id));
          const reviewed = mastery.find(m => m.skill_id === s.id);
          return {
            name: s.name,
            color: s.color,
            minutes: list.reduce((t, a) => t + a.minutes, 0),
            quantity: list.reduce((t, a) => t + a.quantity, 0),
            mastery: reviewed?.mastery ?? 0,
            reviewXp: reviewed?.review_xp ?? 0,
            reviewed: !!reviewed,
            fragile: reviewed?.last_score != null && reviewed.last_score < 70,
          };
        })
        .sort((a, b) => b.minutes - a.minutes),
    [acts, skills, mastery],
  );
  const milestones = acts.filter((a) => a.type === "certificate" || a.type === "level").slice(0, 6);
  const dayList = byDay.get(selected) ?? [];

  if (isLoading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-sm text-track-accent">// {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
        <h1 className="mt-1 text-3xl font-bold">{track?.name}</h1>
      </div>

      {(() => {
        const g = levelInfo(stats.minutes + reviewXp, stats.items);
        return (
          <div className="rounded-xl border border-track-accent/50 bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">
                <span className="text-track-accent font-bold">NÍVEL {g.level}</span> · {g.name}
              </span>
              <span className="font-mono text-sm text-muted-foreground">{g.xp} XP</span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-secondary">
              <div className="h-full rounded-full bg-track-accent transition-all" style={{ width: `${g.progress * 100}%` }} />
            </div>
            <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
              {g.maxed ? "nível máximo" : `faltam ${fmtMinutes(g.minutesToNext)} para o nível ${g.level + 1}`}
            </p>
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Flame} label="Sequência" value={`${stats.streak} dia${stats.streak === 1 ? "" : "s"}`} accent />
        <Stat icon={Clock} label="Tempo total" value={fmtMinutes(stats.minutes)} />
        <Stat icon={Layers} label="Itens concluídos" value={String(stats.items)} />
        <Stat icon={Award} label="Certificados" value={String(stats.certs)} />
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Último ano</h2>
          <span className="text-xs text-muted-foreground">Clique num dia para ver o que você fez</span>
        </div>
        <Heatmap byDay={byDay} selected={selected} onSelect={setSelected} />
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

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="rounded-xl border bg-card p-5 lg:col-span-3">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Atividade por período</h2>
            <div className="flex gap-2">
              <Seg value={metric} onChange={setMetric} opts={[["quantity", "Itens"], ["minutes", "Minutos"]]} />
              <Seg value={range} onChange={setRange} opts={[["week", "Semana"], ["month", "Mês"], ["year", "Ano"]]} />
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
                {sources.map((s) => (
                  <Bar key={s.id} dataKey={s.id} name={s.name} stackId="a" fill={s.color} />
                ))}
                <Bar dataKey="none" name="Sem fonte" stackId="a" fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h2 className="mb-2 font-semibold">Domínio das competências</h2>
          <div className="h-56">
            {skillData.length >= 3 ? (
              <ResponsiveContainer>
                <RadarChart data={skillData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="mastery" name="Domínio" stroke="var(--track-accent)" fill="var(--track-accent)" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Crie ao menos 3 competências.</p>
            )}
          </div>
          <div className="mt-2 space-y-3">
            {skillData.map((s) => {
              const li = levelInfo(s.minutes + s.reviewXp, s.quantity);
              return (
                <div key={s.name} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold text-track-accent-foreground"
                        style={{ background: s.color }}
                      >
                        NV {li.level}
                      </span>
                      <span>{s.name}</span>
                      <span className="text-xs text-muted-foreground">{li.name}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{li.xp} XP</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-secondary">
                    <div className="h-full rounded-full transition-all" style={{ width: `${li.progress * 100}%`, background: s.color }} />
                  </div>
                  <div className="mt-0.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                    <span>{fmtMinutes(s.minutes)} · {s.quantity} itens</span>
                    <span>{li.maxed ? "nível máximo" : `faltam ${fmtMinutes(li.minutesToNext)} p/ NV ${li.level + 1}`}</span>
                  </div>
                  <p className={cn("mt-1 text-xs", s.fragile ? "text-warning" : "text-muted-foreground")}>{s.reviewed ? `${s.mastery}% de domínio${s.fragile ? " · Memória frágil" : ""}` : "Domínio ainda não avaliado"}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

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
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: typeof Flame; label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", accent && "border-track-accent/50")}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={cn("size-4", accent && "text-track-accent")} /> {label}
      </div>
      <div className="mt-2 font-mono text-2xl font-bold">{value}</div>
    </div>
  );
}

function Seg<T extends string>({ value, onChange, opts }: { value: T; onChange: (v: T) => void; opts: [T, string][] }) {
  return (
    <div className="flex rounded-md border p-0.5">
      {opts.map(([v, l]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            "rounded px-2.5 py-1 text-xs transition-colors",
            value === v ? "bg-track-accent text-track-accent-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Heatmap({
  byDay,
  selected,
  onSelect,
}: {
  byDay: Map<string, Activity[]>;
  selected: string;
  onSelect: (d: string) => void;
}) {
  const today = new Date();
  const start = startOfWeek(subDays(today, 364), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end: today });
  const weeks: Date[][] = [];
  days.forEach((d, i) => {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1]!.push(d);
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
            {w[0]!.getDate() <= 7 ? (
              <span className="h-3 text-[9px] leading-3 text-muted-foreground">{format(w[0]!, "MMM", { locale: ptBR })}</span>
            ) : (
              <span className="h-3" />
            )}
            {w.map((d) => {
              const k = format(d, "yyyy-MM-dd");
              const lv = level(k);
              return (
                <button
                  key={k}
                  title={`${format(d, "dd/MM/yyyy")} · ${byDay.get(k)?.length ?? 0} registro(s)`}
                  onClick={() => onSelect(k)}
                  className={cn(
                    "size-3 rounded-[3px]",
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
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        menos
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={cn("size-3 rounded-[3px]", l ? "bg-track-accent" : "bg-foreground")} style={{ opacity: l ? opacity[l] : 0.07 }} />
        ))}
        mais
      </div>
      <span className="hidden">{addDays(today, 0).toString()}</span>
    </div>
  );
}
