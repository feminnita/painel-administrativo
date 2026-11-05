import { X } from "lucide-react";
import {
    FULFILLMENT_STATUS_META, PAYMENT_STATUS_META, STATUS_OPTIONS, fmtBRL,
} from "@/pages/orders/domain";
import type { FulfillmentStatus, PaymentStatus } from "@/pages/orders/types";
import { useCliente } from "../useCliente";
import { dataHora } from "../formatos";
import type { PedidoDaCliente } from "../type";

// Mesmo criterio da tela Pedidos para "situacao do envio".
function envio(p: PedidoDaCliente) {
    if (p.situacao === "cancelled") return STATUS_OPTIONS.cancelled;
    const f: FulfillmentStatus =
        p.situacao === "processing" || p.situacao === "shipped" || p.situacao === "delivered" ? p.situacao : "not_shipped";
    return FULFILLMENT_STATUS_META[f];
}

function pagamento(p: PedidoDaCliente) {
    return PAYMENT_STATUS_META[p.pagamento as PaymentStatus] ?? { label: p.pagamento, color: "bg-gray-100 text-gray-700" };
}

// Quem e a cliente na loja: cadastro e ultimos 5 pedidos. Nao ha pagina propria
// de um pedido no painel (a tela Pedidos abre o detalhe na lista), entao o
// numero do pedido vem para buscar la.
export function PainelCliente({ telefone, onFechar }: { telefone: string; onFechar: () => void }) {
    const { cliente, carregando, erro } = useCliente(telefone);

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-semibold text-[#1A1A1A]">Cliente</h2>
                <button type="button" onClick={onFechar} className="text-neutral-500 hover:text-neutral-800" aria-label="Fechar painel da cliente">
                    <X size={18} />
                </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
                {carregando && <p className="text-neutral-500">Buscando cadastro…</p>}
                {erro && <p className="rounded border border-red-300 bg-red-50 p-2 text-red-700">{erro}</p>}
                {!carregando && !erro && !cliente && (
                    <p className="text-neutral-500">Não encontrei cadastro com este telefone.</p>
                )}
                {cliente && (
                    <>
                        <div className="space-y-1">
                            <p className="font-semibold text-[#1A1A1A]">{cliente.nome}</p>
                            <p className="break-all text-neutral-600">{cliente.email}</p>
                            {cliente.telefone && <p className="text-neutral-600">Cadastro: {cliente.telefone}</p>}
                            {(cliente.cidade || cliente.uf) && (
                                <p className="text-neutral-600">{[cliente.cidade, cliente.uf].filter(Boolean).join(" / ")}</p>
                            )}
                        </div>
                        <div>
                            <h3 className="mb-2 font-semibold text-[#1A1A1A]">Últimos pedidos</h3>
                            {cliente.pedidos.length === 0 ? (
                                <p className="text-neutral-500">Nenhum pedido no site.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {cliente.pedidos.map((p) => {
                                        const pg = pagamento(p);
                                        const ev = envio(p);
                                        return (
                                            <li key={p.id} className="rounded border p-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <strong>{p.numero}</strong>
                                                    <span>R$ {fmtBRL(p.total)}</span>
                                                </div>
                                                <p className="text-xs text-neutral-500">{dataHora(p.criadoEm)}</p>
                                                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                                                    <span className={`rounded px-1.5 py-0.5 ${pg.color}`}>{pg.label}</span>
                                                    <span className={`rounded px-1.5 py-0.5 ${ev.color}`}>{ev.label}</span>
                                                </div>
                                                {p.rastreio && (
                                                    <p className="mt-1 text-xs">
                                                        Rastreio:{" "}
                                                        {p.rastreioUrl ? (
                                                            <a href={p.rastreioUrl} target="_blank" rel="noreferrer" className="text-[#8C2F39] underline">{p.rastreio}</a>
                                                        ) : p.rastreio}
                                                    </p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
