export interface User {
  id: string;
  username: string;
  email: string;
  emailVerifiedAt: string | null;
  role: UserRole;
  deactivatedAt: string | null;
  deletionScheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  token?: string;
}

export interface TokenPayload {
  userId: string;
  role: UserRole;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}
