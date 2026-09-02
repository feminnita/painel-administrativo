import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { calcTotalRevenue, filterOrders } from "./domain";
import { mapApiOrder } from "./mappers";
import type { Order, OverrideValue } from "./types";

const AUTO_REFRESH_MS = 45_000;

export function useOrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [pushingBlingId, setPushingBlingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Guardamos os filtros num ref pra o timer de auto-refresh ler sempre o valor
  // atual sem recriar o intervalo (evita piscar a tela / perder scroll).
  const filtersRef = useRef({ statusFilter, dateFrom, dateTo });
  filtersRef.current = { statusFilter, dateFrom, dateTo };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const { statusFilter, dateFrom, dateTo } = filtersRef.current;
    try {
      const params = new URLSearchParams();
      // "all" = fila de trabalho (servidor esconde cancelados/falhados).
      // Um status especifico (inclusive "cancelled") sobrepoe esse padrao.
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString();

      const data = await api.get<Record<string, any>[]>(
        `/api/admin/orders${qs ? `?${qs}` : ""}`,
      );
      // Merge no estado (mesma referencia de linha por id) - nao remonta a lista.
      setOrders(data.map(mapApiOrder));
      setLastUpdated(new Date());
    } catch (error) {
      // Refresh silencioso nao deve estourar alertas nem limpar a lista.
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  // Recarrega ao mudar filtros (com spinner).
  useEffect(() => {
    setLoading(true);
    load();
  }, [statusFilter, dateFrom, dateTo, load]);

  // Auto-refresh (defeito 3): recarrega sozinha sem piscar nem perder filtro/scroll.
  useEffect(() => {
    const id = window.setInterval(() => load({ silent: true }), AUTO_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = filterOrders(orders, { search, status: statusFilter });
  const totalRevenue = calcTotalRevenue(orders);

  const setStatusOverride = async (id: string, override: OverrideValue | null) => {
    try {
      await api.put(`/api/admin/orders/${id}/status-override`, { override });
      await load({ silent: true });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao mudar status");
    }
  };

  const pushToBling = async (orderId: string) => {
    setPushingBlingId(orderId);
    try {
      await api.post(`/api/admin/bling/push-order/${orderId}`);
      await load({ silent: true });
      alert("Pedido enviado ao Bling — a nota vai sair.");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao enviar ao Bling");
    } finally {
      setPushingBlingId(null);
    }
  };

  // --- Selecao em lote (impressao de romaneios) ---
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (filtered.length > 0 && filtered.every((o) => prev.has(o.id))) {
        const next = new Set(prev);
        filtered.forEach((o) => next.delete(o.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((o) => next.add(o.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedOrders = orders.filter((o) => selectedIds.has(o.id));

  return {
    orders,
    loading,
    filtered,
    totalRevenue,
    lastUpdated,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    setStatusOverride,
    pushingBlingId,
    pushToBling,
    // batch
    selectedIds,
    selectedOrders,
    toggleSelect,
    toggleSelectAll,
    allFilteredSelected,
    clearSelection,
    reload: () => load({ silent: true }),
  };
}
