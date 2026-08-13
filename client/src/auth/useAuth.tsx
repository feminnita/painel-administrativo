import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { AdminUser, AuthContextValue } from "./types";
import { api, getToken, setToken, clearToken } from "@/lib/api/client";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.get<AdminUser>("/api/admin/auth/me")
      .then(setAdmin)
      .catch(() => {
        clearToken();
        setAdmin(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<{ token: string; admin: AdminUser }>(
      "/api/admin/auth/login",
      { email, password },
    );
    setToken(data.token);
    setAdmin(data.admin);
  }

  async function logout() {
    try {
      await api.post<void>("/api/admin/auth/logout");
    } finally {
      clearToken();
      setAdmin(null);
    }
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
