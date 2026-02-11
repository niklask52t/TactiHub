import { create } from 'zustand';
import type { User } from '@strathub/shared';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAdmin: false,
  isAuthenticated: false,
  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAdmin: user.role === 'admin', isAuthenticated: true }),
  logout: () =>
    set({ user: null, accessToken: null, isAdmin: false, isAuthenticated: false }),
}));
