import { AIControls } from "@/components/AIControls";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, Check, Loader2, Swords, Timer, Trophy, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTrack } from "@/lib/tracks";
import { supabase } from "@/integrations/supabase/client";
import { activitiesQuery, saveActivity, skillsQuery, todayStr } from "@/lib/data";
import { computeExamWeights, examBlocksQuery, skillRulesQuery } from "@/lib/exam-rules";
import { masteryQuery } from "@/lib/reviews";
import { EXAM_BOARDS, groupTopics, recommendTopic, sessionMinutes, type ArenaObjective, type ArenaOpen, type ArenaVerdict } from "@/lib/arena";
import { arenaDiscuss, arenaEvaluate, arenaObjective, arenaOpen } from "@/lib/arena.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/arena")({
  validateSearch: z.object({ skill: z.string().optional(), topic: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Arena de estudo ativo · Sapiens Study" },
    { name: "description", content: "Estude um tópico do edital com questões no padrão da banca, debate de alternativas e correção da sua explicação." },
    { property: "og:title", content: "Arena de estudo ativo · Sapiens Study" },
    { property: "og:description", content: "Questões no padrão da banca, debate de alternativas e correção da sua explicação." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Arena,
});

type Chat = { role: "user" | "assistant"; content: string };
type Round = { q: ArenaObjective; picked: string | null; chat: Chat[] };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Algo deu errado.");

function Arena() {
  const { trackId, track } = useTrack();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const { data: acts = [] } = useQuery(activitiesQuery("approved", trackId));
  const withTopics = skills.filter((s) => s.topics?.length);
  const { data: blocks = [] } = useQuery(examBlocksQuery(trackId));
  const { data: rules = [] } = useQuery(skillRulesQuery(trackId));
  const { data: mastery = [] } = useQuery(masteryQuery(trackId));
  const rec = useMemo(() => {
    const w = computeExamWeights(withTopics.map((s) => s.id), blocks, rules);
    return recommendTopic(withTopics, acts, { points: new Map(w.map((x) => [x.skillId, x.points])), difficulty: new Map(w.map((x) => [x.skillId, x.difficulty])), mastery: new Map(mastery.map((m) => [m.skill_id, m.mastery])) });
  }, [withTopics, acts, blocks, rules, mastery]);

  const [skillId, setSkillId] = useState(search.skill ?? "");
  const [topic, setTopic] = useState(search.topic ?? "");
  useEffect(() => { if (!skillId && rec) { setSkillId(rec.skillId); setTopic(rec.topic); } }, [rec, skillId]);
  const skill = skills.find((s) => s.id === skillId);

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [open, setOpen] = useState<{ q: ArenaOpen; answer: string; verdict: ArenaVerdict | null } | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ answered: number; hits: number; minutes: number; skillName: string; topic: string; open: string | null } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!startedAt) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [startedAt]);

  const ctx = { trackId, skillId, topic };
  const current = rounds.at(-1);

  async function setBoard(board: string) {
    const { error } = await supabase.from("study_tracks").update({ exam_board: board }).eq("id", trackId);
    if (error) { toast.error("Não foi possível salvar a banca."); return; }
    await qc.invalidateQueries({ queryKey: ["tracks"] });
  }

  async function nextObjective() {
    setLoading("Elaborando questão no padrão da banca…"); setFailure(null);
    try {
      const q = await arenaObjective({ data: { ...ctx, avoid: rounds.map((r) => r.q.statement.slice(0, 500)) } });
      setRounds((r) => [...r, { q, picked: null, chat: [] }]);
      setStartedAt((s) => s ?? Date.now());
    } catch (e) { setFailure(errMsg(e)); } finally { setLoading(null); }
  }

  async function goOpen() {
    setLoading("Preparando a pergunta discursiva…"); setFailure(null);
    try {
      const q = await arenaOpen({ data: { ...ctx, avoid: open ? [open.q.prompt] : [] } });
      setOpen({ q, answer: "", verdict: null });
    } catch (e) { setFailure(errMsg(e)); } finally { setLoading(null); }
  }

  async function evaluate() {
    if (!open) return;
    setLoading("Corrigindo seu raciocínio…"); setFailure(null);
    try {
      const verdict = await arenaEvaluate({ data: { ...ctx, prompt: open.q.prompt, expected: open.q.expected_points, answer: open.answer } });
      setOpen({ ...open, verdict });
    } catch (e) { setFailure(errMsg(e)); } finally { setLoading(null); }
  }

  async function finish() {
    if (!startedAt || !skill) return;
    const answered = rounds.filter((r) => r.picked);
    const hits = answered.filter((r) => r.picked === r.q.answer).length;
    const notes = [`${hits}/${answered.length} objetivas corretas`, open?.verdict ? `Discursiva: ${open.verdict.verdict} (${open.verdict.score})` : null, track?.exam_board ? `Banca: ${track.exam_board}` : null].filter(Boolean).join(" · ");
    const minutes = sessionMinutes(startedAt, Date.now());
    setLoading("Registrando sessão…");
    try {
      await saveActivity({ track_id: trackId, source_id: null, date: todayStr(), type: "practice", title: `Arena · ${topic}`.slice(0, 200), quantity: Math.max(1, answered.length), minutes, xp: 0, notes, syllabus_topic: topic, skill_ids: [skill.id], status: "approved" });
      await qc.invalidateQueries({ queryKey: ["activities"] });
      setSummary({ answered: answered.length, hits, minutes, skillName: skill.name, topic, open: open?.verdict ? `${open.verdict.verdict} (${open.verdict.score})` : null });
      setLoading(null);
    } catch (e) { toast.error(errMsg(e)); setLoading(null); }
  }

  function restart() {
    setSummary(null); setStartedAt(null); setRounds([]); setOpen(null); setSkillId(""); setTopic(""); setFailure(null);
  }

  const summaryDialog = <Dialog open={!!summary} onOpenChange={(o) => { if (!o) navigate({ to: "/dashboard" }); }}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Trophy className="size-5 text-track-accent" />Sessão concluída!</DialogTitle><DialogDescription>{summary?.skillName} · {summary?.topic}</DialogDescription></DialogHeader>
      {summary && <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md bg-secondary/50 p-3"><p className="font-mono text-2xl font-bold">{summary.answered}</p><p className="text-xs text-muted-foreground">questões</p></div>
        <div className="rounded-md bg-secondary/50 p-3"><p className="font-mono text-2xl font-bold text-primary">{summary.answered ? Math.round((summary.hits / summary.answered) * 100) : 0}%</p><p className="text-xs text-muted-foreground">{summary.hits} acertos</p></div>
        <div className="rounded-md bg-secondary/50 p-3"><p className="font-mono text-2xl font-bold">{summary.minutes}</p><p className="text-xs text-muted-foreground">min de foco</p></div>
      </div>}
      {summary?.open && <p className="text-sm text-muted-foreground">Discursiva: {summary.open}</p>}
      <p className="text-sm text-muted-foreground">O tempo e o XP já entraram no seu painel.</p>
      <DialogFooter className="gap-2"><Button variant="outline" onClick={restart}>Próxima matéria recomendada</Button><Button onClick={() => navigate({ to: "/dashboard" })}>Ver no Painel</Button></DialogFooter>
    </DialogContent>
  </Dialog>;

  if (!startedAt) {
    return <div className="mx-auto max-w-2xl space-y-8">
      <header><p className="font-mono text-xs text-track-accent">ARENA DE ESTUDO ATIVO</p><h1 className="mt-1 text-3xl font-bold">Estude um tópico do edital</h1><p className="mt-2 text-muted-foreground">Questões no padrão da sua banca, debate de cada alternativa e correção da sua explicação. O tempo vira estudo registrado ao encerrar.</p><Button asChild variant="outline" size="sm" className="mt-4"><Link to="/provas">Provas anteriores e gabaritos<ArrowRight className="size-4" /></Link></Button></header>
      <AIControls feature="arena_objective" contextChars={topic.length} busy={!!loading} />
      {!withTopics.length ? <div className="border-l-2 border-track-accent bg-secondary/40 p-5"><p>Importe o conteúdo programático do edital para liberar a Arena.</p><Button asChild className="mt-3" variant="outline"><Link to="/skills">Ir para Competências</Link></Button></div> : <>
        {rec && <button type="button" onClick={() => { setSkillId(rec.skillId); setTopic(rec.topic); }} className={cn("w-full border-l-2 border-track-accent bg-secondary/40 p-5 text-left transition-colors hover:bg-secondary", skillId === rec.skillId && topic === rec.topic && "ring-1 ring-track-accent")}>
          <p className="font-mono text-xs text-track-accent">RECOMENDADO HOJE · {rec.reason === "novo" ? "AINDA NÃO ESTUDADO" : `ÚLTIMO ESTUDO EM ${rec.lastStudied?.split("-").reverse().join("/")}`}</p>
          <p className="mt-1 font-semibold">{rec.skillName}</p><p className="text-sm text-muted-foreground">{rec.topic}</p>
        </button>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm"><span className="text-muted-foreground">Disciplina</span>
            <Select value={skillId} onValueChange={(v) => { setSkillId(v); setTopic(skills.find((s) => s.id === v)?.topics?.[0] ?? ""); }}><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{withTopics.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></label>
          <label className="space-y-1.5 text-sm"><span className="text-muted-foreground">Banca da trilha</span>
            <Select value={track?.exam_board ?? ""} onValueChange={setBoard}><SelectTrigger><SelectValue placeholder="Selecione a banca" /></SelectTrigger><SelectContent>{EXAM_BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></label>
        </div>
        {skill && <TopicPicker topics={skill.topics ?? []} value={topic} onPick={setTopic} />}
        {failure && <p className="text-sm text-destructive">{failure}</p>}
        <Button size="lg" disabled={!skill || !topic || !!loading} onClick={nextObjective}>{loading ? <><Loader2 className="size-4 animate-spin" />{loading}</> : <><Swords className="size-4" />Entrar na Arena</>}</Button>
      </>}
    </div>;
  }

  const elapsed = Math.floor((now - startedAt) / 1000);
  return <div className="mx-auto max-w-3xl space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><p className="font-mono text-xs text-track-accent">{skill?.name.toUpperCase()} · {track?.exam_board ?? "BANCA NÃO DEFINIDA"}</p><h1 className="mt-1 text-xl font-semibold">{topic}</h1></div>
      <div className="flex items-center gap-3"><span className="flex items-center gap-1.5 font-mono text-sm text-muted-foreground"><Timer className="size-4" />{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</span><Button variant="outline" size="sm" disabled={!!loading} onClick={finish}>Encerrar e registrar</Button></div>
    </header>

    <AIControls feature={open ? "arena_evaluate" : "arena_objective"} contextChars={open ? open.answer.length + open.q.prompt.length : topic.length} busy={!!loading} />
    {summaryDialog}
    {!open && current && <ObjectiveCard key={rounds.length} index={rounds.length} round={current} ctx={ctx} onChange={(r) => setRounds((all) => [...all.slice(0, -1), r])} onNext={() => { if (!loading) void nextObjective(); }} />}
    {!open && current && !current.picked && <p className="font-mono text-[11px] text-muted-foreground">Atalhos: tecle a letra da alternativa · Enter avança para a próxima questão</p>}
    {!open && current?.picked && <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={!!loading} onClick={nextObjective}>Outra questão</Button><Button disabled={!!loading} onClick={goOpen}>Explicar com minhas palavras<ArrowRight className="size-4" /></Button></div>}

    {open && <section className="space-y-4">
      <p className="font-mono text-xs text-track-accent">DESAFIO DISCURSIVO</p>
      <MessageResponse>{open.q.prompt}</MessageResponse>
      <Textarea aria-label="Sua explicação" placeholder="Sua explicação" className="min-h-40" value={open.answer} maxLength={8000} disabled={!!open.verdict || !!loading} onChange={(e) => setOpen({ ...open, answer: e.target.value })} />
      {!open.verdict ? <Button disabled={open.answer.trim().length < 3 || !!loading} onClick={evaluate}>Corrigir meu raciocínio</Button> : <Verdict v={open.verdict} />}
      {open.verdict && <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => { setOpen(null); void nextObjective(); }}>Mais questões</Button><Button onClick={finish} disabled={!!loading}>Encerrar e registrar</Button></div>}
    </section>}

    {loading && <Shimmer>{loading}</Shimmer>}
    {failure && <p className="text-sm text-destructive">{failure}</p>}
  </div>;
}

function ObjectiveCard({ index, round, ctx, onChange, onNext }: { index: number; round: Round; ctx: { trackId: string; skillId: string; topic: string }; onChange: (r: Round) => void; onNext: () => void }) {
  const { q, picked } = round;
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const why = (l: string) => q.explanations.find((e) => e.letter === l)?.why;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || t?.closest("input, textarea, select, [contenteditable=true], [role=dialog]")) return;
      if (e.key === "Enter" && picked) { e.preventDefault(); onNext(); return; }
      if (picked) return;
      const opt = q.options.find((o) => o.letter.toUpperCase() === e.key.toUpperCase());
      if (opt) { e.preventDefault(); onChange({ ...round, picked: opt.letter }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, picked, round, onChange, onNext]);

  async function send() {
    const text = input.trim(); if (!text || busy) return;
    const chat: Chat[] = [...round.chat, { role: "user", content: text }];
    onChange({ ...round, chat }); setInput(""); setBusy(true); setErr(null);
    try {
      const { text: reply } = await arenaDiscuss({ data: { ...ctx, question: JSON.stringify(q), picked, messages: chat.slice(-40) } });
      onChange({ ...round, chat: [...chat, { role: "assistant", content: reply }] });
    } catch (e) { setErr(errMsg(e)); onChange({ ...round, chat: round.chat }); setInput(text); } finally { setBusy(false); textarea.current?.focus(); }
  }

  return <section className="space-y-5">
    <p className="font-mono text-xs text-muted-foreground">QUESTÃO {index}</p>
    {q.context && <div className="border-l-2 border-border pl-4 text-sm text-muted-foreground"><MessageResponse>{q.context}</MessageResponse></div>}
    <MessageResponse>{q.statement}</MessageResponse>
    <div className={cn("grid gap-2", q.format === "certo_errado" && "grid-cols-2")}>
      {q.options.map((o) => {
        const isAns = o.letter === q.answer, isPick = o.letter === picked;
        return <div key={o.letter} className="space-y-1">
          <button type="button" disabled={!!picked} onClick={() => onChange({ ...round, picked: o.letter })} className={cn("flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors enabled:hover:border-track-accent", picked && isAns && "border-primary bg-primary/10", picked && isPick && !isAns && "border-destructive bg-destructive/10")}>
            <span className="font-mono font-bold">{o.letter}</span><span className="flex-1">{o.text}</span>{picked && isAns && <Check className="size-4 text-primary" />}{picked && isPick && !isAns && <X className="size-4 text-destructive" />}
          </button>
          {picked && why(o.letter) && <p className="px-4 text-xs text-muted-foreground">{why(o.letter)}</p>}
        </div>;
      })}
    </div>
    {picked && <div className="space-y-2 rounded-md bg-secondary/40 p-4 text-sm">
      <p className={picked === q.answer ? "font-semibold text-primary" : "font-semibold text-destructive"}>{picked === q.answer ? "Você acertou." : `Gabarito: ${q.answer}.`}</p>
      <p><span className="text-muted-foreground">Pegadinha: </span>{q.trap}</p>
      <p><span className="text-muted-foreground">Fundamento: </span>{q.basis}</p>
    </div>}
    {picked && <div className="space-y-3">
      <p className="font-mono text-xs text-track-accent">CONVERSE COM A QUESTÃO</p>
      {!!round.chat.length && <Conversation className="relative max-h-[50vh] border-y">
        <ConversationContent className="gap-5 px-1 py-5">
          {round.chat.map((m, i) => <Message key={i} from={m.role}><MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"><MessageResponse>{m.content}</MessageResponse></MessageContent></Message>)}
          {busy && <Shimmer>Analisando alternativas…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>}
      {err && <p className="text-sm text-destructive">{err}</p>}
      <AIControls feature="arena_discuss" contextChars={JSON.stringify(q).length + round.chat.reduce((n,m) => n+m.content.length,0) + input.length} busy={busy} />
      <PromptInput onSubmit={() => void send()}>
        <PromptInputTextarea ref={textarea} aria-label="Pergunte sobre a questão" placeholder="Pergunte sobre qualquer alternativa" value={input} onChange={(e) => setInput(e.target.value)} maxLength={8000} disabled={busy} />
        <PromptInputFooter className="justify-end"><PromptInputSubmit status={busy ? "submitted" : "ready"} disabled={busy || !input.trim()} aria-label="Enviar pergunta" /></PromptInputFooter>
      </PromptInput>
    </div>}
  </section>;
}

function Verdict({ v }: { v: ArenaVerdict }) {
  const tone = v.verdict === "correto" ? "text-primary" : v.verdict === "parcial" ? "text-warning" : "text-destructive";
  const label = v.verdict === "correto" ? "Raciocínio correto" : v.verdict === "parcial" ? "Parcialmente correto" : "Raciocínio incorreto";
  return <div className="space-y-3 rounded-md bg-secondary/40 p-5 text-sm">
    <p className={cn("font-semibold", tone)}>{label} · {v.score}/100</p>
    <div><p className="text-muted-foreground">O que está certo</p><MessageResponse>{v.correct}</MessageResponse></div>
    <div><p className="text-muted-foreground">O que faltou</p><MessageResponse>{v.missing}</MessageResponse></div>
    <div><p className="text-muted-foreground">Como a banca te pegaria</p><MessageResponse>{v.risk}</MessageResponse></div>
    <details><summary className="cursor-pointer text-muted-foreground">Resposta-modelo</summary><div className="mt-2"><MessageResponse>{v.model_answer}</MessageResponse></div></details>
  </div>;
}

function TopicPicker({ topics, value, onPick }: { topics: string[]; value: string; onPick: (t: string) => void }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    return groupTopics(topics)
      .map((g) => (!term || g.heading?.toLowerCase().includes(term) ? g : { ...g, items: g.items.filter((i) => i.topic.toLowerCase().includes(term)) }))
      .filter((g) => g.items.length);
  }, [topics, q]);
  const item = (i: { topic: string; label: string }, child: boolean, strong = false) => (
    <button key={i.topic} type="button" onClick={() => onPick(i.topic)} className={cn("block w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary", child && "border-l border-border pl-4", strong && "font-medium", i.topic === value && "bg-secondary text-foreground ring-1 ring-track-accent")}>{i.label}</button>
  );
  return <div className="space-y-2">
    <Input aria-label="Filtrar tópicos" placeholder="Filtrar tópicos" value={q} onChange={(e) => setQ(e.target.value)} />
    <div className="max-h-80 space-y-3 overflow-y-auto border-y py-2">
      {groups.map((g, gi) => {
        if (g.heading) return <div key={gi}><p className="px-3 pb-1 pt-2 font-mono text-xs uppercase tracking-wide text-track-accent">{g.heading}</p><div className="ml-3 space-y-0.5">{g.items.map((i) => item(i, true))}</div></div>;
        const [head, ...rest] = g.items;
        if (!head) return null;
        return <div key={gi}>{item(head, false, rest.length > 0)}{rest.length > 0 && <div className="ml-3 space-y-0.5">{rest.map((i) => item(i, true))}</div>}</div>;
      })}
      {!groups.length && <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum tópico encontrado.</p>}
    </div>
  </div>;
}
