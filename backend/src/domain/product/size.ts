/**
 * Normaliza o `size` de um SKU antes da gravacao em `products_skus`.
 * Previne lixo de digitacao virar filtro na vitrine (ex.: " g ", "GG,", "m").
 * Tamanhos de letra ficam em maiusculo; numericos ficam iguais ("10" -> "10").
 */
export function normalizeSize(raw: string | null | undefined): string {
    return String(raw ?? '')
        .trim()                 // corta espacos nas pontas
        .replace(/[.,]+$/, '')  // remove virgula/ponto no fim
        .trim()
        .toUpperCase();         // tamanhos de letra em maiusculo; numericos ficam iguais ("10"->"10")
}

/**
 * Ordem canonica de tamanhos de vestuario: PP, P, M, G, GG, XG, XGG e depois
 * numericos crescentes. Nunca alfabetica. Usada para ordenar variacoes.
 */
const LETTER_SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'XXG', 'XXGG'];

export function sizeRank(raw: string | null | undefined): number {
    const s = normalizeSize(raw);
    const letterIdx = LETTER_SIZE_ORDER.indexOf(s);
    if (letterIdx !== -1) return letterIdx;                 // 0..N letras primeiro
    const num = Number.parseInt(s, 10);
    if (Number.isFinite(num)) return 1000 + num;            // numericos depois, crescente
    return 5000;                                            // desconhecidos por ultimo
}

export function compareSizes(a: string | null | undefined, b: string | null | undefined): number {
    return sizeRank(a) - sizeRank(b);
}
