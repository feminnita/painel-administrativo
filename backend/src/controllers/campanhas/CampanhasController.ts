import { Request, Response } from 'express';
import * as CampanhasRepository from '../../repository/campanhas/CampanhasRepository';

// Padrão: últimos 30 dias. Data no formato AAAA-MM-DD.
function intervalo(req: Request) {
    const texto = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
    const ate = texto(req.query.ate) ?? new Date().toISOString().slice(0, 10);
    const de =
        texto(req.query.de) ??
        new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    return { de, ate };
}

export async function overview(req: Request, res: Response) {
    const { de, ate } = intervalo(req);

    const [resumo, campanhas, artes, referencias] = await Promise.all([
        CampanhasRepository.resumo(de, ate),
        CampanhasRepository.porCampanha(de, ate),
        CampanhasRepository.porArte(de, ate),
        CampanhasRepository.porReferencia(de, ate),
    ]);

    res.json({ de, ate, resumo, campanhas, artes, referencias });
}
