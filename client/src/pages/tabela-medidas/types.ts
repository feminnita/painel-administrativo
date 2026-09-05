// Espelha o setting `size_charts` (site_settings). Objeto por TIPO; cada tipo é
// uma tabela { name, columns, footer, rows } + o campo opcional de imagem
// "como medir" (howToMeasureImage). Aqui no painel só editamos a IMAGEM — os
// números (name/columns/footer/rows) são preservados intactos no save.

export type SizeChartType = "feminino" | "plus" | "masculino" | "infantil" | "pet";

export type SizeChartRow = {
    label?: string;
    equiv?: string | null;
    values?: (string | number)[];
};

export type SizeChart = {
    name?: string;
    columns?: string[];
    footer?: string;
    rows?: SizeChartRow[];
    howToMeasureImage?: string;
};

export type SizeChartsSetting = Partial<Record<SizeChartType, SizeChart>>;

// Ordem e rótulos amigáveis exibidos na tela.
export const CHART_ORDER: { type: SizeChartType; label: string }[] = [
    { type: "feminino", label: "Feminino" },
    { type: "plus", label: "Plus Size" },
    { type: "masculino", label: "Masculino" },
    { type: "infantil", label: "Infantil" },
    { type: "pet", label: "Pet" },
];
