import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { extractSyllabus, type SyllabusSubject } from "@/lib/syllabus.functions";
import { mergeTopics } from "@/lib/syllabus";
import { selectSyllabusPages } from "@/lib/syllabus-pages";
import type { Skill } from "@/lib/data";

const MAX_PDF = 5 * 1024 * 1024;

type Row = SyllabusSubject & { on: boolean };

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function SyllabusImportDialog({ trackId, skills }: { trackId: string; skills: Skill[] }) {
  const qc = useQueryClient();
  const extract = useServerFn(extractSyllabus);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [role, setRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  function reset(o: boolean) {
    setOpen(o);
    if (!o) { setText(""); setFile(null); setRows(null); setStatus(""); }
  }

  async function read() {
    setBusy(true);
    try {
      const payload: { trackId: string; role?: string; text?: string; file?: { name: string; mediaType: "application/pdf"; base64: string } } = { trackId };
      if (role.trim()) payload.role = role.trim();
      const parts: string[] = [];
      if (file) {
        setStatus("Lendo as páginas do edital…");
        const { readPdfPages } = await import("@/lib/pdf-text");
        const pages = await readPdfPages(file, (d, t) => setStatus(`Lendo página ${d} de ${t}…`));
        const chars = pages.join("").replace(/\s/g, "").length;
        if (chars < pages.length * 40) {
          // Scanned PDF without a text layer: send the file itself.
          if (file.size > MAX_PDF) throw new Error("Este PDF é digitalizado (imagem) e grande demais. Envie só as páginas do conteúdo ou cole o texto.");
          payload.file = { name: file.name, mediaType: "application/pdf", base64: await toBase64(file) };
        } else {
          const sel = selectSyllabusPages(pages, role);
          parts.push(sel.text);
          setStatus(`Analisando ${sel.pages.length} páginas do conteúdo programático${role.trim() ? ` para ${role.trim()}` : ""}…`);
        }
      }
      if (text.trim()) parts.push(text.trim());
      if (parts.length) payload.text = parts.join("\n\n");
      if (!payload.file) setStatus((s) => s || "Analisando o conteúdo…");
      const { subjects } = await extract({ data: payload });
      setRows(subjects.map((s) => ({ ...s, on: true })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ler o edital");
    }
    setStatus("");
    setBusy(false);
  }

  async function save() {
    if (!rows) return;
    setBusy(true);
    try {
      let created = 0, updated = 0;
      for (const r of rows.filter((x) => x.on && x.name.trim())) {
        const existing = skills.find((s) => s.name.trim().toLowerCase() === r.name.trim().toLowerCase());
        if (existing) {
          const { error } = await supabase.from("skills").update({ topics: mergeTopics(existing.topics, r.topics) }).eq("id", existing.id);
          if (error) throw error;
          updated++;
        } else {
          const { error } = await supabase.from("skills").insert({ name: r.name.trim().slice(0, 60), track_id: trackId, topics: mergeTopics([], r.topics) });
          if (error) throw error;
          created++;
        }
      }
      toast.success(`${created} competência(s) criada(s), ${updated} atualizada(s)`);
      qc.invalidateQueries({ queryKey: ["skills"] });
      reset(false);
    } catch {
      toast.error("Não foi possível salvar as matérias");
    }
    setBusy(false);
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><FileUp className="size-4" />Importar edital</Button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Importar conteúdo programático</DialogTitle></DialogHeader>
          {!rows ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Envie o edital completo em PDF e informe seu cargo. A IA pega só os conhecimentos gerais e os específicos do seu cargo, ignorando os demais. Você revisa tudo antes de salvar.</p>
              <div className="space-y-1.5">
                <label htmlFor="syllabus-role" className="text-sm font-medium">Cargo pretendido</label>
                <Input id="syllabus-role" maxLength={200} placeholder="Ex.: Analista Judiciário – Área Administrativa" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="syllabus-file" className="text-sm font-medium">Edital (PDF completo)</label>
                <Input id="syllabus-file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <Textarea rows={5} maxLength={60000} placeholder="Ou cole aqui o conteúdo programático" value={text} onChange={(e) => setText(e.target.value)} />
              {status && <p className="text-sm text-muted-foreground" role="status">{status}</p>}
              <DialogFooter>
                <Button onClick={read} disabled={busy || (!file && text.trim().length < 20)}><Wand2 className="size-4" />{busy ? "Analisando…" : "Ler com IA"}</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Revise antes de salvar. Matérias com o mesmo nome de uma competência existente recebem os novos tópicos.</p>
              {rows.map((r, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={r.on} onCheckedChange={(v) => setRows(rows.map((x, j) => j === i ? { ...x, on: !!v } : x))} aria-label={`Importar ${r.name}`} />
                    <Input value={r.name} maxLength={60} onChange={(e) => setRows(rows.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{r.topics.length} tópicos</span>
                  </div>
                  <ol className="ml-8 list-decimal space-y-0.5 text-xs text-muted-foreground">
                    {r.topics.map((t, k) => <li key={k}>{t}</li>)}
                  </ol>
                </div>
              ))}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setRows(null)}>Voltar</Button>
                <Button onClick={save} disabled={busy || !rows.some((r) => r.on)}>{busy ? "Salvando…" : "Criar competências"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
