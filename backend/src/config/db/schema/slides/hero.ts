import { pgTable, pgEnum, uuid, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const heroSlidesTypeEnum = pgEnum('hero_slides_type', ['image', 'video']);

export const heroSlides = pgTable('hero_slides', {
    id: uuid('id').defaultRandom().primaryKey(),
    type: heroSlidesTypeEnum('type').notNull(),
    src: text('src').notNull(),
    alt: text('alt').notNull(),
    poster: text('poster'),
    ctaText: text('cta_text'),
    ctaHref: text('cta_href'),
    orderIndex: integer('order_index').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});