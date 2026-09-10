import {
  addItemSchema,
  createSurpriseBoxSchema,
  surpriseBoxQuerySchema,
  updateItemSchema,
  updateSurpriseBoxSchema,
} from './surprise-boxes.schema';
import { SurpriseBoxesService } from './surprise-boxes.service';

export class SurpriseBoxesController {
  constructor(private readonly surpriseBoxesService: SurpriseBoxesService) {}

  async create(body: unknown, userId: string) {
    const input = createSurpriseBoxSchema.parse(body);
    const box = await this.surpriseBoxesService.create(input, userId);
    return box;
  }

  async list(query: unknown) {
    const input = surpriseBoxQuerySchema.parse(query);
    const result = await this.surpriseBoxesService.findMany(input);
    return result;
  }

  async getById(params: unknown) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da caixa é obrigatório');
    const box = await this.surpriseBoxesService.findById(id);
    return box;
  }

  async update(params: unknown, body: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da caixa é obrigatório');
    const input = updateSurpriseBoxSchema.parse(body);
    const box = await this.surpriseBoxesService.update(id, input, requesterId, role);
    return box;
  }

  async delete(params: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da caixa é obrigatório');
    const result = await this.surpriseBoxesService.delete(id, requesterId, role);
    return result;
  }

  async addItem(params: unknown, body: unknown, requesterId: string, role: string) {
    const boxId = (params as { id: string })?.id;
    if (!boxId) throw new Error('ID da caixa é obrigatório');
    const input = addItemSchema.parse(body);
    const item = await this.surpriseBoxesService.addItem(boxId, input, requesterId, role);
    return item;
  }

  async updateItem(params: unknown, body: unknown, requesterId: string, role: string) {
    const boxId = (params as { id: string })?.id;
    const productId = (params as { productId: string })?.productId;
    if (!boxId || !productId) throw new Error('IDs são obrigatórios');
    const input = updateItemSchema.parse(body);
    const item = await this.surpriseBoxesService.updateItem(
      boxId,
      productId,
      input,
      requesterId,
      role,
    );
    return item;
  }

  async removeItem(params: unknown, requesterId: string, role: string) {
    const boxId = (params as { id: string })?.id;
    const productId = (params as { productId: string })?.productId;
    if (!boxId || !productId) throw new Error('IDs são obrigatórios');
    const result = await this.surpriseBoxesService.removeItem(boxId, productId, requesterId, role);
    return result;
  }
}
