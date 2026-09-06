import { readFile } from 'fs/promises';
import sharp from 'sharp';

export const MAX_DIMENSION = 3000; // lado maior alvo quando estoura
export const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export interface OptimizeResult {
    buffer: Buffer;
    changed: boolean;
    reason: string;
    width?: number;
    height?: number;
    originalWidth?: number;
    originalHeight?: number;
    originalBytes: number;
    finalBytes: number;
    format?: string;
}

/**
 * Regra do Chris (obrigatoria, NAO e comprimir tudo):
 * - Sobe o ORIGINAL. Unico corte: SE lado maior > 3000px OU arquivo > 4MB
 *   -> redimensiona para 3000px no lado maior (mantendo proporcao, sem ampliar).
 * - Preserva o formato original (nao forca WebP).
 */
export async function optimizeImage(input: string | Buffer): Promise<OptimizeResult> {
    const original: Buffer = typeof input === 'string' ? await readFile(input) : input;
    const originalBytes = original.length;

    const meta = await sharp(original).metadata();
    const originalWidth = meta.width;
    const originalHeight = meta.height;
    const format = meta.format;
    const longestSide = Math.max(originalWidth ?? 0, originalHeight ?? 0);

    const tooBigDimension = longestSide > MAX_DIMENSION;
    const tooBigBytes = originalBytes > MAX_BYTES;

    if (!tooBigDimension && !tooBigBytes) {
        return {
            buffer: original,
            changed: false,
            reason: `original mantido (lado maior ${longestSide}px <= ${MAX_DIMENSION}px e ${(
                originalBytes / 1024 / 1024
            ).toFixed(2)}MB <= 4MB)`,
            width: originalWidth,
            height: originalHeight,
            originalWidth,
            originalHeight,
            originalBytes,
            finalBytes: originalBytes,
            format,
        };
    }

    // withoutEnlargement garante "sem ampliar". Preserva o formato de origem
    // porque nao passamos .toFormat() -> sharp reencoda no mesmo formato lido.
    const resized = await sharp(original)
        .resize({
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .toBuffer();

    const outMeta = await sharp(resized).metadata();

    const reasons: string[] = [];
    if (tooBigDimension) reasons.push(`lado maior ${longestSide}px > ${MAX_DIMENSION}px`);
    if (tooBigBytes) reasons.push(`arquivo ${(originalBytes / 1024 / 1024).toFixed(2)}MB > 4MB`);

    return {
        buffer: resized,
        changed: true,
        reason: `redimensionado para ${MAX_DIMENSION}px no lado maior (${reasons.join(' e ')})`,
        width: outMeta.width,
        height: outMeta.height,
        originalWidth,
        originalHeight,
        originalBytes,
        finalBytes: resized.length,
        format: outMeta.format,
    };
}
