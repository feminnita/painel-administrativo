import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../config/db';
import { adminUsers, adminSessions, adminPasswordResetTokens } from '../../config/db/schema';

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

export function deleteSessionsByAdminId(adminId: string) {
    return db.delete(adminSessions).where(eq(adminSessions.adminId, adminId));
}

export function insertPasswordResetToken(values: { adminId: string; tokenHash: string; expiresAt: Date }) {
    return db.insert(adminPasswordResetTokens).values(values);
}

export function findValidPasswordResetToken(tokenHash: string) {
    return db.query.adminPasswordResetTokens.findFirst({
        where: and(
            eq(adminPasswordResetTokens.tokenHash, tokenHash),
            isNull(adminPasswordResetTokens.usedAt),
            gt(adminPasswordResetTokens.expiresAt, new Date()),
        ),
    });
}

export function markPasswordResetTokenUsed(id: string) {
    return db
        .update(adminPasswordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(adminPasswordResetTokens.id, id));
}

export function updateAdminPassword(adminId: string, passwordHash: string) {
    return db.update(adminUsers).set({ passwordHash }).where(eq(adminUsers.id, adminId));
}
