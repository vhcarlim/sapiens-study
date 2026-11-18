import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BYOK_PROVIDERS, PLAN_NAMES, dailyLimit, type AIPlan, type BYOKProvider } from "@/lib/ai-quota";
import { removeOwnAIKey, saveOwnAIKey } from "@/lib/byok.functions";

type Quota = { plan: AIPlan; used: number; byok_provider: BYOKProvider | null; byok_model: string | null };

export function useAIQuota() {
  const { user } = getRouteApi("/_authenticated").useRouteContext();
  return useQuery({ queryKey: ["ai-quota", user.id], staleTime: 0, queryFn: async () => {
    const { data, error } = await supabase.rpc("ai_quota_status");
    if (error) throw error;
    return data as unknown as Quota;
  } });
}

export function QuotaLine() {
  const { data } = useAIQuota();
  if (!data) return null;
  if (data.byok_provider) return <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><KeyRound className="size-3.5 text-primary" />Usando sua chave {BYOK_PROVIDERS.find(p => p.id === data.byok_provider)?.name} · sem limite diário</p>;
  const limit = dailyLimit(data.plan);
  const left = Math.max(0, limit - data.used);
  return <p className={`flex items-center gap-1.5 text-xs ${left === 0 ? "text-destructive" : "text-muted-foreground"}`}><Zap className="size-3.5" />Plano {PLAN_NAMES[data.plan]}: {left} de {limit} usos de IA restantes hoje</p>;
}

export function OwnKeyPanel() {
  const qc = useQueryClient();
  const { data } = useAIQuota();
  const save = useServerFn(saveOwnAIKey);
  const remove = useServerFn(removeOwnAIKey);
  const [provider, setProvider] = useState<BYOKProvider>("openai");
  const info = BYOK_PROVIDERS.find(p => p.id === provider)!;
  const [model, setModel] = useState<string>(info.defaultModel);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["ai-quota"] });

  async function onSave() {
    setBusy(true);
    try { await save({ data: { provider, model, apiKey } }); setApiKey(""); toast.success("Chave conectada e verificada."); await refresh(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar a chave."); }
    finally { setBusy(false); }
  }
  async function onRemove() {
    setBusy(true);
    try { await remove(); toast.success("Chave removida. Voltando à IA do site."); await refresh(); }
    catch { toast.error("Não foi possível remover a chave."); } finally { setBusy(false); }
  }

  return <div className="space-y-3 rounded-lg border p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-primary" />Sua própria chave de IA</h3>
    <QuotaLine />
    {data?.byok_provider ? <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>Conectada: <strong>{BYOK_PROVIDERS.find(p => p.id === data.byok_provider)?.name}</strong> · <span className="font-mono text-xs">{data.byok_model}</span></span>
      <Button variant="outline" size="sm" disabled={busy} onClick={onRemove}><Trash2 className="size-4" />Remover</Button>
    </div> : <>
      <p className="text-xs text-muted-foreground">Use uma chave de API paga por você para estudar sem limite diário. Assinaturas como ChatGPT Plus ou Claude Pro não geram chave — crie uma no painel de desenvolvedor do provedor.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Provedor</Label>
          <Select value={provider} onValueChange={(v) => { const p = v as BYOKProvider; setProvider(p); setModel(BYOK_PROVIDERS.find(x => x.id === p)!.defaultModel); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BYOK_PROVIDERS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select></div>
        <div className="space-y-1.5"><Label htmlFor="byok-model">Modelo</Label><Input id="byok-model" value={model} onChange={e => setModel(e.target.value)} className="font-mono text-xs" /></div>
      </div>
      <div className="space-y-1.5"><Label htmlFor="byok-key">Chave de API</Label><Input id="byok-key" type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={info.placeholder} /><p className="text-xs text-muted-foreground">Onde criar: {info.where}</p></div>
      {!info.full && <p className="text-xs text-muted-foreground">Com esta chave, Arena, Provas e importações usam seu provedor. Resumos, comentário do plano e Arguição continuam na IA do site (contam na cota). Para tudo na sua chave, use OpenAI ou OpenRouter.</p>}
      <Button size="sm" disabled={busy || apiKey.trim().length < 10} onClick={onSave}>{busy ? "Verificando…" : "Verificar e conectar"}</Button>
      <p className="text-xs text-muted-foreground">A chave é verificada, guardada criptografada e nunca volta para o navegador.</p>
    </>}
  </div>;
}
