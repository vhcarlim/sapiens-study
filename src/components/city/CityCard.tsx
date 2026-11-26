import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { ChevronDown, CloudSun, Maximize2, Minimize2, Minus, Moon, Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CityState } from "@/lib/city";
import type { District } from "./CityCanvas";

const CityCanvas = lazy(() => import("./CityCanvas"));

const SHORTCUTS: [District, string][] = [["geral", "Geral"], ["cidadela", "Cidadela"], ["materias", "Matérias"], ["arena", "Arena"], ["revisoes", "Revisões"]];

function info(d: District, s: CityState) {
  switch (d) {
    case "cidadela": return { title: `Cidadela · ${s.citadel.name}`, status: `Nível ${s.citadel.level} · estágio ${s.citadel.stage + 1} de 5`, next: s.citadel.nextLevelForStage ? `Alcance o nível ${s.citadel.nextLevelForStage} para o próximo estágio (faltam ${s.citadel.xpToNext} XP para o próximo nível).` : "Cidadela completa!", cta: ["Treinar na Arena", "/arena"] as const };
    case "materias": { const weak = [...s.towers].sort((a, b) => a.mastery - b.mastery)[0]; return { title: "Distrito das Disciplinas", status: `${s.towers.length} torres · média ${s.towers.length ? Math.round(s.towers.reduce((a, t) => a + t.mastery, 0) / s.towers.length) : 0}% de domínio`, next: weak ? `A torre mais baixa é ${weak.name} (${weak.mastery}%). Revise para erguê-la.` : "Cadastre matérias para erguer torres.", cta: weak ? ["Fazer revisões", "/review"] as const : ["Abrir competências", "/skills"] as const }; }
    case "arena": return { title: "Arena de Questões", status: `${s.arena.items} questões${s.arena.accuracy != null ? ` · ${Math.round(s.arena.accuracy)}% de acerto nas revisões` : ""}`, next: s.arena.nextGoal ? `Faltam ${s.arena.nextGoal - s.arena.items} questões para ampliar a arena.` : "Arena no tamanho máximo!", cta: ["Treinar na Arena", "/arena"] as const };
    case "revisoes": return { title: "Jardim da Memória", status: s.garden.fog ? `${s.garden.overdue} matéria(s) pedindo revisão` : "Revisões em dia", next: s.garden.fog ? "Revise as matérias frágeis ou paradas há mais de 7 dias para dissipar a névoa." : "Cada matéria revisada planta novas árvores.", cta: ["Fazer revisões", "/review"] as const };
    case "farol": return { title: "Farol da Prova", status: s.lighthouse.days == null ? "Sem data de prova" : s.lighthouse.days < 0 ? "A prova já passou" : `Faltam ${s.lighthouse.days} dias`, next: s.lighthouse.days == null ? "Defina a data da prova na trilha para acender o farol." : "O farol brilha mais conforme a prova se aproxima.", cta: ["Abrir plano", "/plano"] as const };
    default: return null;
  }
}

export function CityCard({ state }: { state: CityState }) {
  const [open, setOpen] = useState(true);
  const [full, setFull] = useState(false);
  const [visible, setVisible] = useState(false);
  const [target, setTarget] = useState<District>("geral");
  const [zoom, setZoom] = useState(1);
  const [particles, setParticles] = useState(true);
  const [night, setNight] = useState(false);
  const [reduced, setReduced] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setNight(root.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync); mo.observe(root, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)"); setReduced(mq.matches);
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "200px" });
    if (box.current) io.observe(box.current);
    return () => { mo.disconnect(); io.disconnect(); };
  }, []);
  useEffect(() => { if (!full) return; const k = (e: KeyboardEvent) => { if (e.key === "Escape") setFull(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [full]);

  const card = info(target, state);
  const glass = "rounded-xl border border-border/60 bg-background/70 backdrop-blur-md";

  return <section className="surface-pro rounded-xl border p-5">
    <div className="flex items-center justify-between">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 font-semibold" aria-expanded={open}>
        Cidade Sapiens <ChevronDown className={`size-4 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <Button size="sm" variant="ghost" onClick={() => setFull(true)}><Maximize2 className="size-4" /> Tela cheia</Button>}
    </div>
    {open && <p className="mt-1 text-sm text-muted-foreground">Sua ilha cresce com nível, domínio, questões, revisões e a proximidade da prova. Clique nos prédios.</p>}
    {open && <div ref={box} className={full ? "fixed inset-0 z-50 bg-background" : "relative mt-4 h-[26rem] overflow-hidden rounded-lg border"}>
      <ClientOnly fallback={<div className="h-full animate-pulse bg-muted" />}>
        {visible && <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Erguendo a cidade…</div>}>
          <CityCanvas state={state} night={night} particles={particles} target={target} zoom={zoom} reduced={reduced} onSelect={setTarget} />
        </Suspense>}
      </ClientOnly>
      {full && <Button size="sm" variant="secondary" className="absolute right-4 top-4" onClick={() => setFull(false)}><Minimize2 className="size-4" /> Sair</Button>}
      {card && <div className={`${glass} absolute left-3 top-3 max-w-xs p-4 text-sm`}>
        <p className="font-semibold">{card.title}</p>
        <p className="mt-1 text-muted-foreground">{card.status}</p>
        <p className="mt-2">{card.next}</p>
        <Button asChild size="sm" className="mt-3"><Link to={card.cta[1]}>{card.cta[0]}</Link></Button>
      </div>}
      <div className={`${glass} absolute bottom-3 left-1/2 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 p-1.5`}>
        {SHORTCUTS.map(([d, l]) => <Button key={d} size="sm" variant={target === d ? "default" : "ghost"} onClick={() => setTarget(d)}>{l}</Button>)}
        <span className="mx-1 h-5 w-px bg-border" />
        <Button size="icon" variant="ghost" aria-label="Aproximar" onClick={() => setZoom((z) => Math.min(2.5, z * 1.25))}><Plus className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="Afastar" onClick={() => setZoom((z) => Math.max(0.6, z / 1.25))}><Minus className="size-4" /></Button>
        <Button size="icon" variant={particles ? "secondary" : "ghost"} aria-label="Clima e partículas" aria-pressed={particles} onClick={() => setParticles((v) => !v)} disabled={reduced}><CloudSun className="size-4" /></Button>
        <Button size="icon" variant="ghost" aria-label={night ? "Dia" : "Noite"} onClick={() => setNight((v) => !v)}>{night ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
      </div>
    </div>}
  </section>;
}
