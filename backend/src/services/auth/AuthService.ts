import * as AuthRepository from '../../repository/auth/AuthRepository';
import { hashPassword, verifyPassword } from '../../lib/security/password';
import { generateSessionToken, hashSessionToken } from '../../lib/security/sessionToken';
import { SESSION_TTL_MS } from '../../config/auth';

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
