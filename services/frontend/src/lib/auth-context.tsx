'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, tokenStorage, ApiError, type AuthUser } from './api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  setOAuthToken: (accessToken: string) => void;
  clearError: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to restore session from localStorage on mount
  useEffect(() => {
    const token = tokenStorage.getAccess();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi
      .getProfile()
      .then((profile) => {
        setUser({
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          roles: profile.userRoles.map((ur) => ur.role.name),
        });
      })
      .catch(() => {
        tokenStorage.clear();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await authApi.login({ email, password });
      tokenStorage.set(res.accessToken, res.refreshToken);
      setUser(res.user);
      router.push('/profile');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed');
      throw e;
    }
  }, [router]);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      setError(null);
      try {
        const res = await authApi.register({ email, password, fullName });
        tokenStorage.set(res.accessToken, res.refreshToken);
        setUser(res.user);
        router.push('/profile');
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Registration failed');
        throw e;
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore errors on logout
    } finally {
      tokenStorage.clear();
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  // Called from OAuth callback page
  const setOAuthToken = useCallback(
    (accessToken: string) => {
      tokenStorage.set(accessToken);
      setIsLoading(true);
      authApi
        .getProfile()
        .then((profile) => {
          setUser({
            id: profile.id,
            email: profile.email,
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl,
            roles: profile.userRoles.map((ur) => ur.role.name),
          });
          router.push('/profile');
        })
        .catch(() => {
          tokenStorage.clear();
          router.push('/login');
        })
        .finally(() => setIsLoading(false));
    },
    [router],
  );

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        logout,
        setOAuthToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
