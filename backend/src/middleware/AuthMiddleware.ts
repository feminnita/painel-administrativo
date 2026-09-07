import { NextFunction, Request, Response } from 'express';
import * as AuthRepository from '../repository/auth/AuthRepository';
import { hashSessionToken } from '../lib/security/sessionToken'
import { SESSION_TTL_MS } from '../config/auth';

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });

    const tokenHash = hashSessionToken(token);
    const session = await AuthRepository.findActiveSessionByTokenHash(tokenHash);
    if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada' });

    // Sessão deslizante: quem está usando o painel não é deslogado. O vencimento
    // contava do LOGIN, então caía 24h depois mesmo com a pessoa no meio de um
    // cadastro, com o formulário preenchido. Só grava quando falta menos da
    // metade do prazo, para não dar um UPDATE a cada requisição.
    if (session.expiresAt.getTime() - Date.now() < SESSION_TTL_MS / 2) {
        await AuthRepository.renewSession(tokenHash, new Date(Date.now() + SESSION_TTL_MS));
    }

    req.admin = await AuthRepository.findAdminById(session.adminId);
    next();
}
