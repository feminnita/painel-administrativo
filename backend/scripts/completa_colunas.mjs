/**
 * Compara as colunas de um backup com as do banco de destino e ACRESCENTA as
 * que faltam. Nunca apaga, nunca altera coluna existente.
 *
 * Existe porque as migracoes dos dois projetos nao reproduzem o banco real:
 * varias colunas foram criadas fora delas (cost_price, reference, pick_order,
 * text_theme, as do Bling e da NF-e em orders). O `drizzle-kit push` resolveria,
 * mas cada projeto so conhece metade do schema — empurrar o do painel apagaria
 * as colunas da loja (o cnpj e o aceite do termo de revenda de 1.879 clientes)
 * e vice-versa. Entao a fonte da verdade aqui e o BACKUP: o que existia no
 * banco de producao e o que tem que existir no banco novo.
 *
 * O tipo sai do proprio dado guardado, com o nome da coluna como desempate.
 *
 * Uso:
 *   node scripts/completa_colunas.mjs <arquivo.json.gz>             (ensaio)
 *   node scripts/completa_colunas.mjs <arquivo.json.gz> --aplicar
 *
 * Destino em DATABASE_URL_DESTINO.
 */
import fs from 'fs';
import zlib from 'zlib';
import pg from 'pg';

const ARQUIVO = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');
const DESTINO = process.env.DATABASE_URL_DESTINO;

if (!ARQUIVO || !DESTINO) {
    console.error('uso: DATABASE_URL_DESTINO=... node scripts/completa_colunas.mjs <backup.json.gz> [--aplicar]');
    process.exit(1);
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Tipos que NAO podem sair de adivinhacao, porque o dado guardado nao revela o
 * tipo certo — coluna toda nula, ou numero que o driver devolve como texto.
 * Os que existem no schema drizzle vieram de la; os outros, do uso real.
 */
const FIXOS = {
    // Datas de promocao: no backup vieram vazias, mas o codigo grava Date.
    'products_skus.sale_start': 'timestamp with time zone',
    'products_skus.sale_end': 'timestamp with time zone',
    // nfe_number e TEXT no schema (numero de nota vem com zeros a esquerda).
    'orders.nfe_number': 'text',
    // Peso e medidas: numero, ainda que o backup so tenha nulo.
    'products_skus.weight_g': 'numeric',
    'products_skus.height_cm': 'numeric',
    'products_skus.width_cm': 'numeric',
    'products_skus.length_cm': 'numeric',
    'products_skus.position': 'integer',
};

/** Descobre o tipo olhando o primeiro valor nao-nulo; o nome decide os empates. */
function tipoDe(coluna, linhas) {
    let amostra = null;
    for (const l of linhas) {
        if (l[coluna] !== null && l[coluna] !== undefined) { amostra = l[coluna]; break; }
    }

    if (amostra === null) {
        // Coluna inteira nula no backup: sem dado para inspecionar, vale o nome.
        if (/_at$/.test(coluna)) return 'timestamp with time zone';
        if (/(price|cost|total|valor|frete|desconto)/.test(coluna)) return 'numeric';
        if (/^(is_|has_|tem_)/.test(coluna)) return 'boolean';
        if (/(_qty|_order|_index|_count|_number)$/.test(coluna)) return 'integer';
        return 'text';
    }

    if (typeof amostra === 'boolean') return 'boolean';
    if (amostra instanceof Date) return 'timestamp with time zone';
    if (typeof amostra === 'number') return Number.isInteger(amostra) ? 'integer' : 'numeric';
    if (typeof amostra === 'object') return 'jsonb';

    // String: o driver devolve numeric e timestamp como texto.
    if (ISO.test(amostra)) return 'timestamp with time zone';
    if (/^-?\d+(\.\d+)?$/.test(amostra) && /(price|cost|total|valor|frete|desconto|peso|weight)/.test(coluna)) return 'numeric';
    return 'text';
}

const dump = JSON.parse(zlib.gunzipSync(fs.readFileSync(ARQUIVO)).toString());
const tabelas = dump.tabelas ?? dump.tables;
const cliente = new pg.Client({ connectionString: DESTINO, ssl: { rejectUnauthorized: false } });

try {
    await cliente.connect();

    const { rows } = await cliente.query(
        `select table_name, column_name from information_schema.columns where table_schema = 'public'`,
    );
    const noBanco = new Map();
    for (const r of rows) {
        if (!noBanco.has(r.table_name)) noBanco.set(r.table_name, new Set());
        noBanco.get(r.table_name).add(r.column_name);
    }

    const pendentes = [];
    for (const [tabela, linhas] of Object.entries(tabelas)) {
        if (!linhas.length || !noBanco.has(tabela)) continue;
        const existentes = noBanco.get(tabela);
        // Uniao das chaves de TODAS as linhas: uma coluna pode faltar no primeiro
        // registro se o driver a omitir, e uma so ausencia trava a tabela inteira.
        const doBackup = new Set();
        for (const l of linhas) for (const k of Object.keys(l)) doBackup.add(k);

        for (const coluna of doBackup) {
            if (existentes.has(coluna)) continue;
            const tipo = FIXOS[`${tabela}.${coluna}`] ?? tipoDe(coluna, linhas);
            pendentes.push({ tabela, coluna, tipo, fixo: Boolean(FIXOS[`${tabela}.${coluna}`]) });
        }
    }

    if (!pendentes.length) {
        console.log('Nao falta nenhuma coluna. ✅');
        process.exit(0);
    }

    console.log(`${pendentes.length} coluna(s) faltando:\n`);
    let atual = '';
    for (const p of pendentes) {
        if (p.tabela !== atual) { console.log(`  ${p.tabela}`); atual = p.tabela; }
        console.log(`      ${p.coluna.padEnd(26)} ${p.tipo}${p.fixo ? '   (tipo fixado, nao adivinhado)' : ''}`);
    }

    if (!APLICAR) {
        console.log('\n(ensaio: nada foi alterado — rode com --aplicar)');
        process.exit(0);
    }

    console.log('\n--- acrescentando ---');
    let erros = 0;
    for (const p of pendentes) {
        try {
            await cliente.query(`alter table "${p.tabela}" add column if not exists "${p.coluna}" ${p.tipo}`);
            console.log(`  ok   ${p.tabela}.${p.coluna}`);
        } catch (e) {
            erros += 1;
            console.log(`  ERRO ${p.tabela}.${p.coluna}: ${e.message}`);
        }
    }
    console.log(erros ? `\nterminou com ${erros} erro(s).` : '\nterminou: todas acrescentadas.');
    process.exitCode = erros ? 1 : 0;
} catch (e) {
    console.error('ERRO:', e.message);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
