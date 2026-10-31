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
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,

  // Called after a successful login/register response — just store the user object.
  // Authentication state is managed via the httpOnly cookie set by the server.
  setUser: (user) => {
    set({ user, isAuthenticated: !!user, loading: false });
  },

  logout: async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Best-effort — clear local state regardless
    }
    set({ user: null, isAuthenticated: false, loading: false });
  },

  checkAuth: async () => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        credentials: 'include',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          set({ user: json.user, isAuthenticated: true, loading: false });
          return;
        }
      }
    } catch {
      // Not logged in or network error
    }

    // Session expired or not authenticated
    set({ user: null, isAuthenticated: false, loading: false });
  },
}));
