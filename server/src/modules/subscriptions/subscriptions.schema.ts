import z from 'zod';

const creditCardSchema = z.object({
  holderName: z.string().trim().min(2),
  number: z.string().trim().min(13).max(19),
  expiryMonth: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])$/),
  expiryYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/),
  ccv: z.string().trim().min(3).max(4),
});

const holderInfoSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  cpfCnpj: z.string().trim().min(11).max(14),
  postalCode: z.string().trim().min(8).max(9),
  addressNumber: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});

export const createSubscriptionSchema = z.object({
  boxId: z.string().trim().uuid('ID da caixa inválido'),
  frequency: z
    .enum(['WEEKLY', 'MONTHLY'], { message: 'Frequência deve ser WEEKLY ou MONTHLY' })
    .optional(),
  addressId: z.string().trim().uuid('ID do endereço inválido').optional(),
  // RF04 — meio de pagamento (PIX default para manter compatibilidade)
  method: z.enum(['PIX', 'CREDIT_CARD']).optional().default('PIX'),
  creditCard: creditCardSchema.optional(),
  creditCardHolderInfo: holderInfoSchema.optional(),
});

export const updateSubscriptionPlanSchema = z.object({
  frequency: z
    .enum(['WEEKLY', 'MONTHLY'], { message: 'Frequência deve ser WEEKLY ou MONTHLY' })
    .optional(),
  boxId: z.string().trim().uuid('ID da caixa inválido').optional(),
});

export const subscriptionQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELED', 'EXPIRED']).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>;
export type SubscriptionQueryInput = z.infer<typeof subscriptionQuerySchema>;
