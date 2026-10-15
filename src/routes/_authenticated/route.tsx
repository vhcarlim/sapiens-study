import { TrackProvider, useTrack } from "@/lib/tracks";
import { TrackSelector } from "@/components/TrackSelector";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Inbox, ListChecks, Sparkles, Plus, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { activitiesQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ActivityDialog } from "@/components/ActivityDialog";
import { RewardOverlay } from "@/components/Gamification";
import { UserNav } from "@/components/UserNav";

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
  { to: "/arena", label: "Arena", icon: Swords },
  { to: "/review", label: "Revisão", icon: Inbox },
  { to: "/activities", label: "Atividades", icon: ListChecks },
  { to: "/skills", label: "Competências", icon: Sparkles },
] as const;

function Layout() {
  const { user } = Route.useRouteContext();
  return <TrackProvider userId={user.id}><TrackLayout /></TrackProvider>;
}

function TrackLayout() {
  const { user } = Route.useRouteContext();
  const { trackId, track, loading, error } = useTrack();
  const { data: pending } = useQuery(activitiesQuery("pending", trackId));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [trackId]);

  // Ctrl/Cmd+K = quick log
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen" data-track-color={track?.color ?? "green"}>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <Link to="/dashboard" className="font-mono text-sm font-bold text-primary">
            sapiens
          </Link>
          <TrackSelector />
          <nav className="order-last flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                aria-label={n.label}
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
          <Button size="sm" disabled={!trackId} onClick={() => setOpen(true)} title="Registro rápido (Ctrl + K)">
            <Plus className="size-4" /> <span className="hidden sm:inline">Registrar</span>
          </Button>
          <UserNav userId={user.id} email={user.email ?? ""} />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? <p className="text-muted-foreground">Carregando trilhas…</p> : error ? <p className="text-destructive">Não foi possível carregar suas trilhas. Tente recarregar a página.</p> : trackId ? <div key={trackId} className="border-t-2 border-track-accent pt-6"><Outlet /></div> : <div className="py-16 text-center"><LayersEmpty /></div>}
      </main>
      <ActivityDialog key={`activity-${trackId}`} open={open && !!trackId} onOpenChange={setOpen} />
      <RewardOverlay key={`reward-${trackId}`} trackId={trackId} />
    </div>
  );
}

function LayersEmpty() { return <><h1 className="text-2xl font-bold">Nenhuma trilha ativa</h1><p className="mt-2 text-muted-foreground">Crie uma trilha ou restaure uma trilha arquivada.</p></>; }
