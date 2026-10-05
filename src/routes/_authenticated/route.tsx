import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Inbox, ListChecks, Plug, Sparkles, LogOut, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { activitiesQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ActivityDialog } from "@/components/ActivityDialog";

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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: pending } = useQuery(activitiesQuery("pending"));
  const [open, setOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="font-mono text-sm font-bold text-primary">
            xp.log
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
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
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> <span className="hidden sm:inline">Registrar</span>
          </Button>
          <Button size="icon" variant="ghost" onClick={signOut} aria-label="Sair">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <Outlet />
      </main>
      <ActivityDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
