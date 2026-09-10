import z from 'zod';

export const createProductSchema = z.object({
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
  category: z.string().trim().max(50, 'Categoria deve ter no máximo 50 caracteres').optional(),
  price: z.number().positive('Preço deve ser positivo').max(100000, 'Preço máximo excedido'),
  photoUrl: z.string().trim().url('URL da foto inválida').optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateProductSchema = z.object({
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
  category: z
    .string()
    .trim()
    .max(50, 'Categoria deve ter no máximo 50 caracteres')
    .optional()
    .nullable(),
  price: z
    .number()
    .positive('Preço deve ser positivo')
    .max(100000, 'Preço máximo excedido')
    .optional(),
  photoUrl: z.string().trim().url('URL da foto inválida').optional().nullable(),
  isActive: z.boolean().optional(),
});

export const productQuerySchema = z.object({
  vendorId: z.string().trim().uuid('ID do feirante inválido').optional(),
  category: z.string().trim().max(50).optional(),
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

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
