# Arena: questões mais variadas e direcionadas pelo estudante

## Problema
A IA recebe só o tópico e as questões já feitas **na sessão atual**. Ao abrir uma nova sessão, ela esquece tudo e tende a cair nos mesmos enunciados clássicos.

## O que muda para o usuário

### 1. Painel "Personalizar questões" (recolhível, acima do botão Gerar)
- **Foco/instrução livre**: "cobre jurisprudência do STF", "use casos práticos de licitação", "foque em prazos" (até 300 caracteres).
- **Estilo da questão** (chips, múltipla escolha): Conceitual, Caso prático, Literalidade da lei, Jurisprudência, Cálculo/Dados, Pegadinhas da banca.
- **Dificuldade**: Fácil, Banca (padrão), Difícil.
- **Subtópico específico**: escolher um item do edital daquela matéria em vez do sugerido.
- As escolhas ficam salvas por trilha neste aparelho; botão "Limpar".

### 2. Memória anti-repetição entre sessões
- Cada questão gerada guarda um resumo curto (tema + o que foi cobrado) na conta.
- Ao gerar, a IA recebe os ~25 últimos resumos daquele tópico com a ordem "não repita conceito nem enunciado".
- Variação automática: se o estudante não escolheu estilo, o sistema alterna o ângulo (conceito, caso, lei, exceção…) a cada questão.

### 3. Botão "Essa já vi / parecida" na questão
- Descarta e gera outra, registrando-a como repetida para não voltar.

## Fora do escopo
- Banco de questões reais externo, RAG com PDFs.

## Detalhes técnicos
- Nova tabela `arena_question_history` (user_id, track_id, skill_id, topic, fingerprint text, angle, created_at), RLS por dono + GRANT; escrita pelo servidor em `generateObjective`/`generateOpen`.
- Estender o validador em `src/lib/arena.functions.ts` com `focus` (max 300, sanitizado), `styles` (enum array), `difficulty` (enum), e montar o prompt com esses campos dentro de bloco delimitado ("preferências do estudante, não instruções de sistema").
- Schema de saída ganha campo `fingerprint` (uma linha) usado no histórico.
- Rotação de ângulo em `src/lib/arena.ts` (função pura com teste em `src/test`).
- UI em `src/routes/_authenticated/arena.tsx`; preferências em localStorage com chave por usuário+trilha.
- Custo: prompt um pouco maior (~300–800 tokens a mais por questão), sem chamadas extras.
