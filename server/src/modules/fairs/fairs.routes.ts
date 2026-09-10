import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { prisma } from '../../database/prisma';
import { FairsController } from './fairs.controller';
import { FairsService } from './fairs.service';
import type { AuthTokenPayload } from '../auth/auth.types';

const fairsService = new FairsService();
const fairsController = new FairsController(fairsService);

export const fairsRoutes = new Elysia({ prefix: '/fairs' })
  .use(jwtPlugin)
  // Públicas
  .get(
    '/',
    async ({ query }) => {
      try {
        const result = await fairsController.list(query);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Latitude e longitude')) {
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.name === 'ZodError') {
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
      query: t.Object({
        city: t.Optional(t.String({ maxLength: 100 })),
        state: t.Optional(t.String({ maxLength: 100 })),
        q: t.Optional(t.String({ maxLength: 100 })),
        lat: t.Optional(t.Numeric({ minimum: -90, maximum: 90 })),
        lng: t.Optional(t.Numeric({ minimum: -180, maximum: 180 })),
        radiusKm: t.Optional(t.Numeric({ minimum: 0.1, maximum: 1000 })),
        page: t.Optional(t.Numeric({ minimum: 1 })),
        limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
      detail: {
        tags: ['Fairs'],
        summary: 'Listar feiras',
        description:
          'Lista feiras com filtros por cidade, estado, busca textual e proximidade (Haversine em memória). Paginação com page/limit.',
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
    async ({ params }) => {
      try {
        const fair = await fairsController.getById(params);
        return fair;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Feira não encontrada') {
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
        tags: ['Fairs'],
        summary: 'Obter feira por ID',
        description: 'Retorna feira com vendors associados e owner.',
      },
      response: {
        200: t.Any(),
        404: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  // Protegidas - derive após rotas públicas
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
        return {
          success: false,
          message: 'Não autorizado. Token ausente, inválido ou expirado.',
        };
      }
    },
  )
  .post(
    '/',
    async ({ body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        // Permissão: qualquer autenticado pode criar? Decisão: owner + ADMIN, mas para criar, qualquer autenticado vira owner
        // Se quiser restringir só ADMIN, descomentar abaixo:
        // if (typedUser.role !== 'ADMIN') { set.status = 403; return { success:false, message:'Apenas ADMIN pode criar feiras' } }
        const fair = await fairsController.create(body, typedUser.id);
        set.status = 201;
        return fair;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Latitude e longitude')) {
            const typedSet = set as { status?: number | string };
            typedSet.status = 400;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.name === 'ZodError') {
            const typedSet = set as { status?: number | string };
            typedSet.status = 400;
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
        name: t.String({ minLength: 2, maxLength: 100, examples: ['Mercado Escola UFMS'] }),
        description: t.Optional(t.String({ maxLength: 1000 })),
        address: t.Optional(t.String({ maxLength: 200 })),
        city: t.Optional(t.String({ maxLength: 100, examples: ['Campo Grande'] })),
        state: t.Optional(t.String({ maxLength: 100, examples: ['MS'] })),
        latitude: t.Optional(t.Number({ minimum: -90, maximum: 90, examples: [-20.5] })),
        longitude: t.Optional(t.Number({ minimum: -180, maximum: 180, examples: [-54.6] })),
      }),
      detail: {
        tags: ['Fairs'],
        summary: 'Criar feira',
        description:
          'Cria feira. Requer autenticação. Owner será o usuário autenticado; ADMIN pode criar para qualquer.',
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
    async ({ params, body, user, set }) => {
      try {
        const typedUser = user as { id: string; email: string; role: string };
        const fair = await fairsController.update(params, body, typedUser.id, typedUser.role);
        return fair;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Feira não encontrada') {
            const typedSet = set as { status?: number | string };
            typedSet.status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message.includes('Não autorizado')) {
            const typedSet = set as { status?: number | string };
            typedSet.status = 403;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message.includes('Latitude e longitude')) {
            const typedSet = set as { status?: number | string };
            typedSet.status = 400;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.name === 'ZodError') {
            const typedSet = set as { status?: number | string };
            typedSet.status = 400;
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
        description: t.Optional(t.String({ maxLength: 1000 })),
        address: t.Optional(t.String({ maxLength: 200 })),
        city: t.Optional(t.String({ maxLength: 100 })),
        state: t.Optional(t.String({ maxLength: 100 })),
        latitude: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
        longitude: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
      }),
      detail: {
        tags: ['Fairs'],
        summary: 'Atualizar feira',
        description: 'Apenas owner ou ADMIN.',
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
        const result = await fairsController.delete(params, typedUser.id, typedUser.role);
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Feira não encontrada') {
            const typedSet = set as { status?: number | string };
            typedSet.status = 404;
            return { success: false, message: error.message } as unknown as {
              success: boolean;
              message: string;
            };
          }
          if (error.message.includes('Não autorizado')) {
            const typedSet = set as { status?: number | string };
            typedSet.status = 403;
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
        tags: ['Fairs'],
        summary: 'Excluir feira',
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
