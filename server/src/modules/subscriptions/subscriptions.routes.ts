import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { prisma } from '../../database/prisma';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import type { AuthTokenPayload } from '../auth/auth.types';

const subscriptionsService = new SubscriptionsService();
const subscriptionsController = new SubscriptionsController(subscriptionsService);

export const subscriptionsRoutes = new Elysia({ prefix: '/subscriptions' })
  .use(jwtPlugin)
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
        const sub = await subscriptionsController.create(body, typedUser.id);
        (set as { status?: number | string }).status = 201;
        return sub;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Caixa Surpresa não encontrada') {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message === 'Caixa Surpresa inativa') {
            (set as { status?: number | string }).status = 409;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (
            error.message === 'Endereço não encontrado' ||
            error.message === 'Endereço não pertence ao usuário'
          ) {
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
        boxId: t.String({ format: 'uuid', examples: ['uuid-caixa'] }),
        frequency: t.Optional(t.Union([t.Literal('WEEKLY'), t.Literal('MONTHLY')])),
        addressId: t.Optional(t.String({ format: 'uuid' })),
      }),
      detail: {
        tags: ['Subscriptions'],
        summary: 'Criar assinatura',
        description:
          'Cria assinatura recorrente (RF03). Gera pedido e entrega automaticamente. Requer caixa ativa.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        201: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .get(
    '/',
    async ({ query, user }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const result = await subscriptionsController.list(query, typedUser.id);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          return {
            success: false,
            message: 'Dados inválidos',
            details: (error as unknown as { issues: unknown }).issues ?? error.message,
          } as unknown as { success: boolean; message: string };
        }
        throw error;
      }
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal('ACTIVE'),
            t.Literal('PAUSED'),
            t.Literal('CANCELED'),
            t.Literal('EXPIRED'),
          ]),
        ),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['Subscriptions'],
        summary: 'Listar minhas assinaturas',
        description: 'Lista assinaturas do consumidor autenticado.',
        security: [{ bearerAuth: [] }],
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
        401: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .get(
    '/vendor/me',
    async ({ query, user }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const result = await subscriptionsController.listByVendor(query, typedUser.id);
        return result;
      } catch (error) {
        if (error instanceof Error && error.name === 'ZodError') {
          return {
            success: false,
            message: 'Dados inválidos',
            details: (error as unknown as { issues: unknown }).issues ?? error.message,
          } as unknown as { success: boolean; message: string };
        }
        throw error;
      }
    },
    {
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal('ACTIVE'),
            t.Literal('PAUSED'),
            t.Literal('CANCELED'),
            t.Literal('EXPIRED'),
          ]),
        ),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['Subscriptions'],
        summary: 'Listar assinaturas das minhas caixas (feirante)',
        description: 'Para feirante ver assinantes das suas caixas (RF05).',
        security: [{ bearerAuth: [] }],
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
        401: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .get(
    '/:id',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const sub = await subscriptionsController.getById(params, typedUser.id, typedUser.role);
        return sub;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Assinatura não encontrada') {
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
        tags: ['Subscriptions'],
        summary: 'Obter assinatura por ID',
        description: 'Apenas consumidor dono, feirante da caixa ou ADMIN.',
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
  .patch(
    '/:id/pause',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const sub = await subscriptionsController.pause(params, typedUser.id);
        return sub;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Assinatura não encontrada') {
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
          if (
            error.message.includes('já pausada') ||
            error.message.includes('Apenas assinaturas ativas')
          ) {
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
        tags: ['Subscriptions'],
        summary: 'Pausar assinatura (RF09)',
        description: 'Apenas consumidor dono. Muda ACTIVE→PAUSED.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .patch(
    '/:id/resume',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const sub = await subscriptionsController.resume(params, typedUser.id);
        return sub;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Assinatura não encontrada') {
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
          if (error.message.includes('Apenas assinaturas pausadas')) {
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
        tags: ['Subscriptions'],
        summary: 'Retomar assinatura pausada',
        description: 'Apenas consumidor dono. PAUSED→ACTIVE.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .patch(
    '/:id/cancel',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const sub = await subscriptionsController.cancel(params, typedUser.id);
        return sub;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Assinatura não encontrada') {
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
          if (error.message.includes('já cancelada') || error.message.includes('expirada')) {
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
        tags: ['Subscriptions'],
        summary: 'Cancelar assinatura (RF09)',
        description: 'Apenas consumidor dono. ACTIVE/PAUSED→CANCELED.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .patch(
    '/:id',
    async ({ params, body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const sub = await subscriptionsController.updatePlan(params, body, typedUser.id);
        return sub;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Assinatura não encontrada') {
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
          if (
            error.message === 'Caixa Surpresa não encontrada' ||
            error.message === 'Caixa Surpresa inativa'
          ) {
            (set as { status?: number | string }).status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (
            error.message.includes('Apenas assinaturas ativas') ||
            error.message.includes('Nenhuma alteração')
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
        frequency: t.Optional(t.Union([t.Literal('WEEKLY'), t.Literal('MONTHLY')])),
        boxId: t.Optional(t.String({ format: 'uuid' })),
      }),
      detail: {
        tags: ['Subscriptions'],
        summary: 'Alterar plano da assinatura (RF09)',
        description: 'Apenas consumidor dono. Permite trocar frequency e/ou caixa.',
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
  );
