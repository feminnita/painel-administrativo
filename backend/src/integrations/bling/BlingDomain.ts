import type { BlingProductDetail, BlingProductListItem, BlingStockDeposit, ParsedSku } from "./types";

const PIX_DISCOUNT_RATE = 0.05;

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a\z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 200);
}

