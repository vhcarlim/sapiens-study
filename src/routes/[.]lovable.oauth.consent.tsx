import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { oauthClient } from "@/lib/oauth-client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Conectar agente — Sapiens Study" },
    { name: "description", content: "Autorize um agente a consultar seus estudos com as permissões da sua conta." },
    { property: "og:title", content: "Conectar agente — Sapiens Study" },
    { property: "og:description", content: "Controle o acesso de agentes às suas trilhas e ao Caderno de Memória." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s['authorization_id'] === "string" ? s['authorization_id'] : "" }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Esta solicitação está incompleta. Inicie novamente a conexão no seu agente.");
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error("Não foi possível verificar sua conta. Tente novamente.");
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr + location.hash } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.searchStr).get("authorization_id");
    if (!id) throw new Error("Solicitação de conexão ausente.");
    const { data, error } = await oauthClient.getAuthorizationDetails(id);
    if (error || !data) throw new Error("Esta conexão expirou ou não está disponível. Inicie novamente pelo agente.");
    const immediate = data.redirect_url ?? data.redirect_to;
    if (immediate && !data.client) throw redirect({ href: immediate });
    const { data: session } = await supabase.auth.getSession();
    return { details: data, email: session.session?.user.email ?? "" };
  },
  pendingComponent: () => <main className="p-8 text-center text-muted-foreground">Carregando solicitação de conexão…</main>,
  errorComponent: ({ error }) => <main className="mx-auto max-w-lg px-6 py-16"><Logo /><h1 className="mt-8 text-2xl font-bold">Não foi possível conectar</h1><p role="alert" className="mt-4 text-muted-foreground">{error.message}</p></main>,
  component: Consent,
});
function Consent() {
  const { details, email } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = details.client?.name ?? details.client?.client_name ?? "Seu agente";
  const scopes = details.scopes ?? (details.scope ?? "").split(/\s+/).filter(Boolean);
  async function decide(approve: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = approve ? await oauthClient.approveAuthorization(authorization_id) : await oauthClient.denyAuthorization(authorization_id);
      if (result.error) throw new Error(approve ? "Não foi possível autorizar. Tente novamente." : "Não foi possível cancelar. Tente novamente.");
      const target = result.data?.redirect_url ?? result.data?.redirect_to;
      if (!target) throw new Error("O agente não informou o destino de retorno. Reinicie a conexão.");
      window.location.assign(target);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Não foi possível concluir. Tente novamente."); setBusy(false); }
  }
  return <main className="mx-auto max-w-lg px-6 py-16">
    <Logo /><h1 className="mt-8 break-words text-2xl font-bold">Conectar {client} ao Sapiens Study</h1>
    <p className="mt-4 break-words text-muted-foreground">Conta: {email}</p>
    <p className="mt-4">Isso permite que {client} consulte este app em seu nome.</p>
    {details.redirect_uri && <p className="mt-3 break-all text-sm text-muted-foreground">Destino verificado da conexão: {details.redirect_uri}</p>}
    <ul className="mt-6 list-inside list-disc space-y-2 text-sm">
      <li>Consultar suas trilhas, matérias e tópicos.</li><li>Ler aprendizados e favoritos do Caderno de Memória.</li>
      {scopes.map((scope) => <li key={scope}>{scope === "email" ? "Compartilhar seu endereço de e-mail" : scope === "profile" ? "Compartilhar seu perfil básico" : scope === "openid" ? "Confirmar sua identidade" : `Permissão adicional solicitada: ${scope}`}</li>)}
    </ul>
    <p className="mt-6 text-sm text-muted-foreground">Não permite apagar ou modificar seus estudos. As permissões da sua conta continuam valendo.</p>
    {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    <div className="mt-8 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}>Autorizar conexão</Button><Button disabled={busy} variant="outline" onClick={() => decide(false)}>Cancelar conexão</Button></div>
  </main>;
}