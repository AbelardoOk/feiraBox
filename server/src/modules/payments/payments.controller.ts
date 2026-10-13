import { createPaymentSchema, paymentQuerySchema } from './payments.schema';
import type { PaymentsService } from './payments.service';

export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  async create(body: unknown, userId: string, remoteIp?: string) {
    const input = createPaymentSchema.parse(body);
    return this.paymentsService.create(input, userId, remoteIp);
  }

  async list(query: unknown, userId: string, role: string) {
    const input = paymentQuerySchema.parse(query);
    return this.paymentsService.findMany(userId, input, role);
  }

  async getById(params: unknown, userId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do pagamento é obrigatório');
    return this.paymentsService.findById(id, userId, role);
  }

  async refund(params: unknown, userId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do pagamento é obrigatório');
    return this.paymentsService.refund(id, userId, role);
  }
}
