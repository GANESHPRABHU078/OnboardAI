import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode, useSyncExternalStore } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function subscribeToToken(cb: () => void) {
  window.addEventListener('storage', cb);
  return () => window.removeEventListener('storage', cb);
}

function getTokenSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

function getTokenServerSnapshot(): string | null {
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(subscribeToToken, getTokenSnapshot, getTokenServerSnapshot);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setUserRef = useRef<(u: User | null) => void>(null!);

  // Fetch user profile whenever token changes
  useEffect(() => {
    setUserRef.current = (u: User | null) => setUser(u);

    let cancelled = false;

    function done(u: User | null) {
      if (!cancelled) setUserRef.current?.(u);
    }

    if (!token) {
      done(null);
      queueMicrotask(() => { if (!cancelled) setIsLoading(false); });
      return;
    }

    queueMicrotask(() => { if (!cancelled) setIsLoading(true); });
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => done(data?.user ?? null))
      .catch(() => done(null))
      .finally(() => { queueMicrotask(() => { if (!cancelled) setIsLoading(false); }); });

    return () => { cancelled = true; };
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('auth_token', data.token);
    window.dispatchEvent(new Event('storage'));
    setUser(data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('auth_token', data.token);
    window.dispatchEvent(new Event('storage'));
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    window.dispatchEvent(new Event('storage'));
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}