import { createFairSchema, fairQuerySchema, updateFairSchema } from './fairs.schema';
import { FairsService } from './fairs.service';

export class FairsController {
  constructor(private readonly fairsService: FairsService) {}

  async create(body: unknown, ownerId: string) {
    const input = createFairSchema.parse(body);
    const fair = await this.fairsService.create(input, ownerId);
    return fair;
  }

  async list(query: unknown) {
    const input = fairQuerySchema.parse(query);
    const result = await this.fairsService.findMany(input);
    return result;
  }

  async getById(params: unknown) {
    const parsed = (params as { id: string })?.id;
    if (!parsed) throw new Error('ID da feira é obrigatório');
    const fair = await this.fairsService.findById(parsed);
    return fair;
  }

  async update(params: unknown, body: unknown, requesterId: string, requesterRole: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da feira é obrigatório');
    const input = updateFairSchema.parse(body);
    const fair = await this.fairsService.update(id, input, requesterId, requesterRole);
    return fair;
  }

  async delete(params: unknown, requesterId: string, requesterRole: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID da feira é obrigatório');
    const result = await this.fairsService.delete(id, requesterId, requesterRole);
    return result;
  }
}
