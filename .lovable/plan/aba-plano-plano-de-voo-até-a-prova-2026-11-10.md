# Aba "Plano" — Plano de Voo até a Prova

Uma página nova (`/plano`) que transforma tudo o que o Sapiens Study já sabe sobre a trilha (data da prova, blocos e pesos do edital, tópicos de cada matéria, domínio, percepção de dificuldade, revisões pendentes e provas anteriores) em um plano semanal vivo, que se reajusta sozinho conforme você estuda.

## O que o estudante vê

1. **Linha do tempo até a prova**
   Faixa horizontal do dia de hoje até a data da prova, dividida em fases automáticas:
   - Base (teoria + fixação) → Aprofundamento (questões da banca) → Reta final (simulados com provas anteriores + revisão).
   As proporções se adaptam ao tempo restante (ex.: com menos de 30 dias, só aprofundamento e reta final).

2. **Disponibilidade semanal**
   Grade simples "quantas horas por dia da semana" (ex.: seg 2h, sáb 4h). Gera a capacidade total até a prova, comparada com a carga estimada do edital: "Você tem 186h; o edital pede ~220h no ritmo atual — priorizando o que vale mais pontos".

3. **Semana atual (o coração da aba)**
   Cartões por dia com 2–4 blocos de estudo, cada um com matéria, tópico do edital, fase sugerida (Teoria / Questões / Revisão) e duração. Distribuição baseada na mesma lógica da recomendação rotativa já existente: pontos no edital, facilidade declarada, domínio, percepção e dias sem praticar.
   - Botão "Iniciar" abre a Arena já no tópico, ou o registro de atividade com Material/Fase preenchidos.
   - Bloco concluído é marcado automaticamente quando uma atividade aprovada daquela matéria é registrada no dia.
   - Revisões espaçadas vencidas entram como blocos curtos próprios.
   - Na reta final, um dia da semana vira "Simulado" usando uma prova anterior cadastrada.

4. **Cobertura do edital**
   Barra por bloco do edital: tópicos vistos / revisados / ainda não tocados, e projeção "no ritmo atual você cobre 82% até a prova". Destaque em vermelho para matérias de alto peso com cobertura baixa.

5. **Ajustes do estudante (sem engessar)**
   - Fixar ou pular uma matéria na semana, trocar um bloco por outro (arrastar ou botão "trocar").
   - "Replanejar a semana" recalcula o restante após faltas, sem punir — os dias perdidos são redistribuídos.
   - Nada bloqueia: registrar ou revisar fora do plano continua livre (regra das missões).

6. **Integração com o Painel**
   Cartão compacto "Hoje no plano" no Painel, ao lado da contagem regressiva, com o próximo bloco e progresso do dia. Visão Global oculta o cartão (é por trilha).

7. **Ajuda opcional da IA (barata, sob demanda)**
   Botão "Comentar meu plano": a IA (modelo econômico) lê o resumo numérico da semana e devolve 3 observações estratégicas no estilo da banca. O plano em si é calculado localmente — sem custo de IA.

## Fora do escopo agora
Prova de títulos e discursiva (ficam como blocos manuais por enquanto); sincronização com Google Agenda.

## Detalhes técnicos
- Rota `src/routes/_authenticated/plano.tsx` + aba no menu (desktop e mobile), head() próprio.
- Novo módulo puro `src/lib/study-plan.ts`: fases, capacidade, geração semanal determinística (reaproveita `exam-rules.ts`, `arena.ts`, `reviews.ts`, `study-meta.ts`, `study-day.ts` com fuso de São Paulo) + testes vitest para distribuição por peso, redistribuição de faltas e fases por dias restantes.
- Migração: tabela `study_plan_settings` (user_id, track_id, horas por dia da semana, data de início) e `study_plan_overrides` (track_id, data, skill fixada/pulada/trocada), com GRANTs, RLS por dono e validação de track_id. Plano gerado não é persistido — é derivado (conclusão vem de atividades aprovadas), evitando divergência.
- Query keys por trilha; conteúdo remonta ao trocar trilha (TrackProvider).
- "Comentar meu plano": server function autenticada usando o fetch rastreado e as preferências de modelo do usuário; resumo numérico enviado como dado.
- Registrar decisão em AGENTS.md / project knowledge.
