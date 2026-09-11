import z from 'zod';

export const createSubscriptionSchema = z.object({
  boxId: z.string().trim().uuid('ID da caixa inválido'),
  frequency: z
    .enum(['WEEKLY', 'MONTHLY'], { message: 'Frequência deve ser WEEKLY ou MONTHLY' })
    .optional(),
  addressId: z.string().trim().uuid('ID do endereço inválido').optional(),
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
