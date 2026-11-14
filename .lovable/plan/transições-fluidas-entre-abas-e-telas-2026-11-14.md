# Transições fluidas entre abas e telas

Hoje a troca de aba é um "corte seco": a página some, às vezes aparece "Carregando…" por um instante, e a nova surge de uma vez. A proposta usa a técnica que sites como Linear, Vercel e Arc usam hoje: **View Transitions** do navegador, que fazem a tela antiga se dissolver na nova de forma contínua.

## O que você vai sentir
- **Troca de aba:** o conteúdo antigo desbota e desce 4px; o novo entra com leve fade e subida (~220 ms, curva suave). Cabeçalho e menu ficam parados, sem piscar.
- **Indicador da aba ativa que desliza:** o realce no menu do topo (e o ícone no menu do celular) desliza até a nova aba em vez de pular.
- **Barra de progresso fina no topo** na cor da marca, só quando uma tela demora mais que ~150 ms para carregar (estilo GitHub/YouTube).
- **Carregamento antecipado:** ao passar o mouse sobre uma aba, ela já começa a carregar, então a troca costuma ser instantânea.
- **Esqueletos no lugar de "Carregando…"** nas telas principais (Painel, Plano, Arena, Provas, Competências), mantendo o formato da página para nada "pular".
- **Troca de trilha:** transição de cor suave da faixa de destaque.
- **Volta e avança do navegador:** mesma animação, com a posição de rolagem preservada.
- Quem usa "reduzir movimento" no aparelho recebe só um fade rápido; navegadores sem suporte trocam normalmente, sem quebrar nada.

## Fora do escopo
Layout, cores, textos e conteúdo das páginas.

## Detalhes técnicos
- `src/router.tsx`: `defaultViewTransition: true`, `defaultPreload: "intent"`, `defaultPreloadDelay: 50`, `defaultPendingMs: 150`.
- `src/styles.css`: `::view-transition-old/new(root)` desativado para o chrome; `view-transition-name: page` na área de conteúdo e `nav-indicator` no realce ativo; keyframes fade+translate, `prefers-reduced-motion`.
- Indicador deslizante: elemento absoluto no item ativo com `view-transition-name` (morph automático entre posições).
- Componente `TopProgress` usando `useRouterState({ select: s => s.status === "pending" })`, montado em `route.tsx`.
- Componentes `PageSkeleton` com o `Skeleton` do shadcn, substituindo os textos de carregamento.
- Verificar com Playwright (captura no meio da transição) e checar ausência de erros no console.
