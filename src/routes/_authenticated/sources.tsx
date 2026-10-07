import { useTrack } from "@/lib/tracks";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Trash2, ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { type Source, sourcesQuery, todayStr } from "@/lib/data";
import { syncSource } from "@/lib/sync.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/sources")({
  head: () => ({ meta: [{ title: "Fontes — XP Log" }, { name: "description", content: "Organize as fontes e plataformas da sua trilha de estudos." }, { property: "og:title", content: "Fontes — XP Log" }, { property: "og:description", content: "Organize as fontes e plataformas da sua trilha de estudos." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SourcesPage,
});

function SourcesPage() {
  const { trackId, track } = useTrack();
  const { data: sources = [] } = useQuery(sourcesQuery(trackId));
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22d3ee");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim().slice(0, 60);
    if (!n) return;
    const { error } = await supabase.from("sources").insert({ name: n, color, track_id: trackId });
    if (error) return void toast.error("Falha ao criar");
    setName("");
    qc.invalidateQueries({ queryKey: ["sources"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fontes</h1>
        <p className="text-muted-foreground">Plataformas onde você estuda. Crie, renomeie ou desative.</p>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          Importação segura: só pedimos seu <b>nome de usuário público</b>, nunca senha. Tudo importado vai
          para a fila de revisão antes de contar. Essas plataformas não têm integração oficial, então se a
          leitura falhar, você continua registrando manualmente.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sources.map((s) => (
          <SourceCard key={s.id} s={s} />
        ))}
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-lg border border-dashed p-4">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border bg-transparent"
          aria-label="Cor"
        />
        <Input className="max-w-xs" placeholder="Nova fonte (ex.: Hack The Box)" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Adicionar</Button>
      </form>
    </div>
  );
}

function SourceCard({ s }: { s: Source }) {
  const { trackId } = useTrack();
  const qc = useQueryClient();
  const sync = useServerFn(syncSource);
  const [name, setName] = useState(s.name);
  const [username, setUsername] = useState(s.username ?? "");
  const [syncing, setSyncing] = useState(false);
  const importable = s.kind === "duolingo" || s.kind === "tryhackme";

  async function update(patch: Partial<Source>) {
    const { error } = await supabase.from("sources").update(patch).eq("id", s.id);
    if (error) toast.error("Falha ao salvar");
    qc.invalidateQueries({ queryKey: ["sources"] });
  }

  async function doSync() {
    setSyncing(true);
    try {
      if (username.trim() !== (s.username ?? "")) await update({ username: username.trim().slice(0, 80) });
      const r = await sync({ data: { sourceId: s.id, trackId, today: todayStr() } });
      r.ok ? toast.success(r.message) : toast.error(r.message);
      qc.invalidateQueries();
    } catch {
      toast.error("Falha ao sincronizar");
    }
    setSyncing(false);
  }

  async function remove() {
    if (!confirm(`Excluir a fonte ${s.name}? As atividades ficam, sem fonte.`)) return;
    await supabase.from("sources").delete().eq("id", s.id);
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4" style={{ opacity: s.active ? 1 : 0.55 }}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          defaultValue={s.color}
          onBlur={(e) => e.target.value !== s.color && update({ color: e.target.value })}
          className="h-8 w-8 cursor-pointer rounded border bg-transparent"
          aria-label="Cor"
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== s.name && update({ name: name.trim().slice(0, 60) })}
          className="font-semibold"
        />
        <Switch checked={s.active} onCheckedChange={(v) => update({ active: v })} aria-label="Ativa" />
        <Button size="icon" variant="ghost" onClick={remove} aria-label="Excluir">
          <Trash2 className="size-4" />
        </Button>
      </div>
      {importable ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Usuário público" value={username} onChange={(e) => setUsername(e.target.value)} />
            <Button onClick={doSync} disabled={syncing || !username.trim()}>
              <RefreshCw className={syncing ? "size-4 animate-spin" : "size-4"} /> Sincronizar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {s.last_synced_at
              ? `Última leitura ${formatDistanceToNow(new Date(s.last_synced_at), { locale: ptBR, addSuffix: true })}`
              : "Ainda não sincronizado. A primeira leitura só salva o ponto de partida."}
          </p>
          {s.last_sync_error && <p className="text-xs text-destructive">{s.last_sync_error}</p>}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Registro manual.</p>
      )}
    </div>
  );
}
