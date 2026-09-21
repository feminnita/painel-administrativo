import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
    if (configured) return;
    cloudinary.config({
        cloud_name: process.env.EXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
}

/**
 * A foto e GUARDADA ja enxuta, nao so entregue enxuta.
 *
 * O que subia era o arquivo cru da camera: PNG de ~3 MB. Multiplicado por
 * 1.600 fotos de catalogo isso vira gigabytes parados, e cada um deles pesa
 * tres vezes na conta do Cloudinary — armazenamento, banda e transformacao.
 * A conta gratuita (25 creditos) foi estourada assim: 32,49.
 *
 * eager aqui e diferente de pedir w_ na URL: a URL enxuta economiza ENTREGA,
 * mas o arquivo gordo continua ocupando espaco para sempre. Isto encolhe o
 * proprio original, no momento em que ele entra.
 *
 *   limit 2000px  a maior tela de produto nao passa disso; nao amplia imagem
 *                 menor, so limita as grandes (limit, nao fill)
 *   q_auto:good   compressao escolhida pelo Cloudinary, sem perda visivel
 *   f_auto        entrega webp/avif para quem aceita
 *
 * Na pratica: ~3 MB viram ~250 KB, com a foto igual na tela.
 *
 * Nao mexe em nada que ja esta la — vale para o que for enviado daqui pra frente.
 */
export function uploadImage(buffer: Buffer, folder: string): Promise<string> {
    ensureConfigured();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
                transformation: [{ width: 2000, height: 2000, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }],
            },
            (error, result) => {
                if (error || !result) return reject(error ?? new Error('CLOUDINARY_UPLOAD_FAILED'));
                resolve(result.secure_url);
            },
        );
        stream.end(buffer);
    });
}
