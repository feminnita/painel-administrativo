import { Request, Response } from 'express';
import * as CloudinaryClient from '../../integrations/cloudinary/CloudinaryClient';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'];

export async function uploadImages(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Envie ao menos um arquivo no campo "files"' });
    }
    if (files.some((f) => !ALLOWED_TYPES.includes(f.mimetype))) {
        return res.status(400).json({ error: 'Apenas imagens JPEG, PNG, WebP ou AVIF' });
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
        // Erro do Cloudinary NÃO é instância de Error — vem como { message, http_code } ou { error: {...} }.
        const e = err as { message?: string; http_code?: number; error?: { message?: string; http_code?: number } };
        const reason =
            (err instanceof Error && err.message) ||
            e?.error?.message ||
            e?.message ||
            (err && typeof err === 'object'
                ? JSON.stringify(err, Object.getOwnPropertyNames(err as object))
                : String(err));
        const httpCode = e?.http_code ?? e?.error?.http_code;
        let hint: string | undefined;
        if (/INVALID_CREDENTIALS|api_key|api_secret|cloud_name|Invalid Signature/i.test(reason) || httpCode === 401) {
            hint = 'Credenciais do Cloudinary inválidas/ausentes — confira EXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET no .env.';
        } else if (httpCode === 420 || /too many|slow down|rate limit/i.test(reason)) {
            hint = 'Cloudinary limitou por excesso de requisições (rate limit / limite do plano). Aguarde alguns segundos e envie menos arquivos por vez.';
        }
        res.status(502).json({ error: `Falha ao enviar imagem: ${reason}${httpCode ? ` (HTTP ${httpCode})` : ''}`, hint });
    }
}
