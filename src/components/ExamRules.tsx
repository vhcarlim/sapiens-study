import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DIFFICULTY_LABELS, fmtNum, type ExamBlock, type SkillExamWeight, type SkillRule } from "@/lib/exam-rules";

const selectCls = "h-8 w-full rounded-md border border-input bg-background px-2 text-xs";
const toNum = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

function BulkAssignDialog({ trackId, blocks, skills, rules }: { trackId: string; blocks: ExamBlock[]; skills: { id: string; name: string }[]; rules: SkillRule[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const current = (id: string) => rules.find((r) => r.skill_id === id)?.block_id ?? "";
  function openDialog(o: boolean) {
    if (o) setDraft(Object.fromEntries(skills.map((s) => [s.id, current(s.id)])));
    setOpen(o);
  }
  async function save() {
    const changed = skills.filter((s) => (draft[s.id] ?? "") !== current(s.id));
    if (!changed.length) return setOpen(false);
    setSaving(true);
    const rows = changed.map((s) => {
      const r = rules.find((x) => x.skill_id === s.id);
      return { track_id: trackId, skill_id: s.id, block_id: draft[s.id] || null, questions: r?.questions ?? null, weight: r?.weight ?? null, difficulty: r?.difficulty ?? 3 };
    });
    const { error } = await supabase.from("track_skill_rules").upsert(rows, { onConflict: "track_id,skill_id" });
    setSaving(false);
    if (error) return void toast.error("Falha ao distribuir matérias");
    toast.success(`${changed.length} matéria(s) atualizada(s)`);
    qc.invalidateQueries({ queryKey: ["skill_rules", trackId] });
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><LayoutGrid className="size-4" />Distribuir matérias nos blocos</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Distribuir matérias nos blocos</DialogTitle><DialogDescription>Escolha o bloco de cada matéria e salve tudo de uma vez.</DialogDescription></DialogHeader>
        <div className="space-y-2">
          {skills.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-dashed pb-2">
              <span className="text-sm">{s.name}</span>
              <div className="flex flex-wrap justify-end gap-1">
                {[{ id: "", name: "Avulsa" }, ...blocks].map((b) => (
                  <button key={b.id || "none"} type="button" onClick={() => setDraft((d) => ({ ...d, [s.id]: b.id }))}
                    className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors", (draft[s.id] ?? "") === b.id ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary")}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar distribuição"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExamBlocksPanel({ trackId, blocks, weights, skills = [], rules = [] }: { trackId: string; blocks: ExamBlock[]; weights: SkillExamWeight[]; skills?: { id: string; name: string }[]; rules?: SkillRule[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [questions, setQuestions] = useState("");
  const [weight, setWeight] = useState("1");
  const refresh = () => qc.invalidateQueries({ queryKey: ["exam_blocks", trackId] });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().slice(0, 80);
    const q = Number(questions), w = Number(weight.replace(",", "."));
    if (!n || !Number.isInteger(q) || q < 0 || !(w > 0)) return void toast.error("Preencha nome, nº de questões e peso válidos");
    const { error } = await supabase.from("track_exam_blocks").insert({ track_id: trackId, name: n, total_questions: q, weight: w, position: blocks.length });
    if (error) return void toast.error("Falha ao criar bloco");
    setName(""); setQuestions(""); setWeight("1"); refresh();
  }
  async function update(id: string, patch: Partial<ExamBlock>) {
    const { error } = await supabase.from("track_exam_blocks").update(patch).eq("id", id);
    if (error) toast.error("Falha ao salvar bloco");
    refresh();
  }
  async function remove(b: ExamBlock) {
    if (!confirm(`Excluir o bloco ${b.name}? As matérias ficam sem bloco.`)) return;
    await supabase.from("track_exam_blocks").delete().eq("id", b.id);
    refresh(); qc.invalidateQueries({ queryKey: ["skill_rules", trackId] });
  }

  const totalQ = weights.reduce((n, w) => n + w.questions, 0);
  const totalP = weights.reduce((n, w) => n + w.points, 0);

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Estrutura da prova</h2>
          <p className="text-xs text-muted-foreground">Blocos do edital (ex.: Conhecimentos Básicos · 40 questões · peso 1). Sem distribuição por matéria, as questões são divididas igualmente.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{fmtNum(totalQ)} questões · {fmtNum(totalP)} pontos</span>
          {blocks.length > 0 && skills.length > 0 && <BulkAssignDialog trackId={trackId} blocks={blocks} skills={skills} rules={rules} />}
        </div>
      </div>
      {blocks.length > 0 && (
        <div className="space-y-2">
          {blocks.map((b) => {
            const members = weights.filter((w) => w.blockId === b.id);
            return (
              <div key={b.id} className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2">
                <Input defaultValue={b.name} aria-label="Nome do bloco" onBlur={(e) => { const v = e.target.value.trim().slice(0, 80); if (v && v !== b.name) update(b.id, { name: v }); }} />
                <Input type="number" min={0} defaultValue={b.total_questions} aria-label="Questões do bloco" title="Questões" onBlur={(e) => { const v = Number(e.target.value); if (Number.isInteger(v) && v >= 0 && v !== b.total_questions) update(b.id, { total_questions: v }); }} />
                <Input inputMode="decimal" defaultValue={String(b.weight).replace(".", ",")} aria-label="Peso do bloco" title="Peso" onBlur={(e) => { const v = toNum(e.target.value); if (v && v > 0 && v !== Number(b.weight)) update(b.id, { weight: v }); }} />
                <Button size="icon" variant="ghost" onClick={() => remove(b)} aria-label={`Excluir ${b.name}`}><Trash2 className="size-4" /></Button>
                <p className="col-span-4 -mt-1 text-xs text-muted-foreground">{members.length} matéria(s) · {fmtNum(b.total_questions * Number(b.weight))} pontos</p>
              </div>
            );
          })}
        </div>
      )}
      <form onSubmit={add} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 border-t border-dashed pt-3">
        <Input placeholder="Novo bloco (ex.: Conhecimentos Básicos)" value={name} onChange={(e) => setName(e.target.value)} />
        <Input type="number" min={0} placeholder="Questões" value={questions} onChange={(e) => setQuestions(e.target.value)} aria-label="Questões" />
        <Input inputMode="decimal" placeholder="Peso" value={weight} onChange={(e) => setWeight(e.target.value)} aria-label="Peso" />
        <Button type="submit" size="icon" aria-label="Adicionar bloco"><Plus className="size-4" /></Button>
      </form>
    </section>
  );
}

export function SkillRuleEditor({ trackId, skillId, rule, blocks, weight }: { trackId: string; skillId: string; rule: SkillRule | undefined; blocks: ExamBlock[]; weight: SkillExamWeight | undefined }) {
  const qc = useQueryClient();
  async function save(patch: Partial<Pick<SkillRule, "block_id" | "questions" | "weight" | "difficulty">>) {
    const row = { track_id: trackId, skill_id: skillId, block_id: rule?.block_id ?? null, questions: rule?.questions ?? null, weight: rule?.weight ?? null, difficulty: rule?.difficulty ?? 3, ...patch };
    const { error } = await supabase.from("track_skill_rules").upsert(row, { onConflict: "track_id,skill_id" });
    if (error) toast.error("Falha ao salvar regra");
    qc.invalidateQueries({ queryKey: ["skill_rules", trackId] });
  }
  const inBlock = !!rule?.block_id;
  return (
    <div className="space-y-2 rounded-md border border-dashed p-2 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1"><span className="text-muted-foreground">Bloco do edital</span>
          <select className={selectCls} value={rule?.block_id ?? ""} onChange={(e) => save({ block_id: e.target.value || null })}>
            <option value="">Sem bloco (avulsa)</option>
            {blocks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label className="space-y-1"><span className="text-muted-foreground">Minha facilidade</span>
          <select className={selectCls} value={rule?.difficulty ?? 3} onChange={(e) => save({ difficulty: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>)}
          </select>
        </label>
        <label className="space-y-1"><span className="text-muted-foreground">Questões {inBlock && "(opcional)"}</span>
          <Input key={`q-${rule?.questions}`} className="h-8 text-xs" type="number" min={0} placeholder={inBlock ? "Dividir igualmente" : "0"} defaultValue={rule?.questions ?? ""} onBlur={(e) => { const v = toNum(e.target.value); if (v !== (rule?.questions ?? null) && (v === null || (Number.isInteger(v) && v >= 0))) save({ questions: v }); }} />
        </label>
        {!inBlock && (
          <label className="space-y-1"><span className="text-muted-foreground">Peso</span>
            <Input key={`w-${rule?.weight}`} className="h-8 text-xs" inputMode="decimal" placeholder="1" defaultValue={rule?.weight != null ? String(rule.weight).replace(".", ",") : ""} onBlur={(e) => { const v = toNum(e.target.value); if (v !== (rule?.weight ?? null) && (v === null || v > 0)) save({ weight: v }); }} />
          </label>
        )}
      </div>
      {weight && (weight.questions > 0) && (
        <p className="font-mono text-primary">{fmtNum(weight.questions)} questões{weight.estimated ? " estimadas" : ""} · {fmtNum(weight.points)} pontos</p>
      )}
    </div>
  );
}
