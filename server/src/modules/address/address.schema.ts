import z from 'zod';

export const createAddressSchema = z.object({
  name: z.string().trim().max(100, 'Nome deve ter no máximo 100 caracteres').optional().nullable(),
  street: z
    .string()
    .trim()
    .min(1, 'Rua é obrigatória')
    .max(255, 'Rua deve ter no máximo 255 caracteres'),
  number: z
    .string()
    .trim()
    .min(1, 'Número é obrigatório')
    .max(20, 'Número deve ter no máximo 20 caracteres'),
  complement: z
    .string()
    .trim()
    .max(255, 'Complemento deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  neighborhood: z
    .string()
    .trim()
    .min(1, 'Bairro é obrigatório')
    .max(100, 'Bairro deve ter no máximo 100 caracteres'),
  city: z
    .string()
    .trim()
    .min(1, 'Cidade é obrigatória')
    .max(100, 'Cidade deve ter no máximo 100 caracteres'),
  state: z.string().trim().min(2, 'Estado é obrigatório').max(2, 'Estado deve ter 2 caracteres'),
  postalCode: z
    .string()
    .trim()
    .min(8, 'CEP inválido')
    .max(9, 'CEP inválido')
    .regex(/^[0-9-]+$/, 'CEP deve conter apenas números e hífen'),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = z.object({
  name: z.string().trim().max(100, 'Nome deve ter no máximo 100 caracteres').optional().nullable(),
  street: z
    .string()
    .trim()
    .min(1, 'Rua é obrigatória')
    .max(255, 'Rua deve ter no máximo 255 caracteres')
    .optional(),
  number: z
    .string()
    .trim()
    .min(1, 'Número é obrigatório')
    .max(20, 'Número deve ter no máximo 20 caracteres')
    .optional(),
  complement: z
    .string()
    .trim()
    .max(255, 'Complemento deve ter no máximo 255 caracteres')
    .optional()
    .nullable(),
  neighborhood: z
    .string()
    .trim()
    .min(1, 'Bairro é obrigatório')
    .max(100, 'Bairro deve ter no máximo 100 caracteres')
    .optional(),
  city: z
    .string()
    .trim()
    .min(1, 'Cidade é obrigatória')
    .max(100, 'Cidade deve ter no máximo 100 caracteres')
    .optional(),
  state: z
    .string()
    .trim()
    .min(2, 'Estado é obrigatório')
    .max(2, 'Estado deve ter 2 caracteres')
    .optional(),
  postalCode: z
    .string()
    .trim()
    .min(8, 'CEP inválido')
    .max(9, 'CEP inválido')
    .regex(/^[0-9-]+$/, 'CEP deve conter apenas números e hífen')
    .optional(),
  isDefault: z.boolean().optional(),
});

export const addressQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type AddressQueryInput = z.infer<typeof addressQuerySchema>;
