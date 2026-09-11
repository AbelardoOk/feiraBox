import Elysia from 'elysia';

import { prisma } from '../database/prisma';
import type { AuthTokenPayload } from '../modules/auth/auth.types';

import { jwtPlugin } from './jwt';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
};

export type AuthContext = {
  user: AuthUser | null;
  jwtPayload: AuthTokenPayload | null;
};

/**
 * Plugin de autenticação centralizado.
 * Uso:
 *   new Elysia({prefix:'/xxx'}).use(jwtPlugin)
 *     .get('/', publicHandler) // antes do derive -> público
 *     .use(authPlugin) // a partir daqui, todas as rotas são protegidas
 *     .post('/', protectedHandler)
 *
 * Ou para rotas públicas com usuário opcional:
 *   .use(optionalAuthPlugin)
 */
export const authPlugin = new Elysia({ name: 'auth' })
  .use(jwtPlugin)
  .derive(
    async ({
      headers,
      jwt,
    }: {
      headers: Record<string, string | undefined>;
      jwt: { verify: (token?: string) => Promise<unknown> };
    }): Promise<AuthContext> => {
      const authorization = headers.authorization;
      if (!authorization) {
        return { user: null, jwtPayload: null };
      }
      const [scheme, token] = authorization.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return { user: null, jwtPayload: null };
      }
      const payload = (await jwt.verify(token)) as AuthTokenPayload | false;
      if (!payload) {
        return { user: null, jwtPayload: null };
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });
      if (!user) {
        return { user: null, jwtPayload: null };
      }
      return { user: user as AuthUser, jwtPayload: payload };
    },
  )
  .onBeforeHandle(({ user, set }: { user: AuthUser | null; set: { status?: number | string } }) => {
    if (!user) {
      set.status = 401;
      return { success: false, message: 'Não autorizado. Token ausente, inválido ou expirado.' };
    }
  });

export const optionalAuthPlugin = new Elysia({ name: 'optionalAuth' })
  .use(jwtPlugin)
  .derive(
    async ({
      headers,
      jwt,
    }: {
      headers: Record<string, string | undefined>;
      jwt: { verify: (token?: string) => Promise<unknown> };
    }): Promise<AuthContext> => {
      const authorization = headers.authorization;
      if (!authorization) {
        return { user: null, jwtPayload: null };
      }
      const [scheme, token] = authorization.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return { user: null, jwtPayload: null };
      }
      const payload = (await jwt.verify(token)) as AuthTokenPayload | false;
      if (!payload) {
        return { user: null, jwtPayload: null };
      }
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      });
      if (!user) {
        return { user: null, jwtPayload: null };
      }
      return { user: user as AuthUser, jwtPayload: payload };
    },
  );
