import { useCallback, useEffect, useState } from "react";
import { api } from '../../lib/api/client';
import type { SalesReport } from "../vendas/type";
import type { AbandonedCart } from "../carts/types";
import type { RecentOrder } from "./type";

export function useDashboardAdmin() {
    const [report, setReport] = useState<SalesReport | null>(null);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [carts, setCarts] = useState<AbandonedCart[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [sales, orders, abandonedCarts] = await Promise.all([
                api.get<SalesReport>("/api/admin/reports/sales?days=30"),
                api.get<Record<string, any>[]>("/api/admin/orders"),
                api.get<AbandonedCart[]>("/api/admin/carts").catch(() => []),
            ]);

            setReport(sales);
            setRecentOrders(
                (orders ?? []).slice(0, 5).map((o) => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    total: Number(o.total) || 0,
                    createdAt: o.createdAt,
                })),
            );
            setCarts(abandonedCarts ?? []);
        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);


    const today = new Date();
    const todayKey = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
    ].join("-");
    const todayRow = report?.byDay.find((d) => d.day === todayKey);

    return {
        report, recentOrders, carts, loading, load,
        todayRevenue: todayRow?.revenue ?? 0,
        todayOrders: todayRow?.orders ?? 0,
    };
}