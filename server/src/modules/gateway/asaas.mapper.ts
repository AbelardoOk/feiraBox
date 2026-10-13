import type {
  GatewayCustomerInput,
  GatewayPaymentInput,
  GatewaySubscriptionInput,
} from './payment-gateway.interface';

export function mapCustomerToAsaas(input: GatewayCustomerInput): Record<string, unknown> {
  return {
    name: input.name,
    email: input.email,
    cpfCnpj: input.cpfCnpj,
    mobilePhone: input.phone,
    externalReference: input.externalReference,
    notificationDisabled: false,
  };
}

export function mapPaymentToAsaas(input: GatewayPaymentInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: input.value,
    dueDate: input.dueDate,
    description: input.description,
    externalReference: input.externalReference,
  };

  if (input.creditCard) {
    payload.creditCard = input.creditCard;
  }
  if (input.creditCardHolderInfo) {
    payload.creditCardHolderInfo = input.creditCardHolderInfo;
  }
  if (input.creditCardToken) {
    payload.creditCardToken = input.creditCardToken;
  }
  if (input.remoteIp) {
    payload.remoteIp = input.remoteIp;
  }

  return payload;
}

export function mapSubscriptionToAsaas(input: GatewaySubscriptionInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    value: input.value,
    cycle: input.cycle,
    nextDueDate: input.nextDueDate,
    description: input.description,
    externalReference: input.externalReference,
  };

  if (input.creditCard) payload.creditCard = input.creditCard;
  if (input.creditCardHolderInfo) payload.creditCardHolderInfo = input.creditCardHolderInfo;
  if (input.creditCardToken) payload.creditCardToken = input.creditCardToken;
  if (input.remoteIp) payload.remoteIp = input.remoteIp;

  return payload;
}

export function mapAsaasPaymentStatus(asaasStatus: string): string {
  // ASAAS: PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, RECEIVED_IN_CASH, REFUND_REQUESTED, CHARGEBACK_REQUESTED, AWAITING_RISK_ANALYSIS
  const map: Record<string, string> = {
    PENDING: 'PENDING',
    RECEIVED: 'PAID',
    CONFIRMED: 'PAID',
    RECEIVED_IN_CASH: 'PAID',
    OVERDUE: 'PENDING',
    REFUNDED: 'REFUNDED',
    REFUND_REQUESTED: 'REFUNDED',
    CHARGEBACK_REQUESTED: 'REFUNDED',
    AWAITING_RISK_ANALYSIS: 'PENDING',
  };
  return map[asaasStatus] ?? 'PENDING';
}
