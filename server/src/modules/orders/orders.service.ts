import { prisma } from '../../database/prisma';

import type { OrderQueryInput } from './orders.schema';

const allowedTransitions: Record<string, string[]> = {
  PENDING: ['PREPARING', 'CANCELED'],
  PREPARING: ['READY', 'CANCELED'],
  READY: ['DELIVERED', 'CANCELED'],
  DELIVERED: [],
  CANCELED: [],
};

export class OrdersService {
  async findMany(userId: string, query: OrderQueryInput, role: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Determinar se é feirante (tem vendorProfile) ou consumidor
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const isVendor = !!vendor;
    const where: Record<string, unknown> = {};

    if (isVendor && role !== 'ADMIN') {
      // Se é feirante, por padrão mostra pedidos da sua banca, mas consumidor pode ter filtro ?role=consumer
      // Para Fase 4, se tem vendor, mostra como vendor (painel), senão como consumidor
      // Permitir ?today=true para filtrar expectedDeliveryAt hoje
      (where as Record<string, unknown>).vendorId = vendor.id;
    } else if (!isVendor || query.today === undefined) {
      // Consumidor ou ADMIN sem today: mostra como consumidor
      if (!isVendor) {
        (where as Record<string, unknown>).consumerId = userId;
      } else {
        // ADMIN sem vendor filter: mostra tudo? Para MVP, ADMIN vê como consumidor se não especificar
        // Se ADMIN quer ver como vendor, deve ter vendorId, mas não há filtro vendorId no query
        // Simplificar: se ADMIN e tem vendor, mostra como vendor se query não tem consumer filter
        // Para evitar ambiguidade, se é vendor, mostra vendor; se quer consumer, usar ?today=false? Não ideal
        // Decisão: se é vendor, mostra vendor orders; ADMIN pode ver todas se isVendor false? Vamos manter vendor
        (where as Record<string, unknown>).vendorId = vendor.id;
      }
    }

    // Filtro mais explícito: se query tem status, filtra
    if (query.status) {
      (where as Record<string, unknown>).status = query.status;
    }

    if (query.today) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      (where as Record<string, unknown>).expectedDeliveryAt = {
        gte: start,
        lte: end,
      };
    }

    // Se consumidor sem vendor, sobrescrever para consumerId
    if (!isVendor) {
      (where as Record<string, unknown>).vendorId = undefined;
      (where as Record<string, unknown>).consumerId = userId;
      if (query.today) {
        // today filter já aplicado em expectedDeliveryAt, mantém
      }
    }

    // Corrigir para consumidor: se não é vendor, garantir consumerId
    // Se é vendor mas quer ver como consumidor, não há param; mantemos vendor
    // Para simplificar testes, se é vendor e query não tem today, mostramos vendor; se quer consumer, o teste deve usar user sem vendor

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: { select: { id: true, frequency: true } },
          consumer: { select: { id: true, name: true, email: true } },
          vendor: { select: { id: true, businessName: true } },
          delivery: true,
          payment: true,
          address: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findById(id: string, requesterId: string, requesterRole: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        subscription: { select: { userId: true } },
        consumer: { select: { id: true } },
        vendor: { select: { userId: true } },
        delivery: true,
        payment: true,
        address: true,
      },
    });

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    const isConsumer = order.consumerId === requesterId;
    const isVendorOwner = order.vendor.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';

    if (!isConsumer && !isVendorOwner && !isAdmin) {
      throw new Error('Não autorizado. Apenas consumidor, feirante ou ADMIN.');
    }

    const fullOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        subscription: true,
        consumer: { select: { id: true, name: true, email: true } },
        vendor: { select: { id: true, businessName: true } },
        delivery: true,
        payment: true,
        address: true,
      },
    });

    return fullOrder;
  }

  async updateStatus(id: string, status: string, requesterId: string, requesterRole: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, status: true, vendor: { select: { userId: true } } },
    });

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    const isVendorOwner = order.vendor.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';

    if (!isVendorOwner && !isAdmin) {
      throw new Error('Não autorizado. Apenas feirante ou ADMIN pode atualizar status.');
    }

    const current = order.status as string;
    const allowed = allowedTransitions[current] ?? [];

    if (!allowed.includes(status)) {
      throw new Error(`Transição inválida de ${current} para ${status}`);
    }

    const data: Record<string, unknown> = { status };

    if (status === 'DELIVERED') {
      (data as Record<string, unknown>).deliveredAt = new Date();
    }

    const updated = await prisma.order.update({
      where: { id },
      data: data as never,
    });

    // Sincronizar Delivery status se for DELIVERED
    if (status === 'DELIVERED') {
      const delivery = await prisma.delivery.findUnique({ where: { orderId: id } });
      if (delivery && delivery.status !== 'DELIVERED') {
        await prisma.delivery.update({
          where: { orderId: id },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        });
      }
    }

    // Criar notificação para consumidor (RF06 + RF10)
    try {
      await prisma.notification.create({
        data: {
          userId: (await prisma.order.findUnique({ where: { id }, select: { consumerId: true } }))!
            .consumerId,
          type: 'ORDER',
          title: `Pedido ${status}`,
          message: `Seu pedido ${id.slice(0, 8)} foi atualizado para ${status}`,
        },
      });
    } catch {
      // Não falha se notificação falhar
    }

    return updated;
  }

  async getPanel(vendorUserId: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: vendorUserId },
      select: { id: true },
    });

    if (!vendor) {
      throw new Error('Perfil de feirante não encontrado');
    }

    const vendorId = vendor.id;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const nextWeekEnd = new Date();
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
    nextWeekEnd.setHours(23, 59, 59, 999);

    const [revenueResult, todayOrders, futureDeliveries, totalOrders, pendingOrders] =
      await Promise.all([
        prisma.payment.aggregate({
          where: { order: { vendorId }, status: 'PAID' },
          _sum: { vendorAmount: true },
        }),
        prisma.order.findMany({
          where: { vendorId, expectedDeliveryAt: { gte: todayStart, lte: todayEnd } },
          orderBy: { expectedDeliveryAt: 'asc' },
          take: 20,
          include: { consumer: { select: { id: true, name: true } }, delivery: true },
        }),
        prisma.delivery.findMany({
          where: {
            order: { vendorId },
            expectedAt: { gte: todayStart, lte: nextWeekEnd },
            status: { not: 'DELIVERED' },
          },
          orderBy: { expectedAt: 'asc' },
          take: 20,
          include: {
            order: { select: { id: true, consumer: { select: { name: true } }, status: true } },
          },
        }),
        prisma.order.count({ where: { vendorId } }),
        prisma.order.count({ where: { vendorId, status: 'PENDING' } }),
      ]);

    const revenue = revenueResult._sum.vendorAmount ?? 0;

    return {
      revenue: Number(revenue),
      totalOrders,
      pendingOrders,
      todayOrders,
      futureDeliveries,
    };
  }
}
