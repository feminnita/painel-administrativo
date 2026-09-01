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