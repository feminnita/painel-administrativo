import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        try {
            await login(email, password);
            navigate("/");
        } catch {
            setError("E-mail ou senha inválidos");
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
                <h1 className="text-2xl font-semibold">Painel Feminnita</h1>
                <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail" required
                    className="w-full rounded border px-3 py-2"
                />
                <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha" required
                    className="w-full rounded border px-3 py-2"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button type="submit" className="w-full rounded bg-black py-2 text-white">Entrar</button>
            </form>
        </div>
    );
}
