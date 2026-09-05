import { useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import type { ApplyReport, ReconcileReport, RefreshResult } from "./types";

type Banner = { ok: boolean; message: string };

export function useReconcile() {
    const [report, setReport] = useState<ReconcileReport | null>(null);
    const [gravou, setGravou] = useState<number | null>(null);
    const [loading, setLoading] = useState<null | "dryRun" | "apply" | "refresh">(null);
    const [banner, setBanner] = useState<Banner | null>(null);

    function fail(error: unknown, fallback: string) {
        setBanner({
            ok: false,
            message: error instanceof ApiError ? error.message : fallback,
        });
    }

    const dryRun = async () => {
        setLoading("dryRun");
        setBanner(null);
        setGravou(null);
        try {
            const data = await api.post<ReconcileReport>("/api/admin/reconcile/dry-run");
            setReport(data);
            setBanner({
                ok: true,
                message: `Prévia gerada: ${data.counts.gravaveis} vínculo(s) prontos para gravar.`,
            });
        } catch (error) {
            fail(error, "Erro ao gerar a prévia");
        } finally {
            setLoading(null);
        }
    };

    const apply = async () => {
        setLoading("apply");
        setBanner(null);
        try {
            const data = await api.post<ApplyReport>("/api/admin/reconcile/apply");
            setReport(data);
            setGravou(data.gravou);
            setBanner({
                ok: true,
                message: `Aplicado: ${data.gravou} vínculo(s) gravado(s) com sucesso.`,
            });
        } catch (error) {
            fail(error, "Erro ao aplicar a reconciliação");
        } finally {
            setLoading(null);
        }
    };

    const refreshBackup = async () => {
        setLoading("refresh");
        setBanner(null);
        try {
            const data = await api.post<RefreshResult>("/api/admin/reconcile/refresh-backup");
            setBanner({
                ok: true,
                message: `Backup do vínculo atualizado: ${data.rows} linha(s) salvas.`,
            });
        } catch (error) {
            fail(error, "Erro ao atualizar o backup");
        } finally {
            setLoading(null);
        }
    };

    return { report, gravou, loading, banner, dryRun, apply, refreshBackup };
}
