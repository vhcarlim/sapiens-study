// Abre o diálogo global de registro de atividade a partir de qualquer tela.
// O diálogo pertence ao layout autenticado (src/routes/_authenticated/route.tsx),
// que escuta este evento e mostra o formulário.
export const QUICK_LOG_EVENT = "sapiens:quick-log";

export function openQuickLog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUICK_LOG_EVENT));
}
