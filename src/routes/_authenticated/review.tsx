import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Activity, activitiesQuery, skillsQuery, sourcesQuery } from "@/lib/data";
import { ActivityRow } from "@/components/ActivityRow";
import { ActivityDialog } from "@/components/ActivityDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Revisão — XP Log" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(activitiesQuery("pending"));
  const { data: sources = [] } = useQuery(sourcesQuery);
  const { data: skills = [] } = useQuery(skillsQuery);
  const [editing, setEditing] = useState<Activity | null>(null);

  async function setStatus(ids: string[], status: "approved" | "rejected") {
    const { error } = await supabase.from("activities").update({ status }).in("id", ids);
    if (error) return void toast.error("Falha ao atualizar");
    toast.success(status === "approved" ? "Adicionado ao painel" : "Descartado");
    qc.invalidateQueries({ queryKey: ["activities"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Fila de revisão</h1>
          <p className="text-muted-foreground">
            Atividades importadas esperam aqui. Ajuste minutos e competências antes de aprovar.
          </p>
        </div>
        {items.length > 1 && (
          <Button variant="outline" onClick={() => setStatus(items.map((i) => i.id), "approved")}>
            Aprovar todas ({items.length})
          </Button>
        )}
      </div>
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
      <ActivityDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} activity={editing} approveOnSave />
    </div>
  );
}
