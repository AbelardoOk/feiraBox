import openapi from '@elysia/openapi';
import { Elysia } from 'elysia';

import { authRoutes } from './modules/auth/auth.routes';
import { deliveriesRoutes } from './modules/deliveries/deliveries.routes';
import { addressRoutes } from './modules/address/address.routes';
import { fairsRoutes } from './modules/fairs/fairs.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { paymentsRoutes } from './modules/payments/payments.routes';
import { productsRoutes } from './modules/products/products.routes';
import { subscriptionsRoutes } from './modules/subscriptions/subscriptions.routes';
import { surpriseBoxesRoutes } from './modules/surprise-boxes/surprise-boxes.routes';
import { vendorsRoutes } from './modules/vendors/vendors.routes';
import { webhooksRoutes } from './modules/webhooks/webhooks.routes';

const swaggerDocumentation = {
  info: {
    title: 'FeiraBox API',
    version: '1.0.50',
    description: [
      'API da plataforma FeiraBox - marketplace de produtos de feira com caixas surpresa, assinaturas, pedidos, pagamentos e campanhas de tráfego pago. Autenticação via JWT (Bearer).',
      '',
      '### Gateway de Pagamento — ASAAS v3 (RF04 / RF07)',
      'Implementado em `server/src/modules/gateway` (interface `PaymentGateway` + `AsaasGateway` + `MockGateway`).',
      '**Sandbox:** `https://api-sandbox.asaas.com/v3` | **Produção:** `https://api.asaas.com/v3` — header `access_token` + `User-Agent: FeiraBox/1.0` (`server/src/config/asaas.ts`, `server/.env.example`).',
      'Sem `ASAAS_API_KEY` o backend usa `MockGateway` (dev/test sem rede).',
      '',
      '**PIX** — `POST /v3/payments` `billingType: PIX` → `asaasInvoiceUrl` + `pixQrCode`/`pixCopyPaste` (Payment). **Cartão** — `POST /v3/payments` `billingType: CREDIT_CARD` com `creditCard` + `creditCardHolderInfo` + `remoteIp` (ou `creditCardToken`) → `CONFIRMED`→`PAID` imediato.',
      '**Recorrência** — `POST /v3/subscriptions` `WEEKLY`/`MONTHLY` + `nextDueDate` (Subscriptions, expansão futura via webhooks).',
      '**Comissão** — `CommissionService` taxa fixa `COMMISSION_RATE=0.12` (10-15% validado, descontada `platformFee` + `vendorAmount`), contábil por enquanto (`netValue` reservado para split).',
      '',
      '### Como usar',
      '1. **Assinatura PIX:** `POST /subscriptions` `{ boxId, frequency, method:"PIX" }` + `Authorization: Bearer <JWT>` → `201` com `payments[0].asaasInvoiceUrl/pixQrCode`.',
      '2. **Assinatura Cartão:** `POST /subscriptions` com `method:"CREDIT_CARD"` + `creditCard` + `creditCardHolderInfo` → `201` com Payment `PAID` se aprovado.',
      '3. **Pagamento avulso:** `POST /payments` `{ subscriptionId|orderId|campaignId, method:"PIX"|"CREDIT_CARD", creditCard?, holderInfo? }` → `201 { asaasPaymentId, invoiceUrl, pixQrCode }`. `campaignId` cobre Boost RF08.',
      '4. **Listar/consultar/reembolsar:** `GET /payments`, `GET /payments/:id`, `POST /payments/:id/refund` (ADMIN/feirante, apenas PAID).',
      '5. **Webhook ASAAS (público, idempotente):** `POST /webhooks/asaas` header `asaas-access-token: <ASAAS_WEBHOOK_TOKEN>` body `{ id:"evt_xxx", event:"PAYMENT_RECEIVED", payment:{ id:"pay_xxx", status, externalReference } }` → `200 {received:true}`. Mapeia `PAYMENT_RECEIVED/CONFIRMED→PAID`, `REFUNDED`, `SUBSCRIPTION_INACTIVATED→CANCELED` (+ Notification RF10). `WebhookEvent` garante idempotência.',
      '',
      'Ver também: `docs/api.md`, `docs/decisions.md:ADR-004`, `server/src/modules/payments/payments.routes.ts`, `server/src/modules/webhooks/webhooks.routes.ts`.',
      'Ambiente: `ASAAS_API_KEY`, `ASAAS_BASE_URL`, `ASAAS_ENV=sandbox|production`, `ASAAS_WEBHOOK_TOKEN` (32+ chars, mesmo em ASAAS > Webhooks > authToken), `COMMISSION_RATE` em `server/.env.example`.',
    ].join('\n'),
  },
  tags: [
    {
      name: 'Auth',
      description:
        'Autenticação e autorização (JWT) — `POST /auth/register` público, `POST /auth/login` público, `GET /auth/me` Bearer',
    },
    {
      name: 'Fairs',
      description:
        'Feiras e mercados (RF11 - busca por proximidade) — `GET /fairs` público, `POST/PATCH/DELETE` owner|ADMIN',
    },
    {
      name: 'Vendors',
      description: 'Feirantes e produtores (RF01) — `GET /vendors` público, `POST /vendors` Bearer',
    },
    {
      name: 'Products',
      description:
        'Produtos do feirante (RF02) — `GET /products` público, `POST` Bearer vendor owner',
    },
    {
      name: 'SurpriseBoxes',
      description: 'Caixas surpresa (RF02) — `GET /surprise-boxes` público, `POST` Bearer',
    },
    {
      name: 'Subscriptions',
      description:
        'Assinaturas recorrentes (RF03/RF09) + ASAAS — `POST /subscriptions` Bearer body `boxId + frequency? + addressId? + method?:PIX|CREDIT_CARD + creditCard? + holderInfo?` → cria Subscription+Order+Delivery+Payment (PENDING) com Comissão 12%, tenta AsaasGateway (customer→payment PIX/Cartão→subscription WEEKLY/MONTHLY) sem bloquear 201; `GET /subscriptions`, `GET /subscriptions/:id`, `PATCH /:id/pause|resume|cancel` (cancel sync Asaas), `PATCH /:id` (troca plano). Ver `server/src/modules/subscriptions/subscriptions.routes.ts`',
    },
    {
      name: 'Orders',
      description:
        'Pedidos e painel do feirante (RF05/RF06) — `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status` (PENDING→PREPARING→READY→DELIVERED), `GET /orders/panel` receitas',
    },
    {
      name: 'Payments',
      description:
        'Pagamentos ASAAS — PIX e Cartão (RF04) + Comissão (RF07) — `POST /payments` Bearer `{ subscriptionId|orderId|campaignId, method:PIX|CREDIT_CARD, creditCard?, holderInfo?, remoteIp? }` → `201` com `asaasPaymentId/asaasInvoiceUrl/pixQrCode` (Cartão CONFIRMED→PAID); `GET /payments?status&page&limit`, `GET /payments/:id`, `POST /payments/:id/refund` (ADMIN/feirante, apenas PAID). Comissão 12% FIXA (`CommissionService`, `COMMISSION_RATE` env 0.10-0.15) descontada `platformFee/vendorAmount` (contábil, `netValue` reservado p/ split). Ver `server/src/modules/payments/payments.routes.ts` e `server/src/config/asaas.ts`',
    },
    {
      name: 'Webhooks',
      description:
        'Webhooks ASAAS — eventos de pagamento/assinatura — `POST /webhooks/asaas` **público** headers `asaas-access-token` (=`ASAAS_WEBHOOK_TOKEN`, 32+ chars, `server/.env.example` e ASAAS dashboard) — body `{ id:"evt_xxx", event:"PAYMENT_RECEIVED|CONFIRMED|OVERDUE|REFUNDED|CHARGEBACK|DELETED|SUBSCRIPTION_INACTIVATED", payment:{ id:"pay_xxx", status, externalReference, subscription }, subscription:{ id:"sub_xxx" } }` — idempotente `WebhookEvent` (`prisma/schema.prisma:329`), sempre `200 {received:true}` (evita retry ASAAS). Processa PAYMENT_RECEIVED/CONFIRMED→PAID (+ Notification), REFUNDED, OVERDUE, SUBSCRIPTION_INACTIVATED→CANCELED. Ver `server/src/modules/webhooks/webhooks.routes.ts` + `webhooks.service.ts`',
    },
    {
      name: 'Deliveries',
      description: 'Entregas e QR Code — `GET /deliveries`, `POST /deliveries/:id/validate`',
    },
    {
      name: 'Health',
      description: 'Verificação de saúde da API — `GET /` e `GET /health` públicos',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer' as const,
        bearerFormat: 'JWT',
        description: 'Insira o token JWT como: Bearer <token>',
      },
    },
  },
};

export const app = new Elysia()
  .use(
    openapi({
      path: '/swagger',
      provider: 'swagger-ui',
      documentation: swaggerDocumentation,
      swagger: {
        version: '4.18.2',
        autoDarkMode: true,
      },
    }),
  )
  // Scalar como alternativa em /scalar e compatibilidade com /openapi (antigo padrão)
  .use(
    openapi({
      path: '/scalar',
      provider: 'scalar',
      documentation: swaggerDocumentation,
    }),
  )
  .use(
    openapi({
      path: '/openapi',
      provider: 'swagger-ui',
      documentation: swaggerDocumentation,
      swagger: {
        version: '4.18.2',
        autoDarkMode: true,
      },
    }),
  )
  .onError(({ error, set, code }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message: 'Dados inválidos',
        details: error.message,
      };
    }

    // Prisma P2002 (unique violation) por condição de corrida → 409
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: unknown }).code === 'P2002'
    ) {
      set.status = 409;
      const targetArr = (error as { meta?: { target?: string[] } }).meta?.target ?? [];
      const target = targetArr.join(',');
      if (targetArr.includes('cpfCnpj') || target.includes('cpfCnpj'))
        return { success: false, message: 'CPF/CNPJ já cadastrado' };
      if (targetArr.includes('email') || target.includes('email'))
        return { success: false, message: 'E-mail já cadastrado' };
      if (targetArr.includes('userId'))
        return { success: false, message: 'Usuário já possui perfil de feirante' };
      if (targetArr.includes('surpriseBoxId') && targetArr.includes('productId'))
        return { success: false, message: 'Produto já está na caixa' };
      return { success: false, message: 'Recurso já existe' };
    }

    const message = error instanceof Error ? error.message : 'Erro interno do servidor';

    // Mapeia erros conhecidos para status HTTP adequados (mantém throw new Error)
    if (message === 'E-mail já cadastrado') {
      set.status = 409;
      return { success: false, message };
    }
    if (message === 'E-mail ou senha inválidos') {
      set.status = 401;
      return { success: false, message };
    }
    if (message === 'Não autorizado. Token ausente, inválido ou expirado.') {
      set.status = 401;
      return { success: false, message };
    }
    if (message === 'CPF/CNPJ já cadastrado') {
      set.status = 409;
      return { success: false, message };
    }
    if (message === 'Usuário já possui perfil de feirante') {
      set.status = 409;
      return { success: false, message };
    }
    if (message === 'Produto já está na caixa') {
      set.status = 409;
      return { success: false, message };
    }

    // ZodError fallback
    if (error instanceof Error && error.name === 'ZodError') {
      set.status = 400;
      return {
        success: false,
        message: 'Dados inválidos',
        details: error.message,
      };
    }

    if (process.env.NODE_ENV !== 'test') {
      console.error('[app] Unhandled error:', error);
    }
    set.status = 500;
    return { success: false, message: 'Erro interno do servidor' };
  })
  .use(authRoutes)
  .use(addressRoutes)
  .use(fairsRoutes)
  .use(vendorsRoutes)
  .use(productsRoutes)
  .use(surpriseBoxesRoutes)
  .use(subscriptionsRoutes)
  .use(ordersRoutes)
  .use(paymentsRoutes)
  .use(webhooksRoutes)
  .use(deliveriesRoutes)
  .get(
    '/',
    () => ({
      success: true,
      message: 'FeiraBox API running',
    }),
    {
      detail: {
        tags: ['Health'],
        summary: 'Status raiz',
        description: 'Retorna mensagem de que a API está no ar.',
      },
    },
  )
  .get(
    '/health',
    () => ({
      success: true,
      status: 'ok',
    }),
    {
      detail: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Verifica saúde da API.',
      },
    },
  );
