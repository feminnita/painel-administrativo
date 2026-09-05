/**
 * Converte o texto de um campo numerico (padrao BR) em numero.
 * - Se houver virgula: trata a virgula como decimal e remove pontos de milhar
 *   ("49,90" -> 49.9, "1.234,50" -> 1234.5).
 * - Se NAO houver virgula: usa como esta ("49.90" -> 49.9, "49" -> 49) para nao
 *   quebrar quem digita ponto como decimal.
 * - Vazio/invalido -> null (nunca vira 0 ou um numero errado silenciosamente).
 */
export function parseDecimal(value: string): number | null {
    const v = value.trim();
    if (!v) return null;
    const norm = v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v;
    const n = Number.parseFloat(norm);
    return Number.isFinite(n) ? n : null;
}
