import zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { PassThrough } from 'stream';
import pg from 'pg';
import { to as copyTo } from 'pg-copy-streams';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { clienteR2, BALDE_BACKUPS } from '../../integrations/r2/R2Client';

/**
 * Copia de seguranca diaria do banco, para o Cloudflare R2.
 *
 * Em 22/09/2026 a loja ficou seis horas fora do ar por cota do Neon; no dia
 * seguinte caiu a primeira venda de verdade, R$ 1.240 de uma revendedora. A
 * partir do momento em que ha pedido de cliente e CPF la dentro, nao ter
 * backup deixa de ser descuido e passa a ser risco de negocio.
 *
 * NAO salva o esquema das tabelas: ele vive nas migracoes, que estao no git.
 * Restaurar e: banco vazio -> migracoes -> carregar estes arquivos com COPY.
 *
 * Usa COPY e nao JSON. COPY e o formato do proprio Postgres e devolve o valor
 * exato — nulo continua nulo, numero nao vira texto, data nao perde fuso. Um
 * backup que so PARECE certo e pior que nenhum, porque da falsa paz.
 *
 * Vai para o balde `feminnita-backups`, que e privado. O das imagens e publico,
 * e ali dentro ha nome, telefone, CPF e endereco de quase dois mil clientes.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

function hoje(): string {
    return new Date().toISOString().slice(0, 10);
}

async function tabelasDoBanco(c: pg.Client): Promise<string[]> {
    const r = await c.query<{ table_name: string }>(`
        select table_name from information_schema.tables
         where table_schema = 'public' and table_type = 'BASE TABLE'
         order by table_name`);
    return r.rows.map((x) => x.table_name);
}

export type ResultadoBackup = {
    data: string;
    tabelas: number;
    linhas: number;
    bytes: number;
};

export async function rodarBackup(): Promise<ResultadoBackup> {
    const r2 = clienteR2();
    const data = hoje();

    const c = new pg.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    await c.connect();

    let linhas = 0;
    let bytes = 0;
    const manifesto: { tabela: string; linhas: number; arquivo: string }[] = [];

    try {
        const tabelas = await tabelasDoBanco(c);

        for (const tabela of tabelas) {
            const n = Number(
                (await c.query<{ n: number }>(`select count(*)::int n from "${tabela}"`)).rows[0].n,
            );

            // O gzip e lido para memoria antes de subir: o banco tem 15 MB e
            // cada tabela comprimida cabe em centenas de KB. Streaming direto
            // para o S3 exigiria saber o tamanho antes, que o COPY nao da.
            const pedacos: Buffer[] = [];
            const coletor = new PassThrough();
            coletor.on('data', (p: Buffer) => pedacos.push(p));

            await pipeline(
                c.query(copyTo(`COPY "${tabela}" TO STDOUT`)),
                zlib.createGzip(),
                coletor,
            );

            const corpo = Buffer.concat(pedacos);
            const arquivo = `${tabela}.copy.gz`;

            await r2.send(new PutObjectCommand({
                Bucket: BALDE_BACKUPS,
                Key: `${data}/${arquivo}`,
                Body: corpo,
                ContentType: 'application/gzip',
            }));

            linhas += n;
            bytes += corpo.length;
            manifesto.push({ tabela, linhas: n, arquivo });
        }

        await r2.send(new PutObjectCommand({
            Bucket: BALDE_BACKUPS,
            Key: `${data}/_manifesto.json`,
            Body: Buffer.from(JSON.stringify({ quando: new Date().toISOString(), tabelas: manifesto }, null, 1)),
            ContentType: 'application/json',
        }));
    } finally {
        await c.end();
    }

    return { data, tabelas: manifesto.length, linhas, bytes };
}

/**
 * Roda uma vez ao subir e depois a cada 24h.
 *
 * Sobe junto com o servidor, que no Render fica ligado o tempo todo — e o
 * mesmo lugar de onde ja saem os renovadores de token do Bling e do Melhor
 * Envio. Nunca lanca: backup que derruba o painel seria um remedio pior.
 */
export function iniciarBackupDiario(): void {
    const executar = async () => {
        try {
            const r = await rodarBackup();
            console.log(`[BACKUP] ${r.data}: ${r.tabelas} tabelas, ${r.linhas} linhas, ${(r.bytes / 1048576).toFixed(1)} MB`);
        } catch (error) {
            console.error('[BACKUP] falhou:', error);
        }
    };

    // Espera um minuto para nao disputar o boot com as migracoes e os tokens.
    setTimeout(() => void executar(), 60_000);
    setInterval(() => void executar(), DIA_MS);
}
