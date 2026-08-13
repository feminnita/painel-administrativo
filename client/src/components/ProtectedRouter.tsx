import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";

export function ProtectedRoute() {
    const { admin, loading } = useAuth();

    if (loading) return <div className="flex min-h-screen items-center justify-center">Carregando…</div>;
    if (!admin) return <Navigate to="/login" replace />;

    return <Outlet />;
}
