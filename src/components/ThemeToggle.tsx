import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const THEME_KEY = "sapiens-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener("sapiens:theme", sync);
    return () => window.removeEventListener("sapiens:theme", sync);
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem(THEME_KEY, next ? "dark" : "light"); } catch { /* ignore */ }
  }
  return (
    <Button size="icon" variant="ghost" onClick={toggle} aria-label={dark ? "Mudar para tema claro" : "Mudar para tema escuro"} title={dark ? "Tema claro" : "Tema escuro"}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
