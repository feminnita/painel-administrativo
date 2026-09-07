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

    // Devolve os registros além de guardá-los: quem acompanha o progresso precisa
    // olhar o mais recente na hora, sem esperar o React redesenhar a tela.
    const loadLogs = useCallback(async () => {
        try {
            const rows = await api.get<SyncLog[]>("/api/admin/bling/sync/logs");
            setLogs(rows);
            return rows;
        } catch {
            setLogs([]);
            return [] as SyncLog[];
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

    // A sincronizacao agora roda NO SERVIDOR. Aqui so damos a partida e ficamos
    // lendo o historico para mostrar o progresso.
    //
    // Antes o laco que percorre as paginas vivia aqui no navegador: era preciso
    // deixar a aba aberta e parada, e bastava uma chamada falhar para tudo parar
    // no meio — aconteceu tres vezes seguidas, uma delas parando na 2a pagina.
    const runSync = async () => {
        if (syncing) return;

        setSyncing(true);
        setBanner(null);
        cancelRef.current = false;

        try {
            await api.post("/api/admin/bling/sync/start", {});
            setBanner({
                ok: true,
                message:
                    "Sincronizacao iniciada no servidor. Pode fechar esta pagina — ela continua sozinha. O historico abaixo atualiza a cada 10 segundos.",
            });

            // Acompanha ate o registro sair de "rodando".
            for (let i = 0; i < 360 && !cancelRef.current; i++) {
                await new Promise((r) => setTimeout(r, 10000));
                const logs = await loadLogs();
                const atual = logs?.[0];
                if (atual && atual.status !== "running") {
                    setBanner({
                        ok: atual.status === "done",
                        message:
                            atual.status === "done"
                                ? `Sincronizacao concluida: ${atual.productsCreated} criados · ${atual.productsUpdated} atualizados · ${atual.errors} erros`
                                : "Sincronizacao interrompida — clique de novo para continuar de onde parou",
                    });
                    break;
                }
            }
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
