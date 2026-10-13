import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { prisma } from '../../database/prisma';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import type { AuthTokenPayload } from '../auth/auth.types';
import { AsaasError } from '../gateway/asaas.errors';

const paymentsService = new PaymentsService();
const paymentsController = new PaymentsController(paymentsService);

export const paymentsRoutes = new Elysia({ prefix: '/payments' })
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
      const remoteIp = headers['x-forwarded-for'] ?? headers['x-real-ip'] ?? undefined;
      if (!authorization) {
        return {
          user: null as { id: string; email: string; role: string } | null,
          jwtPayload: null as AuthTokenPayload | null,
          remoteIp,
        };
      }
      const [scheme, token] = authorization.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return {
          user: null as { id: string; email: string; role: string } | null,
          jwtPayload: null as AuthTokenPayload | null,
          remoteIp,
        };
      }
      const payload = (await jwt.verify(token)) as AuthTokenPayload | false;
      if (!payload) {
        return {
          user: null as { id: string; email: string; role: string } | null,
          jwtPayload: null as AuthTokenPayload | null,
          remoteIp,
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
          remoteIp,
        };
      }
      return { user, jwtPayload: payload, remoteIp };
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
    async ({ body, user, remoteIp, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const ip = (remoteIp as string | undefined) ?? undefined;
        const payment = await paymentsController.create(body, typedUser.id, ip);
        (set as { status?: number | string }).status = 201;
        return payment;
      } catch (error) {
        if (error instanceof AsaasError) {
          (set as { status?: number | string }).status = error.status === 401 ? 502 : 400;
          return {
            success: false,
            message: `Erro no gateway: ${error.message}`,
            code: error.code,
            details: error.details,
          } as unknown as { success: boolean; message: string };
        }
        if (error instanceof Error) {
          if (
            error.message.includes('não encontrada') ||
            error.message.includes('não encontrado')
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
      body: t.Object({
        subscriptionId: t.Optional(t.String({ format: 'uuid' })),
        orderId: t.Optional(t.String({ format: 'uuid' })),
        campaignId: t.Optional(t.String({ format: 'uuid' })),
        method: t.Union([t.Literal('PIX'), t.Literal('CREDIT_CARD')]),
        creditCard: t.Optional(
          t.Object({
            holderName: t.String({ minLength: 2 }),
            number: t.String({ minLength: 13, maxLength: 19 }),
            expiryMonth: t.String({ pattern: '^(0[1-9]|1[0-2])$' }),
            expiryYear: t.String({ pattern: '^\\d{4}$' }),
            ccv: t.String({ minLength: 3, maxLength: 4 }),
          }),
        ),
        creditCardHolderInfo: t.Optional(
          t.Object({
            name: t.String({ minLength: 2 }),
            email: t.String({ format: 'email' }),
            cpfCnpj: t.String({ minLength: 11, maxLength: 14 }),
            postalCode: t.String({ minLength: 8, maxLength: 9 }),
            addressNumber: t.String({ minLength: 1 }),
            phone: t.Optional(t.String()),
          }),
        ),
        remoteIp: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Criar pagamento (PIX ou Cartão) — RF04',
        description:
          'Cria pagamento via ASAAS. PIX gera QR Code/invoiceUrl; Cartão tenta cobrança imediata. Comissão contábil 12% já calculada (RF07).',
        security: [{ bearerAuth: [] }],
      },
      response: {
        201: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .get(
    '/',
    async ({ query, user }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const result = await paymentsController.list(query, typedUser.id, typedUser.role);
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
            t.Literal('PAID'),
            t.Literal('FAILED'),
            t.Literal('REFUNDED'),
            t.Literal('CANCELED'),
          ]),
        ),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['Payments'],
        summary: 'Listar meus pagamentos',
        description: 'Lista pagamentos do usuário autenticado (ou todos se ADMIN).',
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
        const payment = await paymentsController.getById(params, typedUser.id, typedUser.role);
        return payment;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Pagamento não encontrado') {
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
        tags: ['Payments'],
        summary: 'Obter pagamento por ID',
        description: 'Apenas dono, feirante vinculado ou ADMIN.',
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
    '/:id/refund',
    async ({ params, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const refunded = await paymentsController.refund(params, typedUser.id, typedUser.role);
        return refunded;
      } catch (error) {
        if (error instanceof AsaasError) {
          (set as { status?: number | string }).status = 400;
          return {
            success: false,
            message: `Erro no gateway: ${error.message}`,
            code: error.code,
          } as unknown as { success: boolean; message: string };
        }
        if (error instanceof Error) {
          if (error.message === 'Pagamento não encontrado') {
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
          if (error.message.includes('Apenas pagamentos pagos')) {
            (set as { status?: number | string }).status = 400;
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
      body: t.Optional(t.Object({ reason: t.Optional(t.String()) })),
      detail: {
        tags: ['Payments'],
        summary: 'Reembolsar pagamento',
        description: 'Apenas ADMIN ou feirante do pedido. Reembolsa via ASAAS e marca REFUNDED.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Any(),
        400: t.Object({ success: t.Boolean(), message: t.String() }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
        403: t.Object({ success: t.Boolean(), message: t.String() }),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  );
