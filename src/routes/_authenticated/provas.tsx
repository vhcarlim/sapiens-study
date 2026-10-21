import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Award, Check, FileUp, Loader2, MessageSquare, Pencil, Play, Trash2, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useTrack } from "@/lib/tracks";
import { supabase } from "@/integrations/supabase/client";
import { examBadge, examPercent, pastExamsQuery, type ExamQuestion, type PastExam } from "@/lib/past-exams";
import { discussPastExamQuestion, extractPastExam } from "@/lib/past-exams.functions";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { readPdfPages } from "@/lib/pdf-text";
import { todayStr } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/provas")({
  head: () => ({ meta: [
    { title: "Provas anteriores · Sapiens Study" },
    { name: "description", content: "Importe provas anteriores com gabarito, pratique na Arena e conquiste insígnias pelo seu desempenho." },
    { property: "og:title", content: "Provas anteriores · Sapiens Study" },
    { property: "og:description", content: "Pratique com provas reais da banca e registre seus acertos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Provas,
});

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Algo deu errado.");

function Provas() {
  const { trackId, track } = useTrack();
  const { data: exams = [], isLoading } = useQuery(pastExamsQuery(trackId));
  const [importing, setImporting] = useState(false);
  const [scoring, setScoring] = useState<PastExam | "new" | null>(null);
  const [practice, setPractice] = useState<PastExam | null>(null);
  const [renaming, setRenaming] = useState<PastExam | null>(null);
  const qc = useQueryClient();

  async function remove(e: PastExam) {
    if (!confirm(`Excluir "${e.title}"?`)) return;
    const { error } = await supabase.from("past_exams").delete().eq("id", e.id);
    if (error) toast.error("Não foi possível excluir");
    await qc.invalidateQueries({ queryKey: ["past-exams", trackId] });
  }

  if (practice) return <Practice key={practice.id} exam={practice} onExit={() => setPractice(null)} />;

  return <div className="mx-auto max-w-3xl space-y-8">
    <header>
      <Button variant="ghost" size="sm" asChild><Link to="/arena"><ArrowLeft className="size-4" />Arena</Link></Button>
      <p className="mt-3 font-mono text-xs text-track-accent">PROVAS ANTERIORES · {track?.name?.toUpperCase()}</p>
      <h1 className="mt-1 text-3xl font-bold">Treine com a prova real</h1>
      <p className="mt-2 text-muted-foreground">Envie a prova e o gabarito oficial para praticar questão a questão, ou registre quanto você acertou para ganhar insígnias.</p>
    </header>
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => setImporting(true)}><FileUp className="size-4" />Importar prova e gabarito</Button>
      <Button variant="outline" onClick={() => setScoring("new")}><Award className="size-4" />Registrar nota de prova feita no papel</Button>
    </div>
    {isLoading ? <p className="text-muted-foreground">Carregando…</p> : !exams.length ? <p className="text-sm text-muted-foreground">Nenhuma prova ainda nesta trilha.</p> :
      <div className="divide-y rounded-lg border">{exams.map((e) => {
        const badge = examBadge(e.score_correct, e.score_total);
        return <div key={e.id} className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold">{e.title}</p>
            <p className="text-xs text-muted-foreground">{e.questions.length ? `${e.questions.length} questões` : "Sem questões importadas"}{e.score_total ? ` · ${e.score_correct}/${e.score_total} (${examPercent(e.score_correct ?? 0, e.score_total)}%)` : ""}</p>
            {badge && <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-track-accent"><Award className="size-3.5" />{badge.name}</p>}
          </div>
          {e.questions.length > 0 && <Button size="sm" onClick={() => setPractice(e)}><Play className="size-4" />Praticar</Button>}
          <Button size="sm" variant="outline" onClick={() => setScoring(e)}>Registrar acertos</Button>
          <Button size="icon" variant="ghost" aria-label={`Editar nome de ${e.title}`} onClick={() => setRenaming(e)}><Pencil className="size-4" /></Button>
          <Button size="icon" variant="ghost" aria-label={`Excluir ${e.title}`} onClick={() => remove(e)}><Trash2 className="size-4 text-destructive" /></Button>
        </div>;
      })}</div>}
    <ImportDialog open={importing} onOpenChange={setImporting} trackId={trackId} />
    {scoring && <ScoreDialog exam={scoring === "new" ? null : scoring} trackId={trackId} onClose={() => setScoring(null)} />}
    {renaming && <RenameDialog exam={renaming} onClose={() => setRenaming(null)} />}
  </div>;
}

async function fileText(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return (await readPdfPages(file)).map((p, i) => `[[PÁGINA ${i + 1}]]\n${p}`).join("\n");
  return file.text();
}

function ImportDialog({ open, onOpenChange, trackId }: { open: boolean; onOpenChange: (v: boolean) => void; trackId: string }) {
  const extract = useServerFn(extractPastExam);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [examFile, setExamFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [keyText, setKeyText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!examFile || !title.trim()) return;
    try {
      setBusy("Lendo a prova…");
      const exam = (await fileText(examFile)).slice(0, 300000);
      const key = (keyFile ? await fileText(keyFile) : keyText).slice(0, 60000);
      if (exam.replace(/\s/g, "").length < 200) throw new Error("A prova parece ser digitalizada (imagem). Envie um PDF com texto selecionável.");
      if (key.trim().length < 5) throw new Error("Envie ou cole o gabarito.");
      setBusy("A IA está separando as questões e o gabarito…");
      const questions = await extract({ data: { exam, key, role: role.trim() || undefined } });
      const { error } = await supabase.from("past_exams").insert({ track_id: trackId, title: title.trim().slice(0, 200), questions });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["past-exams", trackId] });
      toast.success(`${questions.length} questões importadas`);
      setTitle(""); setExamFile(null); setKeyFile(null); setKeyText("");
      onOpenChange(false);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(null); }
  }

  return <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Importar prova anterior</DialogTitle><DialogDescription>A prova precisa ter texto selecionável. Questões anuladas ficam de fora.</DialogDescription></DialogHeader>
      <form onSubmit={run} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="pe-title">Nome da prova</Label><Input id="pe-title" required maxLength={200} placeholder="Ex.: Analista Judiciário 2023" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="pe-exam">Caderno de questões (PDF)</Label><Input id="pe-exam" type="file" accept="application/pdf,.pdf,.txt" onChange={(e) => setExamFile(e.target.files?.[0] ?? null)} /></div>
        <div className="space-y-2"><Label htmlFor="pe-key">Gabarito (PDF ou texto)</Label><Input id="pe-key" type="file" accept="application/pdf,.pdf,.txt" onChange={(e) => setKeyFile(e.target.files?.[0] ?? null)} />
          {!keyFile && <Textarea placeholder="Ou cole aqui: 1-A 2-C 3-E…" value={keyText} onChange={(e) => setKeyText(e.target.value)} rows={3} />}</div>
        <div className="space-y-2"><Label htmlFor="pe-role">Cargo / tipo de prova (opcional)</Label><Input id="pe-role" maxLength={200} placeholder="Use se o gabarito tiver vários cargos" value={role} onChange={(e) => setRole(e.target.value)} /></div>
        <div className="flex items-center justify-end gap-3">{busy && <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{busy}</span>}<Button type="submit" disabled={!!busy || !examFile || !title.trim()}>Importar</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

function ScoreDialog({ exam, trackId, onClose }: { exam: PastExam | null; trackId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(exam?.title ?? "");
  const [correct, setCorrect] = useState(exam?.score_correct?.toString() ?? "");
  const [total, setTotal] = useState((exam?.score_total ?? (exam?.questions.length || "")).toString());
  const [busy, setBusy] = useState(false);
  const c = Number(correct), t = Number(total);
  const valid = Number.isInteger(c) && Number.isInteger(t) && t > 0 && c >= 0 && c <= t && correct !== "" && title.trim();
  const badge = valid ? examBadge(c, t) : null;
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    const row = { score_correct: c, score_total: t, taken_at: todayStr() };
    const { error } = exam ? await supabase.from("past_exams").update(row).eq("id", exam.id) : await supabase.from("past_exams").insert({ ...row, track_id: trackId, title: title.trim().slice(0, 200) });
    setBusy(false);
    if (error) { toast.error("Não foi possível salvar"); return; }
    await qc.invalidateQueries({ queryKey: ["past-exams", trackId] });
    toast.success(badge ? `Insígnia conquistada: ${badge.name}` : "Nota registrada");
    onClose();
  }
  return <Dialog open onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Registrar acertos</DialogTitle><DialogDescription>70% vale Nota de Corte, 80% Alto Rendimento, 90% Domínio de Elite e 100% Gabaritou.</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        {!exam && <div className="space-y-2"><Label htmlFor="sc-title">Nome da prova</Label><Input id="sc-title" required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor="sc-c">Acertos</Label><Input id="sc-c" type="number" min={0} value={correct} onChange={(e) => setCorrect(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="sc-t">Total de questões</Label><Input id="sc-t" type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} /></div>
        </div>
        {badge && <p className="flex items-center gap-2 text-sm text-track-accent"><Award className="size-4" />{examPercent(c, t)}% · {badge.name}</p>}
        <div className="flex justify-end"><Button type="submit" disabled={!valid || busy}>Salvar</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

function RenameDialog({ exam, onClose }: { exam: PastExam; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(exam.title);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim().slice(0, 200);
    if (!t) return;
    setBusy(true);
    const { error } = await supabase.from("past_exams").update({ title: t }).eq("id", exam.id);
    setBusy(false);
    if (error) { toast.error("Não foi possível renomear"); return; }
    await qc.invalidateQueries({ queryKey: ["past-exams", exam.track_id] });
    toast.success("Nome atualizado");
    onClose();
  }
  return <Dialog open onOpenChange={(v) => !v && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>Editar nome da prova</DialogTitle><DialogDescription>Ex.: Técnico Judiciário – TRT 2ª Região – FCC 2024</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="rn-title">Nome da prova</Label><Input id="rn-title" autoFocus required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="flex justify-end"><Button type="submit" disabled={busy || !title.trim()}>Salvar</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

type Chat = { role: "user" | "assistant"; content: string };

function Practice({ exam, onExit }: { exam: PastExam; onExit: () => void }) {
  const qc = useQueryClient();
  const { track } = useTrack();
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [chats, setChats] = useState<Record<number, Chat[]>>({});
  const [index, setIndex] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const q: ExamQuestion | undefined = exam.questions[index];
  const answered = Object.keys(picks).length;
  const hits = exam.questions.filter((x, i) => picks[i] === x.answer).length;
  async function finish() {
    if (answered) {
      const { error } = await supabase.from("past_exams").update({ score_correct: hits, score_total: answered, taken_at: todayStr() }).eq("id", exam.id);
      if (error) toast.error("Não foi possível salvar o resultado");
      else {
        const badge = examBadge(hits, answered);
        const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
        toast.success(`${hits}/${answered} acertos em ${minutes} min${badge ? ` · ${badge.name}` : ""}`);
        await qc.invalidateQueries({ queryKey: ["past-exams", exam.track_id] });
      }
    }
    onExit();
  }
  if (!q) return null;
  const picked = picks[index];
  return <div className="mx-auto max-w-2xl space-y-6">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="font-mono text-xs text-track-accent">{exam.title.toUpperCase()}{track?.exam_board ? ` · ${track.exam_board}` : ""}</p><p className="text-sm text-muted-foreground">Questão {index + 1} de {exam.questions.length} · {hits}/{answered} acertos</p></div>
      <Button variant="outline" onClick={finish}>Encerrar e salvar</Button>
    </div>
    <p className="whitespace-pre-line">{q.number}. {q.statement}</p>
    <div className="space-y-2">{q.options.map((o) => {
      const isAnswer = o.letter === q.answer, isPick = o.letter === picked;
      return <button key={o.letter} type="button" disabled={!!picked} onClick={() => setPicks({ ...picks, [index]: o.letter })}
        className={cn("flex w-full gap-3 rounded-md border p-3 text-left text-sm transition-colors", !picked && "hover:bg-secondary", picked && isAnswer && "border-track-accent bg-track-accent/10", picked && isPick && !isAnswer && "border-destructive bg-destructive/10")}>
        <span className="font-mono font-semibold">{o.letter}</span><span className="flex-1">{o.text}</span>
        {picked && isAnswer && <Check className="size-4 text-track-accent" />}{picked && isPick && !isAnswer && <X className="size-4 text-destructive" />}
      </button>;
    })}</div>
    {picked && <p className="text-sm text-muted-foreground">Gabarito oficial: <strong>{q.answer}</strong></p>}
    {picked && <QuestionChat key={index} exam={exam} q={q} picked={picked} chat={chats[index] ?? []} onChange={(c) => setChats((s) => ({ ...s, [index]: c }))} />}
    <div className="flex justify-between">
      <Button variant="ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>Anterior</Button>
      {index < exam.questions.length - 1 ? <Button onClick={() => setIndex(index + 1)}>Próxima</Button> : <Button onClick={finish}>Finalizar prova</Button>}
    </div>
  </div>;
}

function QuestionChat({ exam, q, picked, chat, onChange }: { exam: PastExam; q: ExamQuestion; picked: string; chat: Chat[]; onChange: (c: Chat[]) => void }) {
  const discuss = useServerFn(discussPastExamQuestion);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  async function send(text: string) {
    text = text.trim(); if (!text || busy) return;
    const next: Chat[] = [...chat, { role: "user", content: text }];
    onChange(next); setInput(""); setBusy(true); setErr(null);
    try {
      const { text: reply } = await discuss({ data: { trackId: exam.track_id, examTitle: exam.title.slice(0, 200), question: JSON.stringify({ number: q.number, statement: q.statement, options: q.options }), answer: q.answer, picked, messages: next.slice(-40) } });
      onChange([...next, { role: "assistant", content: reply }]);
    } catch (e) { setErr(errMsg(e)); onChange(chat); setInput(text); } finally { setBusy(false); textarea.current?.focus(); }
  }
  return <div className="space-y-3">
    <p className="font-mono text-xs text-track-accent">CONVERSE COM A QUESTÃO</p>
    {!chat.length && !busy && <Button size="sm" variant="outline" onClick={() => void send("Explique o fundamento do gabarito e por que cada outra alternativa está errada.")}><MessageSquare className="size-4" />Explicar gabarito e alternativas</Button>}
    {(!!chat.length || busy) && <Conversation className="relative max-h-[50vh] border-y">
      <ConversationContent className="gap-5 px-1 py-5">
        {chat.map((m, i) => <Message key={i} from={m.role}><MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"><MessageResponse>{m.content}</MessageResponse></MessageContent></Message>)}
        {busy && <Shimmer>Analisando a questão…</Shimmer>}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>}
    {err && <p className="text-sm text-destructive">{err}</p>}
    <PromptInput onSubmit={() => void send(input)}>
      <PromptInputTextarea ref={textarea} aria-label="Pergunte sobre a questão" placeholder="Ex.: Por que a letra B não se aplica aqui?" value={input} onChange={(e) => setInput(e.target.value)} maxLength={8000} disabled={busy} />
      <PromptInputFooter className="justify-end"><PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={busy || !input.trim()} aria-label="Enviar pergunta" /></PromptInputFooter>
    </PromptInput>
  </div>;
}
