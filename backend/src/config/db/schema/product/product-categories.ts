import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { products } from "./products";
import { categories } from "./categories";

// Ligação M:N produto <-> categoria. Tabela já existe no banco (NÃO rodar migration).
// A categoria definida no painel é DEFINITIVA; o sync do Bling só ADICIONA
// categoria a produto sem NENHUMA ligação e NUNCA remove uma linha daqui.
export const productCategories = pgTable("product_categories", {
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id),
    categoryId: uuid('category_id')
        .notNull()
        .references(() => categories.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
    pk: primaryKey({ columns: [t.productId, t.categoryId] }),
}));
