import { Type } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const TEXT_SCALE_KEY = "sapiens-text-scale";
export const TEXT_SCALES = [
  { id: "md", label: "Padrão", pct: 100 },
  { id: "lg", label: "Grande", pct: 112 },
  { id: "xl", label: "Maior", pct: 125 },
  { id: "xxl", label: "Máximo", pct: 140 },
] as const;
export type TextScale = (typeof TEXT_SCALES)[number]["id"];

export function applyTextScale(id: TextScale) {
  const el = document.documentElement;
  if (id === "md") el.removeAttribute("data-text-scale"); else el.setAttribute("data-text-scale", id);
  try { localStorage.setItem(TEXT_SCALE_KEY, id); } catch { /* optional */ }
  window.dispatchEvent(new Event("sapiens:text-scale"));
}

export function useTextScale(): [TextScale, (id: TextScale) => void] {
  const [scale, setScale] = useState<TextScale>("md");
  useEffect(() => {
    const sync = () => setScale((document.documentElement.getAttribute("data-text-scale") as TextScale) || "md");
    sync();
    window.addEventListener("sapiens:text-scale", sync);
    return () => window.removeEventListener("sapiens:text-scale", sync);
  }, []);
  return [scale, applyTextScale];
}

export function TextSizeOptions() {
  const [scale, set] = useTextScale();
  return (
    <div role="radiogroup" aria-label="Tamanho do texto" className="grid grid-cols-2 gap-1.5 min-[480px]:grid-cols-4">
      {TEXT_SCALES.map((s) => (
        <button key={s.id} type="button" role="radio" aria-checked={scale === s.id} onClick={() => set(s.id)}
          className={cn("flex flex-col items-center gap-1 rounded-md border px-1 py-2 transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary",
            scale === s.id && "border-primary bg-primary/10 text-primary")}>
          <span className="font-serif leading-none" style={{ fontSize: `${s.pct / 100 * 1.1}rem` }}>Aa</span>
          <span className="text-xs">{s.label}</span>
        </button>
      ))}
    </div>
  );
}

export function TextSizeControl() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Tamanho do texto" title="Tamanho do texto"><Type className="size-4" /></Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-1.5rem))] space-y-3" collisionPadding={12}>
        <div><p className="font-semibold">Tamanho do texto</p><p className="text-sm text-muted-foreground">Aumenta letras e espaços juntos, mantendo tudo alinhado. Fica salvo neste aparelho.</p></div>
        <TextSizeOptions />
      </PopoverContent>
    </Popover>
  );
}
