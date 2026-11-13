# Autocrítica de UX/UI — pequenas melhorias

Ajustes pequenos de visual e usabilidade. Nenhuma regra de estudo, XP ou IA muda.

## O que eu vejo hoje (autocrítica)

1. **Menu do topo está lotado.** São 7 abas (Painel, Plano, Arena, Provas, Revisão, Atividades, Competências), mais trilha, tema, Registrar e conta. Na sua tela (cerca de 1000px), as abas espremem ou passam para uma segunda linha. No celular aparecem só ícones, sem nomes.
2. **O Painel ficou longo.** Ele cresceu com contagem regressiva, Hoje no plano, meta diária, gráficos, domínio e missões. Você precisa rolar muito para achar o que importa no dia.
3. **Ordem das abas não segue o dia a dia.** "Revisão" (aprovar importações) e "Atividades" (histórico) são de uso raro, mas ficam no mesmo nível da Arena.
4. **O botão "Registrar" some quando a Visão Global está aberta.** Ele só fica desabilitado, e a explicação aparece apenas ao passar o mouse.
5. **Estados vazios e carregamento sem padrão.** Algumas telas mostram só "Carregando…" em texto. Telas novas não explicam o primeiro passo, como "salve suas horas" ou "adicione a data da prova".
6. **Faltam atalhos visíveis.** Ctrl+K e as teclas A–E existem, mas ninguém descobre.

## Melhorias propostas

1. **Menu enxuto.** Ficam fixas no topo as abas de uso diário: Painel, Plano, Arena, Provas e Competências. "Atividades" e "Revisão" vão para um menu "Mais", que mostra a contagem de pendências. No celular, uma barra inferior com 5 ícones e nomes curtos.
2. **Painel em três camadas:**
   - **Hoje:** contagem regressiva, Hoje no plano e meta diária, logo no início.
   - **Progresso:** gráfico de atividades e domínio das competências.
   - **Jornada:** mapa de missões e conquistas, que você pode recolher. A escolha fica salva.
3. **Registrar na Visão Global.** O botão abre e pede primeiro a trilha, em vez de ficar desabilitado.
4. **Esqueletos de carregamento e estados vazios com ação.** Todas as abas ganham um cartão com o próximo passo e um botão. Exemplos: "Definir data da prova", "Salvar minhas horas", "Importar edital".
5. **Ajuda de atalhos.** A tecla "?" abre uma pequena janela com Ctrl+K, A–E e Enter. Também aparece uma dica discreta junto ao botão Registrar.
6. **Detalhes visuais.** Mesmo espaçamento e títulos de página consistentes em todas as abas (título, subtítulo e ação à direita). Foco do teclado bem visível nos dois temas.

## Detalhes técnicos

- `src/routes/_authenticated/route.tsx`: separar a navegação em principal e "Mais" (DropdownMenu). Adicionar uma barra inferior fixa em `md:hidden` e ajustar o espaço inferior do `main`.
- Criar o componente `PageHeader` e um `EmptyState` reutilizável. Aplicar nas páginas de `_authenticated`.
- `dashboard.tsx`: reordenar as seções e envolver a camada Jornada em um Collapsible. A preferência fica no localStorage, separada por usuário e trilha, como já é o padrão.
- `ActivityDialog`: aceitar a escolha da trilha quando não houver `trackId`.
- Criar o componente `ShortcutsDialog` (tecla "?").
- Somente front-end, com tokens semânticos. Validação visual com Playwright em 1014px e no tamanho de celular.
