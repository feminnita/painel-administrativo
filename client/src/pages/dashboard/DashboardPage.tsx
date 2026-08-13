import { useAuth } from "@/auth/useAuth";

export function DashboardPage() {
  const { admin, logout } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-xl">Olá, {admin?.name} — painel no ar</h1>
      <button onClick={logout} className="mt-4 rounded border px-4 py-2">Sair</button>
    </div>
  );
}
