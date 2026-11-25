import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flag, ThumbsUp, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { arenaLikeQuestion, arenaReportQuestion } from "@/lib/arena.functions";
import { REPORT_REASONS, type QuestionMeta } from "@/lib/question-quality";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
export function QuestionFeedback({ q, busy, onCorrect }: { q: Partial<QuestionMeta>; busy: boolean; onCorrect: (id: string) => void }) {
  const like = useServerFn(arenaLikeQuestion), report = useServerFn(arenaReportQuestion);
  const [liked, setLiked] = useState(false), [reported, setReported] = useState(false), [dialog, setDialog] = useState(false), [sending, setSending] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]), [details, setDetails] = useState("");
  const id = q.bankId;
  if (!id) return null;
  async function sendReport() {
    if (!id) return;
    const selected = REPORT_REASONS.find((r) => r === reason);
    if (!selected) return;
    setSending(true);
    try { await report({ data: { questionId: id, reason: selected, details } }); setReported(true); setDialog(false); toast.success("Obrigado! A denúncia foi enviada para a revisão da administração."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível relatar."); }
    finally { setSending(false); }
  }
  return <div className="space-y-3 border-y py-3">
    <div className="flex flex-wrap gap-2">
      <Button variant="ghost" size="sm" disabled={liked || reported || sending || busy} onClick={async () => { setSending(true); try { await like({ data: { questionId: id } }); setLiked(true); toast.success("Avaliação registrada."); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível avaliar."); } finally { setSending(false); } }}><ThumbsUp className="size-4" />{liked ? "Você gostou" : "Gostei da questão"}</Button>
      <Button variant="ghost" size="sm" disabled={reported || sending || busy} onClick={() => setDialog(true)}><Flag className="size-4" />{reported ? "Erro relatado" : "Relatar erro"}</Button>
      {q.sourceOrigin === "ai_ephemeral" && q.groundingType === "general_ai" && !reported && <Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/arena?question=${id}`); toast.success("Link de avaliação copiado. O estudante deve escolher a mesma matéria e assunto."); } catch { toast.error("Não foi possível copiar o link."); } }}><Share2 className="size-4" />Compartilhar para avaliação</Button>}
    </div>
    {reported && <div className="space-y-2"><p role="status" className="text-sm text-muted-foreground">Esta questão não será distribuída até ser revisada. A nova versão será identificada como IA.</p><Button variant="outline" size="sm" disabled={busy || sending} onClick={() => onCorrect(id)}><RefreshCw className="size-4" />Gerar versão corrigida agora</Button></div>}
    <Dialog open={dialog} onOpenChange={setDialog}><DialogContent><DialogHeader><DialogTitle>Relatar erro</DialogTitle><DialogDescription>A questão será suspensa imediatamente até revisão.</DialogDescription></DialogHeader>
      <Select value={reason} onValueChange={setReason}><SelectTrigger aria-label="Motivo do relato"><SelectValue /></SelectTrigger><SelectContent>{REPORT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
      <Textarea aria-label="Detalhes do erro" placeholder="Detalhes ou fundamento correto (opcional)" value={details} maxLength={2000} onChange={(e) => setDetails(e.target.value)} />
      <Button disabled={sending} onClick={() => void sendReport()}><Flag className="size-4" />{sending ? "Enviando…" : "Enviar relato"}</Button>
    </DialogContent></Dialog>
  </div>;
}