# Revisão de segurança do Sapiens Study

## Situação atual
- Verificação rápida do banco de dados: nenhum problema encontrado (tabelas protegidas, cada usuário só vê os próprios dados).
- Verificação profunda (código, login, permissões, exposição de dados e chaves): em andamento, leva de 5 a 15 minutos.

## Próximos passos
1. Aguardar o resultado da verificação profunda.
2. Para cada problema encontrado, explicar em linguagem simples o risco e a correção.
3. Corrigir apenas o necessário, sem mudar telas nem fluxos (Arena, Provas, Revisão, Painel, importação de edital).
4. Depois de cada correção, repetir a verificação rápida e testar o fluxo afetado com sua conta para garantir que tudo continua funcionando.
5. Se nada for encontrado, confirmar que o app está protegido e listar recomendações opcionais (ex.: proteção contra senhas vazadas).

## Detalhes técnicos
- Foco: políticas de acesso por proprietário em todas as tabelas, funções do servidor exigindo login, chaves apenas no servidor, registros de uso de IA gravados só pelo servidor.
- Nenhuma alteração será feita antes do resultado da verificação profunda.
