import z from 'zod';

const creditCardSchema = z.object({
  holderName: z.string().trim().min(2, 'Nome do titular obrigatório'),
  number: z.string().trim().min(13).max(19),
  expiryMonth: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])$/, 'Mês inválido (01-12)'),
  expiryYear: z
    .string()
    .trim()
    .regex(/^\d{4}$/, 'Ano deve ter 4 dígitos'),
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

export const createPaymentSchema = z
  .object({
    subscriptionId: z.string().trim().uuid().optional(),
    orderId: z.string().trim().uuid().optional(),
    campaignId: z.string().trim().uuid().optional(),
    method: z.enum(['PIX', 'CREDIT_CARD']),
    creditCard: creditCardSchema.optional(),
    creditCardHolderInfo: holderInfoSchema.optional(),
    remoteIp: z.string().trim().optional(),
  })
  .refine((data) => data.subscriptionId || data.orderId || data.campaignId, {
    message: 'Informe subscriptionId, orderId ou campaignId',
    path: ['subscriptionId'],
  })
  .refine(
    (data) => {
      if (data.method === 'CREDIT_CARD') {
        return !!data.creditCard && !!data.creditCardHolderInfo;
      }
      return true;
    },
    {
      message: 'Cartão e dados do titular são obrigatórios para CREDIT_CARD',
      path: ['creditCard'],
    },
  );

export const paymentQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED']).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const refundPaymentSchema = z.object({
  reason: z.string().trim().optional(),
});

export type CreatePaymentSchemaInput = z.infer<typeof createPaymentSchema>;
export type PaymentQueryInput = z.infer<typeof paymentQuerySchema>;
