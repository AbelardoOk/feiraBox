import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { prisma } from '../../database/prisma';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import type { AuthTokenPayload } from '../auth/auth.types';

const productsService = new ProductsService();
const productsController = new ProductsController(productsService);

export const productsRoutes = new Elysia({ prefix: '/products' })
  .use(jwtPlugin)
  // Públicas
  .get(
    '/',
    async ({ query }) => {
      try {
        const result = await productsController.list(query);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          const zodError = error as unknown as { issues: unknown };
          return {
            success: false,
            message: 'Dados inválidos',
            details: (zodError as { issues: unknown }).issues ?? error.message,
          } as unknown as { success: boolean; message: string };
        }
        throw error;
      }
    },
    {
      query: t.Object({
        vendorId: t.Optional(t.String({ format: 'uuid' })),
        category: t.Optional(t.String({ maxLength: 50 })),
        q: t.Optional(t.String({ maxLength: 100 })),
        isActive: t.Optional(t.String({ maxLength: 5 })),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['Products'],
        summary: 'Listar produtos',
        description:
          'Lista produtos ativos por padrão. Filtros: vendorId, category, q (nome/descrição/categoria), isActive, paginação.',
      },
      response: {
        200: t.Object({
          data: t.Array(t.Any()),
          meta: t.Object({
            page: t.Number(),
            limit: t.Number(),
            total: t.Number(),
            totalPages: t.Number(),
          }),
        }),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
      },
    },
  )
  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        const product = await productsController.getById(params);
        return product;
      } catch (error) {
        if (error instanceof Error && error.message === 'Produto não encontrado') {
          (set as { status?: number | string }).status = 404;
          return { success: false, message: error.message } as unknown as {
            success: boolean;
            message: string;
          };
        }
        throw error;
      }
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      detail: {
        tags: ['Products'],
        summary: 'Obter produto por ID',
        description: 'Público, retorna produto com dados do feirante.',
      },
      response: {
        200: t.Any(),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  // Protegidas
  .derive(
    async ({
      headers,
      jwt,
    }: {
      headers: Record<string, string | undefined>;
      jwt: { verify: (token?: string) => Promise<unknown> };
    }) => {
      const authorization = headers.authorization;
      if (!authorization) {
        return {
          user: null as { id: string; email: string; role: string } | null,
          jwtPayload: null as AuthTokenPayload | null,
        };
      }
      const [scheme, token] = authorization.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return {
          user: null as { id: string; email: string; role: string } | null,
          jwtPayload: null as AuthTokenPayload | null,
        };
      }
      const payload = (await jwt.verify(token)) as AuthTokenPayload | false;
      if (!payload) {
        return {
          user: null as { id: string; email: string; role: string } | null,
          jwtPayload: null as AuthTokenPayload | null,
        };
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });
      if (!user) {
        return {
          user: null as { id: string; email: string; role: string } | null,
          jwtPayload: null as AuthTokenPayload | null,
        };
      }
      return { user, jwtPayload: payload };
    },
  )
  .onBeforeHandle(
    ({
      user,
      set,
    }: {
      user: { id: string; email: string; role: string } | null;
      set: { status?: number | string };
    }) => {
      if (!user) {
        set.status = 401;
        return { success: false, message: 'Não autorizado. Token ausente, inválido ou expirado.' };
      }
    },
  )
  .post(
    '/',
    async ({ body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const product = await productsController.create(body, typedUser.id);
        (set as { status?: number | string }).status = 201;
        return product;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Perfil de feirante não encontrado')) {
            (set as { status?: number | string }).status = 403;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.name === 'ZodError') {
            (set as { status?: number | string }).status = 400;
            const zodError = error as unknown as { issues: unknown };
            return {
              success: false,
              message: 'Dados inválidos',
              details: (zodError as { issues: unknown }).issues ?? error.message,
            } as unknown as { success: boolean; message: string };
          }
        }
        throw error;
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 100, examples: ['Tomate Orgânico'] }),
        description: t.Optional(t.String({ maxLength: 1000 })),
        category: t.Optional(t.String({ maxLength: 50, examples: ['hortaliça'] })),
        price: t.Number({ minimum: 0.01, maximum: 100000, examples: [12.5] }),
        photoUrl: t.Optional(t.String({ format: 'uri' })),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Products'],
        summary: 'Criar produto',
        description:
          'Requer perfil de feirante. Apenas dono (vendor.userId == jwt.sub) ou ADMIN via mesmo endpoint (criação usa vendor do usuário).',
        security: [{ bearerAuth: [] }],
      },
      response: {
        201: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const product = await productsController.update(params, body, typedUser.id, typedUser.role);
        return product;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Produto não encontrado') {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message.includes('Não autorizado')) {
            (set as { status?: number | string }).status = 403;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.name === 'ZodError') {
            (set as { status?: number | string }).status = 400;
            const zodError = error as unknown as { issues: unknown };
            return {
              success: false,
              message: 'Dados inválidos',
              details: (zodError as { issues: unknown }).issues ?? error.message,
            } as unknown as { success: boolean; message: string };
          }
        }
        throw error;
      }
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        description: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
        category: t.Optional(t.Union([t.String({ maxLength: 50 }), t.Null()])),
        price: t.Optional(t.Number({ minimum: 0.01, maximum: 100000 })),
        photoUrl: t.Optional(t.Union([t.String({ format: 'uri' }), t.Null()])),
        isActive: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Products'],
        summary: 'Atualizar produto',
        description: 'Apenas proprietário (vendor.userId) ou ADMIN.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .delete(
    '/:id',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const result = await productsController.delete(params, typedUser.id, typedUser.role);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Produto não encontrado') {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message.includes('Não autorizado')) {
            (set as { status?: number | string }).status = 403;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
        }
        throw error;
      }
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      detail: {
        tags: ['Products'],
        summary: 'Excluir produto',
        description: 'Apenas proprietário ou ADMIN. CASCADE remove SurpriseBoxItem da caixa.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  );
