import z from 'zod';

export const createVendorSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Nome da banca deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  cpfCnpj: z
    .string()
    .trim()
    .min(11, 'CPF/CNPJ deve ter pelo menos 11 caracteres')
    .max(18, 'CPF/CNPJ deve ter no máximo 18 caracteres')
    .regex(/^[0-9.\-/]+$/, 'CPF/CNPJ deve conter apenas números, pontos, barras e hífens'),
  phone: z.string().trim().min(10, 'Telefone inválido').max(20, 'Telefone inválido').optional(),
  description: z
    .string()
    .trim()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  photoUrl: z.string().trim().url('URL da foto inválida').optional(),
  photos: z
    .array(z.string().trim().url('URL da foto inválida'))
    .max(5, 'Máximo 5 fotos')
    .optional()
    .default([]),
  fairId: z.string().trim().uuid('ID da feira inválido').optional().nullable(),
});

export const updateVendorSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'Nome da banca deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .optional(),
  cpfCnpj: z
    .string()
    .trim()
    .min(11, 'CPF/CNPJ deve ter pelo menos 11 caracteres')
    .max(18, 'CPF/CNPJ deve ter no máximo 18 caracteres')
    .regex(/^[0-9.\-/]+$/, 'CPF/CNPJ deve conter apenas números, pontos, barras e hífens')
    .optional(),
  phone: z
    .string()
    .trim()
    .min(10, 'Telefone inválido')
    .max(20, 'Telefone inválido')
    .optional()
    .nullable(),
  description: z
    .string()
    .trim()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional()
    .nullable(),
  photoUrl: z.string().trim().url('URL da foto inválida').optional().nullable(),
  photos: z
    .array(z.string().trim().url('URL da foto inválida'))
    .max(5, 'Máximo 5 fotos')
    .optional(),
  fairId: z.string().trim().uuid('ID da feira inválido').optional().nullable(),
});

export const vendorQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  fairId: z.string().trim().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type VendorQueryInput = z.infer<typeof vendorQuerySchema>;
