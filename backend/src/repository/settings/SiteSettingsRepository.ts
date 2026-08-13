import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { siteSettings } from '../../config/db/schema';

export function findAll() {
    return db.query.siteSettings.findMany();
}

export function findByKey(key: string) {
    return db.query.siteSettings.findFirst({ where: eq(siteSettings.key, key) });
}

export async function upsert(key: string, value: Record<string, unknown>) {
    const [setting] = await db
        .insert(siteSettings)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } })
        .returning();
    return setting;
}
