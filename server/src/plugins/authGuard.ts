/**
 * @deprecated Use `authPlugin` / `optionalAuthPlugin` from './auth' – mantido por compatibilidade.
 * Este arquivo foi simplificado para re-exportar o plugin canônico e evitar duplicação
 * (antes continha 100+ linhas duplicadas de `plugins/auth.ts`).
 */
export { authPlugin as authGuard, authPlugin, optionalAuthPlugin } from './auth';
export type { AuthUser, AuthContext } from './auth';
