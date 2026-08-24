import {
    AlertCircle,
    CheckCircle,
    ExternalLink,
    RefreshCw,
    Square,
    XCircle,
    Zap,
} from "lucide-react";
import { useIntegracoesAdmin } from "../useIntegracoesAdmin";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3334";

export function IntegracoesPage() {
    const { status, logs, syncing, progress, banner, runSync, stopSync, loadLogs } =
        useIntegracoesAdmin();

    const isConnected = Boolean(status?.connected);

    return (
        <div className="max-w-3xl p-8">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Integrações</h1>
            <p className="mb-8 text-gray-500">
                Conecte o Bling para sincronizar produtos automaticamente
            </p>

            {/* Bling Card */}
            <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-50 p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                            B
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Bling ERP</h2>
                            <p className="text-sm text-gray-500">
                                Sincroniza produtos, preços, estoque e variações
                            </p>
                        </div>
                    </div>
                    <div
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${isConnected
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                            }`}
                    >
                        {isConnected ? (
                            <>
                                <CheckCircle size={13} /> Conectado
                            </>
                        ) : (
                            <>
                                <AlertCircle size={13} /> Não conectado
                            </>
                        )}
                    </div>
                </div>

                <div className="space-y-4 p-6">
                    {banner && (
                        <div
                            className={`flex items-start gap-3 rounded-xl p-4 text-sm ${banner.ok
                                ? "bg-green-50 text-green-800"
                                : "bg-red-50 text-red-800"
                                }`}
                        >
                            {banner.ok ? (
                                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                            ) : (
                                <XCircle size={16} className="mt-0.5 shrink-0" />
                            )}
                            <p>{banner.message}</p>
                        </div>
                    )}

                    {syncing && progress && (
                        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                            <div className="mb-1 flex items-center gap-2 font-medium">
                                <RefreshCw size={14} className="animate-spin" />
                                Página {progress.pages} · {progress.synced} itens processados
                            </div>
                            <p className="text-xs">
                                {progress.created} criados · {progress.updated} atualizados ·{" "}
                                {progress.skipped} variações agrupadas
                                {progress.errors > 0 && (
                                    <span className="text-red-600">
                                        {" "}
                                        · {progress.errors} erros
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <a
                            href={`${API_URL}/api/admin/bling/oauth/start`}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <ExternalLink size={15} />
                            {isConnected ? "Reconectar Bling" : "Conectar Bling"}
                        </a>
                        {isConnected && !syncing && (
                            <button
                                onClick={runSync}
                                className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700"
                            >
                                <RefreshCw size={15} />
                                Sincronizar produtos
                            </button>
                        )}
                        {syncing && (
                            <button
                                onClick={stopSync}
                                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                            >
                                <Square size={13} />
                                Parar após esta página
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Sync History */}
            {logs.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
                        <h3 className="font-semibold text-gray-700">
                            Histórico de sincronizações
                        </h3>
                        <button
                            onClick={loadLogs}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="flex items-center justify-between px-6 py-4 text-sm"
                            >
                                <div>
                                    <div className="mb-0.5 flex items-center gap-2">
                                        {log.status === "done" && (
                                            <CheckCircle size={13} className="text-green-500" />
                                        )}
                                        {log.status === "error" && (
                                            <XCircle size={13} className="text-red-500" />
                                        )}
                                        {log.status === "running" && (
                                            <RefreshCw
                                                size={13}
                                                className="animate-spin text-blue-500"
                                            />
                                        )}
                                        <span className="font-medium text-gray-700">
                                            {log.productsCreated} criados · {log.productsUpdated}{" "}
                                            atualizados
                                            {log.errors > 0 && (
                                                <span className="text-red-500">
                                                    {" "}
                                                    · {log.errors} erros
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {new Date(log.startedAt).toLocaleString("pt-BR")}
                                        {log.finishedAt &&
                                            ` — ${Math.round((new Date(log.finishedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s`}
                                    </p>
                                </div>
                                <span
                                    className={`rounded-full px-2 py-1 text-xs font-medium ${log.status === "done"
                                        ? "bg-green-100 text-green-700"
                                        : log.status === "error"
                                            ? "bg-red-100 text-red-700"
                                            : "bg-blue-100 text-blue-700"
                                        }`}
                                >
                                    {log.status === "done"
                                        ? "Concluído"
                                        : log.status === "error"
                                            ? "Erro"
                                            : "Rodando / pausado"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Asaas */}
            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8C2F39]">
                        <Zap size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Asaas</h2>
                        <p className="text-sm text-gray-500">
                            Gateway de pagamento (PIX, Boleto, Cartão)
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
                        <CheckCircle size={13} /> Configurado
                    </div>
                </div>
            </div>
        </div>
    );
}
