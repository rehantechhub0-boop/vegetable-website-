import { create } from 'zustand';

export interface AuthUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt?: string;
  addresses?: Array<{
    id: string;
    fullName: string;
    phone: string;
    streetAddress: string;
    deliveryZoneId: string | null;
    isDefault: boolean;
  }>;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  setUser: (user: AuthUser | null, token?: string | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const TOKEN_KEY = 'muzaffargarh_auth_token';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null,
  loading: true,

  setUser: (user, token) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      set({ user, token, loading: false });
    } else if (token === null) {
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, loading: false });
    } else {
      set({ user, loading: false });
    }
  },

  logout: async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, loading: false });
  },

  checkAuth: async () => {
    const token = get().token;
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/auth/me', {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          set({ user: json.user, loading: false });
          return;
        }
      }
    } catch (e) {
      // not logged in
    }

    // If failed or expired, clean up token
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, loading: false });
  },
}));
