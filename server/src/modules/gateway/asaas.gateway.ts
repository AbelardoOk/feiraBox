import { asaasConfig, getAsaasHeaders } from '../../config/asaas';
import { parseAsaasError } from './asaas.errors';
import { mapCustomerToAsaas, mapPaymentToAsaas, mapSubscriptionToAsaas } from './asaas.mapper';
import type {
  GatewayCustomer,
  GatewayCustomerInput,
  GatewayPayment,
  GatewayPaymentInput,
  GatewaySubscription,
  GatewaySubscriptionInput,
  PaymentGateway,
} from './payment-gateway.interface';

async function asaasFetch<T>(path: string, init: RequestInit): Promise<T> {
  const url = `${asaasConfig.baseUrl}${path}`;
  const headers = getAsaasHeaders();

  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
  });

  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw parseAsaasError(res.status, body);
  }

  return body as T;
}

export class AsaasGateway implements PaymentGateway {
  async createCustomer(input: GatewayCustomerInput): Promise<GatewayCustomer> {
    const payload = mapCustomerToAsaas(input);
    const data = await asaasFetch<{ id: string; name: string; email: string }>('/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { id: data.id, name: data.name, email: data.email };
  }

  async getCustomerByExternalReference(externalReference: string): Promise<GatewayCustomer | null> {
    const data = await asaasFetch<{ data: Array<{ id: string; name: string; email: string }> }>(
      `/customers?externalReference=${encodeURIComponent(externalReference)}`,
      { method: 'GET' },
    );
    if (data.data.length === 0) return null;
    const c = data.data[0]!;
    return { id: c.id, name: c.name, email: c.email };
  }

  async createPayment(input: GatewayPaymentInput): Promise<GatewayPayment> {
    const payload = mapPaymentToAsaas(input);
    const data = await asaasFetch<{
      id: string;
      status: string;
      invoiceUrl?: string;
      pixTransaction?: { qrCode?: { payload?: string; encodedImage?: string } };
      dueDate: string;
      value: number;
      billingType: string;
    }>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Para PIX, buscar billingInfo se qrCode não vier direto
    let pixQrCode: string | undefined;
    let pixCopyAndPaste: string | undefined;
    if (input.billingType === 'PIX') {
      pixCopyAndPaste = (data as unknown as { pixTransaction?: { payload?: string } })
        ?.pixTransaction?.payload;
      // fallback: buscar billingInfo
      if (!pixCopyAndPaste) {
        try {
          const info = await asaasFetch<{ pixQrCode?: string; pixCopyAndPaste?: string }>(
            `/payments/${data.id}/pixQrCode`,
            { method: 'GET' },
          );
          pixCopyAndPaste = (info as Record<string, unknown>).payload as string | undefined;
          pixQrCode = (info as Record<string, unknown>).encodedImage as string | undefined;
        } catch {
          // não crítico
        }
      }
    }

    return {
      id: data.id,
      status: data.status,
      invoiceUrl: data.invoiceUrl,
      pixQrCode,
      pixCopyAndPaste,
      dueDate: data.dueDate,
      value: data.value,
      billingType: data.billingType,
    };
  }

  async getPayment(id: string): Promise<GatewayPayment> {
    const data = await asaasFetch<{
      id: string;
      status: string;
      invoiceUrl?: string;
      dueDate: string;
      value: number;
      billingType: string;
    }>(`/payments/${id}`, { method: 'GET' });
    return {
      id: data.id,
      status: data.status,
      invoiceUrl: data.invoiceUrl,
      dueDate: data.dueDate,
      value: data.value,
      billingType: data.billingType,
    };
  }

  async refundPayment(id: string): Promise<void> {
    await asaasFetch(`/payments/${id}/refund`, { method: 'POST' });
  }

  async createSubscription(input: GatewaySubscriptionInput): Promise<GatewaySubscription> {
    const payload = mapSubscriptionToAsaas(input);
    const data = await asaasFetch<{
      id: string;
      status: string;
      cycle: string;
      value: number;
      nextDueDate: string;
    }>('/subscriptions', { method: 'POST', body: JSON.stringify(payload) });
    return {
      id: data.id,
      status: data.status,
      cycle: data.cycle,
      value: data.value,
      nextDueDate: data.nextDueDate,
    };
  }

  async getSubscription(id: string): Promise<GatewaySubscription> {
    const data = await asaasFetch<{
      id: string;
      status: string;
      cycle: string;
      value: number;
      nextDueDate: string;
    }>(`/subscriptions/${id}`, { method: 'GET' });
    return {
      id: data.id,
      status: data.status,
      cycle: data.cycle,
      value: data.value,
      nextDueDate: data.nextDueDate,
    };
  }

  async cancelSubscription(id: string): Promise<void> {
    await asaasFetch(`/subscriptions/${id}`, { method: 'DELETE' });
  }

  async tokenizeCreditCard(
    creditCard: NonNullable<GatewayPaymentInput['creditCard']>,
    holderInfo: NonNullable<GatewayPaymentInput['creditCardHolderInfo']>,
  ): Promise<{ creditCardToken: string }> {
    const data = await asaasFetch<{ creditCardToken: string }>('/creditCard/tokenizeCreditCard', {
      method: 'POST',
      body: JSON.stringify({ creditCard, creditCardHolderInfo: holderInfo }),
    });
    return { creditCardToken: data.creditCardToken };
  }
}

// Singleton lazy para injeção
let singleton: PaymentGateway | null = null;

export function getPaymentGateway(): PaymentGateway {
  if (singleton) return singleton;
  // Se não configurado, retorna mock para não quebrar boot (dev sem chave)
  if (!asaasConfig.isConfigured) {
    // import dinâmico síncrono evitado: instância mock inline leve
    // fallback: cria mock mínimo sem import circular
    return (singleton = createMockFallback());
  }
  singleton = new AsaasGateway();
  return singleton;
}

function createMockFallback(): PaymentGateway {
  // lazy import via import() não é síncrono; usar construção manual mock simples
  // para testes reais usar setPaymentGateway(new MockGateway())
  let counter = 0;
  const next = (p: string) => `${p}_mock_${++counter}`;
  return {
    async createCustomer(input) {
      return { id: next('cus'), name: input.name, email: input.email };
    },
    async getCustomerByExternalReference() {
      return null;
    },
    async createPayment(input) {
      return {
        id: next('pay'),
        status: input.billingType === 'CREDIT_CARD' ? 'CONFIRMED' : 'PENDING',
        invoiceUrl: `https://mock.asaas.com/i/${next('inv')}`,
        pixQrCode: input.billingType === 'PIX' ? 'mock-qr' : undefined,
        pixCopyAndPaste: input.billingType === 'PIX' ? 'mock-copy-paste' : undefined,
        dueDate: input.dueDate,
        value: input.value,
        billingType: input.billingType,
      };
    },
    async getPayment(id) {
      return {
        id,
        status: 'PENDING',
        dueDate: new Date().toISOString(),
        value: 0,
        billingType: 'PIX',
      };
    },
    async refundPayment() {},
    async createSubscription(input) {
      return {
        id: next('sub'),
        status: 'ACTIVE',
        cycle: input.cycle,
        value: input.value,
        nextDueDate: input.nextDueDate,
      };
    },
    async getSubscription(id) {
      return {
        id,
        status: 'ACTIVE',
        cycle: 'MONTHLY',
        value: 0,
        nextDueDate: new Date().toISOString(),
      };
    },
    async cancelSubscription() {},
    async tokenizeCreditCard() {
      return { creditCardToken: next('tok') };
    },
  };
}

// Para testes: permite injetar mock
export function setPaymentGateway(gateway: PaymentGateway): void {
  singleton = gateway;
}

export function resetPaymentGateway(): void {
  singleton = null;
}
