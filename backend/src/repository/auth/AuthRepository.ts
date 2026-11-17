import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { adminUsers, adminSessions, adminPasswordResetTokens } from '../../config/db/schema';

export function findAdminByEmail(email: string) {
    // Sem diferenciar maiusculas: quem digita "Debora@..." entra no login cadastrado como "debora@...".
    return db.query.adminUsers.findFirst({ where: eq(sql`lower(${adminUsers.email})`, String(email ?? '').trim().toLowerCase()) });
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

// Empurra o vencimento da sessão de quem está trabalhando. Sem isso a sessão
// morria 24h depois do LOGIN, mesmo com a pessoa usando o painel no momento —
// a Chris levou 401 no meio de um cadastro, com o formulário preenchido.
export function renewSession(tokenHash: string, expiresAt: Date) {
    return db.update(adminSessions).set({ expiresAt }).where(eq(adminSessions.tokenHash, tokenHash));
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

// ---- Usuarios do painel (tela Usuarios). Nunca devolve o hash da senha.
export function listAdmins() {
    return db
        .select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, role: adminUsers.role, createdAt: adminUsers.createdAt })
        .from(adminUsers)
        .orderBy(adminUsers.createdAt);
}

export async function insertAdmin(values: { name: string; email: string; passwordHash: string; role?: string }) {
    const [novo] = await db
        .insert(adminUsers)
        .values({ name: values.name, email: values.email, passwordHash: values.passwordHash, role: values.role ?? 'admin' })
        .returning({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, role: adminUsers.role, createdAt: adminUsers.createdAt });
    return novo;
}

// Apaga o usuario com tudo que aponta para ele (sessoes e links de senha).
export async function deleteAdmin(id: string) {
    await db.transaction(async (tx) => {
        await tx.delete(adminSessions).where(eq(adminSessions.adminId, id));
        await tx.delete(adminPasswordResetTokens).where(eq(adminPasswordResetTokens.adminId, id));
        await tx.delete(adminUsers).where(eq(adminUsers.id, id));
    });
}

export async function updateAdmin(id: string, valores: { name?: string; role?: string }) {
    const [u] = await db
        .update(adminUsers)
        .set(valores)
        .where(eq(adminUsers.id, id))
        .returning({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, role: adminUsers.role, createdAt: adminUsers.createdAt });
    return u;
}
