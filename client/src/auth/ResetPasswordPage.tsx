import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Lock, Save } from "lucide-react";
import { api } from "@/lib/api/client";

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") ?? "";
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Link inválido ou expirado");
            return;
        }
        if (password.length < 8) {
            setError("A senha precisa ter pelo menos 8 caracteres");
            return;
        }
        if (password !== confirm) {
            setError("As senhas não conferem");
            return;
        }

        setLoading(true);
        try {
            await api.post<{ message: string }>("/api/admin/auth/reset-password", {
                token,
                password,
            });
            navigate("/login", { replace: true });
        } catch {
            setError("Link inválido ou expirado");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#1A1A1A] p-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-widest text-white">
                        FEMINNITA
                    </h1>
                    <p className="mt-1 text-sm text-gray-400">Nova senha</p>
                </div>

                {!token ? (
                    <div className="space-y-5 rounded-2xl bg-white p-8 shadow-2xl text-center">
                        <AlertCircle size={40} className="mx-auto text-red-600" />
                        <p className="text-sm text-gray-700">Link inválido ou expirado.</p>
                        <Link
                            to="/esqueci-senha"
                            className="inline-block text-sm font-semibold text-[#8C2F39] hover:underline"
                        >
                            Solicitar um novo link
                        </Link>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5 rounded-2xl bg-white p-8 shadow-2xl"
                    >
                        <div>
                            <label
                                htmlFor="new-password"
                                className="mb-1 block text-xs font-medium text-gray-700"
                            >
                                Nova senha
                            </label>
                            <div className="relative">
                                <Lock
                                    size={15}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-10 text-sm outline-none transition-colors focus:border-[#8C2F39] focus:ring-2 focus:ring-[#8C2F39]/15"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="confirm-password"
                                className="mb-1 block text-xs font-medium text-gray-700"
                            >
                                Confirmar nova senha
                            </label>
                            <div className="relative">
                                <Lock
                                    size={15}
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                />
                                <input
                                    id="confirm-password"
                                    type={showPassword ? "text" : "password"}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                    className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition-colors focus:border-[#8C2F39] focus:ring-2 focus:ring-[#8C2F39]/15"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                                <AlertCircle size={15} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8C2F39] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7a2832] disabled:opacity-60"
                        >
                            <Save size={15} />
                            {loading ? "Salvando..." : "Salvar nova senha"}
                        </button>

                        <Link
                            to="/login"
                            className="block text-center text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                            Voltar para o login
                        </Link>
                    </form>
                )}
            </div>
        </div>
    );
}
