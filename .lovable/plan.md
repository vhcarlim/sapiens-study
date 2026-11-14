# Melhorias na aba Plano (sem mudar o que já funciona)

O motor do plano continua o mesmo: calculado na hora, sem guardar o plano pronto, e replanejando sozinho. Tudo abaixo é adicionado em volta dele.

## 1. "Hoje" em destaque no topo
- Um cartão "Seu dia" acima da semana: blocos de hoje, minutos feitos/planejados e botão "Começar o próximo bloco" (abre na Arena com a matéria e o tópico já escolhidos).
- Um bloco aparece como concluído quando já existe atividade aprovada daquela matéria hoje.

## 2. Semana mais legível
- Barra fina em cada dia: planejado x estudado (dias passados) e capacidade (dias futuros).
- Cor da trilha por matéria e ícone por tipo de bloco (teoria, questões, revisão, simulado).
- Celular: mostrar só o dia de hoje aberto e os outros recolhidos, com rolagem lateral.

## 3. Ajustes rápidos por bloco
- Menu em cada bloco: "Trocar matéria" (próxima recomendada), "Pular hoje" e "Fixar esta matéria na semana". Usa os mesmos fixar/pular por semana que já existem; nada novo é guardado.
- "Dia corrido": marcar um dia com menos tempo só nesta semana, sem mudar a disponibilidade padrão.

## 4. Termômetro do plano (pendente desde rodadas anteriores)
- Na Cobertura do edital: por matéria, % do tempo planejado x % do tempo realmente estudado nas últimas 4 semanas, mostrando quem está ficando para trás.
- Aviso de ritmo: "No ritmo atual você cobre X% do edital até a prova", usando a projeção já existente, com sugestão de quantos minutos extras por semana fecham a conta.

## 5. Resumo semanal
- Ao abrir a semana nova, um cartão recolhível com a semana anterior: horas feitas x planejadas, matérias cumpridas, blocos pulados e sequência de dias. Sem IA e sem XP novo, só informação.

## 6. Pequenos acabamentos
- Explicação "Por que esta matéria?" ao passar o mouse em um bloco (peso no edital, facilidade, domínio, dias sem estudar).
- Mensagens orientando o próximo passo quando faltam dados (sem data da prova, sem matérias, sem disponibilidade salva).
- Exportar a semana para a agenda (arquivo .ics) — opcional.

## Fora do escopo
- Mudar a fórmula de recomendação, travar registro de atividades ou criar novas fontes de XP.

## Detalhes técnicos
- Tudo derivado em `src/lib/study-plan.ts` (novas funções puras: `todayBlocks`, `weekAdherence`, `paceForecast`, `blockReason`), com testes para cada regra.
- "Dia corrido" reaproveita `study_plan_overrides` com um novo tipo `reduced` (minutos), via migração pequena; o restante não precisa de banco.
- O cartão "Seu dia" também pode substituir o conteúdo do `StudyPlanCard` no Painel, mantendo a mesma fonte de dados.
- Exportação .ics gerada no navegador.
