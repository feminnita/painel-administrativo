import { randomBytes } from 'crypto';
import * as AuthRepository from '../../repository/auth/AuthRepository';
import * as AuthService from './AuthService';
import { hashPassword } from '../../lib/security/password';
import { ehAdmin, lerPapel, montarRole, type Papel } from '../atendimento/Permissoes';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Linha = { id: string; name: string; email: string; role: string | null; createdAt: Date | null };
const comPapel = (u: Linha) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, ...lerPapel(u.role) });
const papelDe = (v: unknown): Papel => (v === 'atendente' ? 'atendente' : 'admin');

export async function listUsers() {
    return (await AuthRepository.listAdmins()).map(comPapel);
}

// Cria o login SEM senha conhecida por ninguem: grava uma senha aleatoria que
// nao e mostrada nem guardada, e manda para a pessoa o mesmo e-mail do
// "Esqueci minha senha". Ela define a propria senha pelo link (vale 30 minutos;
// se vencer, e so pedir outro na tela de login).
export async function createUser(input: { name: string; email: string; papel?: unknown; assuntos?: unknown }) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (name.length < 2 || name.length > 60) throw new Error('NOME_INVALIDO');
    if (!EMAIL.test(email) || email.length > 120) throw new Error('EMAIL_INVALIDO');
    if (await AuthRepository.findAdminByEmail(email)) throw new Error('EMAIL_JA_CADASTRADO');

    const passwordHash = await hashPassword(randomBytes(32).toString('hex'));
    const role = montarRole(papelDe(input.papel), input.assuntos);
    const user = comPapel(await AuthRepository.insertAdmin({ name, email, passwordHash, role }));

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

// Troca nome e/ou papel e assuntos. A administradora nao pode tirar o proprio
// acesso total: ficaria sem ninguem para devolver.
export async function updateUser(id: string, input: { name?: unknown; papel?: unknown; assuntos?: unknown }, quemPede: string | undefined) {
    const alvo = await AuthRepository.findAdminById(id);
    if (!alvo) throw new Error('NAO_ENCONTRADO');
    const valores: { name?: string; role?: string } = {};
    if (input.name !== undefined) {
        const name = String(input.name).trim();
        if (name.length < 2 || name.length > 60) throw new Error('NOME_INVALIDO');
        valores.name = name;
    }
    if (input.papel !== undefined) {
        const papel = papelDe(input.papel);
        if (id === quemPede && ehAdmin(alvo) && papel !== 'admin') throw new Error('NAO_PODE_SE_REBAIXAR');
        valores.role = montarRole(papel, input.assuntos);
    }
    if (Object.keys(valores).length === 0) return comPapel({ ...alvo, createdAt: null });
    const user = await AuthRepository.updateAdmin(id, valores);
    if (!user) throw new Error('NAO_ENCONTRADO');
    return comPapel(user);
}
