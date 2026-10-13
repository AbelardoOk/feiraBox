# FeiraBox — API

## Objetivo

Este documento orienta a organização da API backend do FeiraBox.

A especificação define Elysia.js + Bun como tecnologia do backend, mas não define uma lista completa de endpoints.

Portanto, endpoints devem ser criados conforme as funcionalidades e documentados conforme forem implementados.

## Princípios

- API separada do aplicativo mobile.
- HTTPS em produção.
- Validação de entradas.
- Autenticação e autorização.
- Respostas consistentes.
- Tratamento adequado de erros.
- Não expor informações sensíveis.
- Não permitir acesso direto do mobile ao banco.

## Domínios funcionais

A API deverá contemplar, conforme os requisitos:

- autenticação;
- usuários;
- perfis de feirante;
- produtos;
- caixas surpresa;
- planos de assinatura;
- assinaturas;
- pedidos;
- pagamentos;
- comissão;
- Boost de Vendas;
- notificações;
- busca/curadoria.

## Autenticação

A implementação deve proteger endpoints que exigem usuário autenticado.

A especificação exige armazenamento seguro de senhas e comunicação HTTPS/TLS, mas não define formalmente o mecanismo de sessão/token.

Se JWT for adotado pelo projeto, sua implementação deve ser documentada como decisão técnica.

## Padrão de resposta

O formato definitivo de resposta da API ainda não foi especificado pela SRS.

Ao definir um padrão, documente-o aqui.

## Versionamento

O padrão de versionamento da API ainda não foi definido pela SRS.

Não introduzir versionamento arbitrário como requisito do projeto sem decisão técnica.

## Contratos

Quando um endpoint for implementado, documentar:

- método HTTP;
- rota;
- autenticação necessária;
- parâmetros;
- body;
- validações;
- resposta de sucesso;
- possíveis erros;
- regras de negócio relacionadas.

### Implementados

#### Autenticação

- `POST /auth/register` — público, `POST /auth/login` — público, `GET /auth/me` — `Bearer`, `GET /auth/verify` — `Bearer`.

#### Payments — ASAAS (RF04/RF07) — `server/src/modules/payments/payments.routes.ts:12`

- `POST /payments` — `Bearer` — body `subscriptionId?|orderId?|campaignId? + method: PIX|CREDIT_CARD + creditCard? + creditCardHolderInfo? + remoteIp?` — cria `Payment PENDING` com `CommissionService` (12% FIXO, `server/src/config/asaas.ts:9`) descontado diretamente (`platformFee/vendorAmount`), tenta `AsaasGateway.createPayment` (`POST /v3/payments`) e persiste `asaasPaymentId/invoiceUrl/pixQrCode` — cartão retorna `PAID` se `CONFIRMED` — `201` ou `400/403/404/502`.
- `GET /payments` — `Bearer` — query `status? page? limit?` — lista do usuário (ADMIN vê todos) — `200 {data,meta}`.
- `GET /payments/:id` — `Bearer` — apenas dono/campanha/order-vendor/ADMIN — `200` ou `403/404`.
- `POST /payments/:id/refund` — `Bearer` — apenas ADMIN ou feirante do pedido, `PAID`→`REFUNDED` via `gateway.refundPayment` — `200` ou `400/403/404`.

#### Webhooks ASAAS — `server/src/modules/webhooks/webhooks.routes.ts:1`

- `POST /webhooks/asaas` — público (valida `asaas-access-token == ASAAS_WEBHOOK_TOKEN` se configurado) — body `{id,event,payment{subscription?},subscription}` — idempotente via `WebhookEvent` (`evt_xxx`) — `200 {received:true}` sempre (evita retry infinito) — `401` se token inválido. Processa `PAYMENT_RECEIVED/CONFIRMED→PAID`, `PAYMENT_OVERDUE` (notifica), `PAYMENT_REFUNDED→REFUNDED`, `SUBSCRIPTION_INACTIVATED→CANCELED`.

#### Subscriptions — ASAAS recorrência (RF03) — `server/src/modules/subscriptions/subscriptions.routes.ts:70`

- `POST /subscriptions` — `Bearer` — body `boxId + frequency? + addressId? + method?:PIX|CREDIT_CARD + creditCard? + creditCardHolderInfo?` — cria `Subscription + Order + Delivery + Payment` em transação, calcula comissão via `CommissionService`, tenta `AsaasGateway.createCustomer + createPayment (PIX/Cartão) + createSubscription (WEEKLY/MONTHLY, nextDueDate)` para expansão futura — `201` ou `404/409`.

#### Outros

- `GET /vendors`, `GET /vendors/:id` — públicos; `POST /vendors` — `Bearer`; `GET /products`, `POST /products` — etc. Ver Swagger em `/swagger` (`server/src/app.ts:44`).
