# Projeto de pesquisa — versão preliminar

## Título provisório

**Desenvolvimento e avaliação de uma aplicação web para centralizar informações diárias de partidas de futebol**

O título deverá ser ajustado ao recorte aprovado pelo orientador e pela instituição.

## Tema e delimitação

O trabalho trata do desenvolvimento de uma aplicação web que consolida dados de agenda esportiva a partir de fontes públicas distintas. O sistema apresenta confrontos, datas e horários, canais de transmissão quando identificados, resultados e eventos de gol quando cobertos pelo provedor, além de notícias, desfalques e escalações prováveis publicadas para determinadas partidas.

O foco acadêmico proposto é a integração e a apresentação rastreável dos dados: normalização dos registros, associação de partidas entre provedores, identificação da origem, sinalização de divergências e exposição de dados ausentes ou antigos. A avaliação deve usar uma competição e um intervalo de coleta definidos antes do estudo. Um recorte inicial possível é o Campeonato Brasileiro Série A; essa escolha ainda não foi validada.

## Problema de pesquisa

As informações sobre horário, transmissão, desfalques e escalação provável podem estar distribuídas entre páginas diferentes e ter níveis variados de atualização e cobertura. Ao combinar essas fontes, nomes de clubes e horários podem divergir, e uma associação incorreta pode apresentar um canal ou informação pré-jogo para a partida errada. O problema de pesquisa é definir e avaliar um processo de integração que preserve a rastreabilidade e comunique a incerteza ao usuário.

## Pergunta de pesquisa

**Como integrar e apresentar dados públicos de partidas de futebol de forma rastreável, indicando a fonte e a incerteza das informações de transmissão e pré-jogo?**

## Hipótese ou proposição de trabalho

Proposição a avaliar: regras conservadoras de associação entre partidas, identificação explícita da fonte e estados de confirmação podem reduzir a apresentação de canais divergentes como se fossem confirmados. Essa proposição ainda não foi testada; o trabalho deve definir medidas e coletar evidências antes de qualquer conclusão.

## Objetivo geral

Desenvolver e avaliar uma aplicação web que integre informações diárias de partidas de futebol a partir de fontes públicas, com indicação de origem, cobertura e incerteza dos dados apresentados.

## Objetivos específicos

1. Identificar campos, formatos, cobertura e limitações das fontes selecionadas.
2. Definir critérios de normalização e associação de partidas entre fontes.
3. Implementar a agenda, a tela de detalhes e a API que alimenta a interface.
4. Registrar a origem dos dados e representar canais não confirmados, divergências e informações antigas.
5. Avaliar a cobertura e a correção das informações em uma amostra e período delimitados.
6. Documentar limitações técnicas, dependências de terceiros e possibilidades de evolução.

## Justificativa

O projeto aborda um problema de integração de dados aplicado a uma experiência web de consulta esportiva. Além de implementar uma aplicação funcional, o trabalho pode analisar qualidade, cobertura, atualização e associação de dados de fontes heterogêneas. A indicação de origem e a comunicação de incerteza são relevantes porque transmissões e informações pré-jogo podem mudar ou não estar disponíveis para todas as partidas.

Esta justificativa é preliminar. A versão acadêmica deve ser apoiada por revisão bibliográfica sobre integração de dados, qualidade de dados, aplicações web e transparência de fontes, além de fontes técnicas dos provedores utilizados.

## Metodologia proposta

Classificação inicial, sujeita à validação do orientador: pesquisa aplicada com desenvolvimento tecnológico e avaliação descritiva do sistema. O procedimento proposto é:

1. **Revisão e delimitação:** levantar trabalhos relacionados, definir o campeonato, período e campos observados, e revisar os termos das fontes.
2. **Modelagem:** especificar os dados, regras de normalização, associação e estados de confirmação.
3. **Implementação:** documentar e desenvolver a API Node.js e a interface Angular já iniciadas.
4. **Coleta controlada:** registrar as respostas do sistema, horário de consulta, origem e páginas públicas de referência para uma amostra fixa.
5. **Verificação:** comparar registros exibidos com as respectivas fontes em uma planilha de avaliação, classificando acertos, ausências, divergências e erros de associação.
6. **Análise:** calcular medidas de cobertura e correção, discutir limitações e relacionar os achados aos objetivos.

O período, o tamanho da amostra, os critérios de inclusão e a eventual pesquisa com usuários precisam ser aprovados antes de iniciar a coleta formal.

## Escopo inicial do produto

### Incluído

- Consulta de partidas por data e horário de Brasília.
- Exibição de clubes, competição, placar e status quando disponíveis.
- Informação de transmissão quando associada com segurança a um confronto e horário.
- Detalhes editoriais de desfalques e escalações prováveis somente quando publicados na fonte.
- Indicação de origem, estado de confirmação e dados antigos quando identificados.

### Fora do escopo inicial

- Streaming ou reprodução de partidas.
- Garantia de cobertura de todas as ligas e partidas.
- Publicação de escalações oficiais antes da confirmação das equipes.
- Serviço de alta disponibilidade ou atualização em tempo real.
- Coleta de dados pessoais de usuários.

O escopo final poderá ser reduzido conforme o prazo do TCC e a aprovação do orientador.

## Contribuições esperadas

- Protótipo web funcional documentado.
- Modelo normalizado dos dados de partidas e transmissões.
- Regras explícitas para associação conservadora de registros.
- Avaliação reproduzível de cobertura e correção em um recorte definido.
- Registro das limitações de dados externos e recomendações de evolução.

Esses itens são entregas pretendidas, não resultados já comprovados.

## Riscos e cuidados

- **Mudança nas páginas externas:** registrar versões, datas, links e falhas de coleta; evitar depender de estrutura não documentada sem monitoramento.
- **Termos e direitos dos provedores:** revisar condições de uso e atribuição antes da coleta formal e de eventual hospedagem pública.
- **Divergência entre fontes:** manter critérios de associação explícitos e não confirmar dados ambíguos.
- **Informação pré-jogo desatualizada:** registrar horários de consulta e comparar com a publicação original.
- **Pesquisa com pessoas:** se houver entrevistas ou testes com usuários, seguir o processo de consentimento e as regras éticas da instituição.

## Planejamento

O cronograma deve ser preenchido após conhecer o calendário do curso. Etapas previstas: delimitação e revisão; especificação; implementação; avaliação; análise; redação; revisão e apresentação.

