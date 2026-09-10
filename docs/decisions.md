# FeiraBox — Decisões Técnicas

Este arquivo registra decisões que não estão completamente definidas na SRS.

## Status

Use os seguintes estados:

- `PROPOSTA` — ainda não aprovada.
- `ACEITA` — decisão adotada.
- `SUBSTITUÍDA` — decisão antiga que foi substituída.

## ADR-001 — Stack do Backend

Status: ACEITA

Backend utilizando:

- Bun
- Elysia.js

Motivo: stack definida na especificação do projeto.

## ADR-002 — Banco de Dados

Status: ACEITA

PostgreSQL.

Motivo: tecnologia definida na especificação.

## ADR-003 — Aplicativo Mobile

Status: ACEITA

React Native.

Motivo: tecnologia definida na especificação.

## ADR-004 — Gateway de Pagamento

Status: PROPOSTA

Gateway ainda não definido.

A escolha deve considerar suporte a:

- PIX;
- cartão de crédito;
- cobranças recorrentes;
- integração com comissão/split quando necessário.

Não implementar dependência de um gateway específico como decisão definitiva antes da escolha oficial.

## ADR-005 — Autenticação com JWT

Status: ACEITA

O backend utiliza JSON Web Tokens (JWT) para autenticação da API.

### Regras

- Credenciais devem ser validadas durante o login.
- Senhas nunca devem ser armazenadas em texto puro.
- Senhas devem utilizar hash seguro.
- Após autenticação bem-sucedida, o backend deve emitir um JWT.
- Rotas protegidas devem validar o JWT antes de permitir acesso.
- Informações sensíveis não devem ser armazenadas no payload do JWT.
- Segredos/chaves utilizados para assinar tokens devem ser mantidos fora do código-fonte.
- O mecanismo de renovação/expiração dos tokens deve seguir a implementação existente do projeto.

### Motivo

JWT foi adotado como mecanismo de autenticação da API do FeiraBox,
permitindo autenticação stateless entre o aplicativo mobile e o backend.

## ADR-006 — Arquitetura Interna do Backend

Status: PROPOSTA

A SRS exige arquitetura modular e não determina um padrão interno específico.

Qualquer adoção de Clean Architecture, Hexagonal, MVC, Repository, Service Layer etc. deve ser registrada aqui quando decidida.
