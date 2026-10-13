# FeiraBox API — Server (Elysia + Bun + ASAAS)

Backend da plataforma FeiraBox (RF04/RF07 pagamentos, RF03 assinaturas). Ver `../README.md` e `../docs/api.md`.

## Stack

- **Bun** + **Elysia.js** (`src/app.ts`) — rotas `routes → controller → service → Prisma`
- **PostgreSQL** + **Prisma** (`prisma/schema.prisma`)
- **ASAAS v3** — `server/src/modules/gateway` (`AsaasGateway` + `MockGateway` + `PaymentGateway` interface)
- **JWT** (`src/plugins/jwt.ts`)

## Quick start

```bash
cd server
bun install
cp .env.example .env  # preencha DATABASE_URL, JWT_SECRET e ASAAS_*
bunx prisma migrate dev # ou deploy em prod
bunx prisma generate
bun run dev             # http://localhost:3000  swagger: /swagger, /scalar, /openapi
```

Health: `GET /health` → `{success:true,status:"ok"}`

## Env — ASAAS (RF04/RF07)

`server/.env.example:8` / `server/src/config/asaas.ts:23`:

```env
DATABASE_URL=postgresql://feirabox:feirabox@localhost:5432/feirabox
JWT_SECRET=change-me
ASAAS_API_KEY=$aact_hmlg_...      # sandbox; $aact_prod_... produção
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_ENV=sandbox                  # sandbox | production
ASAAS_WEBHOOK_TOKEN=32+chars-aleatório  # mesmo valor em ASAAS Dashboard > Webhooks > authToken
COMMISSION_RATE=0.12               # 0.10–0.15 (validado)
```

Sem `ASAAS_API_KEY` o server usa `MockGateway` (`server/src/modules/gateway/mock.gateway.ts`) — dev/test sem rede.

## Gateway — como funciona

`server/src/modules/gateway/asaas.gateway.ts:42` faz `fetch` com `access_token` + `User-Agent: FeiraBox/1.0`.

- **PIX:** `POST /v3/payments` `billingType: PIX` → `invoiceUrl` + `pixQrCode`/`pixCopyPaste` → `Payment.asaasInvoiceUrl/pixQrCode/pixCopyPaste`
- **Cartão:** `POST /v3/payments` `billingType: CREDIT_CARD` com `creditCard:{holderName,number,expiryMonth,expiryYear,ccv}` + `creditCardHolderInfo:{name,email,cpfCnpj,postalCode,addressNumber,phone?}` + `remoteIp` (ou `creditCardToken`) → `CONFIRMED`→`PAID` imediato
- **Recorrência:** `POST /v3/subscriptions` `WEEKLY`/`MONTHLY` + `nextDueDate` (Subscriptions) — gera parcelas futuras automaticamente via ASAAS, webhook cria `Payment` espelho.
- **Comissão:** `server/src/modules/commission/commission.service.ts:19` taxa **FIXA** 12% (`COMMISSION_RATE`), descontada `platformFee`/`vendorAmount` (contábil, `netValue` reservado p/ split `walletId` futuro)

## Rotas principais

### Subscriptions — ASAAS (RF03)

`POST /subscriptions` `Bearer` body `boxId + frequency? + addressId? + method?:PIX|CREDIT_CARD + creditCard? + holderInfo?`
→ cria `Subscription + Order + Delivery + Payment PENDING` (comissão) + tenta ASAAS `createCustomer`→`createPayment` (PIX/Cartão) → `createSubscription` (WEEKLY/MONTHLY) sem bloquear `201`. Ver `server/src/modules/subscriptions/subscriptions.routes.ts:70`.

### Payments — ASAAS (RF04/RF07/RF08)

```bash
# PIX avulso
POST /payments Bearer { "subscriptionId":"uuid", "method":"PIX" }
# Cartão
POST /payments Bearer { "subscriptionId":"uuid", "method":"CREDIT_CARD", "creditCard":{...}, "creditCardHolderInfo":{...} }
# Boost
POST /payments Bearer { "campaignId":"uuid", "method":"PIX" }
→ 201 { id, asaasPaymentId, asaasInvoiceUrl, pixQrCode, status, platformFee, vendorAmount }

GET /payments?status=PENDING&page=1&limit=20  Bearer (ADMIN vê todos)
GET /payments/:id  Bearer (dono/ADMIN)
POST /payments/:id/refund  Bearer (ADMIN/feirante, apenas PAID) → AsaasGateway.refundPayment
```

`server/src/modules/payments/payments.routes.ts:12`, `server/src/modules/payments/payments.service.ts:1`

### Webhooks — ASAAS (idempotente)

`POST /webhooks/asaas` **público** — header `asaas-access-token: <ASAAS_WEBHOOK_TOKEN>`

```json
{ "id":"evt_xxx", "event":"PAYMENT_RECEIVED", "payment":{ "id":"pay_xxx", "status":"RECEIVED", "externalReference":"uuid-payment" } }
→ 200 { received:true }
```

Mapeia `PAYMENT_RECEIVED/CONFIRMED→PAID`, `OVERDUE` (notifica), `REFUNDED`, `SUBSCRIPTION_INACTIVATED→CANCELED` (+ `Notification` RF10). `WebhookEvent` (`prisma/schema.prisma:329`) garante idempotência. Sempre `200` para evitar retry ASAAS. Ver `server/src/modules/webhooks/webhooks.routes.ts:1`, `server/src/modules/webhooks/webhooks.service.ts:8`.

## Swagger / OpenAPI

- http://localhost:3000/swagger (Swagger UI)
- http://localhost:3000/scalar (Scalar)
- http://localhost:3000/openapi (compat)
  Tags `Payments` e `Webhooks` têm descrição completa de uso (ver `server/src/app.ts:15`).

## Comandos

```bash
bun run dev        # watch src/index.ts
bunx prisma migrate dev --name add_...  # cria migração
bunx prisma generate                    # regenera client
bunx tsc --noEmit                       # typecheck
bun run test       # vitest
```

## Docs relacionadas

- `../docs/api.md` — contratos atualizados Payments/Webhooks
- `../docs/decisions.md:ADR-004` — ASAAS ACEITA
- `../docs/database.md` — Payment `asaasPaymentId` + WebhookEvent
- `../docs/business-rules.md` — gateway ASAAS e comissão fixa
