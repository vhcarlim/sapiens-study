# DDD no Sapiens Study: Bounded Contexts e Aggregates

## Análise crítica do documento
O documento está correto em conceito, mas foi escrito sem conhecer o projeto. Ajustes necessários:
- **Faltam contextos reais**: Arena/Banco de Questões, Cota de IA, Plano de Estudos e Caderno não aparecem; "Conteúdo" mistura banco oficial, IA e documentos privados, que têm regras diferentes (proveniência nunca se cruza).
- **Parte já existe**: a conclusão de revisão já é atômica no banco (deduplica rodada e atualiza agenda, domínio e XP juntos), o XP já é derivado em um módulo único e o plano já é derivado, não salvo. Isso já funciona como Aggregate.
- **Risco a evitar**: microserviços, schemas separados ou fila de eventos seriam exagero para um app deste porte e quebrariam o que funciona. A aplicação certa é **fronteiras de módulo no código** + **regras garantidas no banco**.

## Mapa de contextos

```text
Editais & Trilhas ──IDs──> Prática (Arena/Provas) ──atividade aprovada──> Progressão (XP/streak)
       │                          │                                         ▲
       └──> Plano (derivado)      ├──> Retenção (revisão/Caderno) ──────────┘
                                  └── consome ── Conteúdo (Banco oficial | IA comunitária | Docs privados)
Cota de IA = contexto transversal (toda chamada de IA passa por ele)
```

| Contexto | Aggregate Root | Invariante principal |
|---|---|---|
| Editais & Trilhas | Trilha (blocos + regras por matéria) | Matéria pertence à trilha; questões do bloco consistentes |
| Prática | Sessão da Arena | Só salva uma atividade ao encerrar |
| Retenção | Agenda de revisão da competência | Resposta + próxima data + domínio juntos |
| Progressão | Progresso do aluno (derivado) | Sem bônus duplicado por evento |
| Conteúdo | Questão do banco | Oficial nunca vira IA; quarentena com 1 relato |
| Cota de IA | Direito de uso do usuário | Limite diário respeitado antes da chamada |
| Plano | (nenhum — projeção derivada) | Só disponibilidade e ajustes são salvos |

## O que fazer (incremental, sem mudar o que o usuário vê)
1. **Organizar por contexto**: mover arquivos de `src/lib` para pastas por contexto (`tracks/`, `practice/`, `retention/`, `progression/`, `content/`, `ai-quota/`, `planning/`), cada uma com um `index.ts` como porta pública. Sem mudança de comportamento.
2. **Regra de fronteira**: um contexto só importa o `index` de outro e referencia outros só por ID. Adicionar um teste automático que falha se alguém importar arquivos internos de outro contexto.
3. **Raiz única de escrita**: concentrar as gravações de cada Aggregate em uma função de domínio (ex.: salvar regras de blocos, encerrar sessão da Arena, avaliar questão). Telas param de gravar direto em tabelas filhas.
4. **Eventos de domínio leves (síncronos, no código)**: `SessaoEncerrada` → gera aprendizados do Caderno; `AtividadeAprovada` → invalida XP/plano. Apenas funções tipadas, sem fila.
5. **Camada anticorrupção**: unificar a normalização de dados externos (IA, PDF, Colab, Duolingo/TryHackMe) em adaptadores na entrada de cada contexto.
6. **Documentar**: mapa de contextos e regras no `AGENTS.md` (uma regra por decisão).

## Fora do escopo
Bancos/schemas separados, microserviços, filas de mensagens e qualquer mudança de tabela.

## Detalhes técnicos
- Fase 1–2 são refatoração mecânica com reexports para não quebrar imports; validação por typecheck + testes existentes.
- Teste de fronteira: varredura de imports em `src/lib/<ctx>/**` proibindo `@/lib/<outro>/<interno>`.
- Invariantes já no banco (revisão atômica, feedback único, limites de atividade) permanecem como fonte de verdade.
- Ordem sugerida: 1 → 2 → 6 primeiro (baixo risco); 3–5 contexto a contexto, começando por Conteúdo e Prática.
