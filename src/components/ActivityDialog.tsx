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

const schema = z.object({
  title: z.string().trim().min(1, "Informe um título").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  quantity: z.number().int().min(0).max(10000),
  minutes: z.number().int().min(0).max(100000),
  xp: z.number().int().min(0).max(10000000),
  notes: z.string().max(2000),
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
  const { data: sources = [] } = useQuery(sourcesQuery);
  const { data: skills = [] } = useQuery(skillsQuery);
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
    skill_ids: [] as string[],
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
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
        skill_ids: activity.activity_skills.map((s) => s.skill_id),
      });
    } else {
      setF((p) => ({ ...p, title: "", notes: "", date: todayStr(), skill_ids: [], quantity: "1", xp: "0" }));
    }
  }, [open, activity]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const minutes = (parseInt(f.hours) || 0) * 60 + (parseInt(f.mins) || 0);
    const parsed = schema.safeParse({
      title: f.title,
      date: f.date,
      quantity: parseInt(f.quantity) || 0,
      minutes,
      xp: parseInt(f.xp) || 0,
      notes: f.notes,
    });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
    setBusy(true);
    try {
      await saveActivity({
        id: activity?.id,
        source_id: f.source_id || null,
        type: f.type,
        skill_ids: f.skill_ids,
        ...parsed.data,
        notes: parsed.data.notes || null,
        ...(approveOnSave || !activity ? { status: "approved" } : {}),
      });
      toast.success(approveOnSave ? "Aprovada e adicionada ao painel" : "Atividade salva");
      qc.invalidateQueries({ queryKey: ["activities"] });
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
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => toggleSkill(s.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {approveOnSave ? "Aprovar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
