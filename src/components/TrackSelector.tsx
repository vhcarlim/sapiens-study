import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Check, Layers, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TRACK_COLORS, useTrack, type StudyTrack } from "@/lib/tracks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function TrackSelector() {
  const { tracks, track, selectTrack } = useTrack();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudyTrack | null>(null);
  const [deleting, setDeleting] = useState<StudyTrack | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("green");
  const [busy, setBusy] = useState(false);

  function edit(t: StudyTrack | null) {
    setEditing(t);
    setName(t?.name ?? "");
    setColor(t?.color ?? "green");
    setOpen(true);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const row = { name: name.trim().slice(0, 60), color };
      const result = editing
        ? await supabase.from("study_tracks").update(row).eq("id", editing.id).select().single()
        : await supabase.from("study_tracks").insert(row).select().single();
      if (result.error) throw result.error;
      await qc.invalidateQueries({ queryKey: ["tracks"] });
      if (!editing) selectTrack(result.data.id);
      toast.success(editing ? "Trilha atualizada" : "Trilha criada");
      setEditing(null); setName("");
    } catch { toast.error("Não foi possível salvar a trilha"); }
    finally { setBusy(false); }
  }
  async function archive(t: StudyTrack) {
    setBusy(true);
    const { error } = await supabase.from("study_tracks").update({ archived: !t.archived }).eq("id", t.id);
    if (error) toast.error("Não foi possível atualizar a trilha");
    else {
      await qc.invalidateQueries({ queryKey: ["tracks"] });
      toast.success(t.archived ? "Trilha restaurada" : "Trilha arquivada");
    }
    setBusy(false);
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    const { error } = await supabase.from("study_tracks").delete().eq("id", deleting.id);
    if (error) toast.error("Não foi possível excluir a trilha");
    else {
      await qc.invalidateQueries({ queryKey: ["tracks"] });
      qc.removeQueries({ predicate: (q) => q.queryKey.includes(deleting.id) });
      toast.success("Trilha e seus registros excluídos");
      if (editing?.id === deleting.id) { setEditing(null); setName(""); }
    }
    setDeleting(null); setBusy(false);
  }

  return <>
    <div className="flex min-w-0 items-center gap-1">
      {track ? <Select value={track.id} onValueChange={selectTrack}>
        <SelectTrigger aria-label="Trilha ativa" className="w-40 border-transparent bg-secondary/60 sm:w-48">
          <span className="flex min-w-0 items-center gap-2"><span className="size-2 shrink-0 rounded-full bg-track-accent" /><SelectValue /></span>
        </SelectTrigger>
        <SelectContent>{tracks.filter((t) => !t.archived).map((t) => <SelectItem key={t.id} value={t.id}><span data-track-color={t.color} className="flex items-center gap-2"><span className="size-2 rounded-full bg-track-accent" />{t.name}</span></SelectItem>)}</SelectContent>
      </Select> : <Button variant="outline" onClick={() => edit(null)}><Plus className="size-4" /> Nova trilha</Button>}
      <Button variant="ghost" size="icon" aria-label="Gerenciar trilhas" title="Gerenciar trilhas" onClick={() => edit(null)}><Settings2 className="size-4" /></Button>
    </div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Layers className="size-5 text-primary" />Trilhas de estudo</DialogTitle><DialogDescription>{tracks.length} trilha(s) · {tracks.filter((t) => t.archived).length} arquivada(s)</DialogDescription></DialogHeader>
        <div className="divide-y rounded-md border">
          {tracks.map((t) => <div key={t.id} data-track-color={t.color} className="flex items-center gap-2 px-3 py-2">
            <span className="size-2.5 shrink-0 rounded-full bg-track-accent" />
            <span className="min-w-0 flex-1 break-words text-sm">{t.name}{t.archived && <span className="ml-2 text-xs text-muted-foreground">Arquivada</span>}</span>
            {t.id === track?.id && <Check className="size-4 shrink-0 text-track-accent" />}
            <Button size="icon" variant="ghost" disabled={busy} aria-label={`Editar ${t.name}`} title="Renomear e mudar cor" onClick={() => edit(t)}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" disabled={busy} aria-label={`${t.archived ? "Restaurar" : "Arquivar"} ${t.name}`} title={t.archived ? "Restaurar" : "Arquivar"} onClick={() => archive(t)}>{t.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}</Button>
            <Button size="icon" variant="ghost" disabled={busy} aria-label={`Excluir ${t.name}`} title="Excluir trilha" onClick={() => setDeleting(t)}><Trash2 className="size-4 text-destructive" /></Button>
          </div>)}
        </div>
        <form onSubmit={save} className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{editing ? "Editar trilha" : "Nova trilha"}</h3>{editing && <Button type="button" size="sm" variant="ghost" onClick={() => edit(null)}><Plus className="size-4" /> Nova</Button>}</div>
          <div className="space-y-2"><Label htmlFor="track-name">Nome da trilha</Label><Input id="track-name" required maxLength={60} placeholder="Ex.: Cybersecurity ou Concursos" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <fieldset className="space-y-2"><legend className="text-sm font-medium">Cor de destaque</legend><div className="flex flex-wrap gap-2">{TRACK_COLORS.map((c) => <Button key={c.value} type="button" variant="outline" size="icon" data-track-color={c.value} aria-label={c.label} title={c.label} aria-pressed={color === c.value} className={color === c.value ? "border-track-accent ring-1 ring-track-accent" : ""} onClick={() => setColor(c.value)}><span className="flex size-5 items-center justify-center rounded-full bg-track-accent text-track-contrast">{color === c.value && <Check className="size-3" />}</span></Button>)}</div></fieldset>
          <div className="flex justify-end"><Button type="submit" disabled={busy || !name.trim()}>{editing ? <Check className="size-4" /> : <Plus className="size-4" />}{editing ? "Salvar trilha" : "Criar trilha"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir {deleting?.name}?</AlertDialogTitle><AlertDialogDescription>Todas as atividades, competências, fontes e importações desta trilha serão excluídas permanentemente. As outras trilhas não serão afetadas. Para manter os registros, prefira arquivar.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={remove}>Excluir permanentemente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}