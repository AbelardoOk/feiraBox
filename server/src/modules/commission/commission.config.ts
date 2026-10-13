import { asaasConfig } from '../../config/asaas';

/**
 * RF07 — Comissão da plataforma entre 10% e 15%.
 * Decisão: taxa FIXA configurável via env COMMISSION_RATE (default 12% = 0.12).
 * Fácil de alterar: basta mudar .env ou passar rate no construtor (testes / futuro por feirante).
 * Validação 10-15% já feita em config/asaas.ts.
 */

export const COMMISSION_RATE = asaasConfig.commissionRate;

export const COMMISSION_MIN = 0.1;
export const COMMISSION_MAX = 0.15;

export function isValidCommissionRate(rate: number): boolean {
  return rate >= COMMISSION_MIN && rate <= COMMISSION_MAX;
}
