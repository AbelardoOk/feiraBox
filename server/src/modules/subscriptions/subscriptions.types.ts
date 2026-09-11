export interface SubscriptionResponse {
  id: string;
  userId: string;
  boxId: string;
  frequency: 'WEEKLY' | 'MONTHLY';
  status: 'ACTIVE' | 'PAUSED' | 'CANCELED' | 'EXPIRED';
  price: number;
  startedAt: Date;
  pausedAt: Date | null;
  canceledAt: Date | null;
  nextBillingAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
