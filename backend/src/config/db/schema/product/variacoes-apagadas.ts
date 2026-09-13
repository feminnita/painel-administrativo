import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { products } from './products';

/**
 * O que a Chris mandou apagar, e NAO pode voltar.
 *
 * Ate aqui a memoria do que foi apagado vivia so na tela (apagadasNaEdicao),
 * enquanto o produto estava aberto. Fechava e reabria, zerava — e "Gerar
 * variacoes" recriava tudo em branco. No 24520 foram 23 linhas sem referencia
 * e sem bling_id, criadas em duas levas no mesmo dia. Ela apagava de novo, e
 * voltava de novo.
 *
 * Memoria maior na tela nao resolve: a grade e IMPLICITA (toda cor marcada x
 * todo tamanho marcado), entao qualquer coisa que reconstrua a grade recria o
 * que foi apagado. O unico jeito de "apagou, ficou apagado" e o banco lembrar.
 *
 * Cor e tamanho ficam NORMALIZADOS (sem acento, sem espaco, minusculo): "Preto
 * Poá" e "pretopoa" sao a mesma cor para quem olha a loja, e apagar uma escrita
 * nao pode deixar a outra passar.
 *
 * A marca SAI daqui quando a Chris adicionar a variacao de proposito —
 * bloquear para sempre seria pior que o problema original.
 */
export const variacoesApagadas = pgTable(
    'product_deleted_variations',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        productId: uuid('product_id')
            .notNull()
            .references(() => products.id, { onDelete: 'cascade' }),
        colorKey: text('color_key').notNull(),
        sizeKey: text('size_key').notNull(),
        // Como estava escrito, so para a tela poder explicar.
        colorName: text('color_name'),
        sizeName: text('size_name'),
        deletedAt: timestamp('deleted_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => ({
        unica: uniqueIndex('deleted_variations_unica')
            .on(t.productId, t.colorKey, t.sizeKey),
    }),
);

/** "Preto Poá" e "pretopoa" viram a mesma chave. */
export function chaveVariacao(valor: string | null | undefined): string {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}
