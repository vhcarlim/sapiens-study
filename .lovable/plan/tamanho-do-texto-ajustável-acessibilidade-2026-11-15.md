# Tamanho do texto ajustável (acessibilidade)

## O que a pessoa vai ver
- Um botão "Aa" no cabeçalho, ao lado do botão de tema (também na página inicial e no login).
- Ao clicar, abre uma pequena janela com 4 níveis: **Padrão (100%)**, **Grande (112%)**, **Maior (125%)**, **Máximo (140%)**, com uma prévia de texto ao vivo.
- A escolha fica salva no aparelho e é aplicada antes da página aparecer (sem "piscar" no tamanho pequeno).
- Também disponível dentro de Configurações, numa seção "Acessibilidade".
- Atalhos opcionais: Ctrl + "+" / Ctrl + "-" ficam com o navegador; adicionamos apenas o seletor visual (sem sequestrar teclas).

## Como evitar que algo fique desalinhado
- Tudo cresce proporcionalmente: textos, espaçamentos, botões, ícones e cartões, porque o site usa medidas relativas ao tamanho base da letra. Aumentar a base escala o conjunto inteiro, como o zoom do navegador, mantendo proporções.
- Corrigir os ~28 lugares com letras fixas em pixels (ex.: legendas de 10–11px, teclas de atalho) para medidas relativas, senão eles continuariam pequenos.
- Menus e barra inferior do celular: nos níveis maiores, os nomes das abas encurtam ou viram só ícones antes de quebrar linha; a barra de abas desktop rola horizontalmente se faltar espaço.
- Gráficos (atividade, teia, barras): rótulos dos eixos passam a seguir o tamanho escolhido.
- Revisão visual com capturas de tela em todos os 4 níveis, nos temas claro e escuro, no desktop e no celular, nas páginas Painel, Plano, Arena, Provas, Competências e página inicial.

## Detalhes técnicos
- `html { font-size: calc(100% * var(--text-scale)) }` em `src/styles.css`; `data-text-scale` no `<html>` define `--text-scale` (1 / 1.125 / 1.25 / 1.4). Respeita o tamanho de fonte configurado no navegador (base em %).
- Script inline no `__root.tsx` lê `localStorage` antes do render (mesmo padrão do tema), evitando mismatch de hidratação.
- Novo `src/components/TextSizeControl.tsx` (Popover + RadioGroup shadcn, com `aria-label`), reutilizado no cabeçalho, landing e SettingsDialog.
- Substituir `text-[10px]`/`text-[11px]` e `font-size: 10px` por `rem`; ticks do Recharts com `fontSize` em rem/derivado da escala.
- Nav: overflow-x auto + `@container` para colapsar rótulos em ícones quando apertado.
- Verificação com Playwright em 1280px e 390px para cada nível.
