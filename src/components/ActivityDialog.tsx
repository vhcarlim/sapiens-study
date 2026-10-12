import { useTrack } from "@/lib/tracks";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import {
  ACTIVITY_TYPES,
  type Activity,
  saveActivity,
  skillsQuery,
  sourcesQuery,
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
  const { data: sources = [] } = useQuery(sourcesQuery(trackId));
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const [f, setF] = useState({
    source_id: "",
    date: todayStr(),
    type: "lesson",
    title: "",
    quantity: "1",
    hours: "0",
    mins: "30",
    xp: "0",
    notes: "",
    knowledge_summary: "",
    skill_ids: [] as string[],
  });
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
        source_id: activity.source_id ?? "",
        date: activity.date,
        type: activity.type,
        title: activity.title,
        quantity: String(activity.quantity),
        hours: String(Math.floor(activity.minutes / 60)),
        mins: String(activity.minutes % 60),
        xp: String(activity.xp),
        notes: activity.notes ?? "",
        knowledge_summary: activity.knowledge_summary ?? "",
        skill_ids: activity.activity_skills.map((s) => s.skill_id),
      });
    } else {
      setF((p) => ({ ...p, source_id: "", title: "", notes: "", knowledge_summary: "", date: todayStr(), skill_ids: [], quantity: "1", xp: "0" }));
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
        source_id: f.source_id || null,
        type: f.type,
        skill_ids: f.skill_ids,
        ...parsed.data,
        notes: parsed.data.notes || null,
        knowledge_summary: parsed.data.knowledge_summary || null,
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
              placeholder="Ex.: 5 lições de APIs no PortSwigger"
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select value={f.source_id || "none"} onValueChange={(v) => setF({ ...f, source_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fonte</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <div className="space-y-2">
            <Label htmlFor="knowledge-summary">O que aprendi / Resumo do conhecimento</Label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled={organizing} onClick={() => setF(p => ({ ...p, knowledge_summary: p.knowledge_summary ? p.knowledge_summary.split("\n").map(line => line.trim() && !line.trim().startsWith("•") ? `• ${line.trim()}` : line).join("\n").slice(0,12000) : "• " }))}><List className="size-4" />Tópicos-chave</Button>
              <Button type="button" variant="outline" size="sm" disabled={organizing || !reviewEligible(f.knowledge_summary)} onClick={organizeNotes}><Wand2 className="size-4" />{organizing ? "Organizando…" : "Organizar com IA"}</Button>
              {originalSummary !== null && <Button type="button" variant="ghost" size="icon-sm" title="Restaurar notas originais" aria-label="Restaurar notas originais" onClick={() => { setF(p => ({ ...p, knowledge_summary: originalSummary })); setOriginalSummary(null); }}><Undo2 /></Button>}
            </div>
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
