import { and, eq, gt } from 'drizzle-orm';
import { db } from '../../config/db';
import { adminUsers, adminSessions } from '../../config/db/schema';

export function findAdminByEmail(email: string) {
    return db.query.adminUsers.findFirst({ where: eq(adminUsers.email, email) });
}

export function findAdminById(id: string) {
    return db.query.adminUsers.findFirst({
        where: eq(adminUsers.id, id),
        columns: { id: true, name: true, email: true, role: true },
    });
}

export function insertSession(values: { tokenHash: string; adminId: string; userAgent: string; expiresAt: Date }) {
    return db.insert(adminSessions).values(values);
}

export function findActiveSessionByTokenHash(tokenHash: string) {
    return db.query.adminSessions.findFirst({
        where: and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, new Date())),
    });
}

export function deleteSessionByTokenHash(tokenHash: string) {
    return db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
}
