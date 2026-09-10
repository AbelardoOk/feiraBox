export interface ProductResponse {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
