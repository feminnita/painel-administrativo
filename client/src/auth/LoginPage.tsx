import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";
import { useAuth } from "./useAuth";

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            navigate("/");
        } catch {
            setError("E-mail ou senha inválidos");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#1A1A1A] p-4">
            <div className="w-full max-w-sm">
                {/* marca */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-widest text-white">
                        FEMINNITA
                    </h1>
                    <p className="mt-1 text-sm text-gray-400">Painel Administrativo</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-2xl bg-white p-8 shadow-2xl"
                >
                    <div>
                        <label
                            htmlFor="login-email"
                            className="mb-1 block text-xs font-medium text-gray-700"
                        >
                            E-mail
                        </label>
                        <div className="relative">
                            <Mail
                                size={15}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="voce@feminnita.com.br"
                                required
                                autoComplete="email"
                                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none transition-colors focus:border-[#8C2F39] focus:ring-2 focus:ring-[#8C2F39]/15"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="login-password"
                            className="mb-1 block text-xs font-medium text-gray-700"
                        >
                            Senha
                        </label>
                        <div className="relative">
                            <Lock
                                size={15}
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-10 text-sm outline-none transition-colors focus:border-[#8C2F39] focus:ring-2 focus:ring-[#8C2F39]/15"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                aria-label={
                                    showPassword ? "Ocultar senha" : "Mostrar senha"
                                }
                            >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
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
                        <LogIn size={15} />
                        {loading ? "Entrando..." : "Entrar"}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-gray-500">
                    Acesso restrito à equipe Feminnita
                </p>
            </div>
        </div>
    );
}
