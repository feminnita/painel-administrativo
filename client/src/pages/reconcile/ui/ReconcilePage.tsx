import {
    AlertTriangle,
    CheckCircle,
    DatabaseBackup,
    Eye,
    Link2,
    RefreshCw,
    XCircle,
} from "lucide-react";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import { useReconcile } from "../useReconcile";
import type { ReconcileItem } from "../types";

type Tone = "green" | "amber" | "red" | "gray";

const TONES: Record<Tone, { card: string; count: string }> = {
    green: { card: "border-green-100 bg-green-50", count: "text-green-700" },
    amber: { card: "border-amber-100 bg-amber-50", count: "text-amber-700" },
    red: { card: "border-red-100 bg-red-50", count: "text-red-700" },
    gray: { card: "border-gray-100 bg-gray-50", count: "text-gray-700" },
};

function CountCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
    const t = TONES[tone];
    return (
        <div className={`rounded-xl border p-4 ${t.card}`}>
            <div className={`text-2xl font-bold ${t.count}`}>{value}</div>
            <div className="mt-1 text-xs font-medium text-gray-600">{label}</div>
        </div>
    );
}

function ItemList({
    title,
    items,
    tone,
    description,
}: {
    title: string;
    items: ReconcileItem[];
    tone: Tone;
    description: string;
}) {
    if (items.length === 0) return null;
    const t = TONES[tone];
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-50 px-6 py-4">
                <h3 className={`font-semibold ${t.count}`}>
                    {title} · {items.length}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">{description}</p>
            </div>
            <div className="max-h-72 divide-y divide-gray-50 overflow-y-auto">
                {items.map((it, i) => (
                    <div
                        key={`${it.produto_codigo}-${it.tamanho}-${it.cor}-${i}`}
                        className="flex items-center justify-between px-6 py-2.5 text-sm"
                    >
                        <span className="text-gray-700">
                            <span className="font-medium">{it.produto_codigo || "—"}</span>
                            {" | "}
                            {it.cor || "—"}
                            {" | "}
                            {it.tamanho || "—"}
                        </span>
                        {it.bling_id && (
                            <span className="ml-3 shrink-0 font-mono text-xs text-gray-400">
                                bling {it.bling_id}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ReconcilePage() {
    const confirm = useConfirm();
    const { report, gravou, loading, banner, dryRun, apply, refreshBackup } = useReconcile();

    const busy = loading !== null;

    const onApply = async () => {
        const ok = await confirm({
            title: "Aplicar reconciliação?",
            message:
                "Isto grava os vínculos Bling PRONTOS nos SKUs sem vínculo. É ADITIVO: nunca sobrescreve um vínculo existente, nunca cria nem apaga variação. Deseja continuar?",
            confirmLabel: "Aplicar",
        });
        if (ok) apply();
    };

    const onRefresh = async () => {
        const ok = await confirm({
            title: "Atualizar backup do vínculo?",
            message:
                "Isto SOBRESCREVE o snapshot atual (site_settings.bling_id_backup) com o vínculo Bling de agora. Faça isto ANTES de recadastrar as variações, para tirar um baseline novo. Deseja continuar?",
            confirmLabel: "Atualizar backup",
            danger: true,
        });
        if (ok) refreshBackup();
    };

    return (
        <div className="max-w-4xl p-8">
            <div className="mb-2 flex items-center gap-3">
                <Link2 className="text-[#8C2F39]" size={26} />
                <h1 className="text-3xl font-bold text-gray-900">Reconciliar vínculo Bling</h1>
            </div>
            <p className="mb-8 max-w-2xl text-gray-500">
                Depois de recadastrar as variações, use esta tela para reconectar os SKUs do site
                ao Bling sozinha. A reconciliação compara os SKUs sem vínculo com o snapshot salvo
                e regrava o <span className="font-medium">bling_id</span> quando o casamento é
                seguro. É <span className="font-medium">aditivo</span>: nunca sobrescreve um vínculo
                que já existe.
            </p>

            {banner && (
                <div
                    className={`mb-6 flex items-start gap-3 rounded-xl p-4 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
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

            <div className="mb-8 flex flex-wrap gap-3">
                <button
                    onClick={dryRun}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                    {loading === "dryRun" ? (
                        <RefreshCw size={15} className="animate-spin" />
                    ) : (
                        <Eye size={15} />
                    )}
                    Ver prévia (dry-run)
                </button>

                <button
                    onClick={onApply}
                    disabled={busy || !report || report.counts.gravaveis === 0}
                    className="flex items-center gap-2 rounded-xl bg-[#8C2F39] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7a2832] disabled:opacity-50"
                    title={
                        !report
                            ? "Gere a prévia primeiro"
                            : report.counts.gravaveis === 0
                                ? "Nenhum vínculo pronto para gravar"
                                : undefined
                    }
                >
                    {loading === "apply" ? (
                        <RefreshCw size={15} className="animate-spin" />
                    ) : (
                        <Link2 size={15} />
                    )}
                    Aplicar
                    {report && report.counts.gravaveis > 0 ? ` (${report.counts.gravaveis})` : ""}
                </button>

                <button
                    onClick={onRefresh}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    {loading === "refresh" ? (
                        <RefreshCw size={15} className="animate-spin" />
                    ) : (
                        <DatabaseBackup size={15} />
                    )}
                    Atualizar backup do vínculo
                </button>
            </div>

            {report && (
                <div className="space-y-6">
                    {gravou !== null && (
                        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800">
                            <CheckCircle size={16} />
                            {gravou} vínculo(s) gravado(s) nesta aplicação.
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                        <CountCard label="Graváveis" value={report.counts.gravaveis} tone="green" />
                        <CountCard label="Ambíguos" value={report.counts.ambiguos} tone="amber" />
                        <CountCard label="Colisão" value={report.counts.colisao} tone="red" />
                        <CountCard label="Já ocupado" value={report.counts.jaOcupado} tone="gray" />
                        <CountCard label="Não casaram" value={report.counts.naoCasaram} tone="gray" />
                    </div>

                    <p className="flex items-center gap-2 text-xs text-gray-400">
                        <AlertTriangle size={13} />
                        Snapshot base: {report.backupRows} linha(s)
                        {report.backupTakenAt
                            ? ` · tirado em ${new Date(report.backupTakenAt).toLocaleString("pt-BR")}`
                            : ""}
                    </p>

                    <ItemList
                        title="Graváveis"
                        items={report.gravaveis}
                        tone="green"
                        description="1 SKU ↔ 1 bling_id único e livre. Estes serão gravados ao clicar em Aplicar."
                    />
                    <ItemList
                        title="Ambíguos"
                        items={report.ambiguos}
                        tone="amber"
                        description="A chave casou com mais de um bling_id no snapshot — não dá para decidir com segurança."
                    />
                    <ItemList
                        title="Colisão"
                        items={report.colisao}
                        tone="red"
                        description="O mesmo bling_id seria candidato de mais de um SKU — todos foram descartados."
                    />
                    <ItemList
                        title="Já ocupado"
                        items={report.jaOcupado}
                        tone="gray"
                        description="O bling_id do snapshot já está em uso por outro SKU — não reutilizado."
                    />
                    <ItemList
                        title="Não casaram"
                        items={report.naoCasaram}
                        tone="gray"
                        description="A chave (produto | cor | tamanho) não existe no snapshot."
                    />
                </div>
            )}
        </div>
    );
}
