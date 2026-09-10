export interface VendorResponse {
  id: string;
  userId: string;
  businessName: string;
  cpfCnpj: string;
  phone: string | null;
  description: string | null;
  photoUrl: string | null;
  photos: string[];
  fairId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorListResponse {
  data: VendorResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
