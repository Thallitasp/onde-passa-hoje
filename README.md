# Onde Passa Hoje

O Onde Passa Hoje é um projeto independente para consultar os jogos de futebol do dia, os horários de Brasília, os canais de transmissão e informações publicadas sobre cada partida. O projeto está em desenvolvimento e usa fontes públicas para montar a agenda.

O projeto é distribuído sob a licença [MIT](LICENSE), que permite consultar, usar, modificar e redistribuir o código nos termos da licença. Consulte também as condições próprias dos provedores de dados e ativos de terceiros.

**Versão atual:** `0.3.0` — versão em desenvolvimento. O histórico e as regras de versionamento estão em [CHANGELOG.md](CHANGELOG.md).

## O que a aplicação oferece

- Agenda de jogos por data, com horário de Brasília, competição, escudos, placar e status.
- Canais de transmissão quando uma fonte os associa ao confronto e ao horário.
- Detalhes da partida com notícias do ge, desfalques e escalação provável quando publicados.
- Autores dos gols quando a Football-Data.org disponibiliza os eventos e a partida pode ser associada com segurança.
- Filtros por competição, interface adaptável a celular e temas claro e escuro.
- Área de blog em construção, com artigos de exemplo mantidos no frontend.

Os dados podem estar incompletos ou mudar perto do início da partida. A interface identifica canais não confirmados e informa quando a cobertura editorial ainda não publicou desfalques ou escalações.

## Tecnologias

| Parte | Tecnologias |
| --- | --- |
| Frontend | Angular 22, TypeScript, HTML, CSS e PrimeNG |
| Servidor local | Node.js 22 ou superior, módulos ES e servidor HTTP nativo |
| Integrações | Agenda e matérias públicas do ge, programação da CBF e Football-Data.org opcional |

## Requisitos

- Uma versão Node.js suportada no `package.json`: 22.22.3 ou superior na linha 22, 24.15.0 ou superior na linha 24, ou 26.0.0 ou superior na linha 26.
- npm, instalado junto com o Node.js.
- Acesso à internet para buscar os dados das fontes.
- Token da Football-Data.org apenas se quiser tentar complementar placares e autores dos gols.

## Executar localmente

Na pasta raiz do projeto, instale as dependências:

```powershell
npm.cmd install
npm.cmd --prefix client install
```

No macOS ou Linux, os comandos equivalentes são:

```bash
npm install
npm --prefix client install
```

O token da Football-Data.org é opcional. Para configurá-lo, copie `.env.example` para `.env` e substitua o valor de exemplo:

```powershell
Copy-Item .env.example .env
```

Inicie o servidor e a interface juntos:

```powershell
npm.cmd run dev
```

Abra [http://localhost:3000](http://localhost:3000). O Angular serve a interface na porta 3000 e encaminha as chamadas `/api` para o servidor Node.js na porta 3001. Para encerrar os dois processos, pressione `Ctrl+C` no terminal.

No PowerShell, `npm.cmd` evita o bloqueio de execução de scripts que pode afetar o comando `npm.ps1`.

### Outros comandos

| Comando na raiz | Ação |
| --- | --- |
| `npm.cmd run dev` | Inicia API e frontend com recarga automática |
| `npm.cmd run api` | Inicia somente a API Node.js |
| `npm.cmd run web` | Inicia somente o frontend Angular |
| `npm.cmd run build` | Compila o frontend para produção em `client/dist/` |

## Como os dados são montados

O ge é a fonte principal da agenda e das informações de transmissão. A CBF é consultada como alternativa para jogos e canais quando necessário. A Football-Data.org é opcional e serve para complementar placares, status e eventos de gol; a cobertura depende da competição e do plano associado ao token.

Ao abrir uma partida, o servidor procura uma matéria específica do ge e, quando ela não existe, tenta encontrar a cobertura da rodada. A prévia mostra os dados publicados, sem gerar escalações ou ausências por conta própria. Veja [Fontes e tratamento dos dados](docs/fontes-e-dados.md) para as regras e limitações.

## Documentação

- [Arquitetura e fluxo da aplicação](docs/arquitetura.md)
- [Fontes, atualização e limitações dos dados](docs/fontes-e-dados.md)
- [Rotas da API e exemplos de resposta](docs/api.md)
- [Estruturação preliminar para TCC](docs/tcc/README.md)
- [Acesso para estudo](#acesso-para-estudo)

## Estrutura do projeto

```text
.
├── server.mjs                 # API e integração com fontes de dados
├── package.json               # comandos de desenvolvimento da raiz
├── .env.example               # exemplo sem credenciais
├── docs/                      # documentação técnica
└── client/
    ├── src/app/models/        # tipos TypeScript
    ├── src/app/services/      # comunicação com a API
    ├── src/app/pages/         # agenda, detalhe da partida e blog
    ├── src/app/utils/         # datas, horários e formatação
    └── public/                # ícones e recursos estáticos
```

## Segurança e configuração

- Nunca publique o arquivo `.env` nem cole tokens em issues, prints ou código-fonte.
- `.env.example` contém somente um valor de demonstração; a agenda funciona sem token.
- Dependências e arquivos compilados não fazem parte do código-fonte publicado.
- O servidor Node.js escuta em `127.0.0.1` para desenvolvimento local. A publicação deste repositório não hospeda automaticamente o site nem a API.

## Acesso para estudo

A intenção é manter o repositório público para que qualquer pessoa possa consultar e estudar o funcionamento do projeto. O código próprio está licenciado sob MIT; os termos completos estão no arquivo [LICENSE](LICENSE).

As marcas, páginas, escudos, textos e dados de terceiros continuam sujeitos às condições dos respectivos titulares. O projeto é independente e não é afiliado ao ge, à CBF, à Football-Data.org, à UEFA ou aos clubes exibidos.


