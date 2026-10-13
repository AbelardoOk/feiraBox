import { prisma } from '../../database/prisma';
import { CommissionService } from '../commission/commission.service';
import type { PaymentGateway } from '../gateway/payment-gateway.interface';
import { getPaymentGateway } from '../gateway/asaas.gateway';
import { mapAsaasPaymentStatus } from '../gateway/asaas.mapper';
import { toAsaasDate, addDays } from '../../shared/utils/money';

import type { CreatePaymentSchemaInput, PaymentQueryInput } from './payments.schema';

type ResolvedOrigin = {
  amount: number;
  description: string;
  subscriptionId?: string;
  orderId?: string;
  campaignId?: string;
  dueDate: Date;
};

export class PaymentsService {
  private commission = new CommissionService();
  private gateway: PaymentGateway;

  constructor(gateway?: PaymentGateway) {
    this.gateway = gateway ?? getPaymentGateway();
  }

  private async resolveOrigin(
    input: CreatePaymentSchemaInput,
    userId: string,
  ): Promise<ResolvedOrigin> {
    if (input.subscriptionId) {
      const sub = await prisma.subscription.findUnique({
        where: { id: input.subscriptionId },
        select: {
          id: true,
          userId: true,
          price: true,
          status: true,
          surpriseBox: { select: { name: true } },
        },
      });
      if (!sub) throw new Error('Assinatura não encontrada');
      if (sub.userId !== userId)
        throw new Error('Não autorizado. Assinatura não pertence ao usuário.');
      return {
        amount: Number(sub.price),
        description: `Assinatura ${sub.surpriseBox.name} — FeiraBox`,
        subscriptionId: sub.id,
        dueDate: addDays(new Date(), 3),
      };
    }

    if (input.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        select: {
          id: true,
          consumerId: true,
          subscription: { select: { price: true, surpriseBox: { select: { name: true } } } },
        },
      });
      if (!order) throw new Error('Pedido não encontrado');
      if (order.consumerId !== userId)
        throw new Error('Não autorizado. Pedido não pertence ao usuário.');
      return {
        amount: Number(order.subscription.price),
        description: `Pedido ${order.id.slice(0, 8)} — ${order.subscription.surpriseBox.name}`,
        orderId: order.id,
        subscriptionId: undefined,
        dueDate: addDays(new Date(), 1),
      };
    }

    if (input.campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: input.campaignId },
        select: { id: true, userId: true, budget: true, name: true, vendorId: true },
      });
      if (!campaign) throw new Error('Campanha não encontrada');
      // campanha pertence ao vendor owner
      const vendor = await prisma.vendorProfile.findUnique({
        where: { id: campaign.vendorId },
        select: { userId: true },
      });
      if (campaign.userId !== userId && vendor?.userId !== userId) {
        throw new Error('Não autorizado. Campanha não pertence ao usuário.');
      }
      return {
        amount: Number(campaign.budget),
        description: `Boost "${campaign.name}" — FeiraBox`,
        campaignId: campaign.id,
        dueDate: addDays(new Date(), 3),
      };
    }

    throw new Error('Origem do pagamento inválida');
  }

  private async ensureAsaasCustomer(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    });
    if (!user) throw new Error('Usuário não encontrado');

    // Verifica se já existe asaasCustomer (armazenado via último payment ou subscription)
    const existingPayment = await prisma.payment.findFirst({
      where: { userId, asaasCustomerId: { not: null } },
      select: { asaasCustomerId: true },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPayment?.asaasCustomerId) return existingPayment.asaasCustomerId;

    const existingSub = await prisma.subscription.findFirst({
      where: { userId, asaasCustomerId: { not: null } },
      select: { asaasCustomerId: true },
      orderBy: { createdAt: 'desc' },
    });
    if (existingSub?.asaasCustomerId) return existingSub.asaasCustomerId;

    // Busca no gateway por externalReference
    const found = await this.gateway.getCustomerByExternalReference(user.id).catch(() => null);
    if (found) return found.id;

    // Cria no gateway
    const created = await this.gateway.createCustomer({
      name: user.name,
      email: user.email,
      phone: user.phone ?? undefined,
      externalReference: user.id,
    });
    return created.id;
  }

  async create(input: CreatePaymentSchemaInput, userId: string, remoteIp?: string) {
    const origin = await this.resolveOrigin(input, userId);
    const { platformFee, vendorAmount } = this.commission.calculate(origin.amount);

    const asaasCustomerId = await this.ensureAsaasCustomer(userId);
    const billingType = input.method === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX';
    const dueDateStr = toAsaasDate(origin.dueDate);

    // Criar registro local PENDING primeiro (para externalReference)
    const payment = await prisma.payment.create({
      data: {
        userId,
        subscriptionId: origin.subscriptionId ?? null,
        orderId: origin.orderId ?? null,
        campaignId: origin.campaignId ?? null,
        amount: origin.amount,
        platformFee,
        vendorAmount,
        method: input.method as 'PIX' | 'CREDIT_CARD',
        status: 'PENDING',
        dueDate: origin.dueDate,
        gateway: 'asaas',
        asaasCustomerId,
      },
    });

    try {
      const gatewayPayment = await this.gateway.createPayment({
        customerId: asaasCustomerId,
        billingType,
        value: origin.amount,
        dueDate: dueDateStr,
        description: origin.description,
        externalReference: payment.id,
        creditCard: input.creditCard,
        creditCardHolderInfo: input.creditCardHolderInfo,
        remoteIp: remoteIp ?? input.remoteIp,
      });

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          asaasPaymentId: gatewayPayment.id,
          asaasInvoiceUrl: gatewayPayment.invoiceUrl ?? null,
          pixQrCode: gatewayPayment.pixQrCode ?? null,
          pixCopyPaste: gatewayPayment.pixCopyAndPaste ?? null,
          gatewayTransactionId: gatewayPayment.id,
          // Se gateway retornou CONFIRMED (cartão aprovado na hora), marcar PAID
          ...(gatewayPayment.status === 'CONFIRMED' || gatewayPayment.status === 'RECEIVED'
            ? { status: 'PAID' as const, paidAt: new Date() }
            : {}),
        },
      });

      // Se já pago e origem é campaign, atualizar status da campanha
      if (updated.status === 'PAID' && origin.campaignId) {
        await prisma.campaign
          .update({
            where: { id: origin.campaignId },
            data: { status: 'ACTIVE' },
          })
          .catch(() => {});
      }

      return updated;
    } catch (error) {
      // Se gateway falhou, marcar FAILED mas manter registro para auditoria
      await prisma.payment
        .update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        })
        .catch(() => {});
      throw error;
    }
  }

  async findMany(userId: string, query: PaymentQueryInput, role: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const isAdmin = role === 'ADMIN';
    const where: Record<string, unknown> = isAdmin ? {} : { userId };

    if (query.status) (where as Record<string, unknown>).status = query.status;

    const [data, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: { select: { id: true, frequency: true } },
          order: { select: { id: true, status: true } },
          campaign: { select: { id: true, name: true, status: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findById(id: string, requesterId: string, role: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        subscription: { select: { userId: true } },
        order: { select: { consumerId: true } },
        campaign: { select: { userId: true, vendor: { select: { userId: true } } } },
      },
    });
    if (!payment) throw new Error('Pagamento não encontrado');

    const isOwner = payment.userId === requesterId;
    const isOrderOwner = payment.order?.consumerId === requesterId;
    const isCampaignOwner =
      payment.campaign?.userId === requesterId || payment.campaign?.vendor.userId === requesterId;
    const isAdmin = role === 'ADMIN';

    if (!isOwner && !isOrderOwner && !isCampaignOwner && !isAdmin) {
      throw new Error('Não autorizado. Apenas dono ou ADMIN.');
    }

    return prisma.payment.findUnique({
      where: { id },
      include: {
        subscription: true,
        order: true,
        campaign: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async refund(id: string, requesterId: string, role: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        asaasPaymentId: true,
        userId: true,
        order: { select: { vendor: { select: { userId: true } } } },
      },
    });
    if (!payment) throw new Error('Pagamento não encontrado');
    if (payment.status !== 'PAID')
      throw new Error('Apenas pagamentos pagos podem ser reembolsados');

    const isAdmin = role === 'ADMIN';
    const isVendor = payment.order?.vendor.userId === requesterId;

    if (!isAdmin && !isVendor) {
      throw new Error('Não autorizado. Apenas ADMIN ou feirante pode reembolsar.');
    }

    if (payment.asaasPaymentId) {
      await this.gateway.refundPayment(payment.asaasPaymentId);
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: { status: 'REFUNDED' },
    });

    return updated;
  }

  async syncFromGateway(id: string): Promise<unknown> {
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment?.asaasPaymentId) throw new Error('Pagamento sem asaasPaymentId');
    const gatewayPayment = await this.gateway.getPayment(payment.asaasPaymentId);
    const localStatus = mapAsaasPaymentStatus(gatewayPayment.status);
    const updateData: Record<string, unknown> = {};
    if (gatewayPayment.status === 'RECEIVED' || gatewayPayment.status === 'CONFIRMED') {
      updateData.status = 'PAID';
      updateData.paidAt = new Date();
    } else if (gatewayPayment.status === 'REFUNDED') {
      updateData.status = 'REFUNDED';
    } else if (gatewayPayment.status === 'OVERDUE') {
      // mantém PENDING mas pode notificar
    }
    void localStatus;
    if (Object.keys(updateData).length > 0) {
      return prisma.payment.update({ where: { id }, data: updateData as never });
    }
    return payment;
  }
}
