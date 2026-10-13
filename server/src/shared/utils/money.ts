/**
 * Utilitários monetários — sempre com 2 casas decimais.
 * RF07: comissão 10-15% deve ser consistente e sem floating errors.
 */

export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function formatBRL(value: number | string): string {
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte Date para formato ASAAS dueDate: YYYY-MM-DD
 */
export function toAsaasDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

/**
 * Adiciona dias a uma data
 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
