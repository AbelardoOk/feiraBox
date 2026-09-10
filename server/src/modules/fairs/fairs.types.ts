export interface FairUser {
  id: string;
  email: string;
  role: string;
}

export interface FairResponse {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  ownerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FairListResponse {
  data: FairResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
