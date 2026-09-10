import { prisma } from '../../database/prisma';

import type { CreateVendorInput, UpdateVendorInput, VendorQueryInput } from './vendors.schema';

export class VendorsService {
  async create(input: CreateVendorInput, userId: string) {
    const existingByUser = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (existingByUser) {
      throw new Error('Usuário já possui perfil de feirante');
    }

    const existingByCpf = await prisma.vendorProfile.findUnique({
      where: { cpfCnpj: input.cpfCnpj },
    });

    if (existingByCpf) {
      throw new Error('CPF/CNPJ já cadastrado');
    }

    if (input.fairId) {
      const fair = await prisma.fair.findUnique({ where: { id: input.fairId } });
      if (!fair) {
        throw new Error('Feira não encontrada');
      }
    }

    const vendor = await prisma.vendorProfile.create({
      data: {
        userId,
        businessName: input.businessName,
        cpfCnpj: input.cpfCnpj,
        phone: input.phone,
        description: input.description,
        photoUrl: input.photoUrl,
        photos: input.photos ?? [],
        fairId: input.fairId ?? null,
      },
    });

    return vendor;
  }

  async findMany(query: VendorQueryInput) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.fairId) {
      (where as Record<string, unknown>).fairId = query.fairId;
    }

    if (query.q) {
      (where as Record<string, unknown>).OR = [
        { businessName: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.city || query.state) {
      (where as Record<string, unknown>).fair = {
        is: {
          ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
          ...(query.state ? { state: { contains: query.state, mode: 'insensitive' } } : {}),
        },
      };
    }

    const [data, total] = await Promise.all([
      prisma.vendorProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          fair: { select: { id: true, name: true, city: true, state: true } },
        },
      }),
      prisma.vendorProfile.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findById(id: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fair: true,
        products: { where: { isActive: true }, take: 10, orderBy: { createdAt: 'desc' } },
        surpriseBoxes: { where: { isActive: true }, take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!vendor) {
      throw new Error('Feirante não encontrado');
    }

    return vendor;
  }

  async findByUserId(userId: string) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId },
      include: {
        fair: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!vendor) {
      throw new Error('Perfil de feirante não encontrado');
    }

    return vendor;
  }

  async updateByUserId(userId: string, input: UpdateVendorInput, requesterRole: string) {
    const existing = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new Error('Perfil de feirante não encontrado');
    }

    // Ownership já garantido por buscar por userId, mas ADMIN pode editar outro via findById
    // Para PATCH /vendors/me, o userId é do token, então ok
    // Se for ADMIN editando outro, usaria outro método - aqui é só /me
    if (input.cpfCnpj && input.cpfCnpj !== existing.cpfCnpj) {
      const existingByCpf = await prisma.vendorProfile.findUnique({
        where: { cpfCnpj: input.cpfCnpj },
      });
      if (existingByCpf) {
        throw new Error('CPF/CNPJ já cadastrado');
      }
    }

    if (input.fairId !== undefined) {
      if (input.fairId) {
        const fair = await prisma.fair.findUnique({ where: { id: input.fairId } });
        if (!fair) {
          throw new Error('Feira não encontrada');
        }
      }
    }

    // ADMIN pode editar qualquer, mas aqui é /me, então não precisa checar role
    // Mantido para consistência futura
    void requesterRole;

    const updated = await prisma.vendorProfile.update({
      where: { userId },
      data: {
        businessName: input.businessName,
        cpfCnpj: input.cpfCnpj,
        phone: input.phone,
        description: input.description,
        photoUrl: input.photoUrl,
        photos: input.photos,
        fairId: input.fairId,
      },
    });

    return updated;
  }

  async updateById(
    id: string,
    input: UpdateVendorInput,
    requesterId: string,
    requesterRole: string,
  ) {
    const existing = await prisma.vendorProfile.findUnique({
      where: { id },
      select: { userId: true, cpfCnpj: true },
    });

    if (!existing) {
      throw new Error('Feirante não encontrado');
    }

    if (existing.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error('Não autorizado. Apenas o proprietário ou ADMIN pode editar este perfil.');
    }

    if (input.cpfCnpj && input.cpfCnpj !== existing.cpfCnpj) {
      const existingByCpf = await prisma.vendorProfile.findUnique({
        where: { cpfCnpj: input.cpfCnpj },
      });
      if (existingByCpf) {
        throw new Error('CPF/CNPJ já cadastrado');
      }
    }

    if (input.fairId !== undefined && input.fairId) {
      const fair = await prisma.fair.findUnique({ where: { id: input.fairId } });
      if (!fair) {
        throw new Error('Feira não encontrada');
      }
    }

    const updated = await prisma.vendorProfile.update({
      where: { id },
      data: {
        businessName: input.businessName,
        cpfCnpj: input.cpfCnpj,
        phone: input.phone,
        description: input.description,
        photoUrl: input.photoUrl,
        photos: input.photos,
        fairId: input.fairId,
      },
    });

    return updated;
  }

  async deleteByUserId(userId: string) {
    const existing = await prisma.vendorProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new Error('Perfil de feirante não encontrado');
    }

    await prisma.vendorProfile.delete({
      where: { userId },
    });

    return { success: true };
  }

  async deleteById(id: string, requesterId: string, requesterRole: string) {
    const existing = await prisma.vendorProfile.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      throw new Error('Feirante não encontrado');
    }

    if (existing.userId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error('Não autorizado. Apenas o proprietário ou ADMIN pode excluir este perfil.');
    }

    await prisma.vendorProfile.delete({
      where: { id },
    });

    return { success: true };
  }
}
