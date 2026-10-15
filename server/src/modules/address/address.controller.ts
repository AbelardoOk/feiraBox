import { createAddressSchema, addressQuerySchema, updateAddressSchema } from './address.schema';
import { AddressService } from './address.service';

export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  async create(body: unknown, userId: string) {
    const input = createAddressSchema.parse(body);
    const address = await this.addressService.create(input, userId);
    return address;
  }

  async list(query: unknown, userId: string) {
    const input = addressQuerySchema.parse(query);
    const result = await this.addressService.findMany(userId, input);
    return result;
  }

  async getById(params: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do endereço é obrigatório');
    const address = await this.addressService.findById(id, requesterId, role);
    return address;
  }

  async update(params: unknown, body: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do endereço é obrigatório');
    const input = updateAddressSchema.parse(body);
    const address = await this.addressService.update(id, input, requesterId, role);
    return address;
  }

  async delete(params: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do endereço é obrigatório');
    const result = await this.addressService.delete(id, requesterId, role);
    return result;
  }
}
