import { useTrack } from "@/lib/tracks";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type Activity, activitiesQuery, skillsQuery, sourcesQuery } from "@/lib/data";
import { ActivityRow } from "@/components/ActivityRow";
import { ActivityDialog } from "@/components/ActivityDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/activities")({
  head: () => ({ meta: [{ title: "Atividades — XP Log" }, { name: "description", content: "Consulte e edite as atividades da sua trilha de estudos." }, { property: "og:title", content: "Atividades — XP Log" }, { property: "og:description", content: "Consulte e edite as atividades da sua trilha de estudos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { trackId, track } = useTrack();
  const qc = useQueryClient();
  const { data: items = [] } = useQuery(activitiesQuery("approved", trackId));
  const { data: sources = [] } = useQuery(sourcesQuery(trackId));
  const { data: skills = [] } = useQuery(skillsQuery(trackId));
  const [editing, setEditing] = useState<Activity | null>(null);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => items.filter((a) => a.title.toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  async function remove(id: string) {
    if (!confirm("Excluir esta atividade?")) return;
    const { error } = await supabase.from("activities").delete().eq("id", id);
    if (error) return void toast.error("Falha ao excluir");
    qc.invalidateQueries({ queryKey: ["activities"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Atividades</h1>
          <p className="text-muted-foreground">Tudo que já conta no seu painel. Edite quando quiser.</p>
        </div>
        <Input className="max-w-xs" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-2">
        {filtered.map((a) => (
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
                <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Excluir">
                  <Trash2 className="size-4" />
                </Button>
              </>
            }
          />
        ))}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            Nenhuma atividade ainda. Use “Registrar” no topo.
          </div>
        )}
      </div>
      <ActivityDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} activity={editing} />
    </div>
  );
}
