# FeiraBox — Modelo de Dados

Este documento representa as principais entidades descritas na SRS.

## Usuario

Campos descritos:

- `id_usuario`
- `nome`
- `email`
- `senha`
- `data_criacao`
- `data_atualizacao`
- `feirante?`

Relacionamentos descritos:

- pedidos
- assinaturas
- perfil de feirante opcional

## Feirante

Campos:

- `id_feirante`
- `id_usuario`
- `nome`
- `cpf/cnpj`
- `telefone`

Relacionamentos:

- produtos
- caixas

## Produto

Campos:

- `id_produto`
- `id_feirante`
- `nome`
- `descricao`
- `categoria`
- `preco`
- `foto_url`

## Plano de Assinatura

Campos:

- `id_plano`
- `id_feirante`
- `frequencia`
- `valor`
- `descricao_caixa_surpresa`

Frequências previstas:

- semanal;
- mensal.

## Assinatura

Campos:

- `id_assinatura`
- `id_consumidor`
- `id_plano`
- `data_inicio`
- `status_pagamento`
- `data_proxima_cobranca`

## Pedido

Campos:

- `id_pedido`
- `id_assinatura`
- `data_geracao`
- `data_prevista_entrega`
- `status_pedido`

Status definidos na SRS:

- Pendente
- Em Preparação
- Pronto
- Entregue

## Observação

A SRS apresenta as entidades e seus atributos principais, mas não fornece um esquema relacional completo.

Portanto, detalhes como:

- tipos SQL;
- índices;
- constraints;
- cardinalidades completas;
- tabelas auxiliares;
- auditoria;
- timestamps adicionais;
- tabelas de pagamento;
- tabelas de notificações;
- tabelas de Boost;

devem ser definidos durante o projeto e documentados como decisões técnicas.

## Decisões Etapa 0 – Fase 3 Marketplace (2026-09-10)

Aprovadas para implementação:

### VendorProfile (Feirante) – `prisma/schema.prisma:123-154`

- `businessName` **obrigatório** (`String` não opcional, `z.string().min(2).max(100)` no `vendors.schema.ts`). Migração `ALTER COLUMN "businessName" SET NOT NULL` (com `default ''` para dados legados `null`).
- `photos String[]` `default []` – galeria simples MVP (PostgreSQL array), sem `VendorPhoto` dedicada. `photoUrl String?` mantido por compatibilidade.
- `cpfCnpj @unique` permanece obrigatório e único.
- Relação `userId @unique` 1-1 com `User`, `fairId?` opcional para `Fair`.

### Product – `prisma/schema.prisma:237-262`

- `category String?` com `@@index([category])` – permanece `String` flexível, não `enum` (ADR-008).
- `photoUrl String?` mantido; `gallery` não entra no MVP.

### Fair – `prisma/schema.prisma:160-180`

- `latitude Decimal(10,7)?` / `longitude Decimal(10,7)?` – busca por proximidade via **Haversine em memória** no `fairs.service.ts`, sem `PostGIS`/`earthdistance` (ADR-009).
- Adicionado `ownerId String?` FK → `User.id` `onDelete SET NULL` + `@@index([ownerId])` para controle de permissão (ADR-011). `GET /fairs` público, `POST/PATCH/DELETE` só `ownerId==jwt.sub` ou `role==ADMIN`.
- `address/city/state` permanecem `String?` com índices `Fair_city_idx`/`Fair_state_idx`.

### SurpriseBox – `prisma/schema.prisma:268-294`

- Adicionado `photoUrl String?` opcional (foto única, ADR-010). `tags` não incluído no MVP.
- Permanece `price Decimal(10,2)`, `frequency SubscriptionFrequency`, `isActive`, relação `vendorId!` e `SurpriseBoxItem` M:N.

### Arquitetura

- Mantido `routes → controller → service → Prisma` sem Repository (`decisions.md:ADR-006 ACEITA`).
- `/vendors/:id` público para descoberta; `/users` focado em conta/autenticação (ADR-012).
- Ownership: checagem `vendor.userId == jwt.sub` em todos `POST/PATCH/DELETE` de `vendors/products/surprise-boxes`; `ADMIN` global.

## Decisões Etapa 1 – Fase Pagamentos ASAAS (2026-10-13)

### Payment – `prisma/schema.prisma:460-517`

Campos ASAAS adicionados (RF04):

- `asaasPaymentId String? @unique` — `pay_xxx` do ASAAS (`gatewayTransactionId` mantido por compatibilidade);
- `asaasCustomerId String?` — `cus_xxx`;
- `asaasSubscriptionId String?` — vínculo `sub_xxx` recorrente;
- `asaasInvoiceUrl String?`, `pixQrCode String?`, `pixCopyPaste String?` — checkout PIX;
- `dueDate DateTime?`, `gateway String? @default("asaas")`, `netValue Decimal?` — reservado para split futuro;
- `cardLast4 String?`, `cardBrand String?` — exibição sem expor número.

Índices `@@index([asaasPaymentId])` + `@@index([asaasSubscriptionId])`. Migração `prisma/migrations/20261013_add_asaas_fields/migration.sql`.

### Subscription – `prisma/schema.prisma:372-374`

- `asaasSubscriptionId String? @unique` — `sub_xxx` ASAAS para recorrência `WEEKLY`/`MONTHLY` (`nextDueDate`);
- `asaasCustomerId String?`.

### WebhookEvent – `prisma/schema.prisma:329-344`

Tabela de idempotência ASAAS:

- `id String @id` — `evt_xxx` (ou `evt_<event>_<paymentId>`);
- `event String`, `payload Json`, `processed Boolean @default(false)`, `processedAt DateTime?`;
- Índices `@@index([processed])`, `@@index([event])`.

Fluxo: `POST /webhooks/asaas` valida `asaas-access-token` (`server/src/config/asaas.ts:27`), persiste `WebhookEvent` e processa `PAYMENT_RECEIVED/CONFIRMED→PAID`, `PAYMENT_REFUNDED→REFUNDED`, `PAYMENT_CREATED` (cria espelho se cobrança recorrente futura), `SUBSCRIPTION_INACTIVATED→CANCELED` (`server/src/modules/webhooks/webhooks.service.ts:8`). `Notification` RF10 criada em `PAYMENT_RECEIVED`.
