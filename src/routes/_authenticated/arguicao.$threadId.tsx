import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, TriangleAlert } from "lucide-react";
import { useTrack } from "@/lib/tracks";
import { activitiesQuery } from "@/lib/data";
import { resultsQuery, threadsQuery, threadMessages, type ReviewThread } from "@/lib/reviews";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";

export const Route = createFileRoute("/_authenticated/arguicao/$threadId")({
  head: () => ({ meta: [{ title: "Arguição ativa — sapiens" }, { name: "description", content: "Pratique seu conhecimento com desafios situacionais e acompanhe seu domínio." }, { property: "og:title", content: "Arguição ativa — sapiens" }, { property: "og:description", content: "Pratique seu conhecimento com desafios situacionais e acompanhe seu domínio." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ReviewConversation,
});

function ReviewConversation() {
  const { threadId } = Route.useParams();
  const { trackId } = useTrack();
  const { data: threads, isLoading, error } = useQuery(threadsQuery(trackId));
  const { data: activities = [] } = useQuery(activitiesQuery("approved", trackId));
  const thread = threads?.find(t => t.id === threadId);
  const activity = activities.find(a => a.id === thread?.activity_id);
  if (isLoading) return <p className="text-muted-foreground">Carregando arguição…</p>;
  if (error || !thread || !activity) return <div className="space-y-4"><p>Arguição indisponível nesta trilha.</p><Button asChild variant="outline"><Link to="/review">Voltar à revisão</Link></Button></div>;
  return <Arguicao key={threadId} thread={thread} title={activity.title} />;
}

function Arguicao({ thread, title }: { thread: ReviewThread; title: string }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const { data: results = [] } = useQuery(resultsQuery(thread.track_id));
  const latestResult = results.find(r => r.thread_id === thread.id);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/review-chat",
    headers: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
    fetch: async (url, options) => {
      const response = await fetch(url, options);
      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: "Não foi possível concluir a arguição." }));
        throw new Error(data.message ?? "Não foi possível concluir a arguição.");
      }
      return response;
    },
    body: { threadId: thread.id, trackId: thread.track_id },
  }), [thread.id, thread.track_id]);
  const refresh = async () => {
    await Promise.all(["review-threads", "review-results", "skill-mastery"].map(key => qc.invalidateQueries({ queryKey: [key, thread.track_id] })));
  };
  const { messages, status, sendMessage, stop, setMessages } = useChat({ id: thread.id, messages: threadMessages(thread), transport,
    onError: e => setFailure(e.message), onFinish: async () => { await refresh(); textarea.current?.focus(); },
  });
  const busy = status === "submitted" || status === "streaming";
  const due = new Date(thread.next_review_at).getTime() <= Date.now();
  useEffect(() => { textarea.current?.focus(); }, []);
  useEffect(() => { if (!busy) textarea.current?.focus(); }, [busy]);
  async function start() {
    setFailure(null);
    setMessages(threadMessages(thread));
    await sendMessage({ text: "Iniciar uma nova arguição." }, { body: { action: "question" } });
  }
  async function answer() {
    if (!input.trim() || busy || !thread.question_open) return;
    setFailure(null);
    const text = input.trim();
    setInput("");
    await sendMessage({ text }, { body: { action: "answer" } });
    textarea.current?.focus();
  }
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-start gap-3">
        <Button asChild variant="ghost" size="icon" title="Voltar"><Link to="/review"><ArrowLeft /></Link></Button>
        <div className="min-w-0"><p className="font-mono text-xs text-track-accent">sapiens / Arguição ativa</p><h1 className="mt-1 break-words text-2xl font-bold">{title}</h1></div>
      </div>
      <Conversation className="relative h-[min(60vh,640px)] min-h-64 border-y">
        <ConversationContent className="gap-6 px-1 py-6">
          {!messages.length && <div className="py-10"><p className="font-mono text-sm text-track-accent">sapiens</p><h2 className="mt-2 text-xl font-semibold">Seu conhecimento, em ação.</h2></div>}
          {messages.map(message => <Message key={message.id} from={message.role}>
            <MessageContent className="group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground">
              {message.parts.map((part, i) => <MessagePart key={i} part={part} />)}
            </MessageContent>
          </Message>)}
          {busy && <Shimmer>{status === "submitted" ? "Preparando arguição…" : "Analisando conhecimento…"}</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {failure && <p role="alert" className="break-words text-sm text-destructive">{failure}</p>}
      {latestResult && !thread.question_open && !busy && <div className="border-l-2 border-track-accent pl-4">
        <p className="flex items-center gap-2 font-semibold">{latestResult.score >= 70 ? <CheckCircle2 className="size-4 text-track-accent" /> : <TriangleAlert className="size-4 text-warning" />}{latestResult.score >= 70 ? "Domínio demonstrado" : "Fragilidade na memória"} · {latestResult.score}/100</p>
        <p className="mt-1 text-sm text-muted-foreground">{latestResult.mastery_delta > 0 ? "+" : ""}{latestResult.mastery_delta} de domínio · +{latestResult.xp} XP · próxima revisão em {new Date(thread.next_review_at).toLocaleDateString("pt-BR")}</p>
      </div>}
      {thread.question_open || busy ? <PromptInput onSubmit={answer}>
        <PromptInputTextarea ref={textarea} aria-label="Sua argumentação" placeholder="Minha argumentação…" value={input} onChange={e => setInput(e.target.value)} maxLength={12000} disabled={busy} className="min-h-28" />
        <PromptInputFooter className="justify-end"><PromptInputSubmit status={status} disabled={!busy && !input.trim()} onStop={() => { void stop(); setFailure("Arguição interrompida. Nenhuma avaliação incompleta conta no progresso."); }} aria-label={busy ? "Parar arguição" : "Enviar argumentação"} title={busy ? "Parar arguição" : "Enviar argumentação"} /></PromptInputFooter>
      </PromptInput> : <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{due ? "Revisão disponível" : `Próxima revisão: ${new Date(thread.next_review_at).toLocaleDateString("pt-BR")}`}</p><Button onClick={start} disabled={!due || busy}>Iniciar arguição</Button></div>}
    </div>
  );
}

function MessagePart({ part }: { part: UIMessage["parts"][number] }) {
  if (part.type === "text") return <MessageResponse>{part.text}</MessageResponse>;
  if (part.type === "reasoning") return <details className="text-xs text-muted-foreground"><summary>Análise</summary><MessageResponse>{part.text}</MessageResponse></details>;
  if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
    const toolPart = part as { type: `tool-${string}`; state: "input-streaming" | "input-available" | "output-available" | "output-error"; output?: unknown; errorText?: string };
    return <Tool defaultOpen={false}><ToolHeader title="Avaliação do conhecimento" type="tool-avaliarResposta" state={toolPart.state} /><ToolContent>{toolPart.errorText ? <p className="text-destructive">{toolPart.errorText}</p> : <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(toolPart.output, null, 2)}</pre>}</ToolContent></Tool>;
  }
  return null;
}