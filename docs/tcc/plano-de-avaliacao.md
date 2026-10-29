# Plano preliminar de avaliação

Este plano descreve uma avaliação ainda não realizada. A amostra, o período, os critérios e as métricas finais devem ser aprovados pelo orientador antes da coleta.

## Perguntas de avaliação

1. Qual proporção das partidas do recorte aparece na aplicação?
2. Com que frequência a aplicação associa corretamente a transmissão à partida e ao horário?
3. Qual proporção dos jogos tem prévia, desfalques ou escalação publicada pela fonte?
4. As respostas indicam origem e sinalizam dados não confirmados ou antigos?
5. Quais categorias de divergência e falha aparecem entre as fontes?

## Unidade de análise e amostra

- Unidade principal: partida de uma competição e período escolhidos.
- Recorte inicial sugerido: uma competição com cobertura editorial e transmissão verificável, como o Campeonato Brasileiro Série A.
- Definir datas de início e fim e critérios de inclusão/exclusão antes de coletar.
- Registrar todas as consultas e preservar a ligação para a fonte pública e seu horário de acesso.
- O tamanho da amostra deve ser calculado ou justificado após a delimitação; não está definido neste rascunho.

## Procedimento proposto

1. Em cada data da amostra, capturar a resposta da API e a tela correspondente.
2. Consultar as páginas originais indicadas pelo sistema dentro de uma janela temporal definida.
3. Conferir manualmente confronto, horário, canal, placar, status, desfalques e escalação, registrando o que a fonte realmente publica.
4. Classificar cada campo como correto, ausente, divergente, não verificável ou antigo segundo critérios escritos previamente.
5. Revisar uma parcela da classificação por uma segunda pessoa, caso seja viável e aprovado pelo orientador.
6. Calcular as métricas e documentar limitações da comparação.

## Métricas candidatas

| Métrica | Definição inicial |
| --- | --- |
| Cobertura da agenda | Partidas exibidas divididas pelas partidas encontradas nas fontes de referência no mesmo recorte |
| Cobertura de transmissão | Partidas com canal confirmado divididas pelas partidas avaliadas |
| Precisão da associação de canal | Associações confirmadas corretas após conferência divididas pelo total de associações confirmadas conferidas |
| Cobertura de prévia | Partidas com matéria editorial disponível divididas pelas partidas avaliadas |
| Completude de campos | Campos esperados preenchidos divididos pelos campos avaliados, apresentando cada tipo de campo separadamente |
| Sinalização de divergências | Divergências identificadas e marcadas pela aplicação divididas pelas divergências observadas na conferência |

As métricas são sugestões; evitar agregá-las num único índice sem justificativa. Relatar denominadores, dados ausentes e regras de classificação.

## Avaliação de usabilidade (opcional)

Uma avaliação com usuários pode investigar tarefas como localizar um jogo, descobrir o canal e interpretar um dado não confirmado. Antes de aplicar entrevistas, questionários ou testes, definir participantes, instrumento, consentimento, armazenamento e aprovação conforme as regras da instituição. Não coletar dados pessoais além do necessário.

## Artefatos para registrar

- Protocolo de coleta com versão e critérios.
- Planilha de avaliação sem credenciais ou dados pessoais desnecessários.
- Data e hora de cada consulta, competição, identificador da partida e URL da fonte.
- Capturas ou cópias mínimas permitidas pelas condições do provedor.
- Versão do código e configuração utilizada.
- Resultados brutos e memória de cálculo das métricas.

## Critérios para conclusão

As conclusões devem responder às perguntas definidas usando resultados observados. Caso cobertura ou precisão não possam ser estimadas por indisponibilidade das fontes, relatar essa limitação em vez de preencher valores estimados.

