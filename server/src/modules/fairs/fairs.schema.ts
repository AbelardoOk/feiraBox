import z from 'zod';

export const createFairSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: z
    .string()
    .trim()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  address: z.string().trim().max(200, 'Endereço deve ter no máximo 200 caracteres').optional(),
  city: z.string().trim().max(100, 'Cidade deve ter no máximo 100 caracteres').optional(),
  state: z.string().trim().max(100, 'Estado deve ter no máximo 100 caracteres').optional(),
  latitude: z
    .number()
    .min(-90, 'Latitude deve estar entre -90 e 90')
    .max(90, 'Latitude deve estar entre -90 e 90')
    .optional(),
  longitude: z
    .number()
    .min(-180, 'Longitude deve estar entre -180 e 180')
    .max(180, 'Longitude deve estar entre -180 e 180')
    .optional(),
});

export const updateFairSchema = createFairSchema.partial();

export const fairQuerySchema = z.object({
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(1000).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type CreateFairInput = z.infer<typeof createFairSchema>;
export type UpdateFairInput = z.infer<typeof updateFairSchema>;
export type FairQueryInput = z.infer<typeof fairQuerySchema>;
