export type PaymentWithRelations = {
  id: string;
  userId: string;
  subscriptionId: string | null;
  orderId: string | null;
  campaignId: string | null;
  amount: unknown;
  platformFee: unknown;
  vendorAmount: unknown;
  method: string;
  status: string;
  asaasPaymentId: string | null;
  asaasInvoiceUrl: string | null;
  pixQrCode: string | null;
  pixCopyPaste: string | null;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date;
};

export type CreatePaymentInput = {
  subscriptionId?: string;
  orderId?: string;
  campaignId?: string;
  method: 'PIX' | 'CREDIT_CARD';
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
  remoteIp?: string;
};
