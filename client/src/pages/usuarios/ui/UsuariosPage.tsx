import { useCallback, useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/auth/useAuth";

type Usuario = { id: string; name: string; email: string; role: string | null; createdAt: string | null };

// Quem tem login no painel. Cada pessoa com o seu: e assim que a tela Conversas
// sabe quem respondeu cada mensagem.
export function UsuariosPage() {
    const { admin } = useAuth();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        try {
            const r = await api.get<Usuario[]>("/api/admin/users");
            setUsuarios(Array.isArray(r) ? r : []);
        } catch (e) {
            setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os usuários.");
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => { carregar(); }, [carregar]);

    async function criar(e: React.FormEvent) {
        e.preventDefault();
        if (salvando) return;
        setSalvando(true);
        setErro(null);
        setAviso(null);
        try {
            const r = await api.post<{ user: Usuario; emailEnviado: boolean }>("/api/admin/users", { name: nome, email });
            setAviso(
                r.emailEnviado
                    ? `Login criado. ${r.user.name} recebeu um e-mail em ${r.user.email} com o link para criar a própria senha (o link vale 30 minutos).`
                    : `Login criado, mas o e-mail com o link da senha não saiu. Peça para ${r.user.name} abrir a tela de login e clicar em "Esqueci minha senha".`,
            );
            setNome("");
            setEmail("");
            await carregar();
        } catch (e2) {
            setErro(e2 instanceof ApiError ? e2.message : "Não foi possível criar o login.");
        } finally {
            setSalvando(false);
        }
    }

    async function excluir(u: Usuario) {
        if (!window.confirm(`Excluir o login de ${u.name} (${u.email})? A pessoa perde o acesso ao painel na hora.`)) return;
        setErro(null);
        setAviso(null);
        try {
            await api.delete(`/api/admin/users/${u.id}`);
            await carregar();
        } catch (e) {
            setErro(e instanceof ApiError ? e.message : "Não foi possível excluir.");
        }
    }

    return (
        <div className="mx-auto max-w-3xl p-4 md:p-6">
            <h1 className="text-2xl font-bold">Usuários do painel</h1>
            <p className="mt-1 text-sm text-neutral-600">
                Cada pessoa da equipe com o seu login. A senha é criada pela própria pessoa, pelo link que chega no e-mail.
            </p>

            {erro && <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
            {aviso && <p className="mt-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">{aviso}</p>}

            <form onSubmit={criar} className="mt-4 grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="block text-sm">
                    <span className="mb-1 block font-medium">Nome</span>
                    <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} maxLength={60}
                        placeholder="Como vai aparecer nas conversas" className="w-full rounded border px-3 py-2 text-sm" />
                </label>
                <label className="block text-sm">
                    <span className="mb-1 block font-medium">E-mail</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={120}
                        placeholder="pessoa@exemplo.com" className="w-full rounded border px-3 py-2 text-sm" />
                </label>
                <button type="submit" disabled={salvando}
                    className="inline-flex items-center justify-center gap-1 rounded bg-[#8C2F39] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                    <UserPlus size={16} /> {salvando ? "Criando…" : "Criar login"}
                </button>
            </form>

            <div className="mt-4 overflow-hidden rounded-lg border bg-white">
                {carregando && <p className="p-4 text-sm text-neutral-500">Carregando…</p>}
                {!carregando && usuarios.length === 0 && <p className="p-4 text-sm text-neutral-500">Nenhum usuário.</p>}
                <ul className="divide-y">
                    {usuarios.map((u) => (
                        <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">
                                    {u.name}
                                    {u.id === admin?.id && <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">você</span>}
                                </p>
                                <p className="truncate text-sm text-neutral-600">{u.email}</p>
                            </div>
                            {u.id !== admin?.id && (
                                <button type="button" onClick={() => excluir(u)} aria-label={`Excluir o login de ${u.name}`} title="Excluir login"
                                    className="rounded border p-2 text-red-600 hover:bg-red-50">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
