/**
 * Teste unitario do pipeline de otimizacao + upload.
 * NAO grava no banco. Faz UM upload real da imagem PEQUENA se as creds
 * Cloudinary estiverem no ambiente; senao, DRY-RUN.
 *
 * Rodar: npx tsx src/pipeline/test_pipeline.ts
 */
import 'dotenv/config';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { optimizeImage } from './optimizeImage';
import { uploadColorImages } from './uploadColorImages';
import { uploadImage } from '../integrations/cloudinary/CloudinaryClient';

const SCRATCH = path.join(
    os.tmpdir(),
    'claude',
    'C--Users-chris',
    '9ffcec4c-2247-45fc-9e0f-d3f0cc33e433',
    'scratchpad',
    'pipeline-test',
);

async function makeTestImages() {
    await mkdir(SCRATCH, { recursive: true });

    // GRANDE: 4000x6000 (lado maior 6000 > 3000) -> deve redimensionar p/ 3000 no lado maior
    const bigPath = path.join(SCRATCH, 'a_grande_4000x6000.jpg');
    const big = await sharp({
        create: { width: 4000, height: 6000, channels: 3, background: { r: 200, g: 120, b: 160 } },
    })
        .jpeg({ quality: 90 })
        .toBuffer();
    await writeFile(bigPath, big);

    // PEQUENA: 800x1200 (lado maior 1200 <= 3000 e < 4MB) -> deve ficar intacta
    const smallPath = path.join(SCRATCH, 'b_pequena_800x1200.jpg');
    const small = await sharp({
        create: { width: 800, height: 1200, channels: 3, background: { r: 120, g: 160, b: 200 } },
    })
        .jpeg({ quality: 85 })
        .toBuffer();
    await writeFile(smallPath, small);

    return { bigPath, smallPath };
}

function credsPresent(): boolean {
    return Boolean(
        process.env.EXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET,
    );
}

async function main() {
    console.log('=== TESTE PIPELINE otimizacao + upload ===\n');
    const { bigPath, smallPath } = await makeTestImages();
    console.log(`imagens de teste criadas em: ${SCRATCH}\n`);

    // 1) optimizeImage na GRANDE
    console.log('--- optimizeImage: IMAGEM GRANDE ---');
    const big = await optimizeImage(bigPath);
    console.log(`ANTES:  ${big.originalWidth}x${big.originalHeight}  (${(big.originalBytes / 1024 / 1024).toFixed(2)}MB)`);
    console.log(`DEPOIS: ${big.width}x${big.height}  (${(big.finalBytes / 1024 / 1024).toFixed(2)}MB)`);
    console.log(`changed=${big.changed} | reason=${big.reason} | formato=${big.format}`);
    const bigLongest = Math.max(big.width ?? 0, big.height ?? 0);
    console.log(`PROVA grande: lado maior de saida = ${bigLongest}px (esperado 3000) -> ${bigLongest === 3000 ? 'OK' : 'FALHOU'}\n`);

    // 2) optimizeImage na PEQUENA
    console.log('--- optimizeImage: IMAGEM PEQUENA ---');
    const small = await optimizeImage(smallPath);
    console.log(`ANTES:  ${small.originalWidth}x${small.originalHeight}  (${(small.originalBytes / 1024 / 1024).toFixed(2)}MB)`);
    console.log(`DEPOIS: ${small.width}x${small.height}  (${(small.finalBytes / 1024 / 1024).toFixed(2)}MB)`);
    console.log(`changed=${small.changed} | reason=${small.reason} | formato=${small.format}`);
    const intacta = small.changed === false && small.width === 800 && small.height === 1200;
    console.log(`PROVA pequena: intacta (800x1200, changed=false) -> ${intacta ? 'OK' : 'FALHOU'}\n`);

    // 3) uploadColorImages em DRY-RUN (prova o shape de gravacao SEM tocar no banco)
    console.log('--- uploadColorImages: DRY-RUN (shape de gravacao, sem banco) ---');
    await uploadColorImages({
        productId: '00000000-0000-0000-0000-000000000000',
        color: 'Preto',
        files: [smallPath, bigPath], // ordem invertida de proposito p/ provar sort alfabetico
        dryRun: true,
    });
    console.log('');

    // 4) Upload REAL de teste (so a imagem PEQUENA) se houver creds
    if (credsPresent()) {
        console.log('--- UPLOAD REAL de teste (imagem PEQUENA) ---');
        try {
            const url = await uploadImage(small.buffer, 'pipeline_test');
            console.log(`UPLOAD OK -> ${url}`);
        } catch (e) {
            console.log(`UPLOAD FALHOU: ${(e as Error).message}`);
        }
    } else {
        console.log('--- UPLOAD: DRY-RUN (creds Cloudinary ausentes no ambiente) ---');
    }

    console.log('\n=== FIM ===');
}

main().then(
    () => process.exit(0),
    (e) => {
        console.error('ERRO NO TESTE:', e);
        process.exit(1);
    },
);
