import type { Request, Response } from 'express';
import * as UsersService from '../../services/auth/UsersService';

const MENSAGEM: Record<string, [number, string]> = {
    NOME_INVALIDO: [400, 'Informe o nome (de 2 a 60 letras).'],
    EMAIL_INVALIDO: [400, 'Confira o e-mail digitado.'],
    EMAIL_JA_CADASTRADO: [409, 'Já existe um login com esse e-mail.'],
    NAO_PODE_SE_APAGAR: [400, 'Você não pode excluir o seu próprio login.'],
    NAO_ENCONTRADO: [404, 'Login não encontrado.'],
    NAO_PODE_SE_REBAIXAR: [400, 'Você não pode tirar o seu próprio acesso total.'],
};

function responderErro(res: Response, e: unknown) {
    const chave = e instanceof Error ? e.message : '';
    const m = MENSAGEM[chave];
    if (m) return res.status(m[0]).json({ error: m[1] });
    console.error('[usuarios]', e);
    return res.status(500).json({ error: 'Não foi possível concluir. Tente de novo.' });
}

export async function list(_req: Request, res: Response) {
    res.json(await UsersService.listUsers());
}

export async function create(req: Request, res: Response) {
    try {
        const r = await UsersService.createUser({
            name: String(req.body?.name ?? ''),
            email: String(req.body?.email ?? ''),
            papel: req.body?.papel,
            assuntos: req.body?.assuntos,
        });
        res.status(201).json(r);
    } catch (e) {
        responderErro(res, e);
    }
}

export async function remove(req: Request, res: Response) {
    try {
        await UsersService.deleteUser(String(req.params.id), req.admin?.id);
        res.status(204).send();
    } catch (e) {
        responderErro(res, e);
    }
}

export async function rename(req: Request, res: Response) {
    try {
        res.json(await UsersService.updateUser(String(req.params.id), req.body ?? {}, req.admin?.id));
    } catch (e) {
        responderErro(res, e);
    }
}
