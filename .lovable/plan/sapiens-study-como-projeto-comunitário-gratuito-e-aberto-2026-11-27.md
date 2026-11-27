# Sapiens Study como projeto comunitário, gratuito e aberto

Inspiração: Reactive Resume (rxresu.me) — gratuito, código aberto, sem anúncios nem planos pagos. A IA é opcional: cada pessoa conecta a própria chave, e o site funciona por completo sem IA. O autor ganha reconhecimento pelo crédito visível e pelo repositório público, e recebe doações voluntárias.

## Diagnóstico atual
- Hoje há planos "Gratuito / Básico / Avançado" com limites de 20/200/800 por dia. Os planos pagos nunca foram cobrados, então essa estrutura de SaaS não faz mais sentido.
- Todo uso da IA embutida sai dos seus créditos. Num projeto gratuito e aberto, esse custo cresce junto com a comunidade e não volta para você. É o maior risco.
- Chaves próprias (OpenAI, Gemini, Claude, OpenRouter) já funcionam, ficam protegidas no servidor e não contam no limite.
- O Banco de Questões, o Caderno, o Plano, a Cidade e as estatísticas já não gastam IA.

## O que muda

### 1. Acesso à IA no modelo Reactive Resume
- Fim dos planos Básico e Avançado: some qualquer menção a assinatura.
- Cota comunitária pequena para experimentar a IA embutida, paga por você, com um teto diário por pessoa e um teto global do site. Quando o teto do dia acaba, o site convida a pessoa a usar a própria chave.
- A chave própria vira o caminho principal, com um guia passo a passo. Destaque para opções gratuitas: o Google AI Studio tem um nível grátis, e o OpenRouter tem modelos grátis.
- A isenção individual (como a da Marina) continua, agora chamada "Apoiador / Colaborador".

### 2. Tudo o que não usa IA fica em primeiro plano
- Na Arena, "Questões reais do banco" passa a ser o modo padrão.
- Mensagens claras do tipo "funciona sem IA" nas telas de Caderno, Plano, Provas (prática) e Cidade.

### 3. Reconhecimento e comunidade
- Página "Sobre": sua autoria, propósito sem fins lucrativos, links para o seu GitHub e LinkedIn e o repositório público.
- Rodapé com "Feito por Victor Hugo Carlim Pedroni dos Passos", em todas as páginas e na Landing.
- Landing revisada: "gratuito para sempre, código aberto, feito para concurseiros".
- Botão opcional "Apoie o projeto" (Pix ou GitHub Sponsors), que ajuda a pagar a cota comunitária. É só doação: não libera nada.
- Arquivo de licença (MIT ou AGPL) e um README em português para quem quiser contribuir.

### 4. Transparência
- O painel de consumo mostra quanto da cota comunitária do dia já foi usado e explica por que o limite existe.

## Fora do escopo
- Cobrança, pagamentos ou anúncios.
- Apagar dados ou chaves que as pessoas já salvaram.

## Detalhes técnicos
- `src/lib/ai-quota.ts`: os planos ficam `free` e `ilimitado` (o nome mostrado muda para Apoiador). Linhas antigas `basico/avancado` passam para `free`, via migração com um CHECK compatível. A constante do teto global fica num único lugar.
- Teto global: somar o uso do dia na tabela de uso que já existe, dentro de `createTrackedAiFetch`, antes de chamar o gateway. Chamadas com chave própria ignoram os dois tetos.
- Chave do navegador ao estilo Reactive Resume: não recomendado, porque as chaves continuam criptografadas no servidor, o que é mais seguro.
- Nova rota `/sobre` com head() próprio, e rodapé compartilhado. Os valores (links, Pix, licença) serão perguntados a você.
- Atualizar AGENTS.md (regra de cota comunitária) e a memória de cota de IA.
- Testes: tetos diário e global, e a chave própria que ignora os limites.
