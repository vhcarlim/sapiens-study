import { TrackProvider, useTrack } from "@/lib/tracks";
import { TrackSelector } from "@/components/TrackSelector";
import { TopProgress, PageSkeleton } from "@/components/PageTransition";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Inbox, ListChecks, Sparkles, Plus, Swords, FileText, CalendarRange, BookMarked, MoreHorizontal, Keyboard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { activitiesQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ActivityDialog } from "@/components/ActivityDialog";
import { RewardOverlay } from "@/components/Gamification";
import { UserNav } from "@/components/UserNav";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TextSizeControl } from "@/components/TextSizeControl";

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
  { to: "/plano", label: "Plano", icon: CalendarRange },
  { to: "/arena", label: "Arena", icon: Swords },
  { to: "/provas", label: "Provas", icon: FileText },
  { to: "/skills", label: "Competências", icon: Sparkles },
] as const;
const more = [
  { to: "/caderno", label: "Caderno", icon: BookMarked },
  { to: "/review", label: "Revisão", icon: Inbox },
  { to: "/activities", label: "Atividades", icon: ListChecks },
] as const;
const linkCls = "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&:hover_svg]:scale-110 [&_svg]:transition-transform";

function Layout() {
  const { user } = Route.useRouteContext();
  return <TrackProvider userId={user.id}><TrackLayout /></TrackProvider>;
}

function TrackLayout() {
  const { user } = Route.useRouteContext();
  const { trackId, track, loading, error } = useTrack();
  const { data: pending } = useQuery(activitiesQuery("pending", trackId));
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [trackId]);

  // Ctrl/Cmd+K = quick log
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "?" && !(e.target instanceof HTMLElement && e.target.closest("input,textarea,select,[contenteditable=true]"))) {
        e.preventDefault();
        setHelp((h) => !h);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen" data-track-color={track?.color ?? "green"}>
      <TopProgress />
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <Link to="/dashboard" aria-label="Sapiens Study — Painel">
            <Logo />
          </Link>
          <TrackSelector />
          <nav aria-label="Principal" className="isolate hidden flex-1 gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className={`relative ${linkCls}`} activeProps={{ className: "!text-foreground" }}>
                {({ isActive }) => <>{isActive && <span aria-hidden className="nav-indicator absolute inset-0 -z-10 rounded-md bg-secondary" />}<n.icon className="size-4" /><span className="hidden lg:inline">{n.label}</span></>}
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className={linkCls} aria-label="Mais páginas">
                <MoreHorizontal className="size-4" /><span className="hidden lg:inline">Mais</span>
                {!!pending?.length && <span className="rounded-full bg-warning px-1.5 font-mono text-[0.625rem] font-bold text-background">{pending.length}</span>}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {more.map((n) => (
                  <DropdownMenuItem key={n.to} asChild>
                    <Link to={n.to} className="flex items-center gap-2"><n.icon className="size-4" />{n.label}
                      {n.to === "/review" && !!pending?.length && <span className="ml-auto rounded-full bg-warning px-1.5 font-mono text-[0.625rem] font-bold text-background">{pending.length}</span>}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => setHelp(true)} className="flex items-center gap-2"><Keyboard className="size-4" />Atalhos do teclado</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
          <div className="flex-1 md:hidden" />
          <TextSizeControl />
          <ThemeToggle />
          <span title={trackId ? "Registro rápido (Ctrl + K) · aperte ? para ver todos os atalhos" : "Selecione uma trilha específica para registrar atividades"}>
            <Button size="sm" disabled={!trackId} onClick={() => setOpen(true)}>
              <Plus className="size-4" /> <span className="hidden sm:inline">Registrar</span>
            </Button>
          </span>
          <UserNav userId={user.id} email={user.email ?? ""} />
        </div>
      </header>
      <main className="page-transition mx-auto max-w-7xl px-4 pb-24 pt-8 md:pb-8">
        {loading ? <PageSkeleton /> : error ? <p className="text-destructive">Não foi possível carregar suas trilhas. Tente recarregar a página.</p> : trackId ? <div key={trackId} className="border-t-2 border-track-accent pt-6 transition-colors duration-500"><Outlet /></div> : <div className="py-16 text-center"><LayersEmpty /></div>}
      </main>
      <nav aria-label="Principal (celular)" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-background/95 backdrop-blur md:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="relative flex flex-col items-center gap-0.5 py-2 text-[0.625rem] text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary active:bg-primary/15" activeProps={{ className: "!text-track-accent" }}>
            {({ isActive }) => <>{isActive && <span aria-hidden className="nav-indicator-mobile absolute inset-x-4 top-0 h-0.5 bg-track-accent" />}<n.icon className="size-5" />{n.label === "Competências" ? "Matérias" : n.label}</>}
          </Link>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger className="relative flex flex-col items-center gap-0.5 py-2 text-[0.625rem] text-muted-foreground" aria-label="Mais páginas">
            <MoreHorizontal className="size-5" />Mais
            {!!pending?.length && <span className="absolute right-3 top-1 rounded-full bg-warning px-1 font-mono text-[0.5625rem] font-bold text-background">{pending.length}</span>}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top">
            {more.map((n) => <DropdownMenuItem key={n.to} asChild><Link to={n.to} className="flex items-center gap-2"><n.icon className="size-4" />{n.label}</Link></DropdownMenuItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Atalhos do teclado</DialogTitle></DialogHeader>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[["Ctrl + K", "Registrar atividade"], ["A – E", "Escolher alternativa (Arena)"], ["Enter", "Confirmar / próxima questão"], ["?", "Abrir esta ajuda"]].map(([k, d]) => (
              <div key={k} className="contents"><dt><kbd className="rounded border bg-secondary px-1.5 py-0.5 font-mono text-xs">{k}</kbd></dt><dd className="text-muted-foreground">{d}</dd></div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
      <ActivityDialog key={`activity-${trackId}`} open={open && !!trackId} onOpenChange={setOpen} />
      <RewardOverlay key={`reward-${trackId}`} trackId={trackId} />
    </div>
  );
}

function LayersEmpty() { return <><h1 className="text-2xl font-bold">Nenhuma trilha ativa</h1><p className="mt-2 text-muted-foreground">Crie uma trilha ou restaure uma trilha arquivada.</p></>; }
