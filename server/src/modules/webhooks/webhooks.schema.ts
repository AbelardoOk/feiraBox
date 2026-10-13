import z from 'zod';

export const asaasWebhookSchema = z.object({
  id: z.string().optional(), // evt_xxx
  event: z.string().min(1),
  dateCreated: z.string().optional(),
  payment: z
    .object({
      id: z.string(), // pay_xxx
      status: z.string().optional(),
      value: z.number().optional(),
      externalReference: z.string().optional(),
      subscription: z.string().optional().nullable(),
      customer: z.string().optional(),
      billingType: z.string().optional(),
    })
    .optional()
    .nullable(),
  subscription: z
    .object({
      id: z.string(), // sub_xxx
      status: z.string().optional(),
      externalReference: z.string().optional(),
      customer: z.string().optional(),
    })
    .optional()
    .nullable(),
});

export type AsaasWebhookInput = z.infer<typeof asaasWebhookSchema>;
