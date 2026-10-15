import Elysia, { t } from 'elysia';

import { authPlugin } from '../../plugins/auth';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';

const addressService = new AddressService();
const addressController = new AddressController(addressService);

export const addressRoutes = new Elysia({ prefix: '/addresses' })
  .use(authPlugin)
  .get(
    '/',
    async (ctx: unknown) => {
      const { query, user, set } = ctx as {
        query: unknown;
        user: { id: string; email: string; role: string };
        set: { status?: number | string };
      };
      try {
        return await addressController.list(query, user!.id);
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          (set as { status?: number | string }).status = 400;
          const z = error as unknown as { issues: unknown };
          return {
            success: false,
            message: 'Dados inválidos',
            details: z.issues ?? error.message,
          } as unknown as { success: boolean; message: string };
        }
        throw error;
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['Addresses'],
        summary: 'Listar meus endereços',
        description: 'Retorna endereços do usuário autenticado.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .get(
    '/:id',
    async (ctx: unknown) => {
      const { params, user, set } = ctx as {
        params: { id: string };
        user: { id: string; email: string; role: string };
        set: { status?: number | string };
      };
      try {
        return await addressController.getById(params, user!.id, user!.role);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Endereço não encontrado') {
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
        tags: ['Addresses'],
        summary: 'Obter endereço por ID',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
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
        const address = await addressController.create(body, user!.id);
        (set as { status?: number | string }).status = 201;
        return address;
      } catch (error) {
        if (error instanceof Error) {
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
        name: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
        street: t.String({ minLength: 1, maxLength: 255 }),
        number: t.String({ minLength: 1, maxLength: 20 }),
        complement: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
        neighborhood: t.String({ minLength: 1, maxLength: 100 }),
        city: t.String({ minLength: 1, maxLength: 100 }),
        state: t.String({ minLength: 2, maxLength: 2 }),
        postalCode: t.String({ minLength: 8, maxLength: 9 }),
        isDefault: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Addresses'],
        summary: 'Criar endereço',
        security: [{ bearerAuth: [] }],
      },
      response: {
        201: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
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
        return await addressController.update(params, body, user!.id, user!.role);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Endereço não encontrado') {
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
        name: t.Optional(t.Union([t.String({ maxLength: 100 }), t.Null()])),
        street: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
        number: t.Optional(t.String({ minLength: 1, maxLength: 20 })),
        complement: t.Optional(t.Union([t.String({ maxLength: 255 }), t.Null()])),
        neighborhood: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        city: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        state: t.Optional(t.String({ minLength: 2, maxLength: 2 })),
        postalCode: t.Optional(t.String({ minLength: 8, maxLength: 9 })),
        isDefault: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Addresses'],
        summary: 'Atualizar endereço',
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
    async (ctx: unknown) => {
      const { params, user, set } = ctx as {
        params: { id: string };
        user: { id: string; email: string; role: string };
        set: { status?: number | string };
      };
      try {
        return await addressController.delete(params, user!.id, user!.role);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Endereço não encontrado') {
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
        tags: ['Addresses'],
        summary: 'Excluir endereço',
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
