import { Request, Response } from 'express';
import * as AuthService from '../../services/auth/AuthService';
import { ADMIN_SESSION_COOKIE, SESSION_TTL_MS } from '../../config/auth';

const isProduction = process.env.NODE_ENV === 'production';

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const { admin, token } = await AuthService.loginAdmin({ email, password, userAgent: req.headers['user-agent'] });

        res.cookie(ADMIN_SESSION_COOKIE, token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: SESSION_TTL_MS,
        });

        res.json({ id: admin.id, name: admin.name, email: admin.email, role: admin.role });
    } catch {
        res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }
}

export async function logout(req: Request, res: Response) {
    const token = req.cookies?.[ADMIN_SESSION_COOKIE];
    if (token) await AuthService.logoutAdmin(token);
    res.clearCookie(ADMIN_SESSION_COOKIE);
    res.status(204).send();
}

export async function me(req: Request, res: Response) {
    res.json(req.admin);
}



