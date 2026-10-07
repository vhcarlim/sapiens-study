import { useTrack } from "@/lib/tracks";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { importPastedText } from "@/lib/import.functions";
import { sourcesQuery, todayStr } from "@/lib/data";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PasteImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const { trackId, track } = useTrack();
  const navigate = useNavigate();
  const run = useServerFn(importPastedText);
  const { data: sources = [] } = useQuery(sourcesQuery(trackId));
  const [text, setText] = useState("");
  const [sourceId, setSourceId] = useState("none");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!trackId) return;
    if (!text.trim()) return void toast.error("Cole algum texto primeiro");
    setBusy(true);
    try {
      const r = await run({
        data: { track_id: trackId, text: text.slice(0, 30000), source_id: sourceId === "none" ? null : sourceId, default_date: todayStr() },
      });
      if (!r.count) toast.info("Nenhuma atividade encontrada no texto.");
      else {
        toast.success(`${r.count} atividade(s) enviada(s) para revisão`);
        setText("");
        onOpenChange(false);
        qc.invalidateQueries({ queryKey: ["activities"] });
        navigate({ to: "/review" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na importação");
    }
    setBusy(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Wand2 className="size-5 text-primary" /> Importar colando texto</DialogTitle>
          <DialogDescription>
            Copie o histórico, a lista de aulas concluídas ou um JSON da plataforma e cole abaixo. A IA separa as atividades e tudo vai para a fila de revisão.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>De qual plataforma?</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Detectar / sem fonte</SelectItem>
                {sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            rows={12}
            className="font-mono text-xs"
            placeholder={"Ex.:\nAula 3 - Introdução ao Burp Suite · 12min · concluída em 03/10\nSala 'Nmap' concluída há 2 dias\n..."}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="text-right font-mono text-[10px] text-muted-foreground">{text.length.toLocaleString()}/30.000</p>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Interpretar e enviar para revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
