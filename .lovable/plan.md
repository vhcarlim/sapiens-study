# Banco de questões reais: diagnóstico crítico e decisão

## 1. Resposta direta: quantos scripts?

**Um script só, para tudo.** Não existe script por prova, por banca ou por cargo.
A cada prova você muda apenas 4 linhas de configuração (banca, concurso, ano, cargo) e envia 2 PDFs (prova + gabarito definitivo).

```text
1 script genérico  ->  N provas (cada uma = 2 PDFs + 4 campos)
                   ->  mesmo endereço do site, mesmo token
```

## 2. A fraqueza mais grave (precisa ser resolvida antes de importar)

Hoje a Arena busca no banco por **correspondência exata** de três textos: banca + matéria + tópico (convertidos em "slug").
- No seu site, matéria e tópico vêm do **nome que você deu** à competência e do tópico do edital.
- No Colab, quem escreve matéria e tópico é o **Gemini**, com outras palavras.
- Exemplo: você tem "Dir. Constitucional / Direitos e garantias fundamentais"; o Colab grava "direito-constitucional / direitos-fundamentais". **Não casa. A questão nunca aparece.**

Conclusão: importar agora geraria um banco grande e quase invisível. Por isso nada de scripts antes de corrigir isso.

## 3. SWOT do banco de questões

| Forças | Fraquezas |
|---|---|
| Pipeline de custo zero no site; cota e BYOK já prontos | Busca exata por texto (item 2) |
| Validação rígida na entrada (gabarito, A–E, duplicatas) | Sem taxonomia comum de matérias/tópicos |
| Caderno e Arena já consomem o banco | Sem tela para ver/corrigir/remover o que entrou |
| Questão oficial = credibilidade | Explicações geradas por IA sem revisão humana |

| Oportunidades | Ameaças |
|---|---|
| Ativo acumulado: cada prova serve a todos os alunos | Erro de gabarito/explicação ensina errado (dano à marca) |
| Diferencial vs. geradores puros de IA | Questões desatualizadas por mudança de lei |
| Base para "simulado da banca X" | Direitos de terceiros se a fonte for site comercial |
| Estatísticas reais de acerto por questão | Token vazado = lixo no banco (mitigado pelo token + limite) |

## 4. Matriz GUT (Gravidade x Urgência x Tendência, 1–5)

| Problema | G | U | T | Total | Ordem |
|---|---|---|---|---|---|
| Busca exata não casa matéria/tópico | 5 | 5 | 5 | 125 | 1 |
| Sem revisão/remoção de questões importadas | 5 | 4 | 4 | 80 | 2 |
| Explicação de IA errada sem sinalização pelo aluno | 4 | 3 | 4 | 48 | 3 |
| Questões por lei revogada / desatualizada | 4 | 2 | 4 | 32 | 4 |
| Falta de origem visível (banca/ano) na Arena | 3 | 2 | 2 | 12 | 5 |

## 5. Balanced Scorecard (como saber se deu certo)

- **Financeira:** % de questões da Arena servidas pelo banco (meta 60%+) e tokens gastos por sessão.
- **Aluno:** taxa de "questão reportada como errada" (meta < 2%); sessões por semana.
- **Processos:** tempo para importar 1 prova (meta < 15 min); % de questões rejeitadas na validação.
- **Aprendizado/crescimento:** nº de provas por banca; cobertura dos tópicos dos editais das trilhas ativas.

## 6. Proposta de solução (5W2H)

| | |
|---|---|
| **O quê** | Taxonomia canônica + busca tolerante + revisão/denúncia, depois o script |
| **Por quê** | Sem isso, o banco não aparece e erros não têm volta |
| **Onde** | Banco de dados, Arena, nova tela "Banco de questões" (só para você, admin) |
| **Quem** | Você roda o Colab; o site classifica e você aprova |
| **Quando** | Fase 1 e 2 antes de qualquer importação; fase 3 em seguida |
| **Como** | Ver fases abaixo |
| **Quanto** | Zero tokens no site para servir questões; custo de classificação no Colab (Gemini Flash, centavos por prova) |

### Fase 1 — Fazer o banco "achar" as questões
- Lista canônica de matérias (ex.: `direito-constitucional`) com apelidos ("Dir. Constitucional", "Constitucional").
- Cada competência sua ganha um vínculo opcional com a matéria canônica (sugerido automaticamente pelo nome; você confirma).
- Arena busca por banca + matéria canônica e usa o tópico como **preferência**, não exigência (palavras em comum entre tópico do edital e tópico da questão).
- Opção "qualquer banca" quando não há questão da banca alvo.
- O Colab passa a receber a lista canônica e só pode classificar dentro dela (o site rejeita matéria desconhecida).

### Fase 2 — Controle de qualidade
- Papel de admin (tabela de papéis protegida) só para você.
- Tela "Banco de questões": filtros por banca/matéria/origem, ver, editar explicação, desativar.
- Questões importadas entram como **pendentes** (opcional: aprovar em lote por prova) — você escolhe.
- Botão "Reportar erro" na Arena; 3 denúncias desativam a questão até revisão.
- Origem visível na questão: "FGV · CGU 2022".

### Fase 3 — Script final
- Atualizar o script único do Colab para a lista canônica, com modo "simulação" (valida sem enviar) antes do envio real.
- Primeiro teste: 1 prova pequena (10–20 questões), conferida por você na tela de revisão.

## 7. Decisões que dependem de você
1. Questões importadas entram já ativas ou como pendentes para sua aprovação?
2. Quando não houver questão da banca da trilha, servir de outra banca ou gerar com IA?
3. Fonte das provas: só sites oficiais das bancas/órgãos (recomendado) ou também acervos como PCI?

## Detalhes técnicos
- Nova tabela `subjects_canonical` (slug, nome, apelidos[]); coluna `canonical_subject` em `skills`; `question_bank` ganha `status` (pending/active/disabled), `reports` e índice por (board_key, subject_key).
- `pickFromBank` em `src/lib/arena.functions.ts` deixa de exigir `topic_key` igual: filtra banca+matéria, ordena por similaridade de tópico (função já existente `similarity` em `src/lib/question-ingest.ts`), exclui vistas.
- Endpoint `/api/public/question-bank` valida `subject_key` contra a lista canônica; mantém token e limites atuais.
- `user_roles` + `has_role()` para admin; tabela `question_reports` com RLS do autor.
- Testes: casamento por apelido, fallback de banca, rejeição de matéria desconhecida, desativação após 3 denúncias.
