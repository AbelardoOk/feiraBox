import { prisma } from '../../database/prisma';

import type { CreateProductInput, ProductQueryInput, UpdateProductInput } from './products.schema';

export class ProductsService {
  private async getVendorByUserId(userId: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
    return vendor;
  }

  async create(input: CreateProductInput, userId: string) {
    const vendor = await this.getVendorByUserId(userId);
    if (!vendor) {
      throw new Error(
        'Perfil de feirante não encontrado. Crie seu perfil de feirante antes de cadastrar produtos.',
      );
    }

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        name: input.name,
        description: input.description,
        category: input.category,
        price: input.price,
        photoUrl: input.photoUrl,
        isActive: input.isActive ?? true,
      },
    });

    return product;
  }

  async findMany(query: ProductQueryInput) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.vendorId) {
      (where as Record<string, unknown>).vendorId = query.vendorId;
    }

    if (query.category) {
      (where as Record<string, unknown>).category = {
        contains: query.category,
        mode: 'insensitive',
      };
    }

    if (query.isActive !== undefined) {
      (where as Record<string, unknown>).isActive = query.isActive;
    } else {
      // Por padrão, marketplace mostra apenas ativos
      (where as Record<string, unknown>).isActive = true;
    }

    if (query.q) {
      (where as Record<string, unknown>).OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // Se filtra por vendorId, permite mostrar inativos para o dono via isActive param
    // Mas para público, já filtra isActive true por padrão

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: {
            select: { id: true, businessName: true, photoUrl: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, businessName: true, photoUrl: true, userId: true },
        },
      },
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    return product;
  }

  async update(id: string, input: UpdateProductInput, requesterId: string, requesterRole: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { vendorId: true, vendor: { select: { userId: true } } },
    });

    if (!existing) {
      throw new Error('Produto não encontrado');
    }

    if (existing.vendor.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error('Não autorizado. Apenas o proprietário ou ADMIN pode editar este produto.');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        price: input.price,
        photoUrl: input.photoUrl,
        isActive: input.isActive,
      },
    });

    return updated;
  }

  async delete(id: string, requesterId: string, requesterRole: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { vendorId: true, vendor: { select: { userId: true } } },
    });

    if (!existing) {
      throw new Error('Produto não encontrado');
    }

    if (existing.vendor.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error('Não autorizado. Apenas o proprietário ou ADMIN pode excluir este produto.');
    }

    // Verificar se produto está em alguma caixa ativa - permitir exclusão mas avisar que será removido dos itens via CASCADE
    // Para histórico, poderíamos soft delete (isActive=false) mas por enquanto hard delete
    // Se houver SurpriseBoxItem, o CASCADE vai remover o item da caixa
    await prisma.product.delete({
      where: { id },
    });

    return { success: true };
  }
}
