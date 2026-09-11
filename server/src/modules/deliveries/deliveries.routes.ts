import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { prisma } from '../../database/prisma';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import type { AuthTokenPayload } from '../auth/auth.types';

const deliveriesService = new DeliveriesService();
const deliveriesController = new DeliveriesController(deliveriesService);

export const deliveriesRoutes = new Elysia({ prefix: '/deliveries' })
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
    '/:orderId',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const delivery = await deliveriesController.getByOrderId(
          params,
          typedUser.id,
          typedUser.role,
        );
        return delivery;
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === 'Pedido não encontrado' ||
            error.message === 'Entrega não encontrada'
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
      params: t.Object({ orderId: t.String({ format: 'uuid' }) }),
      detail: {
        tags: ['Deliveries'],
        summary: 'Obter entrega por pedido',
        description: 'Apenas consumidor, feirante ou ADMIN do pedido.',
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
    '/:orderId/status',
    async ({ params, body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const delivery = await deliveriesController.updateStatus(
          params,
          body,
          typedUser.id,
          typedUser.role,
        );
        return delivery;
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === 'Pedido não encontrado' ||
            error.message === 'Entrega não encontrada'
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
      params: t.Object({ orderId: t.String({ format: 'uuid' }) }),
      body: t.Object({
        status: t.Union([
          t.Literal('PENDING'),
          t.Literal('PREPARING'),
          t.Literal('READY'),
          t.Literal('IN_TRANSIT'),
          t.Literal('DELIVERED'),
          t.Literal('CANCELED'),
        ]),
      }),
      detail: {
        tags: ['Deliveries'],
        summary: 'Atualizar status da entrega',
        description:
          'Apenas feirante ou ADMIN. Transições: PENDING→PREPARING→READY→IN_TRANSIT→DELIVERED.',
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
  .post(
    '/:orderId/qr-code',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const delivery = await deliveriesController.generateQr(
          params,
          typedUser.id,
          typedUser.role,
        );
        (set as { status?: number | string }).status = 201;
        return delivery;
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === 'Pedido não encontrado' ||
            error.message === 'Entrega não encontrada'
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
          if (error.message.includes('já finalizada')) {
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
      params: t.Object({ orderId: t.String({ format: 'uuid' }) }),
      detail: {
        tags: ['Deliveries'],
        summary: 'Gerar QR Code da entrega',
        description:
          'Gera qrCode único (UUID) para validação da entrega. Apenas feirante ou ADMIN.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        201: t.Any(),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .post(
    '/verify-qr',
    async ({ body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const delivery = await deliveriesController.verifyQr(body, typedUser.id, typedUser.role);
        return { success: true, delivery, message: 'Entrega validada com sucesso' };
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'QR Code inválido ou não encontrado') {
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
          if (error.message.includes('já finalizada')) {
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
      body: t.Object({ qrCode: t.String({ minLength: 1 }) }),
      detail: {
        tags: ['Deliveries'],
        summary: 'Validar QR Code (RF06)',
        description:
          'Valida qrCode e marca entrega e pedido como DELIVERED. Apenas feirante ou ADMIN que escaneia.',
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
