import { useTrack } from "@/lib/tracks";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Skill, skillsQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/skills")({
  head: () => ({ meta: [{ title: "Competências — XP Log" }, { name: "description", content: "Organize as competências específicas da sua trilha de estudos." }, { property: "og:title", content: "Competências — XP Log" }, { property: "og:description", content: "Organize as competências específicas da sua trilha de estudos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SkillsPage,
});

function SkillsPage() {
  const { trackId, track } = useTrack();
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#a3e635");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().slice(0, 60);
    if (!n) return;
    const { error } = await supabase.from("skills").insert({ name: n, color, track_id: trackId });
    if (error) return void toast.error(error.code === "23505" ? "Já existe" : "Falha ao criar");
    setName("");
    qc.invalidateQueries({ queryKey: ["skills"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Competências</h1>
        <p className="text-muted-foreground">As áreas que somam no seu gráfico de habilidades.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {skills.map((s) => (
          <SkillRow key={s.id} s={s} />
        ))}
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-lg border border-dashed p-4">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded border bg-transparent" aria-label="Cor" />
        <Input className="max-w-xs" placeholder="Nova competência (ex.: Cloud)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Adicionar</Button>
      </form>
    </div>
  );
}

function SkillRow({ s }: { s: Skill }) {
  const qc = useQueryClient();
  const [name, setName] = useState(s.name);
  async function update(patch: Partial<Skill>) {
    const { error } = await supabase.from("skills").update(patch).eq("id", s.id);
    if (error) toast.error("Falha ao salvar");
    qc.invalidateQueries({ queryKey: ["skills"] });
  }
  async function remove() {
    if (!confirm(`Excluir ${s.name}?`)) return;
    await supabase.from("skills").delete().eq("id", s.id);
    qc.invalidateQueries();
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
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
  );
}
