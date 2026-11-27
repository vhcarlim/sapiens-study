import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CreditFooter } from "@/components/CreditFooter";
import { PROJECT_INFO } from "@/lib/project-info";

const TITLE = "Sobre o Sapiens Study — projeto gratuito para concurseiros";
const DESC = "Plataforma de estudos gratuita, de código aberto e sem fins lucrativos, criada por Victor Hugo Carlim Pedroni dos Passos.";

export const Route = createFileRoute("/sobre")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: About,
});

function About() {
  const links = [
    ["GitHub", PROJECT_INFO.githubProfile], ["LinkedIn", PROJECT_INFO.linkedin], ["Código-fonte", PROJECT_INFO.repository],
  ].filter(([, url]) => url);
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5"><Link to="/"><Logo /></Link><Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button></header>
      <main className="mx-auto max-w-3xl space-y-8 px-6 pb-20 pt-8">
        <h1 className="text-4xl font-bold tracking-tight">Feito pela comunidade, para a comunidade.</h1>
        <p className="text-lg text-muted-foreground">O Sapiens Study é gratuito para sempre, de código aberto (licença {PROJECT_INFO.license}) e sem fins lucrativos. Não há planos pagos nem anúncios. O objetivo é ajudar concurseiros brasileiros a estudar com método.</p>
        <section className="space-y-2"><h2 className="text-xl font-semibold">Como funciona a IA</h2>
          <p className="text-muted-foreground">Quase tudo funciona sem IA: questões reais do banco, plano de estudos, Caderno, provas e a Cidade. Para experimentar os recursos com IA, cada pessoa tem uma pequena cota diária, paga pelo autor, e o site inteiro tem um teto por dia. Para uso livre, conecte sua própria chave em Configurações › IA. O Google AI Studio e o OpenRouter têm opções gratuitas.</p></section>
        <section className="space-y-2"><h2 className="text-xl font-semibold">Autor</h2>
          <p className="text-muted-foreground">Criado e mantido por <strong className="text-foreground">{PROJECT_INFO.author}</strong>.</p>
          {links.length > 0 && <div className="flex flex-wrap gap-2">{links.map(([label, url]) => <Button key={label} asChild variant="outline" size="sm"><a href={url} target="_blank" rel="noreferrer">{label}</a></Button>)}</div>}
          {PROJECT_INFO.support && <Button asChild size="sm"><a href={PROJECT_INFO.support} target="_blank" rel="noreferrer"><Heart className="size-4" />Apoie o projeto</a></Button>}
        </section>
      </main>
      <CreditFooter />
    </div>
  );
}
