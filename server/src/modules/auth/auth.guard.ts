import Elysia from 'elysia';

import { jwtPlugin } from '../../plugins/jwt';
import { AuthService } from './auth.service';
import type { AuthTokenPayload } from './auth.types';

const authService = new AuthService();

type JwtVerifyService = {
  verify: (token?: string) => Promise<unknown>;
};

type DeriveContext = {
  headers: Record<string, string | undefined>;
  jwt: JwtVerifyService;
};

type RequireAuthContext = {
  user: Awaited<ReturnType<AuthService['getUserById']>>;
  set: { status?: number | string };
};

/**
 * Derive para extrair usuário do JWT.
 * Use como: app.derive(authDerive)
 * Requer que jwtPlugin já tenha sido aplicado antes (app.use(jwtPlugin)).
 */
export const authDerive = async ({ headers, jwt }: DeriveContext) => {
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

  // Verifica se usuário ainda existe
  const user = await authService.getUserById(payload.sub);

  if (!user) {
    return {
      user: null as Awaited<ReturnType<AuthService['getUserById']>>,
      jwtPayload: null as AuthTokenPayload | null,
    };
  }

  return {
    user,
    jwtPayload: payload,
  };
};

/**
 * Guard que bloqueia requisições sem usuário autenticado.
 * Use como: app.onBeforeHandle(requireAuth)
 */
export const requireAuth = ({ user, set }: RequireAuthContext) => {
  if (!user) {
    set.status = 401;
    return {
      success: false,
      message: 'Não autorizado. Token ausente, inválido ou expirado.',
    };
  }
};

export const optionalAuthDerive = async ({ headers, jwt }: DeriveContext) => {
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

  return {
    user,
    jwtPayload: payload,
  };
};

// Plugin legado - para compatibilidade.
// ATENÇÃO: Devido a limitações do Elysia com derive em plugins usados via .use() dentro de .group(),
// prefira usar `app.derive(authDerive).onBeforeHandle(requireAuth)` diretamente.
// Este plugin funciona quando usado como `app.use(authGuard)` após `app.use(jwtPlugin)` e antes das rotas protegidas
// no mesmo nível (sem group).
export const authGuard = new Elysia({ name: 'authGuard' })
  .use(jwtPlugin)
  .derive(authDerive)
  .onBeforeHandle(requireAuth);

// Opcional: não bloqueia, apenas anexa usuário se houver token válido
export const optionalAuth = new Elysia({ name: 'optionalAuth' })
  .use(jwtPlugin)
  .derive(optionalAuthDerive);
