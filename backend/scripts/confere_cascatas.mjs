/**
 * Confere (e corrige) as regras de exclusao das chaves estrangeiras que apontam
 * para `products`.
 *
 * Existe por um erro meu: ao reconstruir o banco, criei `product_categories`
 * com REFERENCES simples. No banco original a exclusao em cascata estava no
 * proprio Postgres — o codigo do painel apaga `product_color_images` e
 * `products_skus` na mao e conta com o banco para o resto. Sem a cascata,
 * excluir produto passou a falhar, e a tela ainda mentia dizendo "Produto nao
 * encontrado".
 *
 * Lista todas, e com --aplicar recria as que estao sem cascata.
 *
 * Uso:
 *   node scripts/confere_cascatas.mjs              (so mostra)
 *   node scripts/confere_cascatas.mjs --aplicar
 */
import pg from 'pg';
import 'dotenv/config';

const APLICAR = process.argv.includes('--aplicar');

// So entra aqui quem o codigo NAO apaga por conta propria.
//
// `product_color_images` e `products_skus` ficam de fora de proposito: o
// deleteProductsCascade ja apaga as duas explicitamente, na ordem certa, antes
// de mexer no produto. Acrescentar cascata nelas nao consertaria nada e mudaria
// o comportamento do banco sem necessidade.
//
// `order_items` tambem fica de fora, e por um motivo forte: ele GUARDA o
// historico de venda e tem que segurar a exclusao. E essa trava que faz o
// painel dizer "produto tem pedidos — desative em vez de excluir".
const DEVEM_CASCATEAR = new Set([
    'product_categories',
    'product_deleted_variations',
]);

const cliente = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

try {
    await cliente.connect();

    const { rows } = await cliente.query(`
        select
            con.conname                          as nome,
            filha.relname                        as tabela,
            att.attname                          as coluna,
            con.confdeltype                      as regra
        from pg_constraint con
        join pg_class  filha on filha.oid = con.conrelid
        join pg_class  pai   on pai.oid   = con.confrelid
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
        where con.contype = 'f' and pai.relname = 'products'
        order by filha.relname`);

    const legenda = { a: 'nao faz nada', r: 'bloqueia', c: 'CASCATA', n: 'anula', d: 'padrao' };
    const corrigir = [];

    console.log('chaves estrangeiras que apontam para products:\n');
    for (const r of rows) {
        const temCascata = r.regra === 'c';
        const deveria = DEVEM_CASCATEAR.has(r.tabela);
        const marca = deveria && !temCascata ? 'FALTA' : 'ok   ';
        console.log(`  ${marca} ${r.tabela.padEnd(28)} ${r.coluna.padEnd(12)} ${legenda[r.regra] ?? r.regra}`);
        if (deveria && !temCascata) corrigir.push(r);
    }

    if (!corrigir.length) {
        console.log('\nTodas as cascatas necessarias ja existem.');
        process.exit(0);
    }

    console.log(`\n${corrigir.length} chave(s) sem cascata: ${corrigir.map((c) => c.tabela).join(', ')}`);

    if (!APLICAR) {
        console.log('(so mostrando: rode com --aplicar para corrigir)');
        process.exit(0);
    }

    console.log('\n--- corrigindo ---');
    for (const c of corrigir) {
        // Recria a constraint: nao da para "alterar" a regra de exclusao no
        // Postgres, entao derruba e cria de novo dentro da mesma transacao.
        await cliente.query('begin');
        try {
            await cliente.query(`alter table "${c.tabela}" drop constraint "${c.nome}"`);
            await cliente.query(
                `alter table "${c.tabela}" add constraint "${c.nome}"
                 foreign key ("${c.coluna}") references "products"("id") on delete cascade`,
            );
            await cliente.query('commit');
            console.log(`  ok   ${c.tabela}.${c.coluna} -> cascata`);
        } catch (e) {
            await cliente.query('rollback');
            console.log(`  ERRO ${c.tabela}.${c.coluna}: ${e.message}`);
        }
    }
} catch (e) {
    console.error('ERRO:', e.message);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
