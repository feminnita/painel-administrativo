import { Request, Response } from 'express';
import * as R2Client from '../../integrations/r2/R2Client';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'];

export async function uploadImages(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Envie ao menos um arquivo no campo "files"' });
    }
    const rejeitado = files.find((f) => !ALLOWED_TYPES.includes(f.mimetype));
    if (rejeitado) {
        return res.status(400).json({
            error: `Tipo não suportado (${rejeitado.mimetype || 'desconhecido'}). Aceitos: imagens JPEG, PNG, WebP, AVIF ou vídeos MP4, WebM, MOV.`,
        });
    }

    try {
        const folder = typeof req.query.folder === 'string' ? req.query.folder : 'Products';
        const urls: string[] = [];
        for (const file of files) {
            urls.push(await R2Client.uploadImage(file.buffer, folder, file.mimetype, file.originalname));
        }
        res.json({ urls });
    } catch (err) {
        console.error('Erro no upload:', err);
        // Sem as chaves do R2 o erro generico mandaria a Chris procurar defeito
        // na foto, que e onde ele nao esta. Diz o que falta.
        if (err instanceof Error && err.message === 'R2_SEM_CHAVES') {
            return res.status(500).json({
                error: 'O servidor está sem as chaves do Cloudflare R2 (R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY).',
            });
        }
        res.status(502).json({ error: 'Falha ao enviar imagem' });
    }
}
