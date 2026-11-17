import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/auth/useAuth";
import { ehAdmin } from "@/auth/papel";
import { ASSUNTOS } from "@/pages/conversas/useAtendimento";
import type { Assunto } from "@/pages/conversas/type";

type Papel = "admin" | "atendente";
type Usuario = { id: string; name: string; email: string; papel: Papel; assuntos: Assunto[]; createdAt: string | null };

function EscolhaDePapel({ papel, assuntos, onPapel, onAssuntos }: {
    papel: Papel; assuntos: Assunto[]; onPapel: (p: Papel) => void; onAssuntos: (a: Assunto[]) => void;
}) {
    const alternar = (a: Assunto) => onAssuntos(assuntos.includes(a) ? assuntos.filter((x) => x !== a) : [...assuntos, a]);
    return (
        <div className="space-y-2 text-sm">
            <label className="flex items-start gap-2">
                <input type="radio" checked={papel === "atendente"} onChange={() => onPapel("atendente")} className="mt-1" />
                <span><strong>Atendente</strong>: nas Conversas vê só o que está com ela e o que chegar, sem responsável, nos assuntos marcados abaixo.</span>
            </label>
            {papel === "atendente" && (
                <div className="ml-6 flex flex-wrap gap-3">
                    {ASSUNTOS.map((a) => (
                        <label key={a.valor} className="flex items-center gap-1.5">
                            <input type="checkbox" checked={assuntos.includes(a.valor)} onChange={() => alternar(a.valor)} /> {a.rotulo}
                        </label>
                    ))}
                </div>
            )}
            <label className="flex items-start gap-2">
                <input type="radio" checked={papel === "admin"} onChange={() => onPapel("admin")} className="mt-1" />
                <span><strong>Administradora</strong>: vê todas as conversas e cadastra usuários.</span>
            </label>
        </div>
    );
}

// Quem tem login no painel e o que cada pessoa enxerga nas Conversas.
export function UsuariosPage() {
    const { admin } = useAuth();
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [papel, setPapel] = useState<Papel>("atendente");
    const [assuntos, setAssuntos] = useState<Assunto[]>(["geral"]);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [editando, setEditando] = useState<Usuario | null>(null);

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

    if (admin && !ehAdmin(admin.role)) {
        return <p className="p-6 text-sm text-neutral-600">Só a administradora acessa os usuários.</p>;
    }

    async function criar(e: React.FormEvent) {
        e.preventDefault();
        if (salvando) return;
        setSalvando(true);
        setErro(null);
        setAviso(null);
        try {
            const r = await api.post<{ user: Usuario; emailEnviado: boolean }>("/api/admin/users", { name: nome, email, papel, assuntos });
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

    async function salvarEdicao() {
        if (!editando || salvando) return;
        setSalvando(true);
        setErro(null);
        setAviso(null);
        try {
            await api.patch(`/api/admin/users/${editando.id}`, { name: editando.name, papel: editando.papel, assuntos: editando.assuntos });
            if (editando.id === admin?.id) setAviso("Alterado. O seu nome novo aparece nas mensagens depois que você sair e entrar de novo.");
            setEditando(null);
            await carregar();
        } catch (e) {
            setErro(e instanceof ApiError ? e.message : "Não foi possível salvar.");
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

    const resumo = (u: Usuario) => u.papel === "admin"
        ? "Administradora · vê todas as conversas"
        : `Atendente · ${u.assuntos.length ? u.assuntos.map((a) => ASSUNTOS.find((x) => x.valor === a)?.rotulo ?? a).join(", ") : "nenhum assunto (só vê o que for transferido para ela)"}`;

    return (
        <div className="mx-auto max-w-3xl p-4 md:p-6">
            <h1 className="text-2xl font-bold">Usuários do painel</h1>
            <p className="mt-1 text-sm text-neutral-600">
                Cada pessoa da equipe com o seu login. A senha é criada pela própria pessoa, pelo link que chega no e-mail.
            </p>

            {erro && <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
            {aviso && <p className="mt-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">{aviso}</p>}

            <form onSubmit={criar} className="mt-4 space-y-3 rounded-lg border bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2">
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
                </div>
                <EscolhaDePapel papel={papel} assuntos={assuntos} onPapel={setPapel} onAssuntos={setAssuntos} />
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
                        <li key={u.id} className="px-4 py-3">
                            {editando?.id === u.id ? (
                                <div className="space-y-3">
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium">Nome</span>
                                        <input value={editando.name} onChange={(e) => setEditando({ ...editando, name: e.target.value })} maxLength={60}
                                            className="w-full rounded border px-3 py-2 text-sm" />
                                    </label>
                                    <EscolhaDePapel papel={editando.papel} assuntos={editando.assuntos}
                                        onPapel={(p) => setEditando({ ...editando, papel: p })} onAssuntos={(a) => setEditando({ ...editando, assuntos: a })} />
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setEditando(null)} className="rounded border px-3 py-2 text-sm">Cancelar</button>
                                        <button type="button" onClick={salvarEdicao} disabled={salvando}
                                            className="rounded bg-[#8C2F39] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                                            {salvando ? "Salvando…" : "Salvar"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium">
                                            {u.name}
                                            {u.id === admin?.id && <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">você</span>}
                                        </p>
                                        <p className="truncate text-sm text-neutral-600">{u.email}</p>
                                        <p className="text-xs text-neutral-500">{resumo(u)}</p>
                                    </div>
                                    <button type="button" onClick={() => setEditando(u)} aria-label={`Editar ${u.name}`} title="Editar nome e acesso"
                                        className="rounded border p-2 text-neutral-600 hover:bg-neutral-50">
                                        <Pencil size={16} />
                                    </button>
                                    {u.id !== admin?.id && (
                                        <button type="button" onClick={() => excluir(u)} aria-label={`Excluir o login de ${u.name}`} title="Excluir login"
                                            className="rounded border p-2 text-red-600 hover:bg-red-50">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
