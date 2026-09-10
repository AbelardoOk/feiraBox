import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { prisma } from '../../database/prisma';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import type { AuthTokenPayload } from '../auth/auth.types';

const vendorsService = new VendorsService();
const vendorsController = new VendorsController(vendorsService);

export const vendorsRoutes = new Elysia({ prefix: '/vendors' })
  .use(jwtPlugin)
  // Públicas
  .get(
    '/',
    async ({ query }) => {
      try {
        const result = await vendorsController.list(query);
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
          'Lista feirantes com filtros por feira, cidade/estado da feira e busca textual. Paginação.',
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
        const vendor = await vendorsController.getById(params);
        return vendor;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Feirante não encontrado') {
            (set as { status?: number | string }).status = 404;
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
        summary: 'Obter feirante por ID',
        description: 'Público, retorna perfil com produtos e caixas ativas.',
      },
      response: {
        200: t.Any(),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  // Protegidas - /me antes do :id genérico para evitar conflito
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
  .get(
    '/me',
    async ({ user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const vendor = await vendorsController.getByUserId(typedUser.id);
        return vendor;
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
        summary: 'Obter meu perfil de feirante',
        description: 'Retorna perfil do usuário autenticado.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .post(
    '/',
    async ({ body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const vendor = await vendorsController.create(body, typedUser.id);
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
        businessName: t.String({ minLength: 2, maxLength: 100, examples: ['Banca da Roça'] }),
        cpfCnpj: t.String({ minLength: 11, maxLength: 18, examples: ['12345678901'] }),
        phone: t.Optional(t.String({ minLength: 10, maxLength: 20 })),
        description: t.Optional(t.String({ maxLength: 1000 })),
        photoUrl: t.Optional(t.String({ format: 'uri' })),
        photos: t.Optional(t.Array(t.String({ format: 'uri' }), { maxItems: 5 })),
        fairId: t.Optional(t.String({ format: 'uuid' })),
      }),
      detail: {
        tags: ['Vendors'],
        summary: 'Criar perfil de feirante',
        description:
          'Cria perfil vinculado ao usuário autenticado. businessName obrigatório, cpfCnpj único.',
        security: [{ bearerAuth: [] }],
      },
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
    '/me',
    async ({ body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const vendor = await vendorsController.updateByUserId(body, typedUser.id, typedUser.role);
        return vendor;
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
        description: 'Apenas proprietário.',
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
    async ({ user }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const result = await vendorsController.deleteByUserId(typedUser.id);
        return result;
      } catch (error) {
        if (error instanceof Error && error.message === 'Perfil de feirante não encontrado') {
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
        summary: 'Excluir meu perfil',
        description:
          'Apenas proprietário. CASCADE apaga produtos e caixas (bloqueado se houver pedidos).',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const vendor = await vendorsController.updateById(
          params,
          body,
          typedUser.id,
          typedUser.role,
        );
        return vendor;
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
        summary: 'Atualizar feirante por ID (ADMIN)',
        description: 'Apenas owner ou ADMIN.',
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
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const result = await vendorsController.deleteById(params, typedUser.id, typedUser.role);
        return result;
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
        summary: 'Excluir feirante por ID (ADMIN)',
        description: 'Apenas owner ou ADMIN.',
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
