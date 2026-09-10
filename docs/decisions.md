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

Status: ACEITA

Decisão: Manter arquitetura em slices verticais por domínio no backend:

`routes → controller → service → Prisma → PostgreSQL`

- Cada módulo (`vendors`, `products`, `surprise-boxes`, `fairs`, `auth`) expõe `*.routes.ts` (Elysia), `*.controller.ts` (validação Zod + delegação), `*.service.ts` (regras de negócio + acesso direto ao `prisma` singleton), `*.schema.ts` (Zod) e `*.types.ts`.
- Não adicionar Repository Layer neste momento para evitar complexidade desnecessária no MVP.
- Reuso de `jwtPlugin` (`src/plugins/jwt.ts`), `authDerive`/`requireAuth` (`src/modules/auth/auth.guard.ts`) e `hashPassword`/`verifyPassword` (`src/shared/utils/hash.ts`).
- Validação dupla `t` (Elysia/TypeBox para OpenAPI) + `Zod` no controller.

Motivo: Aprovado em Etapa 0 da Fase 3 Marketplace para manter consistência com `auth` já implementado e simplicidade do MVP. Evita over-engineering de Clean/Hexagonal sem necessidade.

## ADR-007 — VendorProfile – Nome e Galeria (Etapa 0 Fase 3)

Status: ACEITA

- `businessName` passa a ser **obrigatório** (no código via Zod `min(2)`, no banco `String @unique?` → `String` com migration `SET NOT NULL`).
- Galeria MVP: `photos String[]` (array PostgreSQL, `default []`) em `VendorProfile`, sem tabela `VendorPhoto` ou sistema complexo de mídia. `photoUrl` singular mantido por compatibilidade, mas `photos` é a fonte para marketplace.

Motivo: Decisão Etapa 0 – `RF01` exige fotos plural e nome da banca.

## ADR-008 — Product – Categoria

Status: ACEITA

- `Product.category` permanece `String?` (`prisma/schema.prisma:256`) com índice `Product_category_idx`, não `enum`. Permite flexibilidade no MVP.

Motivo: Etapa 0 – evitar rigidez de enum enquanto categorias ainda não estabilizadas.

## ADR-009 — Geolocalização da Fair

Status: ACEITA

- `Fair` mantém `latitude Decimal(10,7)?` e `longitude Decimal(10,7)?` (`prisma/schema.prisma:170-171`).
- Busca por proximidade usa **Haversine em memória** no service, sem `PostGIS`/`earthdistance`/`cube` no MVP.
- Índices existentes `Fair_city_idx`/`Fair_state_idx` mantidos; índice geo composto opcional `@@index([latitude,longitude])` pode ser adicionado sem extensão.

Motivo: Etapa 0 – simplicidade MVP, evita dependência de extensão Postgres.

## ADR-010 — SurpriseBox – Foto

Status: ACEITA

- `SurpriseBox` não terá `tags` no MVP.
- Adicionar `photoUrl String?` opcional (foto única da caixa) em `SurpriseBox` (`prisma/schema.prisma:268-294`).

Motivo: Etapa 0 – vitrine da caixa com foto única suficiente para MVP.

## ADR-011 — Permissões da Fair

Status: ACEITA

- `Fair` recebe `ownerId String?` FK → `User.id` (`onDelete SET NULL`) para rastrear proprietário.
- Apenas `ownerId == jwt.sub` ou `user.role == ADMIN` podem `POST /fairs`, `PATCH /fairs/:id`, `DELETE /fairs/:id`.
- Leitura `GET /fairs` e `GET /fairs/:id` pública (RF11).

Motivo: Etapa 0 – controle de quem cria feira, sem permitir edição por qualquer autenticado.

## ADR-012 — Separação Users vs Vendors e Ownership

Status: ACEITA

- `GET /vendors/:id` público para descoberta de feirantes (marketplace).
- `/users` permanece focado em conta/autenticação (`auth`), `/vendors` focado no perfil comercial (`VendorProfile` 1-1 com `User`).
- Ownership: usuário só cria/edita/exclui recursos do seu próprio `VendorProfile` (`VendorProfile.userId == jwt.sub`). `ADMIN` tem permissão global onde necessário.

Motivo: Etapa 0 – clareza de domínios e segurança de recursos.
