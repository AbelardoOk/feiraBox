export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: Date;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface VerifiedTokenPayload extends AuthTokenPayload {
  iat?: number;
  exp?: number;
}
