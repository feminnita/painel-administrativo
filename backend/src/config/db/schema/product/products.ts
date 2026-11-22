import { pgTable, uuid, text, numeric, integer, boolean, jsonb, timestamp, bigint } from 'drizzle-orm/pg-core';
import { categories } from './categories';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  code: text('code').unique(),
  categoryId: uuid('category_id').references(() => categories.id),
  basePrice: numeric('base_price', { precision: 10, scale: 2 }).notNull(),
  pixPrice: numeric('pix_price', { precision: 10, scale: 2 }),
  salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
  stock: integer('stock').default(0),
  active: boolean('active').default(true),
  featured: boolean('featured').default(false),
  isNew: boolean('is_new').default(false),
  isBestseller: boolean('is_bestseller').default(false),
  isOutlet: boolean('is_outlet').default(false),
  images: jsonb('images').$type<string[]>().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  viewCount: integer('view_count').notNull().default(0),
  weightKg: numeric('weight_kg', { precision: 6, scale: 3 }).default('0.3'),
  pkgHeightCm: numeric('pkg_height_cm', { precision: 6, scale: 2 }).default('5'),
  pkgWidthCm: numeric('pkg_width_cm', { precision: 6, scale: 2 }).default('15'),
  pkgLengthCm: numeric('pkg_length_cm', { precision: 6, scale: 2 }).default('20'),
  colors: text('colors').array().default([]),
  sizes: text('sizes').array().default([]),
  sizeChart: jsonb('size_chart').$type<Record<string, unknown>>().default({}),
  blingId: bigint('bling_id', { mode: 'number' }),
  videoUrl: text('video_url'),
  colorImages: jsonb('color_images').$type<Record<string, unknown>>().default({}),
  // Colunas já existentes no BANCO (migração aplicada) mas que faltavam no schema
  // drizzle do backend main → drizzle descartava em silêncio na escrita, e o
  // cadastro perdia Marca/custo/referência/promoção/exibir-na-loja ao salvar.
  costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
  reference: text('reference'),
  brand: text('brand'),
  saleStart: timestamp('sale_start', { withTimezone: true }),
  saleEnd: timestamp('sale_end', { withTimezone: true }),
  visibleInStore: boolean('visible_in_store').default(true),
  // Produto "excluido" pela Chris que tem pedido antigo: nao da para apagar do
  // banco (os itens dos pedidos apontam para ele), entao fica ARQUIVADO — some
  // da lista do painel e da loja, e o historico dos pedidos continua inteiro.
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  // Desconto programado (22/11): um preço especial numa data marcada, por cima do
  // preço do dia a dia (sale_price). Quem põe e tira do ar é o job
  // descontoProgramado.Job; enquanto está no ar, o preço do dia a dia fica
  // guardado em promoProgPrecoNormal. Colunas criadas por _desconto_programado_22nov.mjs.
  promoProgPreco: numeric('promo_prog_preco', { precision: 10, scale: 2 }),
  promoProgInicio: timestamp('promo_prog_inicio', { withTimezone: true }),
  promoProgFim: timestamp('promo_prog_fim', { withTimezone: true }),
  promoProgLancamento: boolean('promo_prog_lancamento').notNull().default(false),
  promoProgAplicada: boolean('promo_prog_aplicada').notNull().default(false),
  promoProgPrecoNormal: numeric('promo_prog_preco_normal', { precision: 10, scale: 2 }),
  // Texto da etiqueta no site ("Black Friday", "Preço de lançamento"...). Coluna: _selo_promocao_22nov.mjs
  promoProgSelo: text('promo_prog_selo'),
  // Etiqueta "Chegou reposição" (22/11): ligada por cor no cadastro, vale até reposicaoAte (7 dias).
  reposicaoAte: timestamp('reposicao_ate', { withTimezone: true }),
  reposicaoCores: text('reposicao_cores').array().notNull().default([]),
});
