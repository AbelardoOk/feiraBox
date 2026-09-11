import { orderQuerySchema, updateOrderStatusSchema } from './orders.schema';
import { OrdersService } from './orders.service';

export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  async list(query: unknown, userId: string, role: string) {
    const input = orderQuerySchema.parse(query);
    const result = await this.ordersService.findMany(userId, input, role);
    return result;
  }

  async getById(params: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do pedido é obrigatório');
    const order = await this.ordersService.findById(id, requesterId, role);
    return order;
  }

  async updateStatus(params: unknown, body: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do pedido é obrigatório');
    const input = updateOrderStatusSchema.parse(body);
    const order = await this.ordersService.updateStatus(id, input.status, requesterId, role);
    return order;
  }

  async getPanel(userId: string) {
    const panel = await this.ordersService.getPanel(userId);
    return panel;
  }
}
