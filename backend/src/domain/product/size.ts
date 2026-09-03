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
