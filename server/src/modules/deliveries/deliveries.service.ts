import { randomUUID } from 'crypto';

import { prisma } from '../../database/prisma';

const allowedDeliveryTransitions: Record<string, string[]> = {
  PENDING: ['PREPARING', 'CANCELED'],
  PREPARING: ['READY', 'CANCELED'],
  READY: ['IN_TRANSIT', 'DELIVERED', 'CANCELED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELED'],
  DELIVERED: [],
  CANCELED: [],
};

export class DeliveriesService {
  private async checkOrderOwnership(orderId: string, requesterId: string, requesterRole: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { consumerId: true, vendor: { select: { userId: true } } },
    });

    if (!order) {
      throw new Error('Pedido não encontrado');
    }

    const isConsumer = order.consumerId === requesterId;
    const isVendor = order.vendor.userId === requesterId;
    const isAdmin = requesterRole === 'ADMIN';

    if (!isConsumer && !isVendor && !isAdmin) {
      throw new Error('Não autorizado. Apenas consumidor, feirante ou ADMIN.');
    }

    return { order, isVendor, isAdmin };
  }

  async getByOrderId(orderId: string, requesterId: string, requesterRole: string) {
    await this.checkOrderOwnership(orderId, requesterId, requesterRole);

    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            consumerId: true,
            vendorId: true,
            expectedDeliveryAt: true,
            deliveredAt: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new Error('Entrega não encontrada');
    }

    return delivery;
  }

  async updateStatus(orderId: string, status: string, requesterId: string, requesterRole: string) {
    const { isVendor, isAdmin } = await this.checkOrderOwnership(
      orderId,
      requesterId,
      requesterRole,
    );

    // Apenas feirante ou ADMIN pode atualizar status da entrega
    if (!isVendor && !isAdmin) {
      throw new Error('Não autorizado. Apenas feirante ou ADMIN pode atualizar entrega.');
    }

    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
      select: { status: true },
    });

    if (!delivery) {
      throw new Error('Entrega não encontrada');
    }

    const current = delivery.status as string;
    const allowed = allowedDeliveryTransitions[current] ?? [];

    if (!allowed.includes(status)) {
      throw new Error(`Transição inválida de ${current} para ${status}`);
    }

    const data: Record<string, unknown> = { status };

    if (status === 'DELIVERED') {
      (data as Record<string, unknown>).deliveredAt = new Date();
    } else if (status === 'IN_TRANSIT') {
      (data as Record<string, unknown>).startedAt = new Date();
    }

    const updated = await prisma.delivery.update({
      where: { orderId },
      data: data as never,
    });

    // Sincronizar Order se for DELIVERED
    if (status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED', deliveredAt: new Date() } as never,
      });
    }

    return updated;
  }

  async generateQr(orderId: string, requesterId: string, requesterRole: string) {
    const { isVendor, isAdmin } = await this.checkOrderOwnership(
      orderId,
      requesterId,
      requesterRole,
    );

    if (!isVendor && !isAdmin) {
      throw new Error('Não autorizado. Apenas feirante ou ADMIN pode gerar QR Code.');
    }

    const delivery = await prisma.delivery.findUnique({
      where: { orderId },
      select: { qrCode: true, status: true },
    });

    if (!delivery) {
      throw new Error('Entrega não encontrada');
    }

    if (delivery.status === 'DELIVERED') {
      throw new Error('Entrega já finalizada, não é possível gerar QR Code');
    }

    // Gerar novo QR Code (UUID)
    const qrCode = randomUUID();

    const updated = await prisma.delivery.update({
      where: { orderId },
      data: { qrCode },
    });

    return updated;
  }

  async verifyQr(qrCode: string, scannerId: string, scannerRole: string) {
    const delivery = await prisma.delivery.findUnique({
      where: { qrCode },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            consumerId: true,
            vendor: { select: { userId: true } },
          },
        },
      },
    });

    if (!delivery) {
      throw new Error('QR Code inválido ou não encontrado');
    }

    if (delivery.status === 'DELIVERED') {
      throw new Error('Entrega já finalizada');
    }

    const order = delivery.order as unknown as {
      id: string;
      status: string;
      consumerId: string;
      vendor: { userId: string };
    };
    const isVendor = order.vendor.userId === scannerId;
    const isAdmin = scannerRole === 'ADMIN';

    if (!isVendor && !isAdmin) {
      throw new Error('Não autorizado. Apenas feirante ou ADMIN pode validar QR Code.');
    }

    // Validar QR e marcar como entregue
    const updatedDelivery = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      } as never,
    });

    // Notificar consumidor
    try {
      await prisma.notification.create({
        data: {
          userId: order.consumerId,
          type: 'DELIVERY',
          title: 'Pedido entregue',
          message: `Seu pedido ${order.id.slice(0, 8)} foi entregue. QR Code validado.`,
        },
      });
    } catch {
      // ignorar
    }

    return updatedDelivery;
  }
}
