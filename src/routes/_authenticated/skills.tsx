import { useTrack } from "@/lib/tracks";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Globe2, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { type Skill, skillsQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activitiesQuery, allActivitiesQuery } from "@/lib/data";
import { allMasteryQuery, allResultsQuery, masteryQuery, resultsQuery } from "@/lib/reviews";
import { skillProgressWithShared, type SkillProgress } from "@/lib/gamification";
import { AnimatedNumber, NeonProgress } from "@/components/Gamification";
import { SyllabusImportDialog } from "@/components/SyllabusImportDialog";

export const Route = createFileRoute("/_authenticated/skills")({
  head: () => ({ meta: [{ title: "Competências — Sapiens Study" }, { name: "description", content: "Organize as competências específicas da sua trilha de estudos." }, { property: "og:title", content: "Competências — Sapiens Study" }, { property: "og:description", content: "Organize as competências específicas da sua trilha de estudos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SkillsPage,
});

function SkillsPage() {
  const { trackId, track } = useTrack();
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const { data: activities = [] } = useQuery(activitiesQuery("approved", trackId));
  const { data: mastery = [] } = useQuery(masteryQuery(trackId));
  const { data: results = [] } = useQuery(resultsQuery(trackId));
  const hasShared = skills.some((s) => s.shared);
  const { data: allActs = [] } = useQuery({ ...allActivitiesQuery(), enabled: hasShared });
  const { data: allMastery = [] } = useQuery({ ...allMasteryQuery(), enabled: hasShared });
  const { data: allResults = [] } = useQuery({ ...allResultsQuery(), enabled: hasShared });
  const progress = skillProgressWithShared(skills, activities, mastery, results, { activities: allActs, mastery: allMastery, results: allResults });
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#a3e635");
  const [shared, setShared] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().slice(0, 60);
    if (!n) return;
    const { error } = await supabase.from("skills").insert({ name: n, color, track_id: trackId, shared });
    if (error) return void toast.error(error.code === "23505" ? "Já existe" : "Falha ao criar");
    setName("");
    setShared(false);
    qc.invalidateQueries({ queryKey: ["skills"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Competências</h1>
          <p className="text-muted-foreground">As áreas que somam no seu gráfico de habilidades.</p>
        </div>
        {trackId && <SyllabusImportDialog trackId={trackId} skills={skills} />}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((s) => (
          <SkillRow key={s.id} s={s} foreign={s.track_id !== trackId} progress={progress.find(p => p.id === s.id)} studied={new Set(activities.filter(a => a.syllabus_topic && a.activity_skills.some(x => x.skill_id === s.id)).map(a => a.syllabus_topic as string))} />
        ))}
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-lg border border-dashed p-4">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded border bg-transparent" aria-label="Cor" />
        <Input className="max-w-xs" placeholder="Nome da competência" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={shared} onCheckedChange={setShared} /> Compartilhada entre trilhas</label>
        <Button type="submit">Adicionar</Button>
      </form>
    </div>
  );
}

function SkillRow({ s, foreign, progress, studied }: { s: Skill; foreign: boolean; progress: SkillProgress | undefined; studied: Set<string> }) {
  const qc = useQueryClient();
  const [name, setName] = useState(s.name);
  async function update(patch: Partial<Skill>) {
    const { error } = await supabase.from("skills").update(patch).eq("id", s.id);
    if (error) toast.error("Falha ao salvar");
    qc.invalidateQueries({ queryKey: ["skills"] });
  }
  async function remove() {
    if (!confirm(s.shared ? `${s.name} é compartilhada: excluir remove a competência e seus vínculos em todas as trilhas. Continuar?` : `Excluir ${s.name}?`)) return;
    await supabase.from("skills").delete().eq("id", s.id);
    qc.invalidateQueries();
  }
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4"><div className="flex items-center gap-2">
      <input
        type="color"
        defaultValue={s.color}
        onBlur={(e) => e.target.value !== s.color && update({ color: e.target.value })}
        className="h-8 w-8 rounded border bg-transparent"
        aria-label="Cor"
      />
      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== s.name && update({ name: name.trim().slice(0, 60) })} />
      <Button size="icon" variant="ghost" onClick={remove} aria-label="Excluir">
        <Trash2 className="size-4" />
      </Button>
      </div>
      <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">{s.shared && <Globe2 className="size-3.5 text-primary" />}{s.shared ? (foreign ? "Compartilhada · vem de outra trilha" : "Compartilhada entre trilhas") : "Só nesta trilha"}</span>
        <Switch checked={s.shared} disabled={foreign} onCheckedChange={(v) => { if (!v && !confirm("Deixar de compartilhar? Ela some das outras trilhas e atividades de lá não poderão mais usá-la.")) return; update({ shared: v }); }} aria-label="Compartilhada entre trilhas" />
      </label>
      {progress && <><div className="flex flex-wrap justify-between gap-2 font-mono text-xs"><span className="text-primary">NV {progress.level} / 10 · {progress.title}</span><span className="text-muted-foreground"><AnimatedNumber value={progress.xp} /> XP</span></div><NeonProgress progress={progress.progress} label={`Nível de ${s.name}`} /><p className="text-xs text-muted-foreground">{progress.maxed ? "Maestria máxima" : `${progress.xpToNext} XP para o próximo nível`}</p></>}
      {s.topics.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{s.topics.length} tópicos do edital · {studied.size} estudados</summary>
          <ol className="mt-2 list-decimal space-y-0.5 pl-5">
            {s.topics.map((t) => <li key={t} className={studied.has(t) ? "text-primary" : "text-muted-foreground"}>{t}</li>)}
          </ol>
        </details>
      )}
    </div>
  );
}
