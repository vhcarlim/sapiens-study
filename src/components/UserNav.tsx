import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera, LogOut, Settings, UserRound } from "lucide-react";
import { SettingsDialog } from "@/components/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MAX_BYTES = 2 * 1024 * 1024;

const profileQuery = (userId: string) => ({
  queryKey: ["profile", userId],
  queryFn: async () => {
    const { data } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle();
    let url: string | null = null;
    if (data?.avatar_url) {
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(data.avatar_url, 60 * 60 * 24);
      url = signed?.signedUrl ?? null;
    }
    return { name: data?.display_name ?? "", path: data?.avatar_url ?? null, url };
  },
  staleTime: 1000 * 60 * 60,
});

function initials(name: string, email: string) {
  const base = name.trim() || email;
  const parts = base.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function UserNav({ userId, email }: { userId: string; email: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery(profileQuery(userId));
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const name = data?.name ?? "";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring" aria-label="Menu da conta">
            <Avatar className="size-8 border">
              {data?.url && <AvatarImage src={data.url} alt="Sua foto" className="object-cover" />}
              <AvatarFallback className="bg-secondary font-mono text-xs">{initials(name, email)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            {name && <p className="truncate text-sm font-medium">{name}</p>}
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setEditing(true)}><UserRound className="size-4" /> Editar perfil</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSettings(true)}><Settings className="size-4" /> Configurações</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={signOut} className="text-destructive focus:text-destructive"><LogOut className="size-4" /> Sair da conta</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {settings && <SettingsDialog userId={userId} onClose={() => setSettings(false)} />}
      {editing && <ProfileDialog userId={userId} email={email} initial={data ?? { name: "", path: null, url: null }} onClose={() => setEditing(false)} />}
    </>
  );
}

function ProfileDialog({ userId, email, initial, onClose }: { userId: string; email: string; initial: { name: string; path: string | null; url: string | null }; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initial.name);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial.url);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return void toast.error("Escolha um arquivo de imagem");
    if (f.size > MAX_BYTES) return void toast.error("A imagem deve ter até 2 MB");
    setFile(f);
    setRemoved(false);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    setBusy(true);
    try {
      let path = removed ? null : initial.path;
      if (file) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        path = `${userId}/avatar-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
        if (error) throw error;
      }
      if (initial.path && initial.path !== path) await supabase.storage.from("avatars").remove([initial.path]);
      const { error } = await supabase.from("profiles").upsert({ id: userId, display_name: name.trim().slice(0, 60) || null, avatar_url: path, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Perfil atualizado");
      onClose();
    } catch {
      toast.error("Não foi possível salvar o perfil");
    }
    setBusy(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Editar perfil</DialogTitle></DialogHeader>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="group relative rounded-full" aria-label="Trocar foto">
            <Avatar className="size-20 border">
              {preview && <AvatarImage src={preview} alt="Sua foto" className="object-cover" />}
              <AvatarFallback className="bg-secondary font-mono text-lg">{initials(name, email)}</AvatarFallback>
            </Avatar>
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 transition group-hover:opacity-100"><Camera className="size-5" /></span>
          </button>
          <div className="space-y-2">
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>Escolher foto</Button>
            {preview && <Button size="sm" variant="ghost" onClick={() => { setPreview(null); setFile(null); setRemoved(true); }}>Remover</Button>}
            <p className="text-xs text-muted-foreground">JPG, PNG ou WebP até 2 MB.</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display-name">Nome de exibição</Label>
          <Input id="display-name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
