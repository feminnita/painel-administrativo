import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, Send } from "lucide-react";
import { api } from "@/lib/api/client";

export function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await api.post<{ message: string }>(
                "/api/admin/auth/forgot-password",
                { email },
            );
            setMessage(data.message ?? "Se esse e-mail existir, enviamos o link.");
        } catch {
            // Resposta é sempre genérica; mesmo em erro, não revelamos nada.
            setMessage("Se esse e-mail existir, enviamos o link.");
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
                    <p className="mt-1 text-sm text-gray-400">Recuperar senha</p>
                </div>

                {message ? (
                    <div className="space-y-5 rounded-2xl bg-white p-8 shadow-2xl text-center">
                        <CheckCircle2 size={40} className="mx-auto text-green-600" />
                        <p className="text-sm text-gray-700">{message}</p>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#8C2F39] hover:underline"
                        >
                            <ArrowLeft size={15} />
                            Voltar para o login
                        </Link>
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5 rounded-2xl bg-white p-8 shadow-2xl"
                    >
                        <p className="text-sm text-gray-600">
                            Digite o e-mail da sua conta. Se ele estiver cadastrado,
                            enviaremos um link para redefinir a senha.
                        </p>

                        <div>
                            <label
                                htmlFor="forgot-email"
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
                                    id="forgot-email"
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#8C2F39] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7a2832] disabled:opacity-60"
                        >
                            <Send size={15} />
                            {loading ? "Enviando..." : "Enviar link"}
                        </button>

                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700"
                        >
                            <ArrowLeft size={13} />
                            Voltar para o login
                        </Link>
                    </form>
                )}
            </div>
        </div>
    );
}
