import * as AuthRepository from '../../repository/auth/AuthRepository';
import { hashPassword, verifyPassword } from '../../lib/security/password';
import { generateSessionToken, hashSessionToken } from '../../lib/security/sessionToken';
import { SESSION_TTL_MS } from '../../config/auth';
import { env } from '../../config/env';
import { sendAdminPasswordReset } from '../../integrations/resend/service/EmailServices';

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30; // 30 minutos

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash() {
    if (!dummyHashPromise) dummyHashPromise = hashPassword('senha-que-nunca-vai-bater');
    return dummyHashPromise;
}

export async function loginAdmin(input: { email: string; password: string; userAgent?: string }) {
    const admin = await AuthRepository.findAdminByEmail(input.email);
    const hashToCheck = admin ? admin.passwordHash : await getDummyHash();
    const isValid = await verifyPassword(hashToCheck, input.password);

    if (!admin || !isValid) throw new Error('INVALID_CREDENTIALS');

    const token = generateSessionToken();
    await AuthRepository.insertSession({
        tokenHash: hashSessionToken(token),
        adminId: admin.id,
        userAgent: input.userAgent || 'unknown',
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });

    return { admin, token };
}

export async function logoutAdmin(token: string) {
    await AuthRepository.deleteSessionByTokenHash(hashSessionToken(token));
}

// TRAVA 1: só admin cadastrado recebe. Se o e-mail não for admin, não faz nada.
// O controller SEMPRE responde a mesma mensagem genérica (TRAVA 2), então aqui
// não há nada que revele existência. Se o envio falhar, propaga o erro pra logar
// alto — mas o controller ainda responde genérico ao usuário.
export async function requestPasswordReset(email: string) {
    const admin = await AuthRepository.findAdminByEmail(email);
    if (!admin) return; // e-mail não é admin: não envia nada, resposta genérica mesmo assim

    const token = generateSessionToken();
    await AuthRepository.insertPasswordResetToken({
        adminId: admin.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    });

    const resetUrl = `${env.panelUrl}/redefinir-senha?token=${token}`;
    await sendAdminPasswordReset({ to: admin.email, resetUrl });
}

export async function resetPassword(token: string, newPassword: string) {
    const record = await AuthRepository.findValidPasswordResetToken(hashSessionToken(token));
    if (!record) throw new Error('INVALID_TOKEN');

    const passwordHash = await hashPassword(newPassword);
    await AuthRepository.updateAdminPassword(record.adminId, passwordHash);
    await AuthRepository.markPasswordResetTokenUsed(record.id); // single-use
    await AuthRepository.deleteSessionsByAdminId(record.adminId); // invalida sessões
}
