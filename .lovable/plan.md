# Interatividade dos botões ao passar o mouse

Hoje os botões só trocam de cor, sem transição suave em alguns casos. Os botões "fantasma" e com contorno ficam com um fundo terracota (tema claro) ou ciano (tema escuro) muito forte, que destoa da identidade. Os links de texto e os itens do menu quase não reagem.

## O que muda (no site inteiro, sem mexer no layout)
- **Botão principal:** sobe 1px, ganha brilho suave da cor da marca (azul cobalto no claro, verde fósforo no escuro); ao clicar, "afunda" levemente.
- **Contorno e fantasma:** fundo sutil da cor da marca (~10%) e borda/ícone tingidos, em vez do bloco colorido forte.
- **Links de ação** ("Iniciar na Arena", "Revisar"): sublinhado que desliza e seta/ícone que avança alguns pixels.
- **Ícones pequenos** (fixar, pular, dia corrido, "…"): leve aumento e cor da marca.
- **Cartões clicáveis e itens do menu do topo/celular:** realce de fundo e marcador ativo animado.
- **Foco por teclado:** anel visível na cor da marca (acessibilidade).
- Transições de ~150 ms; tudo desligado para quem prefere menos movimento.

## Fora do escopo
Cores da marca, textos e posições dos botões.

## Detalhes técnicos
- `src/styles.css`: tokens `--hover-tint`, `--shadow-press`/glow por tema e utilitários `interactive-lift`, `link-slide`, com `prefers-reduced-motion`.
- `src/components/ui/button.tsx`: `transition-all`, `active:translate-y-px`, variantes `outline`/`ghost` usando `hover:bg-primary/10 hover:text-primary` e `default` com glow; `link` com sublinhado animado e `[&_svg]` deslocando no hover.
- Revisar `dropdown-menu`, navegação em `route.tsx` e cartões do Painel/Plano para usar os mesmos estados.
- Verificar com Playwright (hover em claro e escuro) via screenshots.
