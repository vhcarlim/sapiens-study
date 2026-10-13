import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrack } from "@/lib/tracks";
import { skillsQuery, sourcesQuery } from "@/lib/data";
import { parseSheet, sessionTitle } from "@/lib/spreadsheet-import";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

export function SpreadsheetImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { trackId } = useTrack();
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const { data: sources = [] } = useQuery(sourcesQuery(trackId));
  const [text, setText] = useState("");
  const [sourceId, setSourceId] = useState("none");
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try { return { ...parseSheet(text), error: null }; } catch (e) { return { sessions: [], skipped: 0, error: (e as Error).message }; }
  }, [text]);
  const subjects = useMemo(() => {
    const map = new Map<string, number>();
    parsed?.sessions.forEach((s) => map.set(s.subject, (map.get(s.subject) ?? 0) + s.minutes));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [parsed]);
  const total = subjects.reduce((n, [, m]) => n + m, 0);
  const known = new Map(skills.map((s) => [s.name.trim().toLowerCase(), s.id]));

  async function readFile(f: File | undefined) {
    if (!f) return;
    if (/\.(xlsx|xls)$/i.test(f.name)) {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]!]!;
        setText(XLSX.utils.sheet_to_csv(ws, { FS: "\t", dateNF: "dd/mm/yyyy hh:mm", blankrows: false }));
      } catch {
        toast.error("Não foi possível ler o arquivo Excel");
      }
      return;
    }
    if (!/\.(csv|tsv|txt)$/i.test(f.name)) return void toast.error("Envie um arquivo .xlsx, .xls ou .csv");
    setText(await f.text());
  }

  async function submit() {
    if (!trackId || !parsed?.sessions.length) return;
    setBusy(true);
    try {
      const ids = new Map(known);
      const missing = subjects.map(([n]) => n).filter((n) => !ids.has(n.toLowerCase()));
      if (missing.length) {
        const { data, error } = await supabase.from("skills").insert(missing.map((name) => ({ name, track_id: trackId }))).select("id,name");
        if (error) throw error;
        data.forEach((s) => ids.set(s.name.toLowerCase(), s.id));
      }
      const src = sourceId === "none" ? null : sourceId;
      const all = parsed.sessions;
      for (let i = 0; i < all.length; i += 200) {
        const chunk = all.slice(i, i + 200);
        const { data, error } = await supabase.from("activities").insert(chunk.map((s) => ({
          track_id: trackId, source_id: src, date: s.date, type: "lesson", title: sessionTitle(s),
          quantity: 1, minutes: s.minutes, notes: s.notes, syllabus_topic: s.content, status: "pending",
        }))).select("id");
        if (error) throw error;
        const links = data.map((a, k) => ({ activity_id: a.id, skill_id: ids.get(chunk[k]!.subject.toLowerCase())! })).filter((l) => l.skill_id);
        if (links.length) { const { error: e2 } = await supabase.from("activity_skills").insert(links); if (e2) throw e2; }
      }
      toast.success(`${all.length} sessões enviadas para revisão`);
      setText("");
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["skills"] });
      navigate({ to: "/review" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na importação");
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-primary" /> Importar planilha</DialogTitle>
          <DialogDescription>
            Colunas aceitas: Início, Matéria, Conteúdo, Duração, Duração (minutos) e Anotações. Envie o CSV ou copie as linhas da planilha (com o cabeçalho) e cole abaixo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Arquivo (Excel ou CSV)</Label>
              <Input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={(e) => readFile(e.target.files?.[0])} />
            </div>
            <div className="space-y-2">
              <Label>Fonte</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fonte</SelectItem>
                  {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Textarea rows={6} className="font-mono text-xs" placeholder="Cole aqui as linhas da planilha" value={text} onChange={(e) => setText(e.target.value)} />
          {parsed?.error && <p className="text-sm text-destructive">{parsed.error}</p>}
          {parsed && !parsed.error && (
            <div className="rounded-md border border-border p-3 text-sm">
              <p className="font-medium">{parsed.sessions.length} sessões · {fmt(total)}{parsed.skipped ? ` · ${parsed.skipped} linha(s) ignorada(s)` : ""}</p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-muted-foreground">
                {subjects.map(([n, m]) => (
                  <li key={n} className="flex justify-between gap-2">
                    <span>{n} {!known.has(n.toLowerCase()) && <span className="text-primary">(nova competência)</span>}</span>
                    <span className="font-mono">{fmt(m)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !parsed?.sessions.length}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Enviar para revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
