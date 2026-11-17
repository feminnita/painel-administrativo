import { randomBytes } from 'crypto';
import * as AuthRepository from '../../repository/auth/AuthRepository';
import * as AuthService from './AuthService';
import { hashPassword } from '../../lib/security/password';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function listUsers() {
    return AuthRepository.listAdmins();
}

// Cria o login SEM senha conhecida por ninguem: grava uma senha aleatoria que
// nao e mostrada nem guardada, e manda para a pessoa o mesmo e-mail do
// "Esqueci minha senha". Ela define a propria senha pelo link (vale 30 minutos;
// se vencer, e so pedir outro na tela de login).
export async function createUser(input: { name: string; email: string }) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (name.length < 2 || name.length > 60) throw new Error('NOME_INVALIDO');
    if (!EMAIL.test(email) || email.length > 120) throw new Error('EMAIL_INVALIDO');
    if (await AuthRepository.findAdminByEmail(email)) throw new Error('EMAIL_JA_CADASTRADO');

    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
    const user = await AuthRepository.insertAdmin({ name, email, passwordHash });

    let emailEnviado = true;
    try {
        await AuthService.requestPasswordReset(email);
    } catch (e) {
        emailEnviado = false;
        console.error('[usuarios] login criado, mas o e-mail da senha nao saiu', email, e);
    }
    return { user, emailEnviado };
}

export async function deleteUser(id: string, quemPede: string | undefined) {
    if (id === quemPede) throw new Error('NAO_PODE_SE_APAGAR');
    const alvo = await AuthRepository.findAdminById(id);
    if (!alvo) throw new Error('NAO_ENCONTRADO');
    await AuthRepository.deleteAdmin(id);
}

export async function renameUser(id: string, nome: string) {
    const name = nome.trim();
    if (name.length < 2 || name.length > 60) throw new Error('NOME_INVALIDO');
    const user = await AuthRepository.updateAdminName(id, name);
    if (!user) throw new Error('NAO_ENCONTRADO');
    return user;
}
