import { NextFunction, Request, Response } from 'express';
import * as AuthRepository from '../repository/auth/AuthRepository';
import { hashSessionToken } from '../lib/security/sessionToken';
import { ADMIN_SESSION_COOKIE } from '../config/auth';

export async function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.[ADMIN_SESSION_COOKIE];
    if (!token) return res.status(401).json({ error: 'Não autenticado' });

    const session = await AuthRepository.findActiveSessionByTokenHash(hashSessionToken(token));
    if (!session) return res.status(401).json({ error: 'Sessão inválida ou expirada' });

    req.admin = await AuthRepository.findAdminById(session.adminId);
    next();
}
