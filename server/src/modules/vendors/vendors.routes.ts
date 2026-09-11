import Elysia, { t } from 'elysia';

import { authPlugin } from '../../plugins/auth';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';

const vendorsService = new VendorsService();
const vendorsController = new VendorsController(vendorsService);

export const vendorsRoutes = new Elysia({ prefix: '/vendors' })
  // Públicas — sem auth, definidas ANTES do guard
  .get(
    '/',
    async ({ query }) => {
      try {
        return await vendorsController.list(query);
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          const zodError = error as unknown as { issues: unknown };
          return {
            success: false,
            message: 'Dados inválidos',
            details: zodError.issues ?? error.message,
          } as unknown as { success: boolean; message: string };
        }
        throw error;
      }
    },
    {
      query: t.Object({
        q: t.Optional(t.String({ maxLength: 100 })),
        city: t.Optional(t.String({ maxLength: 100 })),
        state: t.Optional(t.String({ maxLength: 100 })),
        fairId: t.Optional(t.String({ format: 'uuid' })),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['Vendors'],
        summary: 'Listar feirantes',
        description:
          'Lista feirantes com filtros por feira, cidade/estado e busca textual. Paginação.',
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
        return await vendorsController.getById(params);
      } catch (error) {
        if (error instanceof Error && error.message === 'Feirante não encontrado') {
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
      detail: { tags: ['Vendors'], summary: 'Obter feirante por ID', description: 'Público' },
      response: { 200: t.Any(), 404: t.Object({ success: t.Boolean(), message: t.String() }) },
    },
  )
  // Guard compartilhado — todas abaixo exigem JWT válido
  .use(authPlugin)
  .get(
    '/me',
    async (ctx: unknown) => {
      const { user, set } = ctx as {
        user: { id: string; email: string; role: string };
        set: { status?: number | string };
      };
      try {
        return await vendorsController.getByUserId(user!.id);
      } catch (error) {
        if (error instanceof Error && error.message === 'Perfil de feirante não encontrado') {
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
      detail: {
        tags: ['Vendors'],
        summary: 'Obter meu perfil',
        description: 'Retorna perfil autenticado',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .patch(
    '/me',
    async (ctx: unknown) => {
      const { body, user, set } = ctx as {
        body: unknown;
        user: { id: string; email: string; role: string };
        set: { status?: number | string };
      };
      try {
        return await vendorsController.updateByUserId(body, user!.id, user!.role);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Perfil de feirante não encontrado') {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message === 'CPF/CNPJ já cadastrado') {
            (set as { status?: number | string }).status = 409;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message === 'Feira não encontrada') {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.name === 'ZodError') {
            (set as { status?: number | string }).status = 400;
            const z = error as unknown as { issues: unknown };
            return {
              success: false,
              message: 'Dados inválidos',
              details: z.issues ?? error.message,
            } as unknown as { success: boolean; message: string };
          }
        }
        throw error;
      }
    },
    {
      body: t.Object({
        businessName: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        cpfCnpj: t.Optional(t.String({ minLength: 11, maxLength: 18 })),
        phone: t.Optional(t.Union([t.String({ minLength: 10, maxLength: 20 }), t.Null()])),
        description: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
        photoUrl: t.Optional(t.Union([t.String({ format: 'uri' }), t.Null()])),
        photos: t.Optional(t.Array(t.String({ format: 'uri' }), { maxItems: 5 })),
        fairId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()])),
      }),
      detail: {
        tags: ['Vendors'],
        summary: 'Atualizar meu perfil',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .delete(
    '/me',
    async (ctx: unknown) => {
      const { user } = ctx as { user: { id: string; email: string; role: string } };
      try {
        return await vendorsController.deleteByUserId(user!.id);
      } catch (error) {
        if (error instanceof Error && error.message === 'Perfil de feirante não encontrado')
          return { success: false, message: error.message } as unknown as {
            success: boolean;
            message: string;
          };
        throw error;
      }
    },
    {
      detail: { tags: ['Vendors'], summary: 'Excluir meu perfil', security: [{ bearerAuth: [] }] },
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .post(
    '/',
    async (ctx: unknown) => {
      const { body, user, set } = ctx as {
        body: unknown;
        user: { id: string; email: string; role: string };
        set: { status?: number | string };
      };
      try {
        const vendor = await vendorsController.create(body, user!.id);
        (set as { status?: number | string }).status = 201;
        return vendor;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Usuário já possui perfil de feirante') {
            (set as { status?: number | string }).status = 409;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message === 'CPF/CNPJ já cadastrado') {
            (set as { status?: number | string }).status = 409;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message === 'Feira não encontrada') {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.name === 'ZodError') {
            (set as { status?: number | string }).status = 400;
            const z = error as unknown as { issues: unknown };
            return {
              success: false,
              message: 'Dados inválidos',
              details: z.issues ?? error.message,
            } as unknown as { success: boolean; message: string };
          }
        }
        throw error;
      }
    },
    {
      body: t.Object({
        businessName: t.String({ minLength: 2, maxLength: 100 }),
        cpfCnpj: t.String({ minLength: 11, maxLength: 18 }),
        phone: t.Optional(t.String({ minLength: 10, maxLength: 20 })),
        description: t.Optional(t.String({ maxLength: 1000 })),
        photoUrl: t.Optional(t.String({ format: 'uri' })),
        photos: t.Optional(t.Array(t.String({ format: 'uri' }), { maxItems: 5 })),
        fairId: t.Optional(t.String({ format: 'uuid' })),
      }),
      detail: { tags: ['Vendors'], summary: 'Criar perfil', security: [{ bearerAuth: [] }] },
      response: {
        201: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .patch(
    '/:id',
    async (ctx: unknown) => {
      const { params, body, user, set } = ctx as {
        params: { id: string };
        body: unknown;
        user: { id: string; email: string; role: string };
        set: { status?: number | string };
      };
      try {
        return await vendorsController.updateById(params, body, user!.id, user!.role);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Feirante não encontrado') {
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
          if (error.message === 'CPF/CNPJ já cadastrado') {
            (set as { status?: number | string }).status = 409;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message === 'Feira não encontrada') {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.name === 'ZodError') {
            (set as { status?: number | string }).status = 400;
            const z = error as unknown as { issues: unknown };
            return {
              success: false,
              message: 'Dados inválidos',
              details: z.issues ?? error.message,
            } as unknown as { success: boolean; message: string };
          }
        }
        throw error;
      }
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        businessName: t.Optional(t.String({ minLength: 2, maxLength: 100 })),
        cpfCnpj: t.Optional(t.String({ minLength: 11, maxLength: 18 })),
        phone: t.Optional(t.Union([t.String({ minLength: 10, maxLength: 20 }), t.Null()])),
        description: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
        photoUrl: t.Optional(t.Union([t.String({ format: 'uri' }), t.Null()])),
        photos: t.Optional(t.Array(t.String({ format: 'uri' }), { maxItems: 5 })),
        fairId: t.Optional(t.Union([t.String({ format: 'uuid' }), t.Null()])),
      }),
      detail: {
        tags: ['Vendors'],
        summary: 'Atualizar por ID (ADMIN)',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .delete(
    '/:id',
    async (ctx: unknown) => {
      const { params, user, set } = ctx as {
        params: { id: string };
        user: { id: string; email: string; role: string };
        set: { status?: number | string };
      };
      try {
        return await vendorsController.deleteById(params, user!.id, user!.role);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Feirante não encontrado') {
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
        tags: ['Vendors'],
        summary: 'Excluir por ID (ADMIN)',
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
