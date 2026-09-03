import { pgTable, pgEnum, uuid, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const heroSlidesTypeEnum = pgEnum('hero_slides_type', ['image', 'video']);

export const heroSlides = pgTable('hero_slides', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: heroSlidesTypeEnum('type').notNull(),
    src: text('src').notNull(),
    srcMobile: text('src_mobile'),
    alt: text('alt').notNull(),
    poster: text('poster'),
    ctaText: text('cta_text'),
    ctaHref: text('cta_href'),
    title: text('title'),
    subtitle: text('subtitle'),
    textPosition: text('text_position').default('center-center'),
    focal: text('focal').default('center'),
    orderIndex: integer('order_index').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});