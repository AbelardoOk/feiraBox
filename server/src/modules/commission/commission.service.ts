import { COMMISSION_RATE, isValidCommissionRate } from './commission.config';
import { roundMoney } from '../../shared/utils/money';

export type CommissionResult = {
  platformFee: number;
  vendorAmount: number;
  rate: number;
};

/**
 * Serviço puro de cálculo de comissão.
 * SRP: apenas aritmética monetária, sem IO/prisma/gateway.
 * RF07: retenção automática entre 10% e 15%.
 * Por enquanto contábil (não split ASAAS) — descontada diretamente do pagamento.
 */
export class CommissionService {
  private readonly rate: number;

  constructor(rate: number = COMMISSION_RATE) {
    if (!isValidCommissionRate(rate)) {
      throw new Error(`COMMISSION_RATE inválida: ${rate}. Deve estar entre 0.10 e 0.15 (RF07)`);
    }
    this.rate = rate;
  }

  getRate(): number {
    return this.rate;
  }

  /**
   * Calcula comissão sobre valor bruto.
   * @param amount valor bruto da transação (ex: preço da caixa)
   * @returns platformFee (plataforma), vendorAmount (feirante), rate usado
   */
  calculate(amount: number): CommissionResult {
    const gross = Number(amount);
    if (!Number.isFinite(gross) || gross <= 0) {
      throw new Error('Valor inválido para cálculo de comissão');
    }
    const platformFee = roundMoney(gross * this.rate);
    const vendorAmount = roundMoney(gross - platformFee);
    return { platformFee, vendorAmount, rate: this.rate };
  }

  /**
   * Atalho estático para uso simples.
   */
  static calculate(amount: number, rate: number = COMMISSION_RATE): CommissionResult {
    return new CommissionService(rate).calculate(amount);
  }
}
