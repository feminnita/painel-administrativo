import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { productColorImages, productsColors } from '../config/db/schema';
import { uploadImage } from '../integrations/cloudinary/CloudinaryClient';
import { optimizeImage } from './optimizeImage';

export interface UploadColorImagesInput {
    productId: string;
    /** Nome da cor (ex.: "Preto"). Resolvido para colorId via products_colors. */
    color: string;
    /** Caminhos dos arquivos de imagem. */
    files: string[];
    /**
     * DRY-RUN: nao chama Cloudinary e nao grava no banco.
     * So otimiza, simula URLs e loga o shape que SERIA gravado.
     */
    dryRun?: boolean;
    /** Pasta no Cloudinary (default: product_colors/<productId>). */
    folder?: string;
}

/**
 * Para cada arquivo: otimiza -> uploadImage -> coleta URL.
 * Ordena alfabeticamente pelo NOME do arquivo (1a = principal).
 * Grava as linhas em product_color_images (jsonb images[]) via upsert por (productId, colorId).
 *
 * Shape real da tabela product_color_images:
 *   { id, productId (uuid), colorId (uuid), images (jsonb string[]), createdAt, updatedAt }
 *   UNIQUE (productId, colorId)  -> upsert.
 * A cor e resolvida pelo nome em products_colors (coluna name UNIQUE).
 */
export async function uploadColorImages(input: UploadColorImagesInput): Promise<string[]> {
    const { productId, color, dryRun = false } = input;
    const folder = input.folder ?? `product_colors/${productId}`;

    // Ordena alfabetico pelo basename -> a primeira vira a imagem principal.
    const files = [...input.files].sort((a, b) =>
        path.basename(a).localeCompare(path.basename(b), 'pt-BR'),
    );

    const urls: string[] = [];

    for (const file of files) {
        const opt = await optimizeImage(file);
        console.log(
            `[uploadColorImages] ${path.basename(file)}: changed=${opt.changed} | ${opt.reason} | ` +
                `${opt.originalWidth}x${opt.originalHeight} -> ${opt.width}x${opt.height}`,
        );

        if (dryRun) {
            const fakeUrl = `DRYRUN://cloudinary/${folder}/${path.basename(file)}`;
            console.log(`[uploadColorImages][DRY-RUN] uploadImage() PULADO -> ${fakeUrl}`);
            urls.push(fakeUrl);
        } else {
            const url = await uploadImage(opt.buffer, folder);
            urls.push(url);
        }
    }

    if (dryRun) {
        console.log(
            `[uploadColorImages][DRY-RUN] SERIA gravado em product_color_images:`,
            JSON.stringify(
                {
                    productId,
                    colorId: `<resolvido de products_colors.name = "${color}">`,
                    images: urls,
                },
                null,
                2,
            ),
        );
        return urls;
    }

    // ---- Gravacao real (nao executada no teste) ----
    const [colorRow] = await db
        .select({ id: productsColors.id })
        .from(productsColors)
        .where(eq(productsColors.name, color))
        .limit(1);

    if (!colorRow) {
        throw new Error(`COR_NAO_ENCONTRADA: products_colors.name = "${color}"`);
    }

    await db
        .insert(productColorImages)
        .values({ productId, colorId: colorRow.id, images: urls })
        .onConflictDoUpdate({
            target: [productColorImages.productId, productColorImages.colorId],
            set: { images: urls, updatedAt: new Date() },
        });

    return urls;
}
