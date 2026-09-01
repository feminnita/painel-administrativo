import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { BlingStatus, SyncLog, SyncProgress, SyncStepResult } from "./types";

export function useIntegracoesAdmin() {
    const [status, setStatus] = useState<BlingStatus | null>(null);
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [progress, setProgress] = useState<SyncProgress | null>(null);
    const [banner, setBanner] = useState<{ ok: boolean; message: string } | null>(null);
    const cancelRef = useRef(false);

    const loadStatus = useCallback(async () => {
        try {
            setStatus(await api.get("/api/admin/bling/status"));
        } catch {
            setStatus(null);
        }
    }, []);

    const loadLogs = useCallback(async () => {
        try {
            setLogs(await api.get("/api/admin/bling/sync/logs"));
        } catch {
            setLogs([]);
        }
    }, []);

    useEffect(() => {
        loadStatus();
        loadLogs();

        const params = new URLSearchParams(window.location.search);
        if (params.get("bling") === "success") {
            setBanner({ ok: true, message: "Bling conectado com sucesso!" });
        } else if (params.get("bling") === "error") {
            setBanner({
                ok: false,
                message: `Erro ao conectar: ${params.get("msg") || "desconhecido"}`,
            });
        }
    }, [loadStatus, loadLogs]);

    const runSync = async () => {
        if (syncing) return;

        setSyncing(true);
        setBanner(null);
        cancelRef.current = false;

        const totals: SyncProgress = {
            pages: 0,
            synced: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            done: false,
        };

        try {
            let step: SyncStepResult = await api.post("/api/admin/bling/sync/step", {});

            while (true) {
                totals.pages++;
                totals.synced += step.syncedInThisPage;
                totals.created += step.created;
                totals.updated += step.updated;
                totals.skipped += step.skipped;
                totals.errors += step.errors;
                totals.done = step.done;
                setProgress({ ...totals });

                if (step.done || cancelRef.current) break;

                step = await api.post("/api/admin/bling/sync/step", {
                    page: step.nextPage,
                    logId: step.logId,
                });
            }

            setBanner({
                ok: true,
                message: totals.done
                    ? `Sincronização concluída: ${totals.created} criados · ${totals.updated} atualizados · ${totals.skipped} variações agrupadas · ${totals.errors} erros`
                    : "Sincronização pausada — o próximo clique continua de onde parou",
            });
        } catch (error) {
            setBanner({
                ok: false,
                message: error instanceof Error ? error.message : "Erro ao sincronizar",
            });
        }

        setSyncing(false);
        loadLogs();
        loadStatus();
    };

    const stopSync = () => {
        cancelRef.current = true;
    };

    return {
        status,
        logs,
        syncing,
        progress,
        banner,
        runSync,
        stopSync,
        loadLogs,
    };
}
