import Elysia, { t } from 'elysia';

import { asaasConfig } from '../../config/asaas';
import { WebhooksService } from './webhooks.service';

const webhooksService = new WebhooksService();

export const webhooksRoutes = new Elysia({ prefix: '/webhooks' }).post(
  '/asaas',
  async ({ body, headers, set }) => {
    // Validação do webhook token ASAAS (header asaas-access-token)
    const token =
      (headers['asaas-access-token'] as string | undefined) ??
      (headers['asaas_access_token'] as string | undefined);
    const rawHeaders = headers as Record<string, string | undefined>;
    const headerToken =
      rawHeaders['asaas-access-token'] ??
      rawHeaders['asaas_access_token'] ??
      rawHeaders['Asaas-Access-Token'] ??
      token;

    // Se webhook token configurado, validar; senão, aceitar (dev / sandbox sem token)
    if (asaasConfig.webhookToken && headerToken !== asaasConfig.webhookToken) {
      // Fallback: tentar verificar Authorization também
      const auth = rawHeaders.authorization;
      if (auth && auth !== `Bearer ${asaasConfig.webhookToken}`) {
        set.status = 401;
        return { success: false, message: 'Webhook token inválido' };
      }
      if (!headerToken && !auth) {
        set.status = 401;
        return { success: false, message: 'Webhook token ausente' };
      }
      if (headerToken && headerToken !== asaasConfig.webhookToken) {
        set.status = 401;
        return { success: false, message: 'Webhook token inválido' };
      }
    }

    const payload = body as Record<string, unknown>;
    const event = (payload.event as string) ?? 'UNKNOWN';
    // ASAAS envia id do evento como id ou evt_xxx; fallback usa timestamp + event
    const eventId =
      (payload.id as string) ??
      (payload.eventId as string) ??
      `evt_${event}_${(payload.payment as { id?: string })?.id ?? (payload.subscription as { id?: string })?.id ?? Date.now()}`;

    try {
      const result = await webhooksService.handleAsaasEvent(payload as never, eventId);
      set.status = 200;
      return { success: true, received: true, event, duplicate: result.duplicate ?? false };
    } catch (error) {
      console.error('[webhooks/asaas] erro handle', error);
      set.status = 200; // sempre 200 para ASAAS não re-tentar infinitamente após persistir
      return {
        success: true,
        received: true,
        event,
        error: error instanceof Error ? error.message : 'erro',
      };
    }
  },
  {
    body: t.Any(),
    detail: {
      tags: ['Webhooks'],
      summary: 'Webhook ASAAS — eventos de pagamento/assinatura',
      description:
        'Endpoint público para ASAAS enviar PAYMENT_* e SUBSCRIPTION_*. Valida header asaas-access-token (se ASAAS_WEBHOOK_TOKEN configurado). Idempotente por evt id.',
    },
    response: {
      200: t.Object({
        success: t.Boolean(),
        received: t.Boolean(),
        event: t.String(),
        duplicate: t.Optional(t.Boolean()),
      }),
      401: t.Object({ success: t.Boolean(), message: t.String() }),
    },
  },
);
