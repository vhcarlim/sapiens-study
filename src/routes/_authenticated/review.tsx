import { useTrack } from "@/lib/tracks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Activity, activitiesQuery, skillsQuery, sourcesQuery } from "@/lib/data";
import { ActivityRow } from "@/components/ActivityRow";
import { ActivityDialog } from "@/components/ActivityDialog";
import { Button } from "@/components/ui/button";
import { threadsQuery, resultsQuery } from "@/lib/reviews";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activityXp, celebrateReward } from "@/lib/gamification";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Revisão — sapiens" }, { name: "description", content: "Revise e aprove as atividades importadas na trilha de estudos selecionada." }, { property: "og:title", content: "Revisão — sapiens" }, { property: "og:description", content: "Revise e aprove as atividades importadas na trilha de estudos selecionada." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const { trackId, track } = useTrack();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(activitiesQuery("pending", trackId));
  const { data: sources = [] } = useQuery(sourcesQuery(trackId));
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const [editing, setEditing] = useState<Activity | null>(null);
  const [summaryEditing, setSummaryEditing] = useState<Activity | null>(null);
  const { data: approved = [] } = useQuery(activitiesQuery("approved", trackId));
  const { data: threads = [], error: threadsError } = useQuery(threadsQuery(trackId));
  const { data: results = [] } = useQuery(resultsQuery(trackId));
  const now = Date.now();
  const due = threads.filter(t => t.question_open || new Date(t.next_review_at).getTime() <= now);
  const upcoming = threads.filter(t => !t.question_open && new Date(t.next_review_at).getTime() > now);
  const withoutSummary = approved.filter(a => !a.knowledge_summary?.trim());

  async function setStatus(ids: string[], status: "approved" | "rejected") {
    const { error } = await supabase.from("activities").update({ status }).in("id", ids).eq("track_id", trackId);
    if (error) return void toast.error("Falha ao atualizar");
    toast.success(status === "approved" ? "Adicionado ao painel" : "Descartado");
    if (status === "approved") celebrateReward(trackId, items.filter(a => ids.includes(a.id)).reduce((sum, a) => sum + activityXp({ ...a, status: "approved" }), 0), "Aprendizado aprovado!");
    qc.invalidateQueries({ queryKey: ["activities"] });
    qc.invalidateQueries({ queryKey: ["review-threads", trackId] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl font-bold">Revisão viva</h1>
          <p className="text-muted-foreground">
            {due.length} revisão(ões) disponível(is) · {items.length} importação(ões) pendente(s)
          </p>
        </div>
      </div>
      <Tabs defaultValue="active">
        <TabsList className="max-w-full"><TabsTrigger value="active">Arguição ativa ({due.length})</TabsTrigger><TabsTrigger value="imports">Importações ({items.length})</TabsTrigger></TabsList>
        <TabsContent value="active" className="mt-6 space-y-7">
          {threadsError && <p role="alert" className="text-destructive">Não foi possível carregar as revisões.</p>}
          <section className="space-y-2">
            {due.map(t => { const a = approved.find(a => a.id === t.activity_id); return a ? <ActivityRow key={t.id} a={a} sources={sources} skills={skills} actions={<Button asChild size="sm"><Link to="/arguicao/$threadId" params={{ threadId: t.id }}>{t.question_open ? "Continuar" : "Revisar"}</Link></Button>} /> : null; })}
            {!due.length && <p className="py-6 text-muted-foreground">Nenhuma arguição pendente para hoje.</p>}
          </section>
          {!!upcoming.length && <section className="space-y-2"><h2 className="font-semibold">Próximas revisões</h2>{upcoming.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><Link className="min-w-0 break-words text-sm hover:text-track-accent" to="/arguicao/$threadId" params={{ threadId: t.id }}>{approved.find(a => a.id === t.activity_id)?.title}</Link><span className="text-xs text-muted-foreground">{new Date(t.next_review_at).toLocaleDateString("pt-BR")} · ciclo {t.interval_days} dias</span></div>)}</section>}
          {!!withoutSummary.length && <section className="space-y-2"><h2 className="font-semibold">Sem resumo do conhecimento</h2>{withoutSummary.map(a => <ActivityRow key={a.id} a={a} sources={sources} skills={skills} actions={<Button size="sm" variant="outline" onClick={() => setSummaryEditing(a)}>Adicionar resumo</Button>} />)}</section>}
          {!!results.length && <section className="space-y-2"><h2 className="font-semibold">Histórico de domínio</h2>{results.slice(0, 12).map(r => <div key={r.id} className="border-b py-3"><div className="flex flex-wrap justify-between gap-2"><Link to="/arguicao/$threadId" params={{ threadId: r.thread_id }} className="text-sm hover:text-track-accent">{approved.find(a => a.id === r.activity_id)?.title}</Link><span className="font-mono text-xs">{r.score}/100 · {r.mastery_delta > 0 ? "+" : ""}{r.mastery_delta} domínio · +{r.xp} XP</span></div></div>)}</section>}
        </TabsContent>
        <TabsContent value="imports" className="mt-6 space-y-3">
        {items.length > 1 && <Button variant="outline" onClick={() => setStatus(items.map(i => i.id), "approved")}>Aprovar todas ({items.length})</Button>}
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          Nada pendente. Sincronize uma fonte em <span className="text-foreground">Fontes</span>.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <ActivityRow
              key={a.id}
              a={a}
              sources={sources}
              skills={skills}
              actions={
                <>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(a)} aria-label="Editar">
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setStatus([a.id], "rejected")} aria-label="Descartar">
                    <X className="size-4" />
                  </Button>
                  <Button size="icon" onClick={() => setStatus([a.id], "approved")} aria-label="Aprovar">
                    <Check className="size-4" />
                  </Button>
                </>
              }
            />
          ))}
        </div>
      )}
        </TabsContent>
      </Tabs>
      <ActivityDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} activity={editing} approveOnSave />
      <ActivityDialog open={!!summaryEditing} onOpenChange={o => !o && setSummaryEditing(null)} activity={summaryEditing} />
    </div>
  );
}
