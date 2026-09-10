export interface SurpriseBoxResponse {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  price: number;
  frequency: 'WEEKLY' | 'MONTHLY';
  isActive: boolean;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
