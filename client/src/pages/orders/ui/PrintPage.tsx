import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api/client";
import { mapApiOrderDetail } from "../mappers";
import type { OrderDetail } from "../types";
import {
  ConsolidatedPickingSheet,
  DeclaracaoSheet,
  EtiquetaSheet,
  PrintPortal,
  RomaneioSheet,
} from "./PrintSheets";

// Rota dedicada de impressao (/pedidos/print?ids=...&types=...&foto=1).
// Abre em nova aba, sem menu/sidebar, monta as folhas e dispara window.print().
// Ao imprimir PEDIDOS, carimba printed_at/printed_by (unico efeito colateral).
export function PrintPage() {
  const [params] = useSearchParams();
  const ids = (params.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const types = (params.get("types") || "pedidos").split(",").map((s) => s.trim()).filter(Boolean);
  const showPhoto = params.get("foto") === "1";

  const [orders, setOrders] = useState<OrderDetail[] | null>(null);
  const printedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const results = await Promise.all(
        ids.map((id) =>
          api
            .get<Record<string, any>>(`/api/admin/orders/${id}`)
            .then(mapApiOrderDetail)
            .catch(() => null),
        ),
      );
      if (alive) setOrders(results.filter((o): o is OrderDetail => !!o));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!orders || orders.length === 0 || printedRef.current) return;
    printedRef.current = true;
    // Carimbo de ja-impresso APENAS quando imprime PEDIDOS (romaneio).
    if (types.includes("pedidos") && ids.length) {
      api.post("/api/admin/orders/print/mark", { ids }).catch(() => {});
    }
    const t = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  return (
    <>
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        {orders === null ? (
          <p>Preparando impressão…</p>
        ) : orders.length === 0 ? (
          <p>Nenhum pedido encontrado para impressão.</p>
        ) : (
          <>
            <p>
              Enviando {orders.length} pedido{orders.length === 1 ? "" : "s"} para impressão…
            </p>
            <button onClick={() => window.print()} style={{ marginTop: 8, padding: "6px 12px" }}>
              Imprimir novamente
            </button>
          </>
        )}
      </div>

      {orders && orders.length > 0 && (
        <PrintPortal>
          {types.includes("pedidos") &&
            orders.map((o) => <RomaneioSheet key={`r-${o.id}`} order={o} showPhoto={showPhoto} />)}
          {types.includes("etiquetas") && orders.map((o) => <EtiquetaSheet key={`e-${o.id}`} order={o} />)}
          {types.includes("declaracao") && orders.map((o) => <DeclaracaoSheet key={`d-${o.id}`} order={o} />)}
          {types.includes("produtos") && <ConsolidatedPickingSheet orders={orders} showPhoto={showPhoto} />}
        </PrintPortal>
      )}
    </>
  );
}
