# Fontes e tratamento dos dados

## Fontes usadas

### ge

[Agenda de futebol do ge](https://ge.globo.com/agenda/#/futebol) é a fonte principal para confrontos, datas, horários e dados de transmissão. Para detalhes do jogo, o projeto procura matérias editoriais do ge com notícias, prováveis escalações e jogadores fora.

A aplicação lê conteúdo de páginas públicas e estruturas incorporadas nelas; não usa uma API pública oficial e documentada do ge. A estrutura dessas páginas pode mudar sem aviso e quebrar a extração. As matérias originais são ligadas na tela para consulta e atribuição.

### CBF

A [programação Onde Assistir da CBF](https://www.cbf.com.br/futebol-brasileiro/onde-assistir) é uma fonte alternativa para partidas e canais. Para transmissão, a aplicação usa a CBF quando não encontra uma associação confiável na agenda do ge.

### Football-Data.org

A [Football-Data.org](https://www.football-data.org/) pode complementar placares, status e autores dos gols. É necessário um token em `FOOTBALL_DATA_API_TOKEN`; o acesso e a cobertura variam conforme a conta e o plano. A integração é opcional. Sem token, os jogos e canais ainda podem ser exibidos pelas outras fontes.

## Regras de prioridade e associação

- O ge fornece a agenda principal sempre que houver uma resposta utilizável.
- A CBF pode fornecer uma agenda de contingência quando o ge não estiver disponível, e também pode complementar os canais.
- Football-Data.org é usada como complemento para uma partida quando data, horário, mandante e visitante correspondem a um único jogo.
- Um canal só é tratado como confirmado quando confronto e horário coincidem sem ambiguidade. Divergências e associações ambíguas não devem ser apresentadas como confirmação.
- A prévia editorial vem do ge. O projeto tenta a matéria específica do jogo e, para competições cobertas, uma matéria da rodada. A ausência de matéria é mostrada como indisponibilidade, não preenchida por suposição.
- Desfalques podem ser agrupados como suspensão, lesão ou outros motivos conforme o texto encontrado. A redação da fonte pode não informar o motivo ou pode mudar.

## Atualização e cache

Os dados externos não são consultados a cada renderização. O servidor usa cache em memória para limitar chamadas repetidas e reduzir dependência de disponibilidade instantânea das fontes. O cache é perdido quando a API reinicia; não há atualização em segundo plano nem banco persistente.

As respostas indicam quando dados foram obtidos de um cache antigo (`stale`). Para confirmar horário, canal, desfalque ou escalação, consulte a fonte original indicada na interface.

## Limitações conhecidas

- Nem toda competição ou partida tem cobertura de escalação e desfalques no ge.
- Os canais podem ser alterados por direitos de transmissão, região, data ou mudanças de grade.
- Escalações publicadas antes da partida são prováveis, não oficiais; a escalação oficial pode ser diferente.
- Placares e eventos de gol dependem da cobertura da Football-Data.org e dos limites do token.
- Nomes de clubes, campeonatos e horários podem variar entre fontes; a associação conservadora pode deixar de completar um dado para evitar atribuir informação à partida errada.
- A aplicação é um protótipo educacional, sem compromisso de disponibilidade ou atualização em tempo real.

## Atribuição e direitos

O conteúdo editorial, os escudos, marcas e dados pertencem aos respectivos titulares. O projeto não é afiliado ao ge, à CBF, à Football-Data.org, à UEFA ou aos clubes. A disponibilidade pública de uma página não significa que seu conteúdo possa ser republicado sem restrições. Este projeto apresenta informações extraídas e links para as fontes originais; consulte os termos dos provedores antes de implantar ou redistribuir dados.

