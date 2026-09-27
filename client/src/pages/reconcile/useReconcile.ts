import { useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import type {
    ApplyReport,
    CodigoApplyReport,
    CodigoReport,
    ReconcileReport,
    RefreshResult,
} from "./types";

type Banner = { ok: boolean; message: string };

export function useReconcile() {
    const [report, setReport] = useState<ReconcileReport | null>(null);
    const [gravou, setGravou] = useState<number | null>(null);
    const [codigoReport, setCodigoReport] = useState<CodigoReport | null>(null);
    const [gravouCodigo, setGravouCodigo] = useState<number | null>(null);
    const [loading, setLoading] = useState<
        null | "dryRun" | "apply" | "refresh" | "dryRunCodigo" | "applyCodigo"
    >(null);
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

    // A prévia pelo código conversa com o Bling e leva alguns segundos por
    // produto — por isso ela é um botão separado, e não parte do dry-run acima.
    const dryRunCodigo = async () => {
        setLoading("dryRunCodigo");
        setBanner(null);
        setGravouCodigo(null);
        try {
            const data = await api.post<CodigoReport>("/api/admin/reconcile/codigo/dry-run");
            setCodigoReport(data);
            setBanner({
                ok: true,
                message: `Prévia pelo código: ${data.counts.gravaveis} variação(ões) prontas para religar.`,
            });
        } catch (error) {
            fail(error, "Erro ao gerar a prévia pelo código");
        } finally {
            setLoading(null);
        }
    };

    const applyCodigo = async () => {
        setLoading("applyCodigo");
        setBanner(null);
        try {
            const data = await api.post<CodigoApplyReport>("/api/admin/reconcile/codigo/apply");
            setCodigoReport(data);
            setGravouCodigo(data.gravou);
            setBanner({
                ok: true,
                message: `Religado pelo código: ${data.gravou} vínculo(s) gravado(s).`,
            });
        } catch (error) {
            fail(error, "Erro ao religar pelo código");
        } finally {
            setLoading(null);
        }
    };

    return {
        report,
        gravou,
        codigoReport,
        gravouCodigo,
        loading,
        banner,
        dryRun,
        apply,
        refreshBackup,
        dryRunCodigo,
        applyCodigo,
    };
}
