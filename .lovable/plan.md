# Painel pessoal de evolução nos estudos

## O que você vai ter
- **Painel**: estilo "heatmap" anual (tipo GitHub), mais gráficos mensal e semanal com atividades e minutos por dia. Clicar num dia mostra o que você fez (ex.: "5 lições no TryHackMe – Redes", "PortSwigger – APIs").
- **Gráfico de competências**: radar e barras somando tudo por competência (ex.: Inglês, Redes, Web Security, APIs). Cada atividade pode ter uma ou mais competências.
- **Fontes flexíveis**: lista de plataformas (Duolingo, TryHackMe, Alura, Coursera, PortSwigger...) que você pode criar, editar, renomear ou desativar.
- **Registro manual**: formulário rápido com data, fonte, tipo (lição, sala, curso, certificado, nível), título, minutos, competências e observações. Tudo pode ser editado depois.
- **Certificados e marcos**: certificados e mudanças de nível aparecem em destaque na linha do tempo.
- **Fila de revisão**: tudo que é importado entra como "pendente". Você ajusta minutos, competências e título, depois aprova (vai para o painel) ou descarta.

## Importação automática (segura)
- **Duolingo e TryHackMe**: você informa só o seu **nome de usuário público**. Nenhuma senha é pedida nem guardada.
- O app lê os dados públicos do perfil (XP/nível por idioma no Duolingo; salas concluídas, pontos e ranking no TryHackMe), compara com a última leitura e cria atividades pendentes só com o que mudou (ex.: "+120 XP em Espanhol", "Sala 'Nmap' concluída").
- Importação por botão "Sincronizar agora" (e opcionalmente automática uma vez por dia).
- Aviso honesto: essas plataformas não têm integração oficial; se a leitura pública mudar ou falhar, o app avisa e o registro manual continua funcionando normalmente.

## Acesso
- Login com e-mail (só você usa). Dados salvos no Lovable Cloud.

## Visual
- Tema escuro, focado e "de jogador": cores por fonte, contadores de sequência (streak), totais de horas e XP.

## Detalhes técnicos
- Lovable Cloud: tabelas `sources`, `skills`, `activities` (status pending/approved/rejected, minutes, date, type, source_id), `activity_skills`, `import_snapshots` (último estado lido por fonte). RLS por usuário.
- Server functions autenticadas para sincronizar: Duolingo `duolingo.com/2017-06-30/users?username=` e TryHackMe endpoints públicos de perfil; diff contra o snapshot gera atividades pendentes.
- Rotas: `/` painel, `/review`, `/activities`, `/sources`, `/skills`, `/login`. Gráficos com Recharts.
