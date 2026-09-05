import { Request, Response } from 'express';
import * as CloudinaryClient from '../../integrations/cloudinary/CloudinaryClient';

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
            urls.push(await CloudinaryClient.uploadImage(file.buffer, folder));
        }
        res.json({ urls });
    } catch (err) {
        console.error('Erro no upload:', err);
        res.status(502).json({ error: 'Falha ao enviar imagem' });
    }
}
