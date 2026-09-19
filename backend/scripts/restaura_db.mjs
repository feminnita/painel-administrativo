/**
 * Restaura um backup do painel (.json.gz) para dentro de um banco VAZIO.
 *
 * Existe porque o banco da loja ficou numa conta Neon que deixou de ser
 * acessivel. O backup diario tinha tudo — mas so os DADOS, nao a estrutura.
 * Entao a ordem e: criar o banco novo, rodar as migracoes dos dois projetos
 * (loja e painel) para levantar as tabelas, e so entao chamar este script.
 *
 * Insercao em VARIAS PASSADAS em vez de ordem fixa de tabelas: a cada volta
 * tenta as que sobraram e mantem as que falharam por chave estrangeira para a
 * proxima. Para quando uma volta inteira nao consegue mais nada. Assim a ordem
 * se resolve sozinha, sem eu ter que desenhar o grafo de dependencia na mao e
 * errar numa tabela nova que alguem acrescentar depois.
 *
 * Nao apaga nada: recusa qualquer tabela que ja tenha linha dentro. Restaurar
 * por cima de dado vivo seria a unica forma de este script causar o estrago
 * que ele existe para evitar.
 *
 * Uso:
 *   node scripts/restaura_db.mjs <arquivo.json.gz>                  (ensaio)
 *   node scripts/restaura_db.mjs <arquivo.json.gz> --aplicar
 *
 * O destino vem de DATABASE_URL_DESTINO (nunca de DATABASE_URL, para nao
 * escrever no banco de producao por engano).
 */
import fs from 'fs';
import zlib from 'zlib';
import pg from 'pg';
import 'dotenv/config';

const ARQUIVO = process.argv[2];
const APLICAR = process.argv.includes('--aplicar');
const DESTINO = process.env.DATABASE_URL_DESTINO;

const log = (m) => console.log(m);

if (!ARQUIVO) {
    console.error('ERRO: informe o arquivo de backup. Ex: node scripts/restaura_db.mjs C:/Backups/painel-administrativo/painel-2026-09-17-07-00.json.gz');
    process.exit(1);
}
if (!DESTINO) {
    console.error('ERRO: DATABASE_URL_DESTINO nao definida. Aponte para o banco NOVO (nunca o de producao).');
    process.exit(1);
}

const dump = JSON.parse(zlib.gunzipSync(fs.readFileSync(ARQUIVO)).toString());
const tabelas = dump.tabelas ?? dump.tables;
if (!tabelas) {
    console.error('ERRO: arquivo nao parece um backup deste painel (sem a chave "tabelas").');
    process.exit(1);
}

const cliente = new pg.Client({ connectionString: DESTINO, ssl: { rejectUnauthorized: false } });

/**
 * Descobre o tipo de cada coluna da tabela. Precisa disto porque uma LISTA em
 * JavaScript vira coisas diferentes conforme a coluna: num array do Postgres
 * (text[], as cores e tamanhos do produto) o driver ja sabe converter sozinho e
 * mandar `{Preto,Pink}`; num jsonb (as imagens) tem que ir como texto JSON. Sem
 * essa distincao o Postgres recusa com "malformed array literal".
 */
async function tiposDaTabela(nome) {
    const { rows } = await cliente.query(
        `select column_name, data_type from information_schema.columns
         where table_schema = 'public' and table_name = $1`,
        [nome],
    );
    return new Map(rows.map((r) => [r.column_name, r.data_type]));
}

/** Insere uma tabela inteira. Devolve {ok, erro}. */
async function inserir(nome, linhas) {
    if (!linhas.length) return { ok: true, gravadas: 0 };

    const tipos = await tiposDaTabela(nome);
    const colunas = Object.keys(linhas[0]);
    const lista = colunas.map((c) => `"${c}"`).join(', ');

    // Em lotes: uma ida ao banco por linha levaria minutos num catalogo de
    // 2.919 variacoes, e cada ida e uma chance a mais de a conexao cair no meio.
    const LOTE = 200;
    let gravadas = 0;

    for (let i = 0; i < linhas.length; i += LOTE) {
        const pedaco = linhas.slice(i, i + LOTE);
        const valores = [];
        const marcadores = pedaco.map((linha, l) => {
            const campos = colunas.map((c, k) => {
                const v = linha[c];
                const ehObjeto = v !== null && typeof v === 'object' && !(v instanceof Date);
                // Array do Postgres: entrega a lista crua, o driver monta o literal.
                // Qualquer outro objeto (jsonb, json): vai como texto JSON.
                const arrayDoPostgres = tipos.get(c) === 'ARRAY' && Array.isArray(v);
                valores.push(ehObjeto && !arrayDoPostgres ? JSON.stringify(v) : v);
                return `$${l * colunas.length + k + 1}`;
            });
            return `(${campos.join(', ')})`;
        });

        await cliente.query(
            `insert into "${nome}" (${lista}) values ${marcadores.join(', ')} on conflict do nothing`,
            valores,
        );
        gravadas += pedaco.length;
    }
    return { ok: true, gravadas };
}

try {
    await cliente.connect();

    const { rows: existentes } = await cliente.query(
        `select tablename from pg_tables where schemaname = 'public' order by tablename`,
    );
    const nomesNoBanco = new Set(existentes.map((r) => r.tablename));

    // Tabela que existe no backup, esta VAZIA e nao existe no destino nao e
    // problema: nao ha o que restaurar nela. Exigir a tabela so faria a
    // restauracao inteira parar por causa de zero linha.
    const doBackup = Object.keys(tabelas)
        .filter((t) => tabelas[t].length > 0 || nomesNoBanco.has(t))
        .sort();

    const ignoradas = Object.keys(tabelas).filter((t) => !doBackup.includes(t));
    if (ignoradas.length) log(`ignoradas (vazias e inexistentes no destino): ${ignoradas.join(', ')}`);

    const faltandoNoBanco = doBackup.filter((t) => !nomesNoBanco.has(t));

    log(`backup:  ${doBackup.length} tabelas`);
    log(`destino: ${nomesNoBanco.size} tabelas`);

    if (faltandoNoBanco.length) {
        log(`\nESTAS TABELAS NAO EXISTEM NO DESTINO — rode as migracoes antes:`);
        for (const t of faltandoNoBanco) log(`  ${t} (${tabelas[t].length} linha(s) esperando)`);
        log('\nNada foi gravado.');
        process.exit(1);
    }

    // Guarda-vidas, agora com retomada: uma restauracao pode parar no meio (foi
    // o que aconteceu — faltavam colunas). Tabela que ja tem EXATAMENTE as linhas
    // do backup esta pronta e sai da fila. Tabela com um numero DIFERENTE de
    // linhas e estado desconhecido, e ai o script para: pode ser dado vivo de
    // outra origem, e gravar por cima e o unico estrago que ele poderia causar.
    const jaProntas = [];
    const suspeitas = [];
    for (const t of doBackup) {
        const { rows } = await cliente.query(`select count(*)::int n from "${t}"`);
        const n = rows[0].n;
        if (n === 0) continue;
        if (n === tabelas[t].length) jaProntas.push(t);
        else suspeitas.push(`${t} (banco ${n}, backup ${tabelas[t].length})`);
    }

    if (suspeitas.length) {
        log(`\nO DESTINO TEM DADO QUE NAO BATE COM O BACKUP: ${suspeitas.join(', ')}`);
        log('Este script nao grava por cima. Confira antes de continuar.');
        process.exit(1);
    }

    // A conferencia do fim tem que olhar TODAS, inclusive as que ja estavam
    // prontas — senao uma retomada daria "bate tudo" sem ter conferido metade.
    const todas = [...doBackup];

    if (jaProntas.length) {
        log(`\nja restauradas numa tentativa anterior (${jaProntas.length}): ${jaProntas.join(', ')}`);
        for (const t of jaProntas) doBackup.splice(doBackup.indexOf(t), 1);
    }

    const totalEsperado = doBackup.reduce((s, t) => s + tabelas[t].length, 0);
    log(`\nvai gravar ${totalEsperado.toLocaleString('pt-BR')} linha(s) em ${doBackup.length} tabela(s)`);

    if (!APLICAR) {
        log('\n(ensaio: nada foi gravado — rode com --aplicar)');
        process.exit(0);
    }

    // Passadas: o que falhar por chave estrangeira volta na proxima volta.
    let pendentes = doBackup.filter((t) => tabelas[t].length > 0);
    const prontas = doBackup.filter((t) => tabelas[t].length === 0);
    let volta = 0;
    let ultimoErro = new Map();

    while (pendentes.length) {
        volta += 1;
        const sobraram = [];
        log(`\n--- passada ${volta} (${pendentes.length} tabela[s]) ---`);

        for (const t of pendentes) {
            try {
                await cliente.query('begin');
                const { gravadas } = await inserir(t, tabelas[t]);
                await cliente.query('commit');
                prontas.push(t);
                log(`  ok   ${t.padEnd(32)} ${String(gravadas).padStart(6)} linha(s)`);
            } catch (e) {
                await cliente.query('rollback').catch(() => {});
                sobraram.push(t);
                ultimoErro.set(t, e.message);
                log(`  ...  ${t.padEnd(32)} adiada (${e.message.slice(0, 60)})`);
            }
        }

        if (sobraram.length === pendentes.length) {
            log(`\nTRAVOU: ${sobraram.length} tabela(s) nao entram de jeito nenhum.`);
            for (const t of sobraram) log(`  ${t}: ${ultimoErro.get(t)}`);
            process.exit(1);
        }
        pendentes = sobraram;
    }

    // Conferencia final: linha por linha, contra o backup.
    log(`\n--- conferencia ---`);
    let divergiu = false;
    for (const t of todas) {
        const esperado = tabelas[t].length;
        const { rows } = await cliente.query(`select count(*)::int n from "${t}"`);
        const achado = rows[0].n;
        const marca = achado === esperado ? 'ok  ' : 'ERRO';
        if (achado !== esperado) divergiu = true;
        log(`  ${marca} ${t.padEnd(32)} backup ${String(esperado).padStart(6)} | banco ${String(achado).padStart(6)}`);
    }

    log(divergiu ? '\nTERMINOU COM DIFERENCA — confira as linhas marcadas ERRO.' : '\nTERMINOU: bate tudo com o backup.');
    process.exitCode = divergiu ? 1 : 0;
} catch (e) {
    console.error('ERRO:', e.message);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
