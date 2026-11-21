import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { listDocuments, saveDocument, deleteDocument } from "@/lib/documents.functions";
import { readPdfPages } from "@/lib/pdf-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sourcesQuery } from "@/lib/data";
export function DocumentMaterials({ trackId, selected, onSelect }: { trackId: string; selected?: string[]; onSelect?: (ids: string[]) => void }) {
  const list = useServerFn(listDocuments), save = useServerFn(saveDocument), remove = useServerFn(deleteDocument);
  const qc = useQueryClient();
  const { data: docs = [], error } = useQuery({ queryKey: ["documents", trackId], queryFn: () => list({ data: { trackId } }) });
  const { data: sources = [] } = useQuery(sourcesQuery(trackId));
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [sourceId, setSourceId] = useState("none");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setFailure("O arquivo deve ter até 25 MB."); return; }
    setBusy(true); setFailure(null);
    try {
      const text = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") ? (await readPdfPages(file)).join("\n") : await file.text();
      if (text.trim().length < 20) throw new Error("Este PDF não tem texto legível. Cole uma transcrição do material para usá-lo como fonte.");
      if (text.length > 500000) throw new Error("Material muito extenso. Separe por capítulo ou seção.");
      setName(file.name.slice(0, 200)); setContent(text);
    } catch (e) { setFailure(e instanceof Error ? e.message : "Não foi possível ler o material."); }
    finally { setBusy(false); }
  }
  async function submit() {
    setBusy(true); setFailure(null);
    try {
      const doc = await save({ data: { trackId, name, content, sourceId: sourceId === "none" ? null : sourceId } });
      await qc.invalidateQueries({ queryKey: ["documents", trackId] });
      if (onSelect) onSelect([...(selected ?? []), doc.id].slice(0, 10));
      setName(""); setContent(""); toast.success("Material salvo nesta trilha.");
    } catch (e) { setFailure(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  return <section className="space-y-4">
    <div className="flex items-center gap-2"><FileText className="size-4 text-track-accent" /><h2 className="font-medium">Leis e materiais da trilha</h2></div>
    <p className="text-xs text-muted-foreground">Seus documentos e questões baseadas neles permanecem privados. PDF com texto ou TXT.</p>
    {error && <p className="text-sm text-destructive">Não foi possível carregar os materiais.</p>}
    <ul className="divide-y border-y">{docs.map((doc) => <li key={doc.id} className="flex items-center gap-3 py-3 text-sm">
      {onSelect && <Checkbox id={`doc-${doc.id}`} aria-label={`Usar ${doc.name}`} checked={selected?.includes(doc.id) ?? false} onCheckedChange={(checked) => onSelect(checked ? [...(selected ?? []), doc.id].slice(0, 10) : (selected ?? []).filter((id) => id !== doc.id))} />}
      <label htmlFor={`doc-${doc.id}`} className="min-w-0 flex-1 break-words">{doc.name}</label>
      <Button size="icon" variant="ghost" aria-label={`Excluir ${doc.name}`} disabled={busy} onClick={async () => { try { await remove({ data: { trackId, id: doc.id } }); onSelect?.((selected ?? []).filter((id) => id !== doc.id)); await qc.invalidateQueries({ queryKey: ["documents", trackId] }); } catch { toast.error("Não foi possível excluir o material."); } }}><Trash2 className="size-4" /></Button>
    </li>)}</ul>
    <details className="border-b pb-3" open={!docs.length || undefined}><summary className="cursor-pointer text-sm font-medium">Adicionar material</summary>
      <div className="mt-3 space-y-3">
        <label className="flex items-center gap-2 text-sm"><Upload className="size-4" /><Input aria-label="Enviar PDF ou TXT" type="file" accept=".pdf,.txt,application/pdf,text/plain" disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} /></label>
        <Input aria-label="Nome do documento" placeholder="Nome da lei ou material" value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
        <Textarea aria-label="Texto do material" placeholder="Cole o texto da lei ou material" value={content} maxLength={500000} onChange={(e) => setContent(e.target.value)} className="min-h-28" />
        <Select value={sourceId} onValueChange={setSourceId}><SelectTrigger aria-label="Vincular material à fonte"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem vínculo com plataforma</SelectItem>{sources.map((source) => <SelectItem key={source.id} value={source.id}>{source.name}</SelectItem>)}</SelectContent></Select>
        <Button size="sm" disabled={busy || !name.trim() || content.trim().length < 20} onClick={() => void submit()}>{busy && <Loader2 className="size-4 animate-spin" />}Salvar material</Button>
      </div>
    </details>
    {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
  </section>;
}