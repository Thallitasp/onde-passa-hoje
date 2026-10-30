# Histórico de versões

O projeto segue versionamento semântico (`MAJOR.MINOR.PATCH`) enquanto estiver abaixo da versão `1.0.0`. Nesta fase inicial, mudanças incompatíveis podem ocorrer entre versões menores. A versão da aplicação é definida em `client/package.json`; a versão do servidor e os lockfiles devem ser mantidos alinhados.

## [0.4.0] - 2026-10-29

### Alterado

- Migrado o frontend para Angular 21 e PrimeNG 21.1.10, sem a configuração de chave PrimeUI exigida pela versão 22.
- Atualizado o preset de tema PrimeUIX para a linha 2 compatível com PrimeNG 21.
- Alinhados os requisitos de Node.js com as versões oficialmente compatíveis com Angular 21.
- Atualizada a versão dos pacotes para `0.4.0`.

## [0.3.0] - 2026-10-29

### Adicionado

- Exibição da versão atual no rodapé, lida do `client/package.json`.
- Aviso “Em construção” no blog e nas páginas de artigos de exemplo.
- Histórico de versões e estrutura acadêmica preliminar para TCC.

### Alterado

- Atualização dos pacotes raiz e frontend para a versão `0.3.0`.
