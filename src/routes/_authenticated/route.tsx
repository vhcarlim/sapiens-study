import { TrackProvider, useTrack } from "@/lib/tracks";
import { TrackSelector } from "@/components/TrackSelector";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Inbox, ListChecks, Plug, Sparkles, LogOut, Plus, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { activitiesQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ActivityDialog } from "@/components/ActivityDialog";
import { PasteImportDialog } from "@/components/PasteImportDialog";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Layout,
});

const nav = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/review", label: "Revisão", icon: Inbox },
  { to: "/activities", label: "Atividades", icon: ListChecks },
  { to: "/sources", label: "Fontes", icon: Plug },
  { to: "/skills", label: "Competências", icon: Sparkles },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  return <TrackProvider userId={user.id}><TrackLayout /></TrackProvider>;
}

function TrackLayout() {
  const { trackId, track, loading, error } = useTrack();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: pending } = useQuery(activitiesQuery("pending", trackId));
  const [open, setOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);

  // Ctrl/Cmd+K = quick log, Ctrl/Cmd+I = paste import
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "k") {
        e.preventDefault();
        setPasteOpen(false);
        setOpen((o) => !o);
      } else if (k === "i") {
        e.preventDefault();
        setOpen(false);
        setPasteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen" data-track-color={track?.color ?? "green"}>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <Link to="/dashboard" className="font-mono text-sm font-bold text-primary">
            xp.log
          </Link>
          <TrackSelector />
          <nav className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary !text-foreground" }}
              >
                <n.icon className="size-4" />
                <span className="hidden sm:inline">{n.label}</span>
                {n.to === "/review" && !!pending?.length && (
                  <span className="rounded-full bg-warning px-1.5 font-mono text-[10px] font-bold text-background">
                    {pending.length}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <Button size="sm" variant="outline" disabled={!trackId} onClick={() => setPasteOpen(true)} title="Importar colando texto (Ctrl/⌘ + I)">
            <Wand2 className="size-4" /> <span className="hidden md:inline">Colar</span>
          </Button>
          <Button size="sm" disabled={!trackId} onClick={() => setOpen(true)} title="Registro rápido (Ctrl/⌘ + K)">
            <Plus className="size-4" /> <span className="hidden sm:inline">Registrar</span>
            <kbd className="ml-1 hidden rounded border border-primary-foreground/30 px-1 font-mono text-[10px] lg:inline">⌘K</kbd>
          </Button>
          <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sair">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? <p className="text-muted-foreground">Carregando trilhas…</p> : error ? <p className="text-destructive">Não foi possível carregar suas trilhas. Tente recarregar a página.</p> : trackId ? <div key={trackId} className="border-t-2 border-track-accent pt-6"><Outlet /></div> : <div className="py-16 text-center"><LayersEmpty /></div>}
      </main>
      <ActivityDialog key={`activity-${trackId}`} open={open && !!trackId} onOpenChange={setOpen} />
      <PasteImportDialog key={`paste-${trackId}`} open={pasteOpen && !!trackId} onOpenChange={setPasteOpen} />
    </div>
  );
}

function LayersEmpty() { return <><h1 className="text-2xl font-bold">Nenhuma trilha ativa</h1><p className="mt-2 text-muted-foreground">Crie uma trilha ou restaure uma trilha arquivada.</p></>; }
