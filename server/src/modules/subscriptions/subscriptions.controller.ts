import {
  createSubscriptionSchema,
  subscriptionQuerySchema,
  updateSubscriptionPlanSchema,
} from './subscriptions.schema';
import { SubscriptionsService } from './subscriptions.service';

export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  async create(body: unknown, userId: string) {
    const input = createSubscriptionSchema.parse(body);
    const sub = await this.subscriptionsService.create(input, userId);
    return sub;
  }

  async list(query: unknown, userId: string) {
    const input = subscriptionQuerySchema.parse(query);
    const result = await this.subscriptionsService.findMany(userId, input);
    return result;
  }

  async listByVendor(query: unknown, userId: string) {
    const input = subscriptionQuerySchema.parse(query);
    const result = await this.subscriptionsService.findMany(userId, input, undefined, true);
    return result;
  }

  async getById(params: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da assinatura é obrigatório');
    const sub = await this.subscriptionsService.findById(id, requesterId, role);
    return sub;
  }

  async pause(params: unknown, requesterId: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da assinatura é obrigatório');
    const sub = await this.subscriptionsService.pause(id, requesterId);
    return sub;
  }

  async resume(params: unknown, requesterId: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da assinatura é obrigatório');
    const sub = await this.subscriptionsService.resume(id, requesterId);
    return sub;
  }

  async cancel(params: unknown, requesterId: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da assinatura é obrigatório');
    const sub = await this.subscriptionsService.cancel(id, requesterId);
    return sub;
  }

  async updatePlan(params: unknown, body: unknown, requesterId: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da assinatura é obrigatório');
    const input = updateSubscriptionPlanSchema.parse(body);
    const sub = await this.subscriptionsService.updatePlan(id, input, requesterId);
    return sub;
  }
}
