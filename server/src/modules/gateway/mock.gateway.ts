import type {
  GatewayCustomer,
  GatewayCustomerInput,
  GatewayPayment,
  GatewayPaymentInput,
  GatewaySubscription,
  GatewaySubscriptionInput,
  PaymentGateway,
} from './payment-gateway.interface';

let counter = 0;
function next(prefix: string): string {
  counter += 1;
  return `${prefix}_${String(counter).padStart(8, '0')}`;
}

/**
 * MockGateway — usado em testes e quando ASAAS não configurado (dev sem chave).
 * Implementa determinístico sem rede.
 */
export class MockGateway implements PaymentGateway {
  private customers = new Map<string, GatewayCustomer>();
  private payments = new Map<string, GatewayPayment>();
  private subscriptions = new Map<string, GatewaySubscription>();

  async createCustomer(input: GatewayCustomerInput): Promise<GatewayCustomer> {
    const id = next('cus_mock');
    const c: GatewayCustomer = { id, name: input.name, email: input.email };
    this.customers.set(input.externalReference, c);
    return c;
  }

  async getCustomerByExternalReference(externalReference: string): Promise<GatewayCustomer | null> {
    return this.customers.get(externalReference) ?? null;
  }

  async createPayment(input: GatewayPaymentInput): Promise<GatewayPayment> {
    const id = next('pay_mock');
    const p: GatewayPayment = {
      id,
      status: input.billingType === 'CREDIT_CARD' ? 'CONFIRMED' : 'PENDING',
      invoiceUrl: `https://mock.asaas.com/i/${id}`,
      pixQrCode: input.billingType === 'PIX' ? 'mock-qr-base64' : undefined,
      pixCopyAndPaste: input.billingType === 'PIX' ? 'mock-pix-copy-paste' : undefined,
      dueDate: input.dueDate,
      value: input.value,
      billingType: input.billingType,
    };
    this.payments.set(id, p);
    return p;
  }

  async getPayment(id: string): Promise<GatewayPayment> {
    const p = this.payments.get(id);
    if (!p) throw new Error(`Payment ${id} não encontrado no mock`);
    return p;
  }

  async refundPayment(id: string): Promise<void> {
    const p = this.payments.get(id);
    if (p) p.status = 'REFUNDED';
  }

  async createSubscription(input: GatewaySubscriptionInput): Promise<GatewaySubscription> {
    const id = next('sub_mock');
    const s: GatewaySubscription = {
      id,
      status: 'ACTIVE',
      cycle: input.cycle,
      value: input.value,
      nextDueDate: input.nextDueDate,
    };
    this.subscriptions.set(id, s);
    return s;
  }

  async getSubscription(id: string): Promise<GatewaySubscription> {
    const s = this.subscriptions.get(id);
    if (!s) throw new Error(`Subscription ${id} não encontrado no mock`);
    return s;
  }

  async cancelSubscription(id: string): Promise<void> {
    const s = this.subscriptions.get(id);
    if (s) s.status = 'INACTIVE';
  }

  async tokenizeCreditCard(): Promise<{ creditCardToken: string }> {
    return { creditCardToken: next('cc_token_mock') };
  }

  reset(): void {
    this.customers.clear();
    this.payments.clear();
    this.subscriptions.clear();
    counter = 0;
  }
}
