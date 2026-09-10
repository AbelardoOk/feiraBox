import z from 'zod';

export const createSurpriseBoxSchema = z.object({
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
  price: z.number().positive('Preço deve ser positivo').max(100000, 'Preço máximo excedido'),
  frequency: z.enum(['WEEKLY', 'MONTHLY'], { message: 'Frequência deve ser WEEKLY ou MONTHLY' }),
  isActive: z.boolean().optional().default(true),
  photoUrl: z.string().trim().url('URL da foto inválida').optional(),
});

export const updateSurpriseBoxSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
  price: z
    .number()
    .positive('Preço deve ser positivo')
    .max(100000, 'Preço máximo excedido')
    .optional(),
  frequency: z
    .enum(['WEEKLY', 'MONTHLY'], { message: 'Frequência deve ser WEEKLY ou MONTHLY' })
    .optional(),
  isActive: z.boolean().optional(),
  photoUrl: z.string().trim().url('URL da foto inválida').optional().nullable(),
});

export const surpriseBoxQuerySchema = z.object({
  vendorId: z.string().trim().uuid('ID do feirante inválido').optional(),
  frequency: z.enum(['WEEKLY', 'MONTHLY']).optional(),
  q: z.string().trim().max(100).optional(),
  isActive: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return val;
    }, z.boolean().optional())
    .optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const addItemSchema = z.object({
  productId: z.string().trim().uuid('ID do produto inválido'),
  quantity: z
    .number()
    .int()
    .min(1, 'Quantidade deve ser pelo menos 1')
    .max(100, 'Quantidade máxima 100')
    .default(1)
    .optional(),
});

export const updateItemSchema = z.object({
  quantity: z
    .number()
    .int()
    .min(1, 'Quantidade deve ser pelo menos 1')
    .max(100, 'Quantidade máxima 100'),
});

export type CreateSurpriseBoxInput = z.infer<typeof createSurpriseBoxSchema>;
export type UpdateSurpriseBoxInput = z.infer<typeof updateSurpriseBoxSchema>;
export type SurpriseBoxQueryInput = z.infer<typeof surpriseBoxQuerySchema>;
export type AddItemInput = z.infer<typeof addItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
