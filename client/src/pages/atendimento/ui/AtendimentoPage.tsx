import { useEffect, useState } from "react";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { useAtendimento } from "../useAtendimento";

// Passou deste tempo esperando, o cartao fica vermelho.
const LIMITE_MIN = 10;

function minutosDesde(iso: string, agora: number) {
    return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000));
}

export function AtendimentoPage() {
    const { abertos, recentes, erro, marcarAtendido } = useAtendimento();
    const [agora, setAgora] = useState(Date.now());
    const [marcando, setMarcando] = useState<string | null>(null);

    useEffect(() => {
        const t = setInterval(() => setAgora(Date.now()), 30000);
        return () => clearInterval(t);
    }, []);

    async function atender(id: string) {
        setMarcando(id);
        try { await marcarAtendido(id); } finally { setMarcando(null); }
    }

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-semibold text-[#1A1A1A]">Atendimento</h1>
                <p className="text-sm text-neutral-500">
                    Clientes que a Lia passou para a equipe. Responda pelo WhatsApp e clique em "Atendido": a Lia volta a poder falar com a cliente.
                </p>
            </div>

            {erro && <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{erro}</p>}

            {abertos.length === 0 ? (
                <p className="rounded border border-dashed p-6 text-center text-neutral-500">Ninguém aguardando agora.</p>
            ) : (
                <ul className="space-y-3">
                    {abertos.map((c) => {
                        const m = minutosDesde(c.criadoEm, agora);
                        const atrasado = m >= LIMITE_MIN;
                        return (
                            <li key={c.id} className={`rounded-lg border p-4 ${atrasado ? "border-red-400 bg-red-50" : "bg-white"}`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <strong>{c.nome || "Sem nome"} · {c.telefone}</strong>
                                    <span className={atrasado ? "font-semibold text-red-600" : "text-neutral-500"}>
                                        esperando há {m} min
                                    </span>
                                </div>
                                <p className="mt-2">{c.resumo}</p>
                                {c.ultimaMensagem && <p className="mt-1 text-sm text-neutral-500">“{c.ultimaMensagem}”</p>}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <a className="inline-flex items-center gap-1 rounded border px-3 py-1 hover:bg-neutral-50"
                                        href={`https://wa.me/${c.telefone}`} target="_blank" rel="noreferrer">
                                        <MessageCircle size={16} /> Abrir no WhatsApp
                                    </a>
                                    <button className="inline-flex items-center gap-1 rounded border px-3 py-1 hover:bg-neutral-50 disabled:opacity-50"
                                        disabled={marcando === c.id} onClick={() => atender(c.id)}>
                                        <CheckCircle2 size={16} /> Atendido
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {recentes.length > 0 && (
                <div>
                    <h2 className="mb-2 text-lg font-semibold">Atendidos recentemente</h2>
                    <ul className="space-y-1 text-sm text-neutral-600">
                        {recentes.map((c) => (
                            <li key={c.id}>{c.nome || c.telefone} — {c.resumo} · por {c.atendidoPor}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
