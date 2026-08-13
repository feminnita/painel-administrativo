import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api/client";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AuthContextValue = {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AdminUser>("/api/admin/auth/me")
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const user = await api.post<AdminUser>("/api/admin/auth/login", { email, password });
    setAdmin(user);
  }

  async function logout() {
    await api.post<void>("/api/admin/auth/logout");
    setAdmin(null);
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