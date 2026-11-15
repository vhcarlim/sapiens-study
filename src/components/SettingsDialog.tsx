import { AISettingsPanel } from "@/components/AIControls";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { THEME_KEY } from "@/components/ThemeToggle";
import { TextSizeOptions } from "@/components/TextSizeControl";
import { useTrack } from "@/lib/tracks";

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 border-b py-4 last:border-0">
    <div><Label className="text-sm font-medium">{title}</Label><p className="mt-1 text-xs text-muted-foreground">{desc}</p></div>
    {children}
  </div>;
}

export function SettingsDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { trackId, track } = useTrack();
  const soundKey = `sapiens:sound:${userId}:${trackId}`;
  const [dark, setDark] = useState(true);
  const [sound, setSound] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    try { setSound(localStorage.getItem(soundKey) === "true"); } catch { /* optional */ }
  }, [soundKey]);

  function setTheme(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* optional */ }
    window.dispatchEvent(new Event("sapiens:theme"));
  }
  function setSoundPref(v: boolean) {
    setSound(v);
    try { localStorage.setItem(soundKey, String(v)); } catch { /* optional */ }
    window.dispatchEvent(new CustomEvent("sapiens:sound", { detail: { trackId, enabled: v } }));
  }

  return <Dialog open onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Configurações</DialogTitle><DialogDescription>Tema e som neste navegador; preferências de IA na sua conta.</DialogDescription></DialogHeader>
      <div>
        <Row title="Tema escuro" desc="Homo Deus (preto e verde) ou Sapiens (bege e azul)."><Switch checked={dark} onCheckedChange={setTheme} aria-label="Tema escuro" /></Row>
        <div className="border-b py-3"><p className="text-sm font-medium">Acessibilidade · tamanho do texto</p><p className="mb-2 text-xs text-muted-foreground">Aumenta letras e espaços do site inteiro, sem desalinhar.</p><TextSizeOptions /></div>
        <Row title="Som de recompensas" desc={`Efeitos ao ganhar XP${track ? ` na trilha ${track.name}` : ""}.`}><Switch checked={sound} disabled={!trackId} onCheckedChange={setSoundPref} aria-label="Som de recompensas" /></Row>
        <Row title="Fuso do dia de estudo" desc="Ofensiva e meta diária viram à meia-noite de Brasília."><span className="font-mono text-xs text-muted-foreground">UTC−3</span></Row>
        <Row title="Registro rápido" desc="Abre o lançamento de estudo de qualquer tela."><span className="font-mono text-xs text-muted-foreground">Ctrl/⌘ + K</span></Row>
      </div>
      <AISettingsPanel />
    </DialogContent>
  </Dialog>;
}
