import { PageSkeleton } from "@/components/PageTransition";
import { AIControls } from "@/components/AIControls";
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
    {isLoading ? <PageSkeleton /> : !exams.length ? <p className="text-sm text-muted-foreground">Nenhuma prova ainda nesta trilha.</p> :
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

const MAX_EXAM_IMAGES = 30;
const MAX_KEY_IMAGES = 6;
const ACCEPT = "application/pdf,.pdf,.txt,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";
const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const isImage = (f: File) => f.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(f.name);

/** Reads uploads into text (digital PDFs/txt) or page images (photos, scanned PDFs). */
async function readUploads(files: File[], range: string, maxImages: number, label: string, status: (s: string) => void) {
  const { readPdfPages, renderPdfPages, imageToJpeg, parsePageRange } = await import("@/lib/pdf-text");
  const texts: string[] = [];
  const images: string[] = [];
  for (const file of files) {
    if (isImage(file)) { status(`Preparando imagem ${file.name}…`); images.push(await imageToJpeg(file)); continue; }
    if (!isPdf(file)) { texts.push(await file.text()); continue; }
    const pages = await readPdfPages(file, (d, t) => status(`Lendo ${label}: página ${d} de ${t}…`));
    const wanted = parsePageRange(range, pages.length) ?? pages.map((_, i) => i + 1);
    const chosen = wanted.filter((n) => n <= pages.length);
    const chars = chosen.reduce((s, n) => s + (pages[n - 1] ?? "").replace(/\s/g, "").length, 0);
    if (chars >= chosen.length * 80) {
      texts.push(chosen.map((n) => `[[PÁGINA ${n}]]\n${pages[n - 1]}`).join("\n"));
    } else {
      if (images.length + chosen.length > maxImages) throw new Error(`O ${label} é digitalizado (imagem) e tem ${chosen.length} páginas. Informe no campo "Páginas" no máximo ${maxImages} páginas (ex.: 1-${maxImages}) e importe o restante depois.`);
      images.push(...await renderPdfPages(file, chosen, (d, t) => status(`Convertendo ${label} digitalizado: página ${d} de ${t}…`)));
    }
  }
  if (images.length > maxImages) throw new Error(`Envie no máximo ${maxImages} imagens para o ${label}.`);
  return { text: texts.join("\n\n"), images };
}

function ImportDialog({ open, onOpenChange, trackId }: { open: boolean; onOpenChange: (v: boolean) => void; trackId: string }) {
  const extract = useServerFn(extractPastExam);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [range, setRange] = useState("");
  const [examFiles, setExamFiles] = useState<File[]>([]);
  const [keyFiles, setKeyFiles] = useState<File[]>([]);
  const [keyText, setKeyText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!examFiles.length || !title.trim()) return;
    try {
      setBusy("Lendo a prova…");
      const exam = await readUploads(examFiles, range, MAX_EXAM_IMAGES, "caderno", setBusy);
      const key = keyFiles.length ? await readUploads(keyFiles, "", MAX_KEY_IMAGES, "gabarito", setBusy) : { text: keyText, images: [] };
      if (exam.text.replace(/\s/g, "").length < 50 && !exam.images.length) throw new Error("Não consegui ler o caderno. Tente outro arquivo ou fotos das páginas.");
      if (key.text.trim().length < 5 && !key.images.length) throw new Error("Envie ou cole o gabarito.");
      setBusy(exam.images.length ? `A IA está lendo ${exam.images.length} página(s) digitalizada(s)… pode levar 1–2 minutos` : "A IA está separando as questões e o gabarito…");
      const questions = await extract({ data: { exam: exam.text.slice(0, 300000), examImages: exam.images, key: key.text.slice(0, 60000), keyImages: key.images, role: role.trim() || undefined } });
      const { error } = await supabase.from("past_exams").insert({ track_id: trackId, title: title.trim().slice(0, 200), questions });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["past-exams", trackId] });
      toast.success(`${questions.length} questões importadas`);
      setTitle(""); setExamFiles([]); setKeyFiles([]); setKeyText(""); setRange("");
      onOpenChange(false);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(null); }
  }

  return <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Importar prova anterior</DialogTitle><DialogDescription>Aceita PDF (com texto ou digitalizado) e fotos/prints das páginas (PNG, JPG). Questões anuladas ficam de fora.</DialogDescription></DialogHeader>
      <form onSubmit={run} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="pe-title">Nome da prova</Label><Input id="pe-title" required maxLength={200} placeholder="Ex.: Analista Judiciário 2023" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="pe-exam">Caderno de questões (PDF ou imagens)</Label><Input id="pe-exam" type="file" multiple accept={ACCEPT} onChange={(e) => setExamFiles(Array.from(e.target.files ?? []))} />
          {examFiles.length > 1 && <p className="text-xs text-muted-foreground">{examFiles.length} arquivos, lidos na ordem selecionada.</p>}</div>
        <div className="space-y-2"><Label htmlFor="pe-range">Páginas do caderno (opcional)</Label><Input id="pe-range" placeholder="Ex.: 2-12 — deixe vazio para ler tudo" value={range} onChange={(e) => setRange(e.target.value)} />
          <p className="text-xs text-muted-foreground">Para PDF digitalizado, até {MAX_EXAM_IMAGES} páginas por importação.</p></div>
        <div className="space-y-2"><Label htmlFor="pe-key">Gabarito (PDF, imagem ou texto)</Label><Input id="pe-key" type="file" multiple accept={ACCEPT} onChange={(e) => setKeyFiles(Array.from(e.target.files ?? []))} />
          {!keyFiles.length && <Textarea placeholder="Ou cole aqui: 1-A 2-C 3-E…" value={keyText} onChange={(e) => setKeyText(e.target.value)} rows={3} />}</div>
        <div className="space-y-2"><Label htmlFor="pe-role">Cargo / tipo de prova (opcional)</Label><Input id="pe-role" maxLength={200} placeholder="Use se o gabarito tiver vários cargos" value={role} onChange={(e) => setRole(e.target.value)} /></div>
        <AIControls feature="exam_import" contextChars={keyText.length} busy={!!busy} />
        <div className="flex items-center justify-end gap-3">{busy && <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{busy}</span>}<Button type="submit" disabled={!!busy || !examFiles.length || !title.trim()}>Importar</Button></div>
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
    <AIControls feature="exam_discuss" contextChars={JSON.stringify(q).length + chat.reduce((n,m) => n+m.content.length,0) + input.length} busy={busy} />
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
