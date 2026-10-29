# API local

Durante o desenvolvimento, o servidor Node.js escuta em `http://127.0.0.1:3001`. A interface Angular encaminha as requisições `/api` para ele por meio de `client/proxy.conf.json`.

Todas as rotas documentadas são `GET` e retornam JSON. As datas usam o formato `AAAA-MM-DD` no fuso `America/Sao_Paulo`.

## `GET /api/matches?date=AAAA-MM-DD`

Retorna partidas do dia. Exemplo:

```text
GET http://localhost:3001/api/matches?date=2026-10-29
```

Resposta resumida:

```json
{
  "date": "2026-10-29",
  "timezone": "America/Sao_Paulo",
  "fetchedAt": "2026-10-29T12:00:00.000Z",
  "stale": false,
  "matchesSource": "ge",
  "broadcastsAvailable": true,
  "broadcastsCheckedAt": "2026-10-29T12:00:00.000Z",
  "goalEventsAvailable": false,
  "matches": [
    {
      "id": 123456,
      "utcDate": "2026-10-29T17:30:00.000Z",
      "status": "SCHEDULED",
      "minute": null,
      "venue": null,
      "competition": { "code": "BR-A", "name": "Campeonato Brasileiro" },
      "homeTeam": { "id": 1, "name": "Time da casa", "shortName": "Casa", "crest": null },
      "awayTeam": { "id": 2, "name": "Time visitante", "shortName": "Visitante", "crest": null },
      "goals": [],
      "broadcast": {
        "channels": ["Canal de exemplo"],
        "status": "confirmed",
        "source": "GE",
        "sourceUrl": "https://ge.globo.com/agenda/#/futebol",
        "checkedAt": "2026-10-29T12:00:00.000Z",
        "stale": false
      },
      "score": { "winner": null, "fullTime": { "home": null, "away": null } }
    }
  ]
}
```

`matchesSource` identifica a fonte da agenda: `ge`, `football-data.org` ou `cbf`. `broadcast.status` pode ser:

| Valor | Significado |
| --- | --- |
| `confirmed` | Canal associado a confronto e horário correspondentes |
| `review` | A fonte encontrou o jogo, mas existe divergência ou ambiguidade |
| `unconfirmed` | Nenhum canal foi confirmado para o confronto |
| `unavailable` | Não foi possível consultar as fontes de transmissão |

`stale` indica que a API devolveu dados guardados em cache após uma falha de atualização.

## `GET /api/matches/:id/preview?date=AAAA-MM-DD`

Retorna notícias e dados editoriais disponíveis para o jogo. Exemplo:

```text
GET http://localhost:3001/api/matches/123456/preview?date=2026-10-29
```

Resposta resumida:

```json
{
  "available": true,
  "source": "GE",
  "sourceUrl": "https://ge.globo.com/.../materia-do-jogo.ghtml",
  "matchPageUrl": "https://ge.globo.com/.../jogo/29-10-2026/...",
  "title": "Time da casa x Time visitante: onde assistir e escalações",
  "summary": "Resumo publicado pelo ge.",
  "updatedAt": "2026-10-29T12:00:00.000Z",
  "stale": false,
  "teams": [
    {
      "teamId": 1,
      "teamName": "Time da casa",
      "probableLineup": "Jogadores conforme a matéria do ge.",
      "suspended": "Jogador suspenso, se informado.",
      "injured": "Jogador lesionado, se informado.",
      "otherAbsences": null
    }
  ],
  "message": ""
}
```

Quando não há matéria compatível, a rota normalmente responde `200` com `available: false`, uma mensagem explicativa e os links encontrados. Isso diferencia falta de cobertura de uma falha técnica. A API não cria escalações ou desfalques.

## Erros

| Status | Uso comum |
| --- | --- |
| `400` | Data ou identificador inválido |
| `404` | Rota desconhecida |
| `502` ou `503` | Falha ou indisponibilidade de fonte externa |

O formato de erro é `{ "error": "mensagem" }`. As mensagens são para diagnóstico e podem variar conforme o provedor.

