import { useEffect, useState } from "react";
import { Brain, ChevronDown, Info, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AI_MODELS, AI_EFFORTS, ModelSchema, EffortSchema, FEATURE_NAMES, estimateTokens, resolveAIChoice, tokenValue, usageTotals } from "@/lib/ai-settings";
import { useAIAccount } from "@/lib/ai-personalization";

export function AIModelSelector({ document = false, disabled = false }: { document?: boolean; disabled?: boolean }) {
  const { prefs, ready, save, error } = useAIAccount();
  const model = document ? prefs.document_model : prefs.study_model;
  const effort = document ? prefs.document_effort : prefs.study_effort;
  const change = (value: string, kind: "model" | "effort") => {
    const next = kind === "model" ? ModelSchema.parse(value) : EffortSchema.parse(value);
    void save.mutateAsync({ ...prefs, [document ? `document_${kind}` : `study_${kind}`]: next }).catch(() => toast.error("Não foi possível salvar a preferência de IA."));
  };
  return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" disabled={!ready || disabled || save.isPending || !!error} aria-label={document ? "Modelo de IA para documentos" : "Modelo de IA para estudo"} className="max-w-full"><Brain className="size-4 shrink-0" /><span className="truncate">{AI_MODELS.find(m => m.id === model)?.name}</span><ChevronDown className="size-3 shrink-0" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-64"><DropdownMenuLabel>{document ? "Documentos e resumos" : "Modelo de estudo"}</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={model} onValueChange={value => change(value, "model")}>{AI_MODELS.map(m => <DropdownMenuRadioItem key={m.id} value={m.id}><span className="flex w-full items-center justify-between gap-2"><span>{m.name}</span><span className="text-xs text-muted-foreground">{m.tier}</span></span></DropdownMenuRadioItem>)}</DropdownMenuRadioGroup>
      <DropdownMenuSeparator /><DropdownMenuSub><DropdownMenuSubTrigger>Nível de raciocínio · {AI_EFFORTS.find(e => e.id === effort)?.name}</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuRadioGroup value={effort} onValueChange={value => change(value, "effort")}>{AI_EFFORTS.map(e => <DropdownMenuRadioItem key={e.id} value={e.id}>{e.name}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuSubContent></DropdownMenuSub>
      <DropdownMenuSeparator /><p className="px-2 py-2 text-xs text-muted-foreground">Modelos e raciocínio mais avançados podem consumir mais tokens e levar mais tempo.</p>
    </DropdownMenuContent></DropdownMenu>;
}

export function AIUsageBar({ feature, contextChars = 0, busy = false }: { feature: string; contextChars?: number; busy?: boolean }) {
  const { prefs, usage, error, refresh } = useAIAccount();
  useEffect(() => { if (!busy) void refresh(); }, [busy]);
  const groups = usage?.groups ?? [];
  const totals = usageTotals(groups);
  const { model, effort } = resolveAIChoice(prefs, feature);
  const estimate = estimateTokens(groups, feature, model, effort, contextChars);
  const goal = prefs.monthly_token_goal;
  const used = totals.total;
  const width = goal && used !== null ? Math.min(100, used / goal * 100) : 0;
  const projected = goal && estimate !== null ? Math.min(100 - width, estimate / goal * 100) : 0;
  return <div className="min-w-0 space-y-2 text-xs text-muted-foreground" aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><span className="flex items-center gap-1.5"><Info className="size-3.5" />Uso da IA · mês atual</span><span>{error ? "Uso indisponível" : !usage ? "Carregando…" : `${totals.calls} ${totals.calls === 1 ? "chamada" : "chamadas"} · ${used === null ? "tokens não informados" : `${tokenValue(used)} tokens`}`}</span></div>
    {!!goal && used !== null && <div className="flex h-2 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Meta informativa de tokens" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(goal, used)}><span className="h-full shrink-0 bg-primary" style={{ width: `${width}%` }} /><span className="h-full shrink-0 bg-track-accent/40" style={{ width: `${projected}%` }} /></div>}
    <div className="flex flex-wrap justify-between gap-2"><span>{goal ? `Já usado / meta: ${tokenValue(used)} / ${tokenValue(goal)}` : "Sem meta mensal definida"}</span><span>{busy ? "Uso desta chamada ao concluir" : estimate === null ? "Uso estimado: indisponível" : `Uso estimado: ~${tokenValue(estimate)} tokens`}</span></div>
    {totals.calls > totals.measured && <p>{totals.calls - totals.measured} chamada(s) sem consumo completo informado.</p>}
    {!!goal && used !== null && used >= goal && <p className="text-warning">Meta informativa atingida. Suas ferramentas continuam disponíveis.</p>}
  </div>;
}

export function AIControls({ feature, contextChars = 0, busy = false }: { feature: string; contextChars?: number; busy?: boolean }) {
  return <div className="space-y-3 border-y py-3"><AIModelSelector document={["syllabus", "exam_import", "summary", "activity_import"].includes(feature)} disabled={busy} /><AIUsageBar feature={feature} contextChars={contextChars} busy={busy} /></div>;
}

export function AISettingsPanel() {
  const { prefs, usage, save, ready, error } = useAIAccount();
  const [goal, setGoal] = useState("");
  useEffect(() => { setGoal(prefs.monthly_token_goal?.toString() ?? ""); }, [prefs.monthly_token_goal]);
  const totals = usageTotals(usage?.groups ?? []);
  async function saveGoal() {
    const value = goal.trim() ? Number(goal) : null;
    if (value !== null && (!Number.isSafeInteger(value) || value <= 0)) { toast.error("Informe uma meta inteira maior que zero."); return; }
    try { await save.mutateAsync({ ...prefs, monthly_token_goal: value }); toast.success("Meta informativa salva."); } catch { toast.error("Não foi possível salvar a meta."); }
  }
  return <section className="space-y-4 border-t pt-5">
    <h2 className="flex items-center gap-2 font-semibold"><Brain className="size-4 text-primary" />Inteligência artificial</h2>
    <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Estudo e conversas</Label><AIModelSelector /></div><div className="space-y-2"><Label>Importações e resumos</Label><AIModelSelector document /></div></div>
    {error && <p role="alert" className="text-sm text-destructive">Não foi possível carregar as preferências ou o uso da IA.</p>}
    <div className="space-y-2"><Label htmlFor="ai-token-goal">Meta mensal de tokens (opcional)</Label><div className="flex gap-2"><Input id="ai-token-goal" type="number" min={1} step={1} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Sem meta" /><Button variant="outline" size="icon" aria-label="Salvar meta de tokens" title="Salvar meta de tokens" disabled={!ready || save.isPending} onClick={saveGoal}><Save className="size-4" /></Button></div></div>
    <AIUsageBar feature="arena_discuss" />
    <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Entrada</dt><dd className="font-mono">{tokenValue(totals.input)}</dd></div><div><dt className="text-muted-foreground">Saída</dt><dd className="font-mono">{tokenValue(totals.output)}</dd></div><div><dt className="text-muted-foreground">Raciocínio (incluído na saída)</dt><dd className="font-mono">{tokenValue(totals.reasoning)}</dd></div><div><dt className="text-muted-foreground">Chamadas</dt><dd className="font-mono">{totals.calls}</dd></div></dl>
    <p className="text-xs text-muted-foreground">Tokens não são créditos da Lovable nem valores pagos. Estimativas usam o histórico da ferramenta e o tamanho do contexto; imagens e raciocínio podem variar. A meta não bloqueia o estudo. Histórico disponível a partir da ativação deste acompanhamento.</p>
    {!!usage?.groups.length && <div className="overflow-x-auto"><table className="w-full text-left text-xs"><caption className="mb-2 text-left font-medium">Por ferramenta e modelo</caption><thead><tr className="border-b"><th className="py-2 pr-2">Ferramenta / modelo</th><th className="px-2">Chamadas</th><th className="text-right">Tokens</th></tr></thead><tbody>{usage.groups.map(g => <tr className="border-b last:border-0" key={`${g.feature}:${g.model}:${g.effort}`}><td className="py-2 pr-2">{FEATURE_NAMES[g.feature] ?? g.feature}<p className="text-muted-foreground">{AI_MODELS.find(m => m.id === g.model)?.name ?? g.model} · {AI_EFFORTS.find(e => e.id === g.effort)?.name}</p></td><td className="px-2">{g.calls}</td><td className="text-right font-mono">{tokenValue(g.input_tokens === null || g.output_tokens === null ? null : g.input_tokens + g.output_tokens)}</td></tr>)}</tbody></table></div>}
  </section>;
}