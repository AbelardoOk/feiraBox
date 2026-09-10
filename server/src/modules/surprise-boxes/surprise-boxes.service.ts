import { prisma } from '../../database/prisma';

import type {
  AddItemInput,
  CreateSurpriseBoxInput,
  SurpriseBoxQueryInput,
  UpdateItemInput,
  UpdateSurpriseBoxInput,
} from './surprise-boxes.schema';

export class SurpriseBoxesService {
  private async getVendorByUserId(userId: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    return vendor;
  }

  async create(input: CreateSurpriseBoxInput, userId: string) {
    const vendor = await this.getVendorByUserId(userId);
    if (!vendor) {
      throw new Error(
        'Perfil de feirante não encontrado. Crie seu perfil de feirante antes de criar caixas.',
      );
    }

    const box = await prisma.surpriseBox.create({
      data: {
        vendorId: vendor.id,
        name: input.name,
        description: input.description,
        price: input.price,
        frequency: input.frequency,
        isActive: input.isActive ?? true,
        photoUrl: input.photoUrl,
      },
    });

    return box;
  }

  async findMany(query: SurpriseBoxQueryInput) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.vendorId) {
      (where as Record<string, unknown>).vendorId = query.vendorId;
    }

    if (query.frequency) {
      (where as Record<string, unknown>).frequency = query.frequency;
    }

    if (query.isActive !== undefined) {
      (where as Record<string, unknown>).isActive = query.isActive;
    } else {
      (where as Record<string, unknown>).isActive = true;
    }

    if (query.q) {
      (where as Record<string, unknown>).OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.surpriseBox.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: { select: { id: true, businessName: true, photoUrl: true } },
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, photoUrl: true, category: true },
              },
            },
          },
        },
      }),
      prisma.surpriseBox.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findById(id: string) {
    const box = await prisma.surpriseBox.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, businessName: true, photoUrl: true, userId: true, fairId: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                photoUrl: true,
                category: true,
                isActive: true,
                vendorId: true,
              },
            },
          },
          orderBy: { product: { name: 'asc' } },
        },
      },
    });

    if (!box) {
      throw new Error('Caixa Surpresa não encontrada');
    }

    return box;
  }

  async update(
    id: string,
    input: UpdateSurpriseBoxInput,
    requesterId: string,
    requesterRole: string,
  ) {
    const existing = await prisma.surpriseBox.findUnique({
      where: { id },
      select: { vendorId: true, vendor: { select: { userId: true } } },
    });

    if (!existing) {
      throw new Error('Caixa Surpresa não encontrada');
    }

    if (existing.vendor.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error('Não autorizado. Apenas o proprietário ou ADMIN pode editar esta caixa.');
    }

    const updated = await prisma.surpriseBox.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        frequency: input.frequency,
        isActive: input.isActive,
        photoUrl: input.photoUrl,
      },
    });

    return updated;
  }

  async delete(id: string, requesterId: string, requesterRole: string) {
    const existing = await prisma.surpriseBox.findUnique({
      where: { id },
      select: { vendorId: true, vendor: { select: { userId: true } } },
    });

    if (!existing) {
      throw new Error('Caixa Surpresa não encontrada');
    }

    if (existing.vendor.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error('Não autorizado. Apenas o proprietário ou ADMIN pode excluir esta caixa.');
    }

    // Verificar se há assinaturas ativas vinculadas - RESTRICT no DB impedirá, mas tratamos mensagem
    const activeSubscriptions = await prisma.subscription.count({
      where: { boxId: id, status: 'ACTIVE' },
    });

    if (activeSubscriptions > 0) {
      throw new Error('Não é possível excluir caixa com assinaturas ativas');
    }

    await prisma.surpriseBox.delete({
      where: { id },
    });

    return { success: true };
  }

  async addItem(boxId: string, input: AddItemInput, requesterId: string, requesterRole: string) {
    const box = await prisma.surpriseBox.findUnique({
      where: { id: boxId },
      select: { vendorId: true, vendor: { select: { userId: true } } },
    });

    if (!box) {
      throw new Error('Caixa Surpresa não encontrada');
    }

    if (box.vendor.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error(
        'Não autorizado. Apenas o proprietário ou ADMIN pode adicionar itens a esta caixa.',
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, vendorId: true, isActive: true, name: true },
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    if (product.vendorId !== box.vendorId) {
      throw new Error('Produto deve pertencer ao mesmo feirante da caixa');
    }

    if (!product.isActive) {
      throw new Error('Produto inativo não pode ser adicionado à caixa');
    }

    const existingItem = await prisma.surpriseBoxItem.findUnique({
      where: { surpriseBoxId_productId: { surpriseBoxId: boxId, productId: input.productId } },
    });

    if (existingItem) {
      throw new Error('Produto já está na caixa');
    }

    const item = await prisma.surpriseBoxItem.create({
      data: {
        surpriseBoxId: boxId,
        productId: input.productId,
        quantity: input.quantity ?? 1,
      },
      include: {
        product: { select: { id: true, name: true, price: true, photoUrl: true } },
      },
    });

    return item;
  }

  async updateItem(
    boxId: string,
    productId: string,
    input: UpdateItemInput,
    requesterId: string,
    requesterRole: string,
  ) {
    const box = await prisma.surpriseBox.findUnique({
      where: { id: boxId },
      select: { vendorId: true, vendor: { select: { userId: true } } },
    });

    if (!box) {
      throw new Error('Caixa Surpresa não encontrada');
    }

    if (box.vendor.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error(
        'Não autorizado. Apenas o proprietário ou ADMIN pode editar itens desta caixa.',
      );
    }

    const item = await prisma.surpriseBoxItem.findUnique({
      where: { surpriseBoxId_productId: { surpriseBoxId: boxId, productId } },
    });

    if (!item) {
      throw new Error('Item não encontrado na caixa');
    }

    const updated = await prisma.surpriseBoxItem.update({
      where: { surpriseBoxId_productId: { surpriseBoxId: boxId, productId } },
      data: { quantity: input.quantity },
      include: {
        product: { select: { id: true, name: true, price: true, photoUrl: true } },
      },
    });

    return updated;
  }

  async removeItem(boxId: string, productId: string, requesterId: string, requesterRole: string) {
    const box = await prisma.surpriseBox.findUnique({
      where: { id: boxId },
      select: { vendorId: true, vendor: { select: { userId: true } } },
    });

    if (!box) {
      throw new Error('Caixa Surpresa não encontrada');
    }

    if (box.vendor.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error(
        'Não autorizado. Apenas o proprietário ou ADMIN pode remover itens desta caixa.',
      );
    }

    const item = await prisma.surpriseBoxItem.findUnique({
      where: { surpriseBoxId_productId: { surpriseBoxId: boxId, productId } },
    });

    if (!item) {
      throw new Error('Item não encontrado na caixa');
    }

    await prisma.surpriseBoxItem.delete({
      where: { surpriseBoxId_productId: { surpriseBoxId: boxId, productId } },
    });

    return { success: true };
  }
}
