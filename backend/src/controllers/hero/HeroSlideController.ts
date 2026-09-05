import { Request, Response } from 'express';
import * as HeroSlideService from '../../services/hero/HeroSlideService';

// Traduz o erro real em mensagem útil pra quem está usando o painel:
// diz QUAL campo faltou e o que fazer, em vez do genérico "confira type e src".
function respondSlideError(res: Response, error: unknown, fallbackStatus: number, fallbackMsg: string) {
    if (error instanceof Error && error.message === 'INVALID_VIDEO_ID') {
        return res.status(400).json({ error: 'Vídeo deve ser só o ID do YouTube (11 caracteres), não a URL' });
    }
    const pgErr = error as { code?: string; column?: string };
    if (pgErr?.code === '23502') {
        const campos: Record<string, string> = {
            alt: 'o texto alternativo (alt) — descreva a imagem',
            src: 'a imagem principal — o link não chegou; reenvie o arquivo (o upload não retornou URL)',
        };
        const campo = campos[pgErr.column ?? ''] ?? `o campo obrigatório "${pgErr.column ?? '—'}"`;
        return res.status(400).json({ error: `Não salvou: falta ${campo}.` });
    }
    console.error('[hero-slide]', error);
    return res.status(fallbackStatus).json({ error: fallbackMsg });
}

export async function list(req: Request, res: Response) {
    res.json(await HeroSlideService.listSlides());
}

export async function create(req: Request, res: Response) {
    try {
        const { type, src, srcMobile, alt, poster, ctaText, ctaHref, title, subtitle, textPosition, textTheme, textPositionMobile, textThemeMobile, focal } = req.body;
        res.status(201).json(await HeroSlideService.createSlide({
            type,
            src,
            srcMobile,
            alt,
            poster,
            ctaText,
            ctaHref,
            title,
            subtitle,
            textPosition,
            textTheme,
            textPositionMobile,
            textThemeMobile,
            focal,
        }));
    } catch (error) {
        return respondSlideError(res, error, 400, 'Não foi possível criar o slide. O erro foi registrado no servidor.');
    }
}

export async function update(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
        res.json(await HeroSlideService.updateSlide(id, req.body));
    } catch (error) {
        if (error instanceof Error && error.message === 'SLIDE_NOT_FOUND') {
            return res.status(404).json({ error: 'Slide não encontrado' });
        }
        return respondSlideError(res, error, 404, 'Slide não encontrado');
    }
}

export async function remove(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        await HeroSlideService.deleteSlide(id);
        res.status(204).send();
    } catch {
        res.status(404).json({ error: 'Slide não encontrado' });
    }
}

export async function reorder(req: Request, res: Response) {
    try {
        await HeroSlideService.reorderSlides(req.body.ids);
        res.json(await HeroSlideService.listSlides());
    } catch {
        res.status(400).json({ error: 'Envie ids: [array de ids na ordem desejada]' });
    }
}