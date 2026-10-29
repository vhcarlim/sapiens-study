import { useEffect, useMemo, useState } from "react";
import { BarChart3, LayoutGrid, Radar as RadarIcon, Target } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { computeExamWeights, fmtNum, type ExamBlock, type SkillRule } from "@/lib/exam-rules";
import { fmtMinutes } from "@/lib/data";
import { cn } from "@/lib/utils";
import { AnimatedNumber, NeonProgress } from "@/components/Gamification";

export type MasterySkill = {
  id: string; name: string; level: number; title?: string | undefined; xp: number; progress: number;
  minutes: number; quantity: number; maxed: boolean; xpToNext: number;
  mastery: number; reviewed: boolean; fragile: boolean;
};

type View = "bars" | "blocks" | "matrix" | "radar";
const VIEWS: { id: View; label: string; icon: typeof BarChart3 }[] = [
  { id: "bars", label: "Barras", icon: BarChart3 },
  { id: "blocks", label: "Blocos do edital", icon: LayoutGrid },
  { id: "matrix", label: "Esforço × Retenção", icon: Target },
  { id: "radar", label: "Teia", icon: RadarIcon },
];

export function masteryStatus(s: Pick<MasterySkill, "reviewed" | "fragile" | "mastery">) {
  if (!s.reviewed) return { label: "Não avaliado", tone: "text-muted-foreground border-border", bar: "bg-muted-foreground/40" };
  if (s.fragile || s.mastery < 40) return { label: "Memória frágil", tone: "text-warning border-warning/50", bar: "bg-warning" };
  if (s.mastery < 80) return { label: "Em construção", tone: "text-track-accent border-track-accent/50", bar: "bg-track-accent" };
  return { label: "Consolidado", tone: "text-primary border-primary/50", bar: "bg-primary" };
}

function StatusBadge({ s }: { s: MasterySkill }) {
  const st = masteryStatus(s);
  return <span className={cn("shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px]", st.tone)}>{st.label}</span>;
}

export function SkillMasteryViews({ skills, blocks, rules, storageKey }: { skills: MasterySkill[]; blocks: ExamBlock[]; rules: SkillRule[]; storageKey: string }) {
  const [view, setView] = useState<View>("bars");
  useEffect(() => {
    const v = localStorage.getItem(storageKey) as View | null;
    if (v && VIEWS.some((x) => x.id === v)) setView(v);
  }, [storageKey]);
  const choose = (v: View) => { setView(v); localStorage.setItem(storageKey, v); };

  return (
    <div>
      <div role="tablist" aria-label="Visualização do domínio" className="mb-4 flex flex-wrap gap-1 rounded-md border p-0.5">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => choose(id)}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs transition-colors",
              view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>
      {skills.length === 0 ? <p className="text-sm text-muted-foreground">Crie competências para ver o domínio.</p>
        : view === "bars" ? <BarsView skills={skills} />
        : view === "blocks" ? <BlocksView skills={skills} blocks={blocks} rules={rules} />
        : view === "matrix" ? <MatrixView skills={skills} />
        : <RadarView skills={skills} />}
    </div>
  );
}

function BarsView({ skills }: { skills: MasterySkill[] }) {
  const [sort, setSort] = useState<"urgent" | "name">("urgent");
  const list = useMemo(() => [...skills].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name)
    : (a.reviewed ? a.mastery : -1) - (b.reviewed ? b.mastery : -1) || a.minutes - b.minutes), [skills, sort]);
  return (
    <div>
      <div className="mb-2 flex justify-end gap-2 text-xs">
        <span className="text-muted-foreground">Ordenar:</span>
        <button className={cn(sort === "urgent" ? "text-primary underline" : "text-muted-foreground")} onClick={() => setSort("urgent")}>Mais urgentes</button>
        <button className={cn(sort === "name" ? "text-primary underline" : "text-muted-foreground")} onClick={() => setSort("name")}>A–Z</button>
      </div>
      <div className="space-y-3">
        {list.map((s) => <div key={s.id} className="space-y-2 border-b border-border pb-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="break-words font-semibold">{s.name}</p><p className="mt-1 font-mono text-xs text-primary">NÍVEL {s.level} / 10 · {s.title}</p></div>
            <div className="flex shrink-0 flex-col items-end gap-1"><span className="font-mono text-xs text-muted-foreground"><AnimatedNumber value={s.xp} /> XP</span><StatusBadge s={s} /></div>
          </div>
          <div>
            <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>Domínio</span><span>{s.reviewed ? `${s.mastery}%` : "—"}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", masteryStatus(s).bar)} style={{ width: `${s.reviewed ? Math.max(s.mastery, 2) : 0}%` }} /></div>
          </div>
          <NeonProgress progress={s.progress} label={`Nível de ${s.name}`} />
          <div className="flex flex-wrap justify-between gap-1 font-mono text-[10px] text-muted-foreground"><span>{fmtMinutes(s.minutes)} · {s.quantity} itens</span><span>{s.maxed ? "nível máximo" : `${s.xpToNext} XP p/ NV ${s.level + 1}`}</span></div>
        </div>)}
      </div>
    </div>
  );
}

function BlocksView({ skills, blocks, rules }: { skills: MasterySkill[]; blocks: ExamBlock[]; rules: SkillRule[] }) {
  const weights = useMemo(() => new Map(computeExamWeights(skills.map((s) => s.id), blocks, rules).map((w) => [w.skillId, w])), [skills, blocks, rules]);
  const groups = [...blocks.map((b) => ({ id: b.id, title: b.name, sub: `${b.total_questions} questões · peso ${fmtNum(Number(b.weight))}` })), { id: null as string | null, title: "Sem bloco", sub: "Matérias avulsas" }]
    .map((g) => ({ ...g, items: skills.filter((s) => (weights.get(s.id)?.blockId ?? null) === g.id) }))
    .filter((g) => g.items.length > 0);
  if (blocks.length === 0) return <p className="mb-3 text-sm text-muted-foreground">Cadastre os blocos do edital em Competências para agrupar as matérias aqui.</p>;
  return (
    <div className="space-y-5">
      {groups.map((g) => {
        const rev = g.items.filter((s) => s.reviewed);
        const avg = rev.length ? Math.round(rev.reduce((a, s) => a + s.mastery, 0) / rev.length) : null;
        return <div key={g.id ?? "none"}>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h3 className="font-semibold">{g.title}</h3><span className="font-mono text-[10px] text-muted-foreground">{g.sub} · domínio médio {avg == null ? "—" : `${avg}%`}</span></div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {g.items.map((s) => { const w = weights.get(s.id); return (
              <div key={s.id} className="rounded-lg border bg-card p-3 text-sm">
                <div className="flex items-start justify-between gap-2"><p className="min-w-0 break-words font-medium leading-snug">{s.name}</p><StatusBadge s={s} /></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full", masteryStatus(s).bar)} style={{ width: `${s.reviewed ? s.mastery : 0}%` }} /></div>
                <div className="mt-2 flex flex-wrap justify-between gap-1 font-mono text-[10px] text-muted-foreground">
                  <span>NV {s.level} · {fmtMinutes(s.minutes)}</span>
                  {w && w.points > 0 && <span>{w.estimated ? "~" : ""}{fmtNum(w.questions)} q · {fmtNum(w.points)} pts</span>}
                </div>
              </div>); })}
          </div>
        </div>;
      })}
    </div>
  );
}

function MatrixView({ skills }: { skills: MasterySkill[] }) {
  const sorted = [...skills.map((s) => s.minutes)].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const highTime = (s: MasterySkill) => s.minutes > 0 && s.minutes >= median;
  const highMastery = (s: MasterySkill) => s.reviewed && s.mastery >= 60;
  const quads = [
    { title: "Ponto de atenção", hint: "Muito tempo, pouca retenção: mude a técnica ou faça mais questões.", tone: "border-warning/50", items: skills.filter((s) => highTime(s) && !highMastery(s)) },
    { title: "Consolidadas", hint: "Muito tempo e alto domínio: manutenção leve.", tone: "border-primary/50", items: skills.filter((s) => highTime(s) && highMastery(s)) },
    { title: "A iniciar", hint: "Pouco tempo e sem domínio comprovado: entram na fila.", tone: "border-border", items: skills.filter((s) => !highTime(s) && !highMastery(s)) },
    { title: "Facilidade natural", hint: "Pouco tempo e alto domínio: não gaste horas extras aqui.", tone: "border-track-accent/50", items: skills.filter((s) => !highTime(s) && highMastery(s)) },
  ];
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex w-5 items-center justify-center"><span className="-rotate-90 whitespace-nowrap font-mono text-[10px] text-muted-foreground">Retenção ↑</span></div>
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          {[3, 1, 2, 0].map((i) => quads[i]!).map((q) => (
            <div key={q.title} className={cn("min-h-32 rounded-lg border-2 border-dashed p-3", q.tone)}>
              <p className="font-semibold">{q.title} <span className="font-mono text-xs text-muted-foreground">({q.items.length})</span></p>
              <p className="mb-2 text-xs text-muted-foreground">{q.hint}</p>
              <div className="flex flex-wrap gap-1.5">
                {q.items.map((s) => <span key={s.id} title={`${s.name} · ${fmtMinutes(s.minutes)} · ${s.reviewed ? `${s.mastery}%` : "não avaliado"}`}
                  className="rounded-md border bg-card px-2 py-1 text-xs">{s.name} <span className="font-mono text-[10px] text-muted-foreground">{s.reviewed ? `${s.mastery}%` : "—"}</span></span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">Tempo investido → (divisão pela mediana: {fmtMinutes(median)})</p>
    </div>
  );
}

const short = (n: string) => (n.split(/,| e /)[0] ?? n).trim();

function RadarTick({ x, y, payload, textAnchor }: { x?: number; y?: number; payload?: { value: string }; textAnchor?: "start" | "middle" | "end" | "inherit" }) {
  const words = short(payload?.value ?? "").split(" ");
  const lines: string[] = [];
  for (const w of words) { const last = lines[lines.length - 1]; if (last && (last + " " + w).length <= 16) lines[lines.length - 1] = last + " " + w; else lines.push(w); }
  return <text x={x} y={y} textAnchor={textAnchor} fill="var(--muted-foreground)" fontSize={11}>
    {lines.slice(0, 3).map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : 13}>{l}</tspan>)}
  </text>;
}

function RadarView({ skills }: { skills: MasterySkill[] }) {
  if (skills.length < 3) return <p className="text-sm text-muted-foreground">Crie ao menos 3 competências para ver a teia.</p>;
  return (
    <div className="h-[520px] w-full">
      <ResponsiveContainer>
        <RadarChart data={skills} outerRadius="68%" margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="name" tick={<RadarTick />} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "var(--muted-foreground)", fontSize: 9 }} axisLine={false} tickCount={5} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number, _n, item) => [(item?.payload as MasterySkill)?.reviewed ? `${v}%` : "não avaliado", "Domínio"]} />
          <Radar dataKey="mastery" name="Domínio" stroke="var(--track-accent)" fill="var(--track-accent)" fillOpacity={0.3} strokeWidth={2} dot={{ r: 3, fill: "var(--track-accent)" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
