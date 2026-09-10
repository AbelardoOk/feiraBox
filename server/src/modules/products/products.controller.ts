import { createProductSchema, productQuerySchema, updateProductSchema } from './products.schema';
import { ProductsService } from './products.service';

export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  async create(body: unknown, userId: string) {
    const input = createProductSchema.parse(body);
    const product = await this.productsService.create(input, userId);
    return product;
  }

  async list(query: unknown) {
    const input = productQuerySchema.parse(query);
    const result = await this.productsService.findMany(input);
    return result;
  }

  async getById(params: unknown) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do produto é obrigatório');
    const product = await this.productsService.findById(id);
    return product;
  }

  async update(params: unknown, body: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do produto é obrigatório');
    const input = updateProductSchema.parse(body);
    const product = await this.productsService.update(id, input, requesterId, role);
    return product;
  }

  async delete(params: unknown, requesterId: string, role: string) {
    const id = (params as { id: string })?.id;
    if (!id) throw new Error('ID do produto é obrigatório');
    const result = await this.productsService.delete(id, requesterId, role);
    return result;
  }
}
