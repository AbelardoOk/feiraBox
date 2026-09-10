import { prisma } from '../../database/prisma';

import type { CreateFairInput, FairQueryInput, UpdateFairInput } from './fairs.schema';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class FairsService {
  async create(input: CreateFairInput, ownerId: string) {
    // Validação: latitude e longitude devem vir juntos
    if (
      (input.latitude !== undefined && input.longitude === undefined) ||
      (input.latitude === undefined && input.longitude !== undefined)
    ) {
      throw new Error('Latitude e longitude devem ser informados juntos');
    }

    const fair = await prisma.fair.create({
      data: {
        name: input.name,
        description: input.description,
        address: input.address,
        city: input.city,
        state: input.state,
        latitude: input.latitude,
        longitude: input.longitude,
        ownerId,
      },
    });

    return fair;
  }

  async findMany(query: FairQueryInput) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.city) {
      (where as Record<string, unknown>).city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.state) {
      (where as Record<string, unknown>).state = { contains: query.state, mode: 'insensitive' };
    }

    if (query.q) {
      (where as Record<string, unknown>).OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    // Se busca por proximidade, buscamos todos que têm lat/lng e filtramos em memória (Haversine MVP)
    if (query.lat !== undefined && query.lng !== undefined && query.radiusKm !== undefined) {
      const allFairs = await prisma.fair.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const filtered = allFairs
        .map((fair) => {
          if (fair.latitude === null || fair.longitude === null) return null;
          const lat = Number(fair.latitude);
          const lng = Number(fair.longitude);
          const distance = haversineDistance(query.lat as number, query.lng as number, lat, lng);
          return { fair, distance };
        })
        .filter(
          (item): item is { fair: (typeof allFairs)[number]; distance: number } =>
            item !== null && item.distance <= (query.radiusKm as number),
        )
        .sort((a, b) => a.distance - b.distance);

      const total = filtered.length;
      const paginated = filtered.slice(skip, skip + limit).map((item) => item.fair);
      const totalPages = Math.ceil(total / limit);

      return {
        data: paginated,
        meta: { page, limit, total, totalPages },
      };
    }

    // Se lat/lng sem radius, ou sem geo, busca normal com paginação no DB
    if (query.lat !== undefined || query.lng !== undefined) {
      // Se enviou lat/lng mas sem radius, filtrar apenas quem tem coordenadas e ordenar por proximidade sem raio
      if (query.lat !== undefined && query.lng !== undefined) {
        const allFairs = await prisma.fair.findMany({
          where: {
            ...where,
            latitude: { not: null },
            longitude: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });

        const sorted = allFairs
          .map((fair) => {
            const lat = Number(fair.latitude as unknown as number);
            const lng = Number(fair.longitude as unknown as number);
            const distance = haversineDistance(query.lat as number, query.lng as number, lat, lng);
            return { fair, distance };
          })
          .sort((a, b) => a.distance - b.distance);

        const total = sorted.length;
        const paginated = sorted.slice(skip, skip + limit).map((item) => item.fair);
        const totalPages = Math.ceil(total / limit);

        return {
          data: paginated,
          meta: { page, limit, total, totalPages },
        };
      }
      throw new Error(
        'Latitude e longitude devem ser informados juntos para busca por proximidade',
      );
    }

    const [data, total] = await Promise.all([
      prisma.fair.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.fair.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: { page, limit, total, totalPages },
    };
  }

  async findById(id: string) {
    const fair = await prisma.fair.findUnique({
      where: { id },
      include: {
        vendors: {
          select: {
            id: true,
            businessName: true,
            photoUrl: true,
            photos: true,
            description: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!fair) {
      throw new Error('Feira não encontrada');
    }

    return fair;
  }

  async update(id: string, input: UpdateFairInput, requesterId: string, requesterRole: string) {
    const existing = await prisma.fair.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!existing) {
      throw new Error('Feira não encontrada');
    }

    // Permissão: apenas owner ou ADMIN
    if (existing.ownerId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error('Não autorizado. Apenas o proprietário ou ADMIN pode editar esta feira.');
    }

    if (
      (input.latitude !== undefined && input.longitude === undefined) ||
      (input.latitude === undefined && input.longitude !== undefined)
    ) {
      throw new Error('Latitude e longitude devem ser informados juntos');
    }

    const updated = await prisma.fair.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        address: input.address,
        city: input.city,
        state: input.state,
        latitude: input.latitude,
        longitude: input.longitude,
      },
    });

    return updated;
  }

  async delete(id: string, requesterId: string, requesterRole: string) {
    const existing = await prisma.fair.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!existing) {
      throw new Error('Feira não encontrada');
    }

    if (existing.ownerId !== requesterId && requesterRole !== 'ADMIN') {
      throw new Error('Não autorizado. Apenas o proprietário ou ADMIN pode excluir esta feira.');
    }

    await prisma.fair.delete({
      where: { id },
    });

    return { success: true };
  }
}
