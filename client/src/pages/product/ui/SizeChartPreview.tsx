import { useEffect, useState } from "react";
import { Ruler } from "lucide-react";
import { api } from "@/lib/api/client";

// ── Formato da tabela guardada em settings.size_charts ──
type SettingsChartRow = { label: string; equiv?: string | null; values: string[] };
type SettingsChart = {
    name: string;
    columns: string[];
    footer?: string | null;
    rows: SettingsChartRow[];
};
type ChartType = "pet" | "infantil" | "plus" | "masculino" | "feminino";
type SizeChartsSettings = Partial<Record<ChartType, SettingsChart>>;

// Mapa slug→tipo. A ordem de PRIORITY decide o desempate (pet ganha de tudo,
// feminino é o padrão).
const TYPE_SLUGS: Record<Exclude<ChartType, "feminino">, string[]> = {
    pet: ["pet"],
    infantil: [
        "infantil",
        "feminino-menina",
        "menino",
        "feminino-menina-pijama-manga-curta",
        "feminino-menina-pijama-manga-longa",
        "menina-baby-doll",
    ],
    plus: ["plus-size", "baby-doll-plus-size"],
    masculino: [
        "masculino",
        "pijama-masculino-curto",
        "pijama-masculino-longo",
        "samba-cancao",
    ],
};
const PRIORITY: ChartType[] = ["pet", "infantil", "plus", "masculino", "feminino"];

/** Percorre a prioridade e devolve o 1º tipo cujos slugs batem; senão feminino. */
function resolveChartType(categorySlugs: string[]): ChartType {
    const set = new Set(categorySlugs);
    for (const type of PRIORITY) {
        if (type === "feminino") continue;
        if (TYPE_SLUGS[type].some((slug) => set.has(slug))) return type;
    }
    return "feminino";
}

/** Carrega settings e extrai a chave size_charts (só leitura, não grava nada). */
function useSizeCharts(): SizeChartsSettings | null {
    const [charts, setCharts] = useState<SizeChartsSettings | null>(null);
    useEffect(() => {
        let active = true;
        api
            .get<{ key: string; value: unknown }[]>("/api/admin/settings")
            .then((rows) => {
                if (!active) return;
                const found = rows.find((r) => r.key === "size_charts");
                setCharts((found?.value as SizeChartsSettings) ?? {});
            })
            .catch((err) => {
                console.error("Erro ao carregar tabelas de medidas:", err);
                if (active) setCharts({});
            });
        return () => {
            active = false;
        };
    }, []);
    return charts;
}

function hasOwnChart(
    ownChart: Record<string, Record<string, string>> | undefined,
): boolean {
    return Object.values(ownChart || {}).some((measures) =>
        Object.values(measures || {}).some((v) => (v || "").trim() !== ""),
    );
}

function Frame({ children }: { children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-1 flex items-center gap-2 font-semibold text-gray-700">
                <Ruler size={16} /> Tabela de medidas
            </h3>
            <p className="mb-4 text-xs text-gray-400">
                Só leitura — confira se a categoria trouxe a tabela certa.
            </p>
            {children}
        </section>
    );
}

/**
 * Bloco read-only que mostra a tabela de medidas HERDADA pela categoria
 * (ou a específica do produto, quando ele tem size_chart próprio preenchido).
 */
export function SizeChartPreview({
    categorySlugs,
    sizes,
    ownChart,
}: {
    categorySlugs: string[];
    sizes: string[];
    ownChart: Record<string, Record<string, string>> | undefined;
}) {
    const charts = useSizeCharts();

    // Exceção: produto com tabela própria preenchida.
    if (hasOwnChart(ownChart)) {
        const chartSizes =
            sizes.length > 0 ? sizes : Object.keys(ownChart || {});
        const measureKeys = Array.from(
            new Set(
                chartSizes.flatMap((s) => Object.keys(ownChart?.[s] || {})),
            ),
        );
        return (
            <Frame>
                <p className="mb-2 text-sm font-semibold text-[#8C2F39]">
                    Tabela específica deste produto
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="border border-gray-200 px-3 py-2 text-left text-gray-500">
                                    Medida
                                </th>
                                {chartSizes.map((s) => (
                                    <th
                                        key={s}
                                        className="border border-gray-200 px-3 py-2 text-center font-semibold text-gray-700"
                                    >
                                        {s}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {measureKeys.map((key) => (
                                <tr key={key}>
                                    <td className="border border-gray-200 px-3 py-2 font-medium capitalize text-gray-500">
                                        {key}
                                    </td>
                                    {chartSizes.map((s) => (
                                        <td
                                            key={s}
                                            className="border border-gray-200 px-3 py-2 text-center text-gray-700"
                                        >
                                            {ownChart?.[s]?.[key] || "—"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Frame>
        );
    }

    // Sem categoria marcada → orienta a cliente.
    if (categorySlugs.length === 0) {
        return (
            <Frame>
                <p className="text-sm text-gray-400">
                    Selecione uma categoria para ver a tabela.
                </p>
            </Frame>
        );
    }

    if (charts === null) {
        return (
            <Frame>
                <p className="text-sm text-gray-400">Carregando tabela…</p>
            </Frame>
        );
    }

    const type = resolveChartType(categorySlugs);
    const chart = charts[type];

    if (!chart || !Array.isArray(chart.rows) || chart.rows.length === 0) {
        return (
            <Frame>
                <p className="text-sm text-gray-400">
                    Nenhuma tabela de medidas cadastrada para esta categoria.
                </p>
            </Frame>
        );
    }

    // Filtra as linhas aos tamanhos do produto (bate label ou equiv). Se nada
    // bater ou o produto não tem tamanhos, mostra todas.
    const wanted = new Set(sizes.map((s) => s.toLowerCase().trim()));
    const filtered =
        wanted.size > 0
            ? chart.rows.filter(
                  (r) =>
                      wanted.has((r.label || "").toLowerCase().trim()) ||
                      wanted.has((r.equiv || "").toLowerCase().trim()),
              )
            : chart.rows;
    const rows = filtered.length > 0 ? filtered : chart.rows;

    const columns = Array.isArray(chart.columns) ? chart.columns : [];

    return (
        <Frame>
            <p className="mb-2 text-sm font-semibold text-gray-700">
                Tabela de medidas herdada — {chart.name}
            </p>
            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr className="bg-gray-50">
                            {columns.map((col, i) => (
                                <th
                                    key={i}
                                    className={`border border-gray-200 px-3 py-2 font-semibold text-gray-700 ${
                                        i === 0 ? "text-left" : "text-center"
                                    }`}
                                >
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri}>
                                <td className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-700">
                                    {row.label}
                                    {row.equiv && (
                                        <span className="ml-1 text-[11px] font-normal text-gray-400">
                                            ({row.equiv})
                                        </span>
                                    )}
                                </td>
                                {(row.values || []).map((v, vi) => (
                                    <td
                                        key={vi}
                                        className="border border-gray-200 px-3 py-2 text-center text-gray-700"
                                    >
                                        {v || "—"}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {chart.footer && (
                <p className="mt-2 text-[11px] text-gray-400">{chart.footer}</p>
            )}
        </Frame>
    );
}
