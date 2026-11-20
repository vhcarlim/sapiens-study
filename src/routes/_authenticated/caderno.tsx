import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookMarked, ChevronRight, Clock, GitBranch, Plus, Search, Star, Trash2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTrack } from "@/lib/tracks";
import { skillsQuery } from "@/lib/data";
import { KINDS, learningsQuery, saveLearnings, type Learning, type LearningKind } from "@/lib/learnings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";

export const Route = createFileRoute("/_authenticated/caderno")({
  head: () => ({ meta: [
    { title: "Caderno de Memória · Sapiens Study" },
    { name: "description", content: "Regras, pegadinhas, erros e dúvidas que você aprendeu na Arena, organizados por tópico do edital." },
    { property: "og:title", content: "Caderno de Memória · Sapiens Study" },
    { property: "og:description", content: "Tudo o que você aprendeu com cada questão, em árvore, atlas ou linha do tempo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Caderno,
});

type View = "tree" | "atlas" | "timeline";
const VIEWS: { id: View; label: string; icon: typeof GitBranch }[] = [
  { id: "tree", label: "Árvore do edital", icon: GitBranch },
  { id: "atlas", label: "Atlas & filtros", icon: Filter },
  { id: "timeline", label: "Linha do tempo", icon: Clock },
];
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

function Caderno() {
  const { trackId } = useTrack();
  const qc = useQueryClient();
  const { data: items = [], isPending: loadingItems } = useQuery(learningsQuery(trackId));
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const skillName = (id: string | null) => skills.find((s) => s.id === id)?.name ?? "Sem matéria";
  const [view, setView] = useState<View>(() => "tree");
  const [adding, setAdding] = useState(false);
  function changeView(next: View) {
    if (!VIEWS.some((v) => v.id === next)) throw new Error("Visualização inválida; escolha tree, atlas ou timeline.");
    setView(next);
  }
  useWebMCP({
    name: "select_notebook_view", description: "Alternar o Caderno entre árvore, atlas e linha do tempo.",
    inputSchema: { type: "object", properties: { view: { type: "string", enum: ["tree", "atlas", "timeline"], description: "Visualização do Caderno." } }, required: ["view"], additionalProperties: false },
    execute: ({ view }: { view: View }) => runWebMCPTool("select_notebook_view", () => { changeView(view); return "Visualização alterada."; }),
  });
  useWebMCP({
    name: "read_notebook_overview", description: "Consultar os contadores de aprendizado exibidos no Caderno da trilha atual.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true },
    execute: () => runWebMCPTool("read_notebook_overview", () => loadingItems ? "Caderno carregando." : (Object.keys(KINDS) as LearningKind[]).map((kind) => `${KINDS[kind].label}: ${items.filter((item) => item.kind === kind).length}`).join("\n")),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["learnings", trackId] });

  async function toggleStar(l: Learning) {
    const { error } = await supabase.from("study_learnings").update({ starred: !l.starred }).eq("id", l.id);
    if (error) toast.error("Não foi possível atualizar."); else refresh();
  }
  async function remove(l: Learning) {
    const { error } = await supabase.from("study_learnings").delete().eq("id", l.id);
    if (error) toast.error("Não foi possível apagar."); else refresh();
  }
  const card = (l: Learning, meta = false) => <LearningCard key={l.id} l={l} meta={meta ? `${skillName(l.skill_id)} · ${l.topic}` : undefined} onStar={() => toggleStar(l)} onDelete={() => remove(l)} />;
  const counts = Object.fromEntries((Object.keys(KINDS) as LearningKind[]).map((k) => [k, items.filter((i) => i.kind === k).length]));

  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="font-mono text-xs text-track-accent">CADERNO DE MEMÓRIA</p><h1 className="mt-1 text-3xl font-bold">O que você aprendeu</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">Cada questão da Arena vira regra, pegadinha, ponto cego e dúvida do chat — guardados no tópico do edital.</p></div>
      <Button onClick={() => setAdding(true)}><Plus className="size-4" />Anotação</Button>
    </header>
    <div className="flex flex-wrap gap-2 text-xs">{(Object.keys(KINDS) as LearningKind[]).map((k) => <span key={k} className={cn("rounded-md border border-l-4 bg-card px-2 py-1", KINDS[k].cls)}>{KINDS[k].label}: <b className="font-mono">{counts[k]}</b></span>)}</div>
    <div role="tablist" className="inline-flex rounded-lg border bg-secondary/40 p-1">
      {VIEWS.map((v) => <Button variant="ghost" key={v.id} role="tab" aria-selected={view === v.id} onClick={() => changeView(v.id)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors", view === v.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}><v.icon className="size-4" />{v.label}</Button>)}
    </div>
    {!items.length ? <div className="border-l-2 border-track-accent bg-secondary/40 p-5"><BookMarked className="mb-2 size-5 text-track-accent" /><p>Seu caderno está vazio. Faça uma sessão na Arena e encerre — os aprendizados de cada questão aparecem aqui.</p><Button asChild variant="outline" className="mt-3"><Link to="/arena">Ir para a Arena</Link></Button></div>
      : view === "tree" ? <TreeView items={items} skillName={skillName} card={card} />
      : view === "atlas" ? <AtlasView items={items} card={card} />
      : <TimelineView items={items} card={card} />}
    <AddDialog open={adding} onClose={() => setAdding(false)} trackId={trackId} skills={skills} onSaved={refresh} />
  </div>;
}

function LearningCard({ l, meta, onStar, onDelete }: { l: Learning; meta?: string | undefined; onStar: () => void; onDelete: () => void }) {
  const k = KINDS[l.kind as LearningKind] ?? KINDS.note;
  return <article className={cn("group rounded-md border border-l-4 bg-card p-3 text-sm", k.cls)}>
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1"><p className="font-mono text-[0.6875rem] text-muted-foreground">{k.tag}{meta ? ` · ${meta}` : ""}</p><p className="mt-0.5 font-medium">{l.title}</p>
        {l.detail && <p className="mt-1 whitespace-pre-line text-muted-foreground">{l.detail}</p>}</div>
      <Button variant="ghost" size="icon" aria-label={l.starred ? "Desfavoritar" : "Favoritar"} onClick={onStar}><Star className={cn("size-4", l.starred && "fill-current text-warning")} /></Button>
      <Button variant="ghost" size="icon" aria-label="Apagar" className="opacity-60 group-hover:opacity-100" onClick={onDelete}><Trash2 className="size-4" /></Button>
    </div>
  </article>;
}

function TreeView({ items, skillName, card }: { items: Learning[]; skillName: (id: string | null) => string; card: (l: Learning) => React.ReactNode }) {
  const tree = useMemo(() => {
    const m = new Map<string, Map<string, Learning[]>>();
    for (const l of items) { const s = l.skill_id ?? "-"; if (!m.has(s)) m.set(s, new Map()); const t = m.get(s)!; const key = l.topic || "Geral"; t.set(key, [...(t.get(key) ?? []), l]); }
    return [...m.entries()].map(([sid, topics]) => ({ sid, name: skillName(sid === "-" ? null : sid), topics: [...topics.entries()].sort((a, b) => b[1].length - a[1].length) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, skillName]);
  return <div className="space-y-3">{tree.map((s) => <details key={s.sid} open className="rounded-lg border bg-card/50">
    <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold [&::-webkit-details-marker]:hidden"><ChevronRight className="size-4 transition-transform [details[open]>summary_&]:rotate-90" />{s.name}<span className="ml-auto font-mono text-xs text-muted-foreground">{s.topics.reduce((n, t) => n + t[1].length, 0)}</span></summary>
    <div className="space-y-2 border-t px-4 py-3">{s.topics.map(([topic, ls]) => <details key={topic} className="ml-2 border-l-2 border-border pl-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 py-1.5 text-sm [&::-webkit-details-marker]:hidden"><ChevronRight className="size-3.5 transition-transform [details[open]>summary_&]:rotate-90" />{topic}
        <span className="ml-auto flex gap-1">{(Object.keys(KINDS) as LearningKind[]).map((k) => { const n = ls.filter((l) => l.kind === k).length; return n ? <span key={k} className={cn("rounded border border-l-4 px-1.5 font-mono text-[0.6875rem]", KINDS[k].cls)}>{n}</span> : null; })}</span></summary>
      <div className="space-y-2 py-2">{ls.map((l) => card(l))}</div>
    </details>)}</div>
  </details>)}</div>;
}

function AtlasView({ items, card }: { items: Learning[]; card: (l: Learning, meta?: boolean) => React.ReactNode }) {
  const [kinds, setKinds] = useState<LearningKind[]>(["trap", "mistake"]);
  const [q, setQ] = useState(""); const [starred, setStarred] = useState(false);
  const list = items.filter((l) => (!kinds.length || kinds.includes(l.kind as LearningKind)) && (!starred || l.starred) && (!q || `${l.title} ${l.detail ?? ""} ${l.topic}`.toLowerCase().includes(q.toLowerCase())));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1"><Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input aria-label="Buscar" placeholder="Buscar no caderno…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {(Object.keys(KINDS) as LearningKind[]).map((k) => <Button key={k} size="sm" variant={kinds.includes(k) ? "default" : "outline"} onClick={() => setKinds((c) => c.includes(k) ? c.filter((x) => x !== k) : [...c, k])}>{KINDS[k].tag}</Button>)}
      <Button size="sm" variant={starred ? "default" : "outline"} onClick={() => setStarred(!starred)}><Star className="size-3.5" />Favoritos</Button>
    </div>
    <p className="font-mono text-xs text-muted-foreground">{list.length} itens</p>
    <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(100%,22rem),1fr))]">{list.map((l) => card(l, true))}</div>
  </div>;
}

function TimelineView({ items, card }: { items: Learning[]; card: (l: Learning, meta?: boolean) => React.ReactNode }) {
  const days = useMemo(() => { const m = new Map<string, Learning[]>(); for (const l of items) { const d = dayKey(l.created_at); m.set(d, [...(m.get(d) ?? []), l]); } return [...m.entries()]; }, [items]);
  return <ol className="relative space-y-8 border-l-2 border-border pl-6">{days.map(([d, ls]) => <li key={d} className="relative">
    <span className="absolute -left-[1.95rem] top-1 size-3 rounded-full border-2 border-background bg-track-accent" />
    <p className="font-mono text-xs uppercase text-track-accent">{fmtDay(ls[0]?.created_at ?? d)} · {ls.length} aprendizados</p>
    <div className="mt-3 space-y-2">{ls.map((l) => card(l, true))}</div>
  </li>)}</ol>;
}

function AddDialog({ open, onClose, trackId, skills, onSaved }: { open: boolean; onClose: () => void; trackId: string; skills: { id: string; name: string; topics: string[] | null }[]; onSaved: () => void }) {
  const [skillId, setSkillId] = useState(""); const [topic, setTopic] = useState(""); const [kind, setKind] = useState<LearningKind>("note");
  const [title, setTitle] = useState(""); const [detail, setDetail] = useState(""); const [busy, setBusy] = useState(false);
  const topics = skills.find((s) => s.id === skillId)?.topics ?? [];
  async function save() {
    setBusy(true);
    try { await saveLearnings({ track_id: trackId, skill_id: skillId || null, topic, source: "manual" }, [{ kind, title: title.trim().slice(0, 500), detail: detail.trim().slice(0, 4000) || null }]); onSaved(); setTitle(""); setDetail(""); onClose(); toast.success("Anotado no caderno"); }
    catch { toast.error("Não foi possível salvar."); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(o) => !o && onClose()}><DialogContent>
    <DialogHeader><DialogTitle>Nova anotação</DialogTitle></DialogHeader>
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={skillId} onValueChange={(v) => { setSkillId(v); setTopic(""); }}><SelectTrigger aria-label="Matéria"><SelectValue placeholder="Matéria" /></SelectTrigger><SelectContent>{skills.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
        <Select value={kind} onValueChange={(v) => setKind(v as LearningKind)}><SelectTrigger aria-label="Tipo"><SelectValue /></SelectTrigger><SelectContent>{(Object.keys(KINDS) as LearningKind[]).map((k) => <SelectItem key={k} value={k}>{KINDS[k].label}</SelectItem>)}</SelectContent></Select>
      </div>
      {!!topics.length && <Select value={topic} onValueChange={setTopic}><SelectTrigger aria-label="Tópico"><SelectValue placeholder="Tópico do edital (opcional)" /></SelectTrigger><SelectContent>{topics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>}
      <Input aria-label="Aprendizado" placeholder="O macete ou fato, em uma linha" maxLength={500} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea aria-label="Detalhes" placeholder="Fundamento, exemplo… (opcional)" maxLength={4000} value={detail} onChange={(e) => setDetail(e.target.value)} />
    </div>
    <DialogFooter><Button disabled={!title.trim() || busy} onClick={save}>Salvar</Button></DialogFooter>
  </DialogContent></Dialog>;
}
