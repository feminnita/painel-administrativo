import { NextFunction, Request, Response } from 'express';
import * as AuthRepository from '../repository/auth/AuthRepository';
import { hashSessionToken } from '../lib/security/sessionToken'

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) return res.status(401).json({ error: 'Não autenticado' });

    const session = await AuthRepository.findActiveSessionByTokenHash(hashSessionToken(token));
    if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada' });

    req.admin = await AuthRepository.findAdminById(session.adminId);
    next();
}
