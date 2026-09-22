import { randomBytes } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

/**
 * Onde as fotos passaram a morar.
 *
 * Em 21/09/2026 a Cloudinary avisou que desativaria a conta: 196% de 25
 * creditos, e o plano que aguentaria o catalogo custava US$ 89 por mes. Os
 * mesmos 2,4 GB no R2 da Cloudflare custam cerca de US$ 0,04 por mes, e saida
 * de dados o R2 nao cobra — que e justamente o que pesava la.
 *
 * A foto entra INTACTA. O upload antigo encolhia para 2000px e recomprimia na
 * entrada; aquilo existia para poupar credito da Cloudinary, e essa razao
 * morreu junto com a conta. Quem entrega para a cliente e o next/image da
 * Vercel, que busca o original uma vez, gera a versao do tamanho da tela e
 * guarda por um ano — a loja continua leve sem precisar estragar o arquivo.
 */

const BALDE = process.env.R2_BUCKET ?? 'feminnita-imagens';
const CONTA = process.env.R2_ACCOUNT_ID ?? '1502df02fc0128da99cde4231f861bd5';
const PUBLICO = process.env.R2_PUBLIC_URL ?? 'https://pub-3c261fc069aa46e795f1276f1f25ed51.r2.dev';

const EXTENSAO: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
};

let cliente: S3Client | null = null;

function conectar(): S3Client {
    if (cliente) return cliente;

    // trim: a chave e colada a mao no painel do Render, e um espaco ou uma
    // quebra de linha que venha junto nao aparece na tela — mas entra na
    // assinatura. O R2 entao devolve SignatureDoesNotMatch, que do lado de ca
    // chega como "Falha ao enviar imagem", sem nenhuma pista de que o problema
    // e um caractere invisivel. Aconteceu em 22/09/2026.
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    if (!accessKeyId || !secretAccessKey) {
        throw new Error('R2_SEM_CHAVES');
    }

    cliente = new S3Client({
        region: 'auto',
        endpoint: `https://${CONTA}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
    return cliente;
}

/**
 * Um nome que ninguem repete.
 *
 * A Cloudinary batizava sozinha ("j4a5tdjnwvamnfo4lwxp"); aqui o nome e nosso.
 * Nome sorteado, e nao o nome do arquivo da camera, porque duas fotos
 * chamadas "IMG_0423.png" de dias diferentes sobrescreveriam uma a outra — e
 * a que sumisse so apareceria como quadrado vazio semanas depois.
 */
function nomeNovo(mimetype: string, nomeOriginal?: string): string {
    const ext = EXTENSAO[mimetype]
        ?? (nomeOriginal?.split('.').pop()?.toLowerCase() || 'bin');
    return `${randomBytes(10).toString('hex')}.${ext}`;
}

export async function uploadImage(
    buffer: Buffer,
    folder: string,
    mimetype = 'image/png',
    nomeOriginal?: string,
): Promise<string> {
    const chave = `${folder}/${nomeNovo(mimetype, nomeOriginal)}`;

    await conectar().send(new PutObjectCommand({
        Bucket: BALDE,
        Key: chave,
        Body: buffer,
        ContentType: mimetype,
        // A foto de um produto nao muda; quando muda, muda o nome do arquivo.
        // Entao o navegador e a Vercel podem guardar para sempre. E isso que
        // mantem o endereco pub-*.r2.dev longe do limite de requisicoes dele:
        // uma visita por foto, nao uma por cliente.
        CacheControl: 'public, max-age=31536000, immutable',
    }));

    return `${PUBLICO}/${chave}`;
}
