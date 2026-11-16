# Usar sua chave Gemini (Google AI Studio) nas ferramentas de IA

## O que muda para você
- Em **Configurações > IA** aparece uma nova escolha: **"Gemini — minha chave"**, ao lado dos modelos que já existem (Mini, Avançado, Astra).
- Com ela escolhida, a Arena, as Provas, a Arguição, os resumos, o comentário do Plano e a importação de editais passam a usar o Gemini, que cobra direto na sua conta Google.
- Você escolhe o modelo Gemini: **Flash** (rápido e barato) ou **Pro** (melhor para editais e provas longas). Isso vale separado para "estudo" e "documentos", como já acontece hoje.
- Se a chave faltar, for inválida ou estourar a cota grátis do Google, aparece uma mensagem clara com a opção de voltar ao modelo embutido. Nada para de funcionar sem aviso.
- As estatísticas de uso continuam aparecendo, com os tokens que o Google informar. Lá fica indicado "cobrado na sua conta Google", e não nos créditos do projeto.

## O que você precisa fazer
1. Entrar em aistudio.google.com com sua conta Google (é grátis, sem assinatura) e clicar em **Get API key**.
2. Colar a chave no formulário seguro que vou abrir. Ela fica guardada no servidor e nunca aparece no site.

## Observação
Os mesmos modelos Gemini também já existem no serviço de IA embutido do site. Eles custam o mesmo preço do Google no plano mensal Pro/Business e vêm com registro por pedido, limites e alertas. Com a chave própria, você perde esse acompanhamento, mas pode trocar de volta quando quiser, em Configurações.

## Detalhes técnicos
- Secret `GOOGLE_API_KEY` (pedido via add_secret). Lido apenas no servidor.
- Novo adaptador `src/lib/ai/provider.server.ts`: recebe a preferência já resolvida e devolve `{ baseURL, headers, model, api }`. Para Gemini, usa o endpoint compatível com OpenAI `https://generativelanguage.googleapis.com/v1beta/openai/` (chat/completions, com `response_format` json_schema e suporte a imagem/PDF em base64).
- As chamadas que hoje usam `/v1/responses` (arena, import, syllabus, summary, study-plan) ganham um ramo chat/completions quando o provedor é Gemini. O streaming da Arguição troca `createOpenAI` por `createOpenAICompatible` com o baseURL do Gemini.
- Allowlist compartilhada ganha `gemini-direct/gemini-2.5-flash` e `gemini-direct/gemini-2.5-pro` (ids confirmados contra o `/models` do Google na implementação). O esforço de raciocínio vira `reasoning_effort` do Gemini.
- tracked-fetch continua registrando cada chamada, com um campo `provider` ("lovable" | "google"). Isso exige uma migração que adiciona a coluna, com padrão "lovable". A tela de estatísticas separa as duas origens.
- Erros 401/403/429 do Google viram mensagens em português. O tratamento de 402/429 do serviço embutido fica intacto.
- O embaralhamento das alternativas, o filtro de alfabetos estrangeiros, o histórico anti-repetição e a defesa contra injeção de instruções continuam se aplicando ao Gemini, porque todos rodam depois da resposta.
- Testes: resolução do provedor (preferência Gemini sem chave cai para erro claro, nunca para outro modelo silenciosamente) e allowlist rejeitando ids forjados.
- Regra registrada no AGENTS.md.
