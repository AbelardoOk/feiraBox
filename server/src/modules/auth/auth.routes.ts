import Elysia, { t } from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { AuthTokenPayload } from './auth.types';

const authService = new AuthService();
const authController = new AuthController(authService);

export const authRoutes = new Elysia({
  prefix: '/auth',
})
  .use(jwtPlugin)
  .post(
    '/register',
    async ({ body, jwt, set }) => {
      try {
        const result = await authController.register(
          body,
          jwt as unknown as { sign: (payload: { sub: string; email: string }) => Promise<string> },
        );
        set.status = 201;
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'E-mail já cadastrado') {
            set.status = 409;
            return {
              success: false,
              message: error.message,
            };
          }
          // Zod validation
          if (error.name === 'ZodError') {
            set.status = 400;
            const zodError = error as unknown as { issues: unknown };
            return {
              success: false,
              message: 'Dados inválidos',
              details: (zodError as { issues: unknown }).issues ?? error.message,
            };
          }
        }
        throw error;
      }
    },
    {
      body: t.Object({
        name: t.String({
          minLength: 2,
          maxLength: 100,
          description: 'Nome completo do usuário',
          examples: ['João Silva'],
        }),
        email: t.String({
          format: 'email',
          description: 'E-mail único do usuário',
          examples: ['joao@example.com'],
        }),
        password: t.String({
          minLength: 8,
          maxLength: 128,
          description: 'Senha com no mínimo 8 caracteres',
          examples: ['senhaSegura123'],
        }),
        phone: t.Optional(
          t.String({
            minLength: 10,
            maxLength: 20,
            description: 'Telefone opcional',
            examples: ['11999999999'],
          }),
        ),
      }),
      detail: {
        tags: ['Auth'],
        summary: 'Registrar novo usuário',
        description:
          'Cria um novo usuário com nome, e-mail, senha e telefone opcional. Retorna usuário criado e token JWT.',
      },
      response: {
        201: t.Object({
          user: t.Object({
            id: t.String({ examples: ['cuid-123'] }),
            name: t.String(),
            email: t.String({ format: 'email' }),
            phone: t.Union([t.String(), t.Null()]),
            role: t.String({ examples: ['USER', 'ADMIN'] }),
            createdAt: t.String({ format: 'date-time' }),
          }),
          token: t.String({ description: 'JWT Bearer token' }),
        }),
        400: t.Object({
          success: t.Boolean(),
          message: t.String(),
          details: t.Optional(t.Any()),
        }),
        409: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .post(
    '/login',
    async ({ body, jwt, set }) => {
      try {
        const result = await authController.login(
          body,
          jwt as unknown as { sign: (payload: { sub: string; email: string }) => Promise<string> },
        );
        set.status = 200;
        return result;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'E-mail ou senha inválidos') {
            set.status = 401;
            return {
              success: false,
              message: error.message,
            };
          }
          if (error.name === 'ZodError') {
            set.status = 400;
            const zodError = error as unknown as { issues: unknown };
            return {
              success: false,
              message: 'Dados inválidos',
              details: (zodError as { issues: unknown }).issues ?? error.message,
            };
          }
        }
        throw error;
      }
    },
    {
      body: t.Object({
        email: t.String({
          format: 'email',
          description: 'E-mail cadastrado',
          examples: ['joao@example.com'],
        }),
        password: t.String({ description: 'Senha', examples: ['senhaSegura123'] }),
      }),
      detail: {
        tags: ['Auth'],
        summary: 'Autenticar usuário',
        description:
          'Valida credenciais e retorna usuário e token JWT. Use o token como `Authorization: Bearer <token>` nas rotas protegidas.',
      },
      response: {
        200: t.Object({
          user: t.Object({
            id: t.String(),
            name: t.String(),
            email: t.String({ format: 'email' }),
            phone: t.Union([t.String(), t.Null()]),
            role: t.String(),
          }),
          token: t.String({ description: 'JWT Bearer token' }),
        }),
        400: t.Object({ success: t.Boolean(), message: t.String(), details: t.Optional(t.Any()) }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  // Rotas protegidas - derive/guarda vem APÓS rotas públicas para não afetar login/register
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
          user: null as Awaited<ReturnType<AuthService['getUserById']>>,
          jwtPayload: null as AuthTokenPayload | null,
        };
      }

      const [scheme, token] = authorization.split(' ');

      if (scheme !== 'Bearer' || !token) {
        return {
          user: null as Awaited<ReturnType<AuthService['getUserById']>>,
          jwtPayload: null as AuthTokenPayload | null,
        };
      }

      const payload = (await jwt.verify(token)) as AuthTokenPayload | false;

      if (!payload) {
        return {
          user: null as Awaited<ReturnType<AuthService['getUserById']>>,
          jwtPayload: null as AuthTokenPayload | null,
        };
      }

      const user = await authService.getUserById(payload.sub);

      if (!user) {
        return {
          user: null as Awaited<ReturnType<AuthService['getUserById']>>,
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
      user: Awaited<ReturnType<AuthService['getUserById']>>;
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
  .get(
    '/me',
    (context) => {
      const { user } = context as unknown as { user: unknown };
      return { user };
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Obter usuário autenticado',
        description:
          'Retorna dados do usuário do token JWT. Requer header `Authorization: Bearer <token>`.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({ user: t.Any() }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  )
  .get(
    '/verify',
    (context) => {
      const { user, jwtPayload } = context as unknown as { user: unknown; jwtPayload: unknown };
      return { valid: true, payload: jwtPayload, user };
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Verificar validade do token',
        description:
          'Verifica se o JWT é válido e retorna payload e usuário. Requer `Authorization: Bearer <token>`.',
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({ valid: t.Boolean(), payload: t.Any(), user: t.Any() }),
        401: t.Object({ success: t.Boolean(), message: t.String() }),
      },
    },
  );
