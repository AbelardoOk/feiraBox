import { prisma } from '../../database/prisma';

import type {
  CreateSubscriptionInput,
  SubscriptionQueryInput,
  UpdateSubscriptionPlanInput,
} from './subscriptions.schema';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function calculateNextBilling(frequency: string, from: Date = new Date()): Date {
  return frequency === 'WEEKLY' ? addDays(from, 7) : addDays(from, 30);
}

export class SubscriptionsService {
  async create(input: CreateSubscriptionInput, userId: string) {
    const box = await prisma.surpriseBox.findUnique({
      where: { id: input.boxId },
      select: {
        id: true,
        vendorId: true,
        price: true,
        frequency: true,
        isActive: true,
        name: true,
      },
    });

    if (!box) {
      throw new Error('Caixa Surpresa não encontrada');
    }

    if (!box.isActive) {
      throw new Error('Caixa Surpresa inativa');
    }

    const frequency = input.frequency ?? box.frequency;
    const price = box.price;

    // Validar address se fornecido
    let addressId: string | null = null;
    if (input.addressId) {
      const address = await prisma.address.findUnique({
        where: { id: input.addressId },
        select: { id: true, userId: true },
      });
      if (!address) {
        throw new Error('Endereço não encontrado');
      }
      if (address.userId !== userId) {
        throw new Error('Endereço não pertence ao usuário');
      }
      addressId = address.id;
    } else {
      // Tentar pegar endereço padrão do usuário, se houver
      const defaultAddress = await prisma.address.findFirst({
        where: { userId, isDefault: true },
        select: { id: true },
      });
      if (defaultAddress) addressId = defaultAddress.id;
    }

    const vendorId = box.vendorId;
    const now = new Date();
    const nextBillingAt = calculateNextBilling(frequency, now);

    // Criar assinatura + pedido + entrega + pagamento em transação
    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          userId,
          boxId: box.id,
          frequency: frequency as 'WEEKLY' | 'MONTHLY',
          status: 'ACTIVE',
          price,
          startedAt: now,
          nextBillingAt,
        },
      });

      const amount = price;
      // Comissão RF07: 12% MVP (entre 10-15%)
      const platformFee = Number((Number(amount) * 0.12).toFixed(2));
      const vendorAmount = Number((Number(amount) - platformFee).toFixed(2));

      const payment = await tx.payment.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          amount,
          platformFee,
          vendorAmount,
          method: 'PIX',
          status: 'PENDING',
        },
      });

      const expectedDeliveryAt = addDays(now, 2);
      const order = await tx.order.create({
        data: {
          subscriptionId: subscription.id,
          consumerId: userId,
          vendorId,
          addressId,
          status: 'PENDING',
          generatedAt: now,
          expectedDeliveryAt,
        },
      });

      // Atualizar payment com orderId (relação 1-1)
      await tx.payment.update({
        where: { id: payment.id },
        data: { orderId: order.id },
      });

      const delivery = await tx.delivery.create({
        data: {
          orderId: order.id,
          status: 'PENDING',
          expectedAt: expectedDeliveryAt,
        },
      });

      return { subscription, order, delivery, payment };
    });

    // Retornar assinatura com relações para o controller
    const subscriptionWithRelations = await prisma.subscription.findUnique({
      where: { id: result.subscription.id },
      include: {
        surpriseBox: {
          select: {
            id: true,
            name: true,
            price: true,
            frequency: true,
            photoUrl: true,
            vendorId: true,
          },
        },
        orders: { take: 1, orderBy: { createdAt: 'desc' }, include: { delivery: true } },
        payments: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    return subscriptionWithRelations ?? result.subscription;
  }

  async findMany(
    userId: string,
    query: SubscriptionQueryInput,
    requesterRole?: string,
    isVendorQuery = false,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (isVendorQuery) {
      // Para feirante: buscar assinaturas onde a caixa pertence ao vendor do requester
      const vendor = await prisma.vendorProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!vendor) {
        return { data: [], meta: { page, limit, total: 0, totalPages: 0 } };
      }
      (where as Record<string, unknown>).surpriseBox = { vendorId: vendor.id };
      if (query.status) {
        (where as Record<string, unknown>).status = query.status;
      }
    } else {
      (where as Record<string, unknown>).userId = userId;
      if (query.status) {
        (where as Record<string, unknown>).status = query.status;
      }
    }

    // ADMIN pode ver todas se passar ?all=true - não implementado no MVP, keep consumer/vendor split
    void requesterRole;

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          surpriseBox: {
            select: {
              id: true,
              name: true,
              price: true,
              frequency: true,
              photoUrl: true,
              vendorId: true,
            },
          },
          orders: { take: 1, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findById(id: string, requesterId: string, requesterRole: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        surpriseBox: {
          select: { id: true, name: true, vendorId: true, vendor: { select: { userId: true } } },
        },
        user: { select: { id: true, name: true, email: true } },
        orders: { include: { delivery: true }, orderBy: { createdAt: 'desc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!subscription) {
      throw new Error('Assinatura não encontrada');
    }

    const isOwner = subscription.userId === requesterId;
    const isVendorOwner = subscription.surpriseBox.vendor.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';

    if (!isOwner && !isVendorOwner && !isAdmin) {
      throw new Error('Não autorizado. Apenas consumidor, feirante da caixa ou ADMIN.');
    }

    return subscription;
  }

  async pause(id: string, requesterId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });

    if (!sub) throw new Error('Assinatura não encontrada');
    if (sub.userId !== requesterId)
      throw new Error('Não autorizado. Apenas o consumidor pode pausar.');
    if (sub.status === 'PAUSED') throw new Error('Assinatura já pausada');
    if (sub.status !== 'ACTIVE') throw new Error('Apenas assinaturas ativas podem ser pausadas');

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: 'PAUSED', pausedAt: new Date() },
    });

    return updated;
  }

  async resume(id: string, requesterId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { id },
      select: { userId: true, status: true, pausedAt: true },
    });

    if (!sub) throw new Error('Assinatura não encontrada');
    if (sub.userId !== requesterId)
      throw new Error('Não autorizado. Apenas o consumidor pode retomar.');
    if (sub.status !== 'PAUSED') throw new Error('Apenas assinaturas pausadas podem ser retomadas');

    // Recalcular nextBillingAt: adiciona duração da pausa ao nextBillingAt original, ou +7/30 a partir de agora se null
    const existing = await prisma.subscription.findUnique({
      where: { id },
      select: { nextBillingAt: true, frequency: true },
    });
    let nextBillingAt: Date | null = null;
    if (existing?.nextBillingAt && sub.pausedAt) {
      const pauseDuration = Date.now() - new Date(sub.pausedAt).getTime();
      nextBillingAt = new Date(new Date(existing.nextBillingAt).getTime() + pauseDuration);
    } else if (existing) {
      nextBillingAt = calculateNextBilling(existing.frequency);
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: 'ACTIVE', pausedAt: null, nextBillingAt },
    });

    return updated;
  }

  async cancel(id: string, requesterId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { id },
      select: { userId: true, status: true },
    });

    if (!sub) throw new Error('Assinatura não encontrada');
    if (sub.userId !== requesterId)
      throw new Error('Não autorizado. Apenas o consumidor pode cancelar.');
    if (sub.status === 'CANCELED') throw new Error('Assinatura já cancelada');
    if (sub.status === 'EXPIRED') throw new Error('Assinatura expirada não pode ser cancelada');

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELED', canceledAt: new Date(), nextBillingAt: null },
    });

    // Opcional: cancelar pedidos PENDING futuros – MVP mantém pedidos já gerados
    return updated;
  }

  async updatePlan(id: string, input: UpdateSubscriptionPlanInput, requesterId: string) {
    const sub = await prisma.subscription.findUnique({
      where: { id },
      select: { userId: true, status: true, boxId: true, frequency: true },
    });

    if (!sub) throw new Error('Assinatura não encontrada');
    if (sub.userId !== requesterId)
      throw new Error('Não autorizado. Apenas o consumidor pode alterar o plano.');
    if (sub.status !== 'ACTIVE')
      throw new Error('Apenas assinaturas ativas podem ter plano alterado');

    let newBoxId = sub.boxId;
    let newFrequency = sub.frequency as string;
    let newPrice: unknown = undefined;

    if (input.boxId && input.boxId !== sub.boxId) {
      const box = await prisma.surpriseBox.findUnique({
        where: { id: input.boxId },
        select: { id: true, price: true, frequency: true, isActive: true },
      });
      if (!box) throw new Error('Caixa Surpresa não encontrada');
      if (!box.isActive) throw new Error('Caixa Surpresa inativa');
      newBoxId = box.id;
      newPrice = box.price;
      if (!input.frequency) {
        newFrequency = box.frequency;
      }
    }

    if (input.frequency) {
      newFrequency = input.frequency;
    }

    // Se mudou box, price vem da nova caixa; se só frequency, mantém price atual mas recalcula nextBillingAt
    const data: Record<string, unknown> = {};
    if (newBoxId !== sub.boxId) {
      (data as Record<string, unknown>).boxId = newBoxId;
      if (newPrice !== undefined) (data as Record<string, unknown>).price = newPrice;
    }
    if (newFrequency !== sub.frequency) {
      (data as Record<string, unknown>).frequency = newFrequency;
      (data as Record<string, unknown>).nextBillingAt = calculateNextBilling(newFrequency);
    } else if (newBoxId !== sub.boxId && newPrice !== undefined) {
      // Mudou caixa mas frequência igual à nova caixa, já recalculou acima se frequency mudou, senão mantém nextBillingAt
      // Se frequência não mudou, mas caixa mudou, recalcula com frequência da nova caixa
      const boxFreq = newFrequency;
      (data as Record<string, unknown>).nextBillingAt = calculateNextBilling(boxFreq);
    }

    if (Object.keys(data).length === 0) {
      throw new Error('Nenhuma alteração informada');
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: data as never,
    });

    return updated;
  }
}
