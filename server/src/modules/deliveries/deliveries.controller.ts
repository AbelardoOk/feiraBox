import { updateDeliveryStatusSchema, verifyQrSchema } from './deliveries.schema';
import { DeliveriesService } from './deliveries.service';

export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  async getByOrderId(params: unknown, requesterId: string, role: string) {
    const orderId = (params as { orderId: string })?.orderId;
    if (!orderId) throw new Error('ID do pedido é obrigatório');
    const delivery = await this.deliveriesService.getByOrderId(orderId, requesterId, role);
    return delivery;
  }

  async updateStatus(params: unknown, body: unknown, requesterId: string, role: string) {
    const orderId = (params as { orderId: string })?.orderId;
    if (!orderId) throw new Error('ID do pedido é obrigatório');
    const input = updateDeliveryStatusSchema.parse(body);
    const delivery = await this.deliveriesService.updateStatus(
      orderId,
      input.status,
      requesterId,
      role,
    );
    return delivery;
  }

  async generateQr(params: unknown, requesterId: string, role: string) {
    const orderId = (params as { orderId: string })?.orderId;
    if (!orderId) throw new Error('ID do pedido é obrigatório');
    const delivery = await this.deliveriesService.generateQr(orderId, requesterId, role);
    return delivery;
  }

  async verifyQr(body: unknown, scannerId: string, role: string) {
    const input = verifyQrSchema.parse(body);
    const delivery = await this.deliveriesService.verifyQr(input.qrCode, scannerId, role);
    return delivery;
  }
}
