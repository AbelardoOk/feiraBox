import { createVendorSchema, updateVendorSchema, vendorQuerySchema } from './vendors.schema';
import { VendorsService } from './vendors.service';

export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  async create(body: unknown, userId: string) {
    const input = createVendorSchema.parse(body);
    const vendor = await this.vendorsService.create(input, userId);
    return vendor;
  }

  async list(query: unknown) {
    const input = vendorQuerySchema.parse(query);
    const result = await this.vendorsService.findMany(input);
    return result;
  }

  async getById(params: unknown) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do feirante é obrigatório');
    const vendor = await this.vendorsService.findById(id);
    return vendor;
  }

  async getByUserId(userId: string) {
    const vendor = await this.vendorsService.findByUserId(userId);
    return vendor;
  }

  async updateByUserId(body: unknown, userId: string, role: string) {
    const input = updateVendorSchema.parse(body);
    const vendor = await this.vendorsService.updateByUserId(userId, input, role);
    return vendor;
  }

  async updateById(params: unknown, body: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do feirante é obrigatório');
    const input = updateVendorSchema.parse(body);
    const vendor = await this.vendorsService.updateById(id, input, requesterId, role);
    return vendor;
  }

  async deleteByUserId(userId: string) {
    const result = await this.vendorsService.deleteByUserId(userId);
    return result;
  }

  async deleteById(params: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do feirante é obrigatório');
    const result = await this.vendorsService.deleteById(id, requesterId, role);
    return result;
  }
}
