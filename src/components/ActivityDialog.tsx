import { AIControls } from "@/components/AIControls";
import { useTrack } from "@/lib/tracks";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  type Activity,
  saveActivity,
  skillsQuery,
  todayStr,
} from "@/lib/data";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { activityXp, celebrateReward } from "@/lib/gamification";
import { List, Wand2, Undo2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { organizeSummary } from "@/lib/summary.functions";
import { reviewEligible } from "@/lib/study-day";
import { topicOptions } from "@/lib/syllabus";
import { MATERIALS, PERCEPTIONS, PHASES, phaseToType } from "@/lib/study-meta";

const schema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  quantity: z.number().int().min(0).max(10000),
  minutes: z.number().int().min(0).max(100000),
  xp: z.number().int().min(0).max(10000000),
  notes: z.string().max(2000),
  knowledge_summary: z.string().trim().max(12000, "O resumo deve ter até 12.000 caracteres"),
});

export function ActivityDialog({
  open,
  onOpenChange,
  activity,
  approveOnSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activity?: Activity | null;
  approveOnSave?: boolean;
}) {
  const qc = useQueryClient();
  const { trackId, track } = useTrack();
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const [f, setF] = useState({
    material: "pdf",
    phase: "theory",
    perception: 0,
    date: todayStr(),
    type: "lesson",
    title: "",
    quantity: "1",
    hours: "0",
    mins: "30",
    xp: "0",
    notes: "",
    knowledge_summary: "",
    syllabus_topic: "",
    skill_ids: [] as string[],
  });
  const topics = topicOptions(skills, f.skill_ids);
  const [busy, setBusy] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [originalSummary, setOriginalSummary] = useState<string | null>(null);
  const organize = useServerFn(organizeSummary);
  async function organizeNotes() {
    const original = f.knowledge_summary;
    setOrganizing(true);
    try {
      const result = await organize({ data: { trackId, text: original } });
      setOriginalSummary(original);
      setF(p => p.knowledge_summary === original ? { ...p, knowledge_summary: result.text } : p);
    } catch(e) { toast.error(e instanceof Error ? e.message : "Suas notas foram preservadas."); }
    finally { setOrganizing(false); }
  }

  useEffect(() => {
    if (!open) return;
    setOriginalSummary(null);
    if (activity) {
      setF({
        material: activity.material ?? "other",
        phase: activity.phase ?? "theory",
        perception: activity.perception ?? 0,
        date: activity.date,
        type: activity.type,
        title: activity.title,
        quantity: String(activity.quantity),
        hours: String(Math.floor(activity.minutes / 60)),
        mins: String(activity.minutes % 60),
        xp: String(activity.xp),
        notes: activity.notes ?? "",
        knowledge_summary: activity.knowledge_summary ?? "",
        syllabus_topic: activity.syllabus_topic ?? "",
        skill_ids: activity.activity_skills.map((s) => s.skill_id),
      });
    } else {
      setF((p) => ({ ...p, perception: 0, title: "", notes: "", knowledge_summary: "", syllabus_topic: "", date: todayStr(), skill_ids: [], quantity: "1", xp: "0" }));
    }
  }, [open, activity, trackId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trackId || (activity && activity.track_id !== trackId)) return;
    const minutes = (parseInt(f.hours) || 0) * 60 + (parseInt(f.mins) || 0);
    const parsed = schema.safeParse({
      title: f.title,
      date: f.date,
      quantity: parseInt(f.quantity) || 0,
      minutes,
      xp: parseInt(f.xp) || 0,
      notes: f.notes,
      knowledge_summary: f.knowledge_summary,
    });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
    setBusy(true);
    try {
      await saveActivity({
        track_id: trackId,
        id: activity?.id,
        source_id: activity?.source_id ?? null,
        type: activity && (activity.type === "certificate" || activity.type === "level" || activity.type === "exam") ? activity.type : phaseToType(f.phase),
        material: f.material,
        phase: f.phase,
        perception: f.perception || null,
        skill_ids: f.skill_ids,
        ...parsed.data,
        notes: parsed.data.notes || null,
        knowledge_summary: parsed.data.knowledge_summary || null,
        syllabus_topic: f.syllabus_topic.trim().slice(0, 300) || null,
        ...(approveOnSave || !activity ? { status: "approved" } : {}),
      });
      toast.success(approveOnSave ? "Aprovada e adicionada ao painel" : "Atividade salva");
      const status = approveOnSave || !activity ? "approved" : activity.status;
      const gainedXp = activityXp({ ...parsed.data, status }) - (activity ? activityXp(activity) : 0);
      celebrateReward(trackId, gainedXp, approveOnSave ? "Aprendizado aprovado!" : "Conhecimento conquistado!");
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["review-threads", trackId] });
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar");
    }
    setBusy(false);
  }

  const toggleSkill = (id: string) =>
    setF((p) => ({
      ...p,
      skill_ids: p.skill_ids.includes(id) ? p.skill_ids.filter((x) => x !== id) : [...p.skill_ids, id],
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {approveOnSave ? "Revisar e aprovar" : activity ? "Editar atividade" : "Registrar atividade"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{track?.name}</p>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>O que você fez?</Label>
            <Input
              value={f.title}
              placeholder="Título da atividade"
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Material de estudo</Label>
              <Select value={f.material} onValueChange={(v) => setF({ ...f, material: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fase do ciclo</Label>
              <Select value={f.phase} onValueChange={(v) => setF({ ...f, phase: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PHASES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Como foi a compreensão?</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PERCEPTIONS.map((p) => (
                <Button key={p.value} type="button" size="sm" variant={f.perception === p.value ? "default" : "outline"} className="h-auto whitespace-normal py-1.5 text-xs" aria-pressed={f.perception === p.value} onClick={() => setF({ ...f, perception: f.perception === p.value ? 0 : p.value })}>{p.label}</Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Opcional · matérias marcadas como difíceis ganham prioridade na recomendação</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <Label>Data</Label>
              <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min={0} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Horas</Label>
              <Input type="number" min={0} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Minutos</Label>
              <Input type="number" min={0} max={59} value={f.mins} onChange={(e) => setF({ ...f, mins: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Competências</Label>
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => {
                const on = f.skill_ids.includes(s.id);
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    key={s.id}
                    onClick={() => toggleSkill(s.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.name}
                  </Button>
                );
              })}
            </div>
          </div>
          {(topics.length > 0 || f.syllabus_topic) && (
            <div className="space-y-2">
              <Label htmlFor="syllabus-topic">Tópico do edital</Label>
              <Input id="syllabus-topic" list="syllabus-topic-options" maxLength={300} placeholder="Escolha ou digite um tópico" value={f.syllabus_topic} onChange={(e) => setF({ ...f, syllabus_topic: e.target.value })} />
              <datalist id="syllabus-topic-options">
                {topics.map((t) => <option key={t} value={t} />)}
              </datalist>
              <p className="text-xs text-muted-foreground">Opcional · {topics.length} tópicos das competências selecionadas</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="knowledge-summary">O que aprendi / Resumo do conhecimento</Label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={organizing} onClick={() => setF(p => ({ ...p, knowledge_summary: p.knowledge_summary ? p.knowledge_summary.split("\n").map(line => line.trim() && !line.trim().startsWith("•") ? `• ${line.trim()}` : line).join("\n").slice(0,12000) : "• " }))}><List className="size-4" />Tópicos-chave</Button>
              <Button type="button" variant="outline" size="sm" disabled={organizing || !reviewEligible(f.knowledge_summary)} onClick={organizeNotes}><Wand2 className="size-4" />{organizing ? "Organizando…" : "Organizar com IA"}</Button>
              {originalSummary !== null && <Button type="button" variant="ghost" size="icon-sm" title="Restaurar notas originais" aria-label="Restaurar notas originais" onClick={() => { setF(p => ({ ...p, knowledge_summary: originalSummary })); setOriginalSummary(null); }}><Undo2 /></Button>}
            </div>
          <AIControls feature="summary" contextChars={f.knowledge_summary.length} busy={organizing} />
            <Textarea id="knowledge-summary" rows={4} maxLength={12000} disabled={organizing} placeholder="Com minhas palavras, aprendi que…" value={f.knowledge_summary} onChange={(e) => setF({ ...f, knowledge_summary: e.target.value })} />
            <p className="text-xs text-muted-foreground">Opcional · {f.knowledge_summary.trim().length}/12.000 · +20 XP pelo resumo</p>
            <p className={cn("text-xs", reviewEligible(f.knowledge_summary) ? "text-primary" : "text-warning")}>{reviewEligible(f.knowledge_summary) ? "Conhecimento pronto para arguição ativa." : "Sem ao menos 30 caracteres, a atividade será salva sem arguição ativa."}</p>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy || organizing}>
              {approveOnSave ? "Aprovar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
