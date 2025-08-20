// src/types/auth.ts

import type { LoginRequest as LoginReq, RegisterRequest as RegisterReq, User as AuthUser, AuthResponse as AuthResp } from '../services/authService';

export type LoginRequest = LoginReq;
export type RegisterRequest = RegisterReq;
export type User = AuthUser;
export type AuthResponse = AuthResp;

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginRequest) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}
