import { Request, Response } from 'express';
import * as HeroSlideService from '../../services/hero/HeroSlideService';

export async function list(req: Request, res: Response) {
    res.json(await HeroSlideService.listSlides());
}

export async function create(req: Request, res: Response) {
    try {
        const { type, src, alt, poster, ctaText, ctaHref } = req.body;
        res.status(201).json(await HeroSlideService.createSlide({
            type,
            src,
            alt,
            poster,
            ctaText,
            ctaHref,
        }));
    } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_VIDEO_ID') {
            return res.status(400).json({ error: 'Vídeo deve ser só o ID do YouTube (11 caracteres), não a URL' });
        }
        res.status(400).json({ error: 'Erro ao criar slide — confira type e src' });
    }
}

export async function update(req: Request, res: Response) {
    const id = req.params.id as string;

    try {
        res.json(await HeroSlideService.updateSlide(id, req.body));
    } catch (error) {
        if (error instanceof Error && error.message === 'INVALID_VIDEO_ID') {
            return res.status(400).json({ error: 'Vídeo deve ser só o ID do YouTube (11 caracteres), não a URL' });
        }
        res.status(404).json({ error: 'Slide não encontrado' });
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