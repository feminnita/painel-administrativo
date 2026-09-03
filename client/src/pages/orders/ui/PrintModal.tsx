import { useState } from "react";
import { Printer, X } from "lucide-react";
import { api, ApiError } from "@/lib/api/client";
import type { Order } from "../types";

type PrintType = "pedidos" | "etiquetas" | "declaracao" | "produtos";

// Modal de impressao: escolhe O QUE imprimir para N pedidos selecionados.
// Nenhuma opcao altera estoque/situacao — a UNICA gravacao e' o carimbo
// printed_at/printed_by (feito na rota /pedidos/print ao imprimir PEDIDOS).
export function PrintModal({
  orders,
  onClose,
  onChanged,
}: {
  orders: Order[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [types, setTypes] = useState<Record<PrintType, boolean>>({
    pedidos: true,
    etiquetas: false,
    declaracao: false,
    produtos: false,
  });
  const [foto, setFoto] = useState(true);
  const [clearing, setClearing] = useState(false);

  const ids = orders.map((o) => o.id);
  const alreadyPrinted = orders.filter((o) => o.printed_at);

  const toggle = (t: PrintType) => setTypes((prev) => ({ ...prev, [t]: !prev[t] }));

  const selectedTypes = (Object.keys(types) as PrintType[]).filter((t) => types[t]);

  const clearPrinted = async () => {
    if (!alreadyPrinted.length) return;
    setClearing(true);
    try {
      await api.post("/api/admin/orders/print/clear", { ids: alreadyPrinted.map((o) => o.id) });
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao desmarcar impressos");
    } finally {
      setClearing(false);
    }
  };

  const continuePrint = () => {
    if (!selectedTypes.length) return;
    const qs = new URLSearchParams({
      ids: ids.join(","),
      types: selectedTypes.join(","),
      foto: foto ? "1" : "0",
    });
    window.open(`/pedidos/print?${qs.toString()}`, "_blank", "noopener");
    // A lista reflete o carimbo no proximo refresh.
    onChanged();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Printer size={18} /> {orders.length} pedido{orders.length === 1 ? "" : "s"} selecionado
            {orders.length === 1 ? "" : "s"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Aviso de ja impresso */}
        {alreadyPrinted.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {alreadyPrinted.map((o) => (
              <p key={o.id}>⚠ O pedido {o.order_number} já foi impresso.</p>
            ))}
            <button
              onClick={clearPrinted}
              disabled={clearing}
              className="mt-2 font-medium text-amber-900 underline hover:text-amber-950 disabled:opacity-50"
            >
              {clearing ? "Desmarcando..." : "Desmarcar pedidos impressos"}
            </button>
          </div>
        )}

        <p className="mb-2 text-sm font-medium text-gray-700">
          Quais itens desses pedidos você deseja imprimir?
        </p>
        <div className="space-y-2">
          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <input type="checkbox" checked={types.pedidos} onChange={() => toggle("pedidos")} className="mt-0.5" />
            <span className="flex-1">
              <span className="font-medium">PEDIDOS</span> — romaneio, uma folha por pedido (separação um a um)
              <label className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={foto} onChange={() => setFoto((v) => !v)} />
                Imprimir imagem dos produtos
              </label>
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <input type="checkbox" checked={types.etiquetas} onChange={() => toggle("etiquetas")} className="mt-0.5" />
            <span className="flex-1">
              <span className="font-medium">ETIQUETAS</span> — etiqueta do Melhor Envio (se já comprada)
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={types.declaracao}
              onChange={() => toggle("declaracao")}
              className="mt-0.5"
            />
            <span className="flex-1">
              <span className="font-medium">DECLARAÇÃO DE CONTEÚDO</span> — declaração do Melhor Envio
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <input type="checkbox" checked={types.produtos} onChange={() => toggle("produtos")} className="mt-0.5" />
            <span className="flex-1">
              <span className="font-medium">PRODUTOS VENDIDOS</span> — lista consolidada por SKU
              <span className="ml-1 text-xs text-gray-400">(opção secundária — some tudo num apanhado só)</span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={continuePrint}
            disabled={selectedTypes.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#8C2F39] px-4 py-2 text-sm font-medium text-white hover:bg-[#7a2832] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={14} /> Continuar impressão
          </button>
        </div>
      </div>
    </div>
  );
}
