import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { calcTotalRevenue, filterOrders } from "./domain";
import { mapApiOrder } from "./mappers";
import type { Order } from "./types";

export function useOrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingInput, setTrackingInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [buyingLabel, setBuyingLabel] = useState(false);
  const [refreshingTracking, setRefreshingTracking] = useState(false);

  const load = useCallback(
    async (keepSelectedId?: string) => {
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
        const mapped = data.map(mapApiOrder);
        setOrders(mapped);
        if (keepSelectedId) {
          setSelected(mapped.find((o) => o.id === keepSelectedId) ?? null);
        }
      } catch (error) {
        console.error("Erro ao carregar pedidos:", error);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, dateFrom, dateTo],
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = filterOrders(orders, { search, status: statusFilter });
  const totalRevenue = calcTotalRevenue(orders);

  const select = (order: Order | null) => {
    setSelected(order);
    setTrackingInput(order?.tracking_code || "");
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.put(`/api/admin/orders/${id}/status`, { status });
      await load(id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao mudar status");
    }
  };

  const saveTracking = async () => {
    if (!selected || !trackingInput.trim()) return;
    setSavingTracking(true);
    try {
      await api.put(`/api/admin/orders/${selected.id}/tracking`, {
        trackingCode: trackingInput,
      });
      await load(selected.id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao salvar rastreio");
    } finally {
      setSavingTracking(false);
    }
  };

  const buyLabel = async () => {
    if (!selected) return;
    setBuyingLabel(true);
    try {
      await api.post(`/api/admin/orders/${selected.id}/shipping/label`);
      await load(selected.id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao comprar etiqueta");
    } finally {
      setBuyingLabel(false);
    }
  };

  const refreshTracking = async () => {
    if (!selected) return;
    setRefreshingTracking(true);
    try {
      await api.post(`/api/admin/orders/${selected.id}/shipping/tracking`);
      await load(selected.id);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao atualizar rastreio");
    } finally {
      setRefreshingTracking(false);
    }
  };

  return {
    orders,
    loading,
    filtered,
    totalRevenue,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    selected,
    select,
    trackingInput,
    setTrackingInput,
    savingTracking,
    changeStatus,
    saveTracking,
    buyingLabel,
    buyLabel,
    refreshingTracking,
    refreshTracking,
  };
}
