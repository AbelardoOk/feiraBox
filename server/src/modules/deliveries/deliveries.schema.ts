import z from 'zod';

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'IN_TRANSIT', 'DELIVERED', 'CANCELED'], {
    message: 'Status deve ser PENDING, PREPARING, READY, IN_TRANSIT, DELIVERED ou CANCELED',
  }),
});

export const verifyQrSchema = z.object({
  qrCode: z.string().trim().min(1, 'QR Code é obrigatório'),
});

export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
export type VerifyQrInput = z.infer<typeof verifyQrSchema>;
