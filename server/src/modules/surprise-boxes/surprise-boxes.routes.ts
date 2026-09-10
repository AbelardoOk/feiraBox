import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { prisma } from '../../database/prisma';
import { SurpriseBoxesController } from './surprise-boxes.controller';
import { SurpriseBoxesService } from './surprise-boxes.service';
import type { AuthTokenPayload } from '../auth/auth.types';

const surpriseBoxesService = new SurpriseBoxesService();
const surpriseBoxesController = new SurpriseBoxesController(surpriseBoxesService);

export const surpriseBoxesRoutes = new Elysia({ prefix: '/surprise-boxes' })
  .use(jwtPlugin)
  // Públicas
  .get(
    '/',
    async ({ query }) => {
      try {
        const result = await surpriseBoxesController.list(query);
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
        frequency: t.Optional(t.Union([t.Literal('WEEKLY'), t.Literal('MONTHLY')])),
        q: t.Optional(t.String({ maxLength: 100 })),
        isActive: t.Optional(t.String({ maxLength: 5 })),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['SurpriseBoxes'],
        summary: 'Listar caixas surpresa',
        description:
          'Lista caixas ativas por padrão. Filtros: vendorId, frequency (WEEKLY/MONTHLY), q, isActive, paginação.',
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
        const box = await surpriseBoxesController.getById(params);
        return box;
      } catch (error) {
        if (error instanceof Error && error.message === 'Caixa Surpresa não encontrada') {
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
        tags: ['SurpriseBoxes'],
        summary: 'Obter caixa por ID',
        description: 'Público, retorna caixa com itens e produtos.',
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
        const box = await surpriseBoxesController.create(body, typedUser.id);
        (set as { status?: number | string }).status = 201;
        return box;
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
        name: t.String({ minLength: 2, maxLength: 100, examples: ['Caixa da Estação'] }),
        description: t.Optional(t.String({ maxLength: 1000 })),
        price: t.Number({ minimum: 0.01, maximum: 100000, examples: [49.9] }),
        frequency: t.Union([t.Literal('WEEKLY'), t.Literal('MONTHLY')]),
        isActive: t.Optional(t.Boolean()),
        photoUrl: t.Optional(t.String({ format: 'uri' })),
      }),
      detail: {
        tags: ['SurpriseBoxes'],
        summary: 'Criar caixa surpresa',
        description: 'Requer perfil de feirante. Apenas dono.',
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
        const box = await surpriseBoxesController.update(
          params,
          body,
          typedUser.id,
          typedUser.role,
        );
        return box;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Caixa Surpresa não encontrada') {
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
        price: t.Optional(t.Number({ minimum: 0.01, maximum: 100000 })),
        frequency: t.Optional(t.Union([t.Literal('WEEKLY'), t.Literal('MONTHLY')])),
        isActive: t.Optional(t.Boolean()),
        photoUrl: t.Optional(t.Union([t.String({ format: 'uri' }), t.Null()])),
      }),
      detail: {
        tags: ['SurpriseBoxes'],
        summary: 'Atualizar caixa',
        description: 'Apenas proprietário ou ADMIN.',
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
        const result = await surpriseBoxesController.delete(params, typedUser.id, typedUser.role);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Caixa Surpresa não encontrada') {
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
          if (error.message.includes('assinaturas ativas')) {
            (set as { status?: number | string }).status = 409;
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
        tags: ['SurpriseBoxes'],
        summary: 'Excluir caixa',
        description: 'Apenas proprietário ou ADMIN. Bloqueado se houver assinaturas ativas.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  // Itens
  .post(
    '/:id/items',
    async ({ params, body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const item = await surpriseBoxesController.addItem(
          params,
          body,
          typedUser.id,
          typedUser.role,
        );
        (set as { status?: number | string }).status = 201;
        return item;
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === 'Caixa Surpresa não encontrada' ||
            error.message === 'Produto não encontrado'
          ) {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (
            error.message.includes('Não autorizado') ||
            error.message.includes('mesmo feirante')
          ) {
            (set as { status?: number | string }).status = 403;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (
            error.message.includes('já está na caixa') ||
            error.message.includes('Produto inativo')
          ) {
            (set as { status?: number | string }).status = 409;
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
        productId: t.String({ format: 'uuid' }),
        quantity: t.Optional(t.Number({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['SurpriseBoxes'],
        summary: 'Adicionar produto à caixa',
        description:
          'Apenas proprietário ou ADMIN. Produto deve ser do mesmo feirante e ativo. Único (409 se duplicado).',
        security: [{ bearerAuth: [] }],
      },
      response: {
        201: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .patch(
    '/:id/items/:productId',
    async ({ params, body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const item = await surpriseBoxesController.updateItem(
          params,
          body,
          typedUser.id,
          typedUser.role,
        );
        return item;
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === 'Caixa Surpresa não encontrada' ||
            error.message === 'Item não encontrado na caixa'
          ) {
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
      params: t.Object({
        id: t.String({ format: 'uuid' }),
        productId: t.String({ format: 'uuid' }),
      }),
      body: t.Object({ quantity: t.Number({ minimum: 1, maximum: 100 }) }),
      detail: {
        tags: ['SurpriseBoxes'],
        summary: 'Atualizar quantidade do item',
        description: 'Apenas proprietário ou ADMIN.',
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
    '/:id/items/:productId',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const result = await surpriseBoxesController.removeItem(
          params,
          typedUser.id,
          typedUser.role,
        );
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === 'Caixa Surpresa não encontrada' ||
            error.message === 'Item não encontrado na caixa'
          ) {
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
      params: t.Object({
        id: t.String({ format: 'uuid' }),
        productId: t.String({ format: 'uuid' }),
      }),
      detail: {
        tags: ['SurpriseBoxes'],
        summary: 'Remover produto da caixa',
        description: 'Apenas proprietário ou ADMIN.',
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
