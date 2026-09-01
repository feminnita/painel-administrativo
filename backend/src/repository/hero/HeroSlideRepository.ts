import { asc, eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { heroSlides } from '../../config/db/schema';
import type { HeroSlideInsert } from './type';


export function findAll() {
    return db.query.heroSlides.findMany({
        orderBy: [asc(heroSlides.orderIndex)]
    });
}

export async function insert(values: HeroSlideInsert) {
    const [slide] = await db.insert(heroSlides).values(values).returning();

    return slide;
}

export async function update(id: string, values: Partial<HeroSlideInsert>) {

    const [slide] = await db.update(heroSlides).set(values).where(eq(heroSlides.id, id)).returning();

    return slide;
}

export async function remove(id: string) {

    const [slide] = await db.delete(heroSlides).where(eq(heroSlides.id, id)).returning();

    return slide;
}

export function reorder(ids: string[]) {
    return db.transaction(async (tx) => {
        for (let i = 0; i < ids.length; i++) {
            await tx.update(heroSlides).set({ orderIndex: i }).where(eq(heroSlides.id, ids[i]));
        }
    });
}