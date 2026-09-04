import { FileText, Save, Upload } from "lucide-react";
import { useResaleTermAdmin } from "../useResaleTermAdmin";

function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("pt-BR");
}

export function ResaleTermPage() {
    const {
        term,
        content,
        setContent,
        loading,
        saving,
        dirty,
        saveSameVersion,
        saveNewVersion,
    } = useResaleTermAdmin();

    return (
        <div className="p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
                        <FileText size={26} /> Termo de Revenda
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Cole aqui o texto do termo (enviado pelo advogado). O conteúdo
                        é HTML e é exibido para as revendedoras.
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-[#8C2F39]/10 px-3 py-1 text-sm font-semibold text-[#8C2F39]">
                        Versão vigente: v{term.version}
                    </span>
                    <span className="text-xs text-gray-400">
                        Atualizado em {formatDate(term.updatedAt)}
                    </span>
                </div>
            </div>

            {!term.content?.trim() && (
                <div className="mb-6 max-w-3xl rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <strong>Termo sem conteúdo — o aceite está desativado na loja.</strong>{" "}
                    Enquanto este campo estiver vazio, a loja não pede aceite, não mostra a
                    página do termo e não bloqueia compra. Cole o texto e salve para ativar.
                </div>
            )}

            <div className="max-w-3xl space-y-6">
                <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <label className="mb-1 block text-sm font-semibold text-gray-700">
                        Conteúdo do termo (HTML)
                    </label>
                    <p className="mb-3 text-xs text-gray-400">
                        Pode colar HTML formatado. Deixe em branco se ainda não tiver o
                        texto final.
                    </p>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        disabled={loading}
                        rows={20}
                        spellCheck={false}
                        className="w-full rounded-lg border border-gray-200 p-4 font-mono text-sm leading-relaxed focus:border-[#8C2F39] focus:outline-none disabled:opacity-50"
                        placeholder="<h1>Termo de Revenda</h1><p>...</p>"
                    />
                </section>

                <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-semibold">Como o versionamento funciona</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                        <li>
                            <strong>Salvar nova versão</strong>: incrementa a versão
                            (v{term.version} → v{term.version + 1}). Os aceites antigos
                            continuam válidos — quem já comprou não perde nada, mas os
                            novos checkouts vão pedir o reaceite da versão nova.
                        </li>
                        <li>
                            <strong>Salvar sem mudar versão</strong>: corrige um erro de
                            digitação sem forçar reaceite geral (mantém a v
                            {term.version}).
                        </li>
                    </ul>
                </section>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={saveNewVersion}
                        disabled={saving || loading}
                        className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-6 py-2 text-sm font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                    >
                        <Upload size={15} />
                        {saving ? "Salvando..." : `Salvar nova versão (v${term.version + 1})`}
                    </button>
                    <button
                        onClick={saveSameVersion}
                        disabled={saving || loading}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        <Save size={15} />
                        Salvar sem mudar versão
                    </button>
                    {dirty && !saving && (
                        <span className="text-xs font-medium text-amber-600">
                            Alterações não salvas
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
