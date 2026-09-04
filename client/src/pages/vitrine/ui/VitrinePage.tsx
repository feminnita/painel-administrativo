import { useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { SECTIONS, useVitrineAdmin, type SectionKey } from "../useVitrineAdmin";

export function VitrinePage() {
    const vm = useVitrineAdmin();
    const [tab, setTab] = useState<SectionKey>("lancamentos");

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Vitrine</h1>
                    <p className="mt-1 text-gray-500">
                        Escolha de qual categoria saem os produtos de cada seção da home.
                    </p>
                </div>

                <button
                    onClick={vm.handleSave}
                    disabled={vm.saving}
                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-3 font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                >
                    {vm.saving ? (
                        <RefreshCw size={18} className="animate-spin" />
                    ) : (
                        <Save size={18} />
                    )}
                    {vm.saving ? "Salvando..." : vm.saved ? "Salvo!" : "Salvar"}
                </button>
            </div>

            <div className="mb-6 flex gap-2 border-b border-gray-200">
                {SECTIONS.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => setTab(s.key)}
                        className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === s.key
                            ? "border-[#8C2F39] text-[#8C2F39]"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                            }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {vm.loading ? (
                <p className="text-gray-500">Carregando...</p>
            ) : (
                <div className="max-w-3xl">
                    {/* Categoria de origem da seção */}
                    <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Categoria de origem —{" "}
                            {SECTIONS.find((s) => s.key === tab)?.label}
                        </label>
                        <p className="mb-2 text-xs text-gray-500">
                            Os produtos desta seção saem desta categoria. Vazio = seção não
                            configurada.
                        </p>
                        <select
                            value={vm.sectionCategories[tab]}
                            onChange={(e) => vm.setSectionCategory(tab, e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#8C2F39] focus:outline-none"
                        >
                            <option value="">— Nenhuma (não configurada) —</option>
                            {vm.categories
                                .filter((c) => c.active)
                                .map((c) => (
                                    <option key={c.id} value={c.slug}>
                                        {c.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}
