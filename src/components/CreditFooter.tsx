import { Link } from "@tanstack/react-router";
import { PROJECT_INFO } from "@/lib/project-info";

export function CreditFooter() {
  return (
    <footer className="border-t border-border/40 px-6 py-5 font-mono text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <span>Feito por {PROJECT_INFO.author} · gratuito, sem fins lucrativos · licença {PROJECT_INFO.license}</span>
        <Link to="/sobre" className="underline-offset-4 hover:text-foreground hover:underline">Sobre o projeto</Link>
      </div>
    </footer>
  );
}
