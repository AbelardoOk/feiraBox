export class AsaasError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AsaasError';
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isValidation(): boolean {
    return this.status === 400;
  }
}

export function parseAsaasError(status: number, body: unknown): AsaasError {
  const obj = body as Record<string, unknown> | null;
  if (obj && Array.isArray(obj.errors) && obj.errors.length > 0) {
    const first = obj.errors[0] as Record<string, unknown>;
    const code = (first.code as string) ?? 'asaas_error';
    const desc = (first.description as string) ?? JSON.stringify(first);
    return new AsaasError(desc, status, code, obj.errors);
  }
  const message =
    (obj?.message as string) ?? (obj?.error as string) ?? `Erro ASAAS (HTTP ${status})`;
  return new AsaasError(message, status, undefined, body);
}
