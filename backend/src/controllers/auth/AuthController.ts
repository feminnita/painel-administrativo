import { Request, Response } from 'express';
import * as AuthService from '../../services/auth/AuthService';

export async function login(req: Request, res: Response) {

    try {
        const { email, password } = req.body;
        const { admin, token } = await AuthService.loginAdmin({
            email,
            password,
            userAgent: req.headers['user-agent'],
        });

        res.json({
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            },
        })
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Email ou senha inválidos' });
    }
}

export async function logout(req: Request, res: Response) {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) await AuthService.logoutAdmin(token);

    res.status(204).send();
}

export async function me(req: Request, res: Response) {
    res.json(req.admin);
}

const GENERIC_FORGOT_MESSAGE = 'Se esse e-mail existir, enviamos o link.';

export async function forgotPassword(req: Request, res: Response) {
    const { email } = req.body ?? {};

    // TRAVA 2: resposta SEMPRE igual, com sucesso, e-mail inexistente ou falha de
    // envio. Nunca revela se o e-mail existe. Erros só vão pro log.
    try {
        if (typeof email === 'string' && email.trim()) {
            await AuthService.requestPasswordReset(email.trim().toLowerCase());
        }
    } catch (error) {
        console.error('[forgot-password] falha ao processar pedido de reset:', error);
    }

    res.status(200).json({ message: GENERIC_FORGOT_MESSAGE });
}

export async function resetPassword(req: Request, res: Response) {
    try {
        const { token, password } = req.body ?? {};

        if (typeof token !== 'string' || !token || typeof password !== 'string' || password.length < 8) {
            res.status(400).json({ error: 'Link inválido ou expirado' });
            return;
        }

        await AuthService.resetPassword(token, password);
        res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    } catch (error) {
        console.error('[reset-password]', error);
        res.status(400).json({ error: 'Link inválido ou expirado' });
    }
}