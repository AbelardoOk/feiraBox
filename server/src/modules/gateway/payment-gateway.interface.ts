/**
 * Interface do Gateway de Pagamento — DIP.
 * Serviços de domínio dependem desta abstração, não de ASAAS diretamente.
 * Permite trocar implementação (MockGateway em testes, outro gateway futuro).
 */

// Cliente = consumidor FeiraBox (pagador)
export type GatewayCustomerInput = {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  externalReference: string; // id do User FeiraBox
};

export type GatewayCustomer = {
  id: string; // cus_xxx ASAAS
  name: string;
  email: string;
};

// Cobrança avulsa (PIX / Cartão) — RF04 + Boost (RF08)
export type GatewayPaymentInput = {
  customerId: string; // cus_xxx
  billingType: 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference: string; // id do Payment FeiraBox
  // Cartão (quando billingType = CREDIT_CARD)
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone?: string;
  };
  creditCardToken?: string;
  remoteIp?: string;
};

export type GatewayPayment = {
  id: string; // pay_xxx
  status: string; // PENDING | CONFIRMED | RECEIVED etc.
  invoiceUrl?: string;
  pixQrCode?: string;
  pixCopyAndPaste?: string;
  dueDate: string;
  value: number;
  billingType: string;
};

// Assinatura recorrente — RF03 (WEEKLY/MONTHLY)
export type GatewaySubscriptionInput = {
  customerId: string;
  billingType: 'PIX' | 'CREDIT_CARD' | 'UNDEFINED';
  value: number;
  cycle: 'WEEKLY' | 'MONTHLY';
  nextDueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference: string; // id da Subscription FeiraBox
  creditCard?: GatewayPaymentInput['creditCard'];
  creditCardHolderInfo?: GatewayPaymentInput['creditCardHolderInfo'];
  creditCardToken?: string;
  remoteIp?: string;
};

export type GatewaySubscription = {
  id: string; // sub_xxx
  status: string;
  cycle: string;
  value: number;
  nextDueDate: string;
};

export interface PaymentGateway {
  createCustomer(input: GatewayCustomerInput): Promise<GatewayCustomer>;
  getCustomerByExternalReference(externalReference: string): Promise<GatewayCustomer | null>;
  createPayment(input: GatewayPaymentInput): Promise<GatewayPayment>;
  getPayment(id: string): Promise<GatewayPayment>;
  refundPayment(id: string): Promise<void>;
  createSubscription(input: GatewaySubscriptionInput): Promise<GatewaySubscription>;
  getSubscription(id: string): Promise<GatewaySubscription>;
  cancelSubscription(id: string): Promise<void>;
  tokenizeCreditCard(
    creditCard: NonNullable<GatewayPaymentInput['creditCard']>,
    holderInfo: NonNullable<GatewayPaymentInput['creditCardHolderInfo']>,
  ): Promise<{ creditCardToken: string }>;
}
