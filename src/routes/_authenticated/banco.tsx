import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Ban, Database, Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAdminQuery } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/banco")({
  head: () => ({ meta: [
    { title: "Banco de questões — Sapiens Study" },
    { name: "description", content: "Revise, aprove e desative questões oficiais importadas para a Arena." },
    { property: "og:title", content: "Banco de questões — Sapiens Study" },
    { property: "og:description", content: "Curadoria das questões oficiais da Arena." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: BancoPage,
});

type Status = "pending" | "active" | "disabled";
type Row = { id: string; status: string; origin_label: string; subject_key: string; topic_key: string; board_key: string; report_count: number; source: string; payload: { statement?: string; answer?: string; options?: { letter: string; text: string }[]; explanations?: { letter: string; why: string }[] } };
const STATUS: Record<Status, string> = { pending: "Pendentes", active: "Ativas", disabled: "Desativadas" };

const bankQuery = (status: Status) => ({
  queryKey: ["bank-admin", status],
  queryFn: async () => {
    const { data, error } = await supabase.from("question_bank").select("id,status,origin_label,subject_key,topic_key,board_key,report_count,source,payload")
      .eq("status", status).order("report_count", { ascending: false }).order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return data as unknown as Row[];
  },
});

function BancoPage() {
  const { user } = Route.useRouteContext();
  const { data: isAdmin, isLoading } = useQuery(isAdminQuery(user.id));
  const [status, setStatus] = useState<Status>("pending");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Row | null>(null);
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({ ...bankQuery(status), enabled: !!isAdmin });

  const groups = useMemo(() => {
    const t = q.trim().toLowerCase();
    const m = new Map<string, Row[]>();
    for (const r of rows) {
      if (t && !`${r.origin_label} ${r.subject_key} ${r.topic_key} ${r.payload.statement ?? ""}`.toLowerCase().includes(t)) continue;
      const k = r.origin_label || (r.source === "ai" ? "Geradas por IA" : "Sem origem");
      m.set(k, [...(m.get(k) ?? []), r]);
    }
    return [...m.entries()];
  }, [rows, q]);

  async function setMany(ids: string[], next: Status) {
    const { error } = await supabase.from("question_bank").update({ status: next, ...(next === "active" ? { report_count: 0 } : {}) }).in("id", ids);
    if (error) { toast.error("Não foi possível atualizar."); return; }
    toast.success(`${ids.length} questão(ões) ${next === "active" ? "ativada(s)" : next === "disabled" ? "desativada(s)" : "atualizada(s)"}.`);
    setView(null);
    await qc.invalidateQueries({ queryKey: ["bank-admin"] });
  }

  if (isLoading) return null;
  if (!isAdmin) return <p className="py-16 text-center text-muted-foreground">Esta área é só para a administração do Sapiens Study.</p>;

  return <div className="space-y-6">
    <header className="space-y-1">
      <h1 className="flex items-center gap-2 font-serif text-3xl"><Database className="size-6 text-primary" />Banco de questões</h1>
      <p className="text-sm text-muted-foreground">Questões importadas chegam pendentes. Confira e aprove por prova; só as ativas aparecem na Arena. Três denúncias de alunos desativam uma questão automaticamente.</p>
    </header>
    <div className="flex flex-wrap items-center gap-2">
      {(Object.keys(STATUS) as Status[]).map((s) => <Button key={s} size="sm" variant={s === status ? "default" : "outline"} onClick={() => setStatus(s)}>{STATUS[s]}</Button>)}
      <Input className="ml-auto max-w-xs" placeholder="Buscar prova, matéria, enunciado…" value={q} onChange={(e) => setQ(e.target.value)} />
    </div>
    {!groups.length && <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Nada em “{STATUS[status]}”.</p>}
    {groups.map(([label, items]) => <section key={label} className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div><h2 className="font-medium">{label}</h2><p className="text-xs text-muted-foreground">{items.length} questão(ões)</p></div>
        <div className="flex gap-2">
          {status !== "active" && <Button size="sm" onClick={() => void setMany(items.map((i) => i.id), "active")}><Check className="size-4" />Aprovar todas</Button>}
          {status !== "disabled" && <Button size="sm" variant="outline" onClick={() => void setMany(items.map((i) => i.id), "disabled")}><Ban className="size-4" />Desativar todas</Button>}
        </div>
      </div>
      <ul className="divide-y">
        {items.map((r) => <li key={r.id} className="flex items-start gap-3 p-3 text-sm">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2">{r.payload.statement}</p>
            <div className="mt-1 flex flex-wrap gap-1.5"><Badge variant="secondary">{r.subject_key}</Badge><Badge variant="outline">{r.topic_key}</Badge>{r.report_count > 0 && <Badge variant="destructive">{r.report_count} denúncia(s)</Badge>}</div>
          </div>
          <Button size="icon" variant="ghost" aria-label="Ver questão" onClick={() => setView(r)}><Eye className="size-4" /></Button>
        </li>)}
      </ul>
    </section>)}
    <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{view?.origin_label || "Questão"}</DialogTitle></DialogHeader>
        {view && <div className="space-y-3 text-sm">
          <p className="whitespace-pre-wrap">{view.payload.statement}</p>
          <ul className="space-y-2">{view.payload.options?.map((o) => <li key={o.letter} className={o.letter === view.payload.answer ? "rounded-md bg-primary/10 p-2" : "p-2"}>
            <b>{o.letter})</b> {o.text}
            <p className="mt-1 text-xs text-muted-foreground">{view.payload.explanations?.find((e) => e.letter === o.letter)?.why}</p>
          </li>)}</ul>
          <div className="flex justify-end gap-2">
            {view.status !== "active" && <Button size="sm" onClick={() => void setMany([view.id], "active")}><Check className="size-4" />Aprovar</Button>}
            {view.status === "disabled" && <Button size="sm" variant="outline" onClick={() => void setMany([view.id], "pending")}><RotateCcw className="size-4" />Voltar a pendente</Button>}
            {view.status !== "disabled" && <Button size="sm" variant="outline" onClick={() => void setMany([view.id], "disabled")}><Ban className="size-4" />Desativar</Button>}
          </div>
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
}
