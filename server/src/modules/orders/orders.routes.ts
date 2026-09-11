import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { prisma } from '../../database/prisma';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import type { AuthTokenPayload } from '../auth/auth.types';

const ordersService = new OrdersService();
const ordersController = new OrdersController(ordersService);

export const ordersRoutes = new Elysia({ prefix: '/orders' })
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
  .get(
    '/panel',
    async ({ user }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const panel = await ordersController.getPanel(typedUser.id);
        return panel;
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
        tags: ['Orders'],
        summary: 'Painel do feirante (RF05)',
        description: 'Retorna receita acumulada, pedidos do dia e entregas futuras.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .get(
    '/',
    async ({ query, user }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const result = await ordersController.list(query, typedUser.id, typedUser.role);
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
            t.Literal('PENDING'),
            t.Literal('PREPARING'),
            t.Literal('READY'),
            t.Literal('DELIVERED'),
            t.Literal('CANCELED'),
          ]),
        ),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
        today: t.Optional(t.String({ maxLength: 5 })),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Listar pedidos',
        description:
          'Lista pedidos do consumidor ou do feirante (se for vendor, lista da banca; se consumidor, lista próprios). Filtro today e status.',
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
    '/:id',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const order = await ordersController.getById(params, typedUser.id, typedUser.role);
        return order;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Pedido não encontrado') {
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
        tags: ['Orders'],
        summary: 'Obter pedido por ID',
        description: 'Apenas consumidor, feirante da banca ou ADMIN.',
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
    '/:id/status',
    async ({ params, body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const order = await ordersController.updateStatus(
          params,
          body,
          typedUser.id,
          typedUser.role,
        );
        return order;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Pedido não encontrado') {
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
          if (error.message.includes('Transição inválida')) {
            (set as { status?: number | string }).status = 400;
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
        status: t.Union([
          t.Literal('PENDING'),
          t.Literal('PREPARING'),
          t.Literal('READY'),
          t.Literal('DELIVERED'),
          t.Literal('CANCELED'),
        ]),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Atualizar status do pedido (RF06)',
        description:
          'Apenas feirante ou ADMIN. Transições: PENDING→PREPARING→READY→DELIVERED (CANCELED permitido em PENDING/PREPARING/READY). Gera notificação em READY.',
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
  );
