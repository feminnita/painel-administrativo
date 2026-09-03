import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { mapApiOrderDetail } from "./mappers";
import type { OrderDetail, OverrideValue } from "./types";

export function useOrderDetail(id: string | undefined) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [buyingLabel, setBuyingLabel] = useState(false);
  const [refreshingTracking, setRefreshingTracking] = useState(false);
  const [pushingBling, setPushingBling] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<Record<string, any>>(`/api/admin/orders/${id}`);
      const mapped = mapApiOrderDetail(data);
      setOrder(mapped);
      setTrackingInput(mapped.tracking_code || "");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else console.error("Erro ao carregar pedido:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    load();
  }, [load]);

  const setStatusOverride = async (override: OverrideValue | null) => {
    if (!id) return;
    setSavingOverride(true);
    try {
      await api.put(`/api/admin/orders/${id}/status-override`, { override });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao mudar status");
    } finally {
      setSavingOverride(false);
    }
  };

  const addNote = async (body: string) => {
    if (!id || !body.trim()) return;
    setSavingNote(true);
    try {
      await api.post(`/api/admin/orders/${id}/notes`, { body });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao salvar observação");
    } finally {
      setSavingNote(false);
    }
  };

  const saveTracking = async () => {
    if (!id || !trackingInput.trim()) return;
    setSavingTracking(true);
    try {
      await api.put(`/api/admin/orders/${id}/tracking`, { trackingCode: trackingInput });
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao salvar rastreio");
    } finally {
      setSavingTracking(false);
    }
  };

  const buyLabel = async () => {
    if (!id) return;
    setBuyingLabel(true);
    try {
      await api.post(`/api/admin/orders/${id}/shipping/label`);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao comprar etiqueta");
    } finally {
      setBuyingLabel(false);
    }
  };

  const refreshTracking = async () => {
    if (!id) return;
    setRefreshingTracking(true);
    try {
      await api.post(`/api/admin/orders/${id}/shipping/tracking`);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao atualizar rastreio");
    } finally {
      setRefreshingTracking(false);
    }
  };

  const pushToBling = async () => {
    if (!id) return;
    setPushingBling(true);
    try {
      await api.post(`/api/admin/bling/push-order/${id}`);
      await load();
      alert("Pedido enviado ao Bling — a nota vai sair.");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao enviar ao Bling");
    } finally {
      setPushingBling(false);
    }
  };

  return {
    order,
    loading,
    notFound,
    trackingInput,
    setTrackingInput,
    savingTracking,
    saveTracking,
    buyingLabel,
    buyLabel,
    refreshingTracking,
    refreshTracking,
    pushingBling,
    pushToBling,
    savingOverride,
    setStatusOverride,
    savingNote,
    addNote,
    reload: load,
  };
}
