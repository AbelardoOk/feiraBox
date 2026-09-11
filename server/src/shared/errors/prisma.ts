/**
 * Helper para identificar violação de unique constraint do Prisma (P2002).
 * Suporta tanto `PrismaClientKnownRequestError` quanto objetos serializados.
 */
export function isPrismaUniqueError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if ('code' in error && (error as { code: unknown }).code === 'P2002') return true;
  // Fallback para instância de PrismaClientKnownRequestError (evita import circular)
  return (
    (error as { name?: string; code?: string }).name === 'PrismaClientKnownRequestError' &&
    (error as { code?: string }).code === 'P2002'
  );
}

export function getPrismaTarget(error: unknown): string[] | undefined {
  if (!error || typeof error !== 'object' || !('meta' in error)) return undefined;
  const meta = (error as { meta?: { target?: string[] | string } }).meta;
  if (!meta?.target) return undefined;
  return Array.isArray(meta.target) ? meta.target : [meta.target];
}
