import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "XP Log — todas as suas evoluções num só lugar" },
      { name: "description", content: "Painel pessoal que soma lições, salas, cursos e certificados em gráficos diários, mensais e anuais." },
      { property: "og:title", content: "XP Log — todas as suas evoluções num só lugar" },
      { property: "og:description", content: "Painel pessoal que soma lições, salas, cursos e certificados." },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const cells = Array.from({ length: 7 * 30 }, (_, i) => (Math.sin(i * 1.7) + Math.cos(i * 0.37)) / 2);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="font-mono text-sm text-primary">// xp.log</p>
      <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight tracking-tight md:text-6xl">
        Cada lição, sala e certificado <span className="text-primary">somando</span> num só painel.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Duolingo, TryHackMe, Alura, Coursera, PortSwigger. Importe com segurança, revise antes de
        contar e veja sua evolução dia a dia.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild size="lg">
          <Link to="/auth">Entrar</Link>
        </Button>
      </div>
      <div className="mt-16 grid grid-flow-col grid-rows-7 gap-1 overflow-hidden" aria-hidden>
        {cells.map((v, i) => (
          <div
            key={i}
            className="size-3 rounded-[3px] bg-primary"
            style={{ opacity: v > 0.4 ? 0.9 : v > 0 ? 0.5 : v > -0.4 ? 0.2 : 0.06 }}
          />
        ))}
      </div>
    </main>
  );
}
