import { Logo, LogoMark } from "@/components/Logo";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TopoBackground } from "@/components/landing/TopoBackground";
import { ArrowRight, CalendarRange, FileSearch, MessagesSquare, Swords } from "lucide-react";

const TITLE = "Sapiens Study — Estude para ser aprovado";
const DESC = "Arena de questões calibrada pela banca, plano de estudos que se recalcula sozinho e leitura de editais filtrada pelo seu cargo.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="inline-block transition-transform duration-200 ease-out motion-reduce:transition-none"
      onPointerMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.15;
        const y = (e.clientY - r.top - r.height / 2) * 0.25;
        ref.current!.style.transform = `translate(${x}px, ${y}px)`;
      }}
      onPointerLeave={() => (ref.current!.style.transform = "")}
    >
      {children}
    </div>
  );
}

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="grain relative min-h-screen overflow-x-hidden">
      <TopoBackground />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-10rem] -z-10 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 md:pt-28">
          <div className="rise-in inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            Feito para concursos de alto nível
          </div>
          <h1 className="rise-in mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl" style={{ animationDelay: "80ms" }}>
            Estude o que cai. <br />
            <span className="font-serif font-medium italic text-primary">Domine</span> o que importa.
          </h1>
          <p className="rise-in mt-6 max-w-xl text-lg text-muted-foreground" style={{ animationDelay: "160ms" }}>
            {DESC}
          </p>
          <div className="rise-in mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "240ms" }}>
            <Magnetic>
              <Link
                to="/auth"
                className="shimmer-border group inline-flex items-center gap-3 rounded-full bg-primary px-7 py-4 font-semibold text-primary-foreground shadow-[var(--shadow-reward)] transition-shadow hover:shadow-[var(--shadow-neon)]"
              >
                Criar minha primeira trilha
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <a href="#recursos" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Ver como funciona ↓
            </a>
          </div>
          <ul className="rise-in mt-14 flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs uppercase tracking-wider text-muted-foreground" style={{ animationDelay: "320ms" }}>
            <li>◆ IA calibrada pela banca</li>
            <li>◆ Plano que se recalcula</li>
            <li>◆ Editais de 60+ páginas</li>
          </ul>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl scroll-mt-10 px-6 pb-28">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">O método</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">Tudo o que um aprovado faz, em um só lugar.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-6">
            <Bento className="md:col-span-4" icon={<Swords />} title="Arena de questões" text="Questões no estilo da sua banca, com conversa sobre cada alternativa errada até você entender de verdade.">
              <div className="mt-5 space-y-2 font-mono text-xs">
                {["A) Compete privativamente à União…", "B) A lei pode restringir…", "C) É vedado ao Estado…"].map((a, i) => (
                  <div key={a} className={`rounded-md border px-3 py-2 ${i === 2 ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground"}`}>{a}</div>
                ))}
              </div>
            </Bento>
            <Bento className="md:col-span-2" icon={<CalendarRange />} title="Plano vivo" text="Distribui a semana pelo peso de cada matéria no edital e se ajusta quando você falha um dia.">
              <div className="mt-5 flex h-20 items-end gap-1.5">
                {[60, 85, 40, 95, 70, 30, 55].map((v, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-primary/70" style={{ height: `${v}%`, opacity: 0.35 + v / 160 }} />
                ))}
              </div>
            </Bento>
            <Bento className="md:col-span-3" icon={<FileSearch />} title="Edital filtrado pelo cargo" text="Envie o edital inteiro. Ficam só as matérias gerais e as do seu cargo — o resto é descartado." />
            <Bento className="md:col-span-3" icon={<MessagesSquare />} title="Arguição ativa" text="Explique o que estudou e a IA testa sua retenção, atualizando o domínio de cada competência." />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-28">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-10 text-center backdrop-blur md:p-16">
            <LogoMark className="mx-auto h-12 w-12 text-brand" />
            <h2 className="mx-auto mt-6 max-w-2xl text-3xl font-bold tracking-tight md:text-5xl">Sua aprovação começa na próxima sessão.</h2>
            <div className="mt-8"><Magnetic><Button asChild size="lg" className="rounded-full px-8"><Link to="/auth">Começar agora</Link></Button></Magnetic></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-background/60 backdrop-blur">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 font-serif text-lg italic text-muted-foreground">Da cognição à posse.</p>
          </div>
          <FooterCol title="Ferramentas" items={["Arena de questões", "Plano adaptativo", "Provas anteriores", "Competências"]} />
          <FooterCol title="Método" items={["Fases de estudo", "Peso por edital", "Retenção socrática", "Revisão espaçada"]} />
          <FooterCol title="Atalhos" items={["Ctrl + K  ·  buscar", "?  ·  ajuda", "A–E  ·  responder", "Enter  ·  confirmar"]} mono />
        </div>
        <div className="mx-auto flex max-w-6xl items-center justify-between border-t border-border/40 px-6 py-5 font-mono text-xs text-muted-foreground">
          <span>© 2026 Sapiens Study</span>
          <span className="inline-flex items-center gap-2"><span className="size-1.5 rounded-full bg-primary" /> Todos os sistemas operando</span>
        </div>
      </footer>
    </div>
  );
}

function Bento({ className = "", icon, title, text, children }: { className?: string; icon: ReactNode; title: string; text: string; children?: ReactNode }) {
  return (
    <article className={`interactive-card group rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur ${className}`}>
      <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-5">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
      {children}
    </article>
  );
}

function FooterCol({ title, items, mono }: { title: string; items: string[]; mono?: boolean }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-foreground">{title}</p>
      <ul className={`mt-4 space-y-2 text-sm text-muted-foreground ${mono ? "font-mono text-xs" : ""}`}>
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
