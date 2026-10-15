import { prisma } from '../../database/prisma';

import type { CreateAddressInput, UpdateAddressInput, AddressQueryInput } from './address.schema';

export class AddressService {
  async create(input: CreateAddressInput, userId: string) {
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return prisma.address.create({
      data: {
        userId,
        name: input.name ?? null,
        street: input.street,
        number: input.number,
        complement: input.complement ?? null,
        neighborhood: input.neighborhood,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        isDefault: input.isDefault ?? false,
      },
    });
  }

  async findMany(userId: string, query: AddressQueryInput) {
    const page = Math.max(1, Math.min(query.page ?? 1, 1000));
    const limit = Math.max(1, Math.min(query.limit ?? 20, 100));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.address.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.address.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findById(id: string, requesterId: string, role: string) {
    const address = await prisma.address.findUnique({ where: { id } });

    if (!address) {
      throw new Error('Endereço não encontrado');
    }

    if (address.userId !== requesterId && role !== 'ADMIN') {
      throw new Error('Não autorizado. Endereço não pertence ao usuário.');
    }

    return address;
  }

  async update(id: string, input: UpdateAddressInput, requesterId: string, role: string) {
    const existing = await prisma.address.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Endereço não encontrado');
    }

    if (existing.userId !== requesterId && role !== 'ADMIN') {
      throw new Error('Não autorizado. Endereço não pertence ao usuário.');
    }

    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId: existing.userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.street !== undefined ? { street: input.street } : {}),
        ...(input.number !== undefined ? { number: input.number } : {}),
        ...(input.complement !== undefined ? { complement: input.complement } : {}),
        ...(input.neighborhood !== undefined ? { neighborhood: input.neighborhood } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.state !== undefined ? { state: input.state } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });
  }

  async delete(id: string, requesterId: string, role: string) {
    const existing = await prisma.address.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Endereço não encontrado');
    }

    if (existing.userId !== requesterId && role !== 'ADMIN') {
      throw new Error('Não autorizado. Endereço não pertence ao usuário.');
    }

    await prisma.address.delete({ where: { id } });

    return { success: true };
  }
}
