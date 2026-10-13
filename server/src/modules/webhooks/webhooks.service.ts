import { prisma } from '../../database/prisma';
import type { AsaasWebhookInput } from './webhooks.schema';

export class WebhooksService {
  async handleAsaasEvent(
    raw: AsaasWebhookInput,
    eventId: string,
  ): Promise<{ processed: boolean; duplicate?: boolean }> {
    // Idempotência: se evt já existe, ignora
    const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
    if (existing) {
      return { processed: true, duplicate: true };
    }

    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        event: raw.event,
        payload: raw as unknown as never,
        processed: false,
      },
    });

    // Processar assincronamente (sem bloquear resposta 200)
    // Aqui processamos inline mas sem falhar o webhook
    try {
      await this.processEvent(raw);
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processed: true, processedAt: new Date() },
      });
    } catch (err) {
      console.error('[webhooks] erro ao processar evento', eventId, err);
      // mantém processed=false para reprocessamento futuro se necessário
    }

    return { processed: true };
  }

  private async processEvent(raw: AsaasWebhookInput): Promise<void> {
    const event = raw.event;

    // Eventos de pagamento: PAYMENT_CREATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED, etc.
    if (event.startsWith('PAYMENT_') && raw.payment) {
      await this.handlePaymentEvent(event, raw.payment);
      return;
    }

    // Eventos de assinatura: SUBSCRIPTION_CREATED, UPDATED, INACTIVATED, etc.
    if (event.startsWith('SUBSCRIPTION_') && raw.subscription) {
      await this.handleSubscriptionEvent(event, raw.subscription);
      return;
    }

    // Outros eventos: apenas log
    if (process.env.NODE_ENV !== 'test') {
      console.log('[webhooks] evento não mapeado:', event);
    }
  }

  private async handlePaymentEvent(
    event: string,
    payment: NonNullable<AsaasWebhookInput['payment']>,
  ): Promise<void> {
    const asaasPaymentId = payment.id;
    const externalRef = payment.externalReference; // nosso payment.id

    // Encontrar Payment local por asaasPaymentId ou externalReference
    let localPayment = null as Awaited<ReturnType<typeof prisma.payment.findFirst>> | null;
    if (asaasPaymentId) {
      localPayment = await prisma.payment.findFirst({ where: { asaasPaymentId } });
    }
    if (!localPayment && externalRef) {
      localPayment = await prisma.payment.findUnique({ where: { id: externalRef } });
      // se achou por id mas sem asaasPaymentId, atualizar vinculo
      if (localPayment && !localPayment.asaasPaymentId) {
        localPayment = await prisma.payment.update({
          where: { id: localPayment.id },
          data: { asaasPaymentId, gatewayTransactionId: asaasPaymentId },
        });
      }
    }

    // Caso assinatura recorrente gerou cobrança automática futura (sem Payment local ainda)
    // Criar Payment espelho se tiver subscription vinculada
    if (!localPayment && payment.subscription) {
      const sub = await prisma.subscription.findFirst({
        where: { asaasSubscriptionId: payment.subscription },
        select: { id: true, userId: true, price: true },
      });
      if (sub) {
        const amount = payment.value ?? Number(sub.price);
        const { platformFee, vendorAmount } = await this.calculateCommission(amount);
        localPayment = await prisma.payment.create({
          data: {
            userId: sub.userId,
            subscriptionId: sub.id,
            amount,
            platformFee,
            vendorAmount,
            method: 'PIX',
            status: 'PENDING',
            asaasPaymentId,
            gatewayTransactionId: asaasPaymentId,
            asaasSubscriptionId: payment.subscription,
            gateway: 'asaas',
          },
        });
      } else {
        console.warn(
          '[webhooks] pagamento sem Payment local nem subscription encontrada',
          asaasPaymentId,
        );
        return;
      }
    }

    if (!localPayment) {
      console.warn('[webhooks] Payment não encontrado para evento', event, asaasPaymentId);
      return;
    }

    // Mapear status ASAAS → local
    if (
      event === 'PAYMENT_RECEIVED' ||
      event === 'PAYMENT_CONFIRMED' ||
      event === 'PAYMENT_RECEIVED_IN_CASH'
    ) {
      if (localPayment.status !== 'PAID') {
        await prisma.payment.update({
          where: { id: localPayment.id },
          data: { status: 'PAID', paidAt: new Date(), asaasPaymentId },
        });
        await this.createNotification(
          localPayment.userId,
          'PAYMENT',
          'Pagamento confirmado',
          `Seu pagamento ${localPayment.id.slice(0, 8)} foi confirmado.`,
        );
        // Se pagamento vinculado a campanha, ativar
        if (localPayment.campaignId) {
          await prisma.campaign
            .update({ where: { id: localPayment.campaignId }, data: { status: 'ACTIVE' } })
            .catch(() => {});
        }
      }
      return;
    }

    if (event === 'PAYMENT_OVERDUE') {
      // manter PENDING, notificar
      await this.createNotification(
        localPayment.userId,
        'PAYMENT',
        'Pagamento vencido',
        `Seu pagamento ${localPayment.id.slice(0, 8)} está vencido.`,
      );
      return;
    }

    if (event === 'PAYMENT_REFUNDED' || event === 'PAYMENT_REFUND_REQUESTED') {
      await prisma.payment.update({ where: { id: localPayment.id }, data: { status: 'REFUNDED' } });
      await this.createNotification(
        localPayment.userId,
        'PAYMENT',
        'Pagamento reembolsado',
        `Seu pagamento ${localPayment.id.slice(0, 8)} foi reembolsado.`,
      );
      return;
    }

    if (event === 'PAYMENT_CHARGEBACK_REQUESTED') {
      await prisma.payment.update({ where: { id: localPayment.id }, data: { status: 'REFUNDED' } });
      return;
    }

    if (event === 'PAYMENT_DELETED') {
      await prisma.payment.update({ where: { id: localPayment.id }, data: { status: 'CANCELED' } });
      return;
    }

    // Outros (PAYMENT_CREATED, AWAITING_RISK_ANALYSIS, etc.) — apenas garantir asaasPaymentId vinculado
    if (localPayment.asaasPaymentId !== asaasPaymentId) {
      await prisma.payment.update({ where: { id: localPayment.id }, data: { asaasPaymentId } });
    }
  }

  private async handleSubscriptionEvent(
    event: string,
    subscription: NonNullable<AsaasWebhookInput['subscription']>,
  ): Promise<void> {
    const asaasSubId = subscription.id;
    const localSub = await prisma.subscription.findFirst({
      where: { asaasSubscriptionId: asaasSubId },
    });
    if (!localSub) {
      console.warn('[webhooks] Subscription não encontrada', asaasSubId);
      return;
    }

    if (event === 'SUBSCRIPTION_INACTIVATED' || event === 'SUBSCRIPTION_DELETED') {
      await prisma.subscription.update({
        where: { id: localSub.id },
        data: { status: 'CANCELED', canceledAt: new Date() },
      });
    }
    // SUBSCRIPTION_UPDATED pode refletir próximo vencimento — ignorar no MVP, mantido local como fonte da verdade
  }

  private async calculateCommission(
    amount: number,
  ): Promise<{ platformFee: number; vendorAmount: number }> {
    const { CommissionService } = await import('../commission/commission.service');
    const commission = new CommissionService();
    return commission.calculate(amount);
  }

  private async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      await prisma.notification.create({
        data: { userId, type: type as never, title, message },
      });
    } catch {
      // não falha webhook
    }
  }
}
