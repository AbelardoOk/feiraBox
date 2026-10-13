import 'dotenv/config';
import { z } from 'zod';

const asaasEnvSchema = z.object({
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_BASE_URL: z.string().url().optional(),
  ASAAS_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  COMMISSION_RATE: z.coerce.number().min(0.1).max(0.15).default(0.12),
});

const parsed = asaasEnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('[asaas.config] Variáveis ASAAS inválidas:', parsed.error.flatten());
}

const env = parsed.success ? parsed.data : asaasEnvSchema.parse({});

const defaultBaseUrl =
  env.ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';

export const asaasConfig = {
  apiKey: env.ASAAS_API_KEY ?? '',
  baseUrl: env.ASAAS_BASE_URL ?? defaultBaseUrl,
  env: env.ASAAS_ENV,
  webhookToken: env.ASAAS_WEBHOOK_TOKEN ?? '',
  commissionRate: env.COMMISSION_RATE,
  isConfigured: Boolean(env.ASAAS_API_KEY),
} as const;

export function assertAsaasConfigured(): void {
  if (!asaasConfig.isConfigured) {
    throw new Error('ASAAS_API_KEY não configurado. Defina ASAAS_API_KEY no .env');
  }
}

export function getAsaasHeaders(): Record<string, string> {
  assertAsaasConfigured();
  return {
    'Content-Type': 'application/json',
    access_token: asaasConfig.apiKey,
    'User-Agent': 'FeiraBox/1.0 (Bun; Elysia)',
  };
}
