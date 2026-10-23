# Personalização e transparência da IA

## O que será entregue
- Seletor discreto na Arena, Provas e Arguição, com **GPT-5.4 Mini**, **GPT-5.4** e **GPT-6 Astra**, confirmados no catálogo disponível. Mini continua como padrão econômico.
- Opções de raciocínio **Baixo, Médio e Alto**, salvas na conta e aplicadas às próximas chamadas. As configurações também permitem escolher o padrão para importações e organização de resumos.
- Painel **Uso da IA** nas configurações e uma versão compacta junto às conversas: chamadas e tokens de entrada, saída e raciocínio no mês, com detalhamento por ferramenta e modelo.
- Aviso antes do envio com previsão de consumo baseada no contexto e no histórico disponível. Quando faltarem dados, mostrar “estimativa indisponível”, sem números inventados. A estimativa não representa cobrança real.
- Barra “Já usado” e “Uso estimado” quando houver uma meta mensal de acompanhamento definida pelo usuário. Sem meta, mostrar os totais, sem percentual fictício.

## Regras de transparência
- Tokens não são créditos da Lovable nem dinheiro pago. Não apresentar uma conversão financeira sem evidência apropriada.
- O histórico começa após a implementação; chamadas antigas não serão atribuídas artificialmente a usuários.
- A meta mensal é opcional e apenas informativa. Não criar planos pagos, cotas arbitrárias ou bloquear o estudo nesta etapa.
- Trocar modelo ou aumentar raciocínio pode alterar qualidade, latência e consumo; não prometer equivalência entre modelos.

## Detalhes técnicos
- Preferências por usuário e registros de chamadas no Lovable Cloud, com leitura restrita ao titular e escrita do consumo exclusivamente pelo servidor.
- Validar modelo e nível de raciocínio no servidor; nunca aceitar modelos arbitrários enviados pelo navegador.
- Instrumentar todas as chamadas: geração e correção da Arena, conversas de provas, importação de provas e editais, arguições, organização de resumos e importação de atividades.
- Registrar apenas metadados e consumo informado pela resposta, sem duplicar o conteúdo dos documentos ou conversas. Campos sem dados permanecem desconhecidos, não zero.
- Preservar as perguntas, avaliações, recompensas, leitura de arquivos, streaming e tratamento de erros existentes.

## Verificação
- Testar seleção persistida, validação de modelos, isolamento entre contas, soma de consumo e ausência de dados.
- Exercitar uma chamada autenticada e uma continuação de conversa, conferir o modelo utilizado e o consumo lido de volta na interface.
- Conferir as três telas de estudo e as configurações em diferentes larguras.