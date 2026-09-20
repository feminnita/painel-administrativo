/**
 * Liga produtos e variacoes da loja aos do Bling pelo CODIGO, e so por ele.
 *
 * O envio de pedidos exige bling_id em todo item — sem isso ele se recusa a
 * empurrar, para nao criar cadastro duplicado no Bling. Depois da reconstrucao
 * do banco sobraram 2 produtos e centenas de variacoes sem vinculo, e a
 * sincronizacao normal nao os recuperou.
 *
 * Regra unica: o codigo da loja tem que ser IGUAL ao do Bling. Nada de casar
 * por nome parecido — "Regata Preta M" existe em cinco produtos diferentes, e
 * um vinculo errado manda a venda baixar o estoque da peca errada. Melhor
 * deixar sem vinculo e aparecer o erro do que vincular errado em silencio.
 *
 * O que nao casar e listado no fim, para a Chris decidir: normalmente e grafia
 * diferente (a loja escreve PRETO, o Bling escreve PR) ou variacao sem codigo.
 *
 * Uso:
 *   node scripts/vincula_por_referencia.mjs                (ensaio, nao grava)
 *   node scripts/vincula_por_referencia.mjs --aplicar
 */
import 'dotenv/config';
import pg from 'pg';

const APLICAR = process.argv.includes('--aplicar');
const API = 'https://api.bling.com.br/Api/v3';

const cliente = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// O Bling limita a 3 chamadas por segundo. Sem a pausa, a varredura morre com
// 429 no meio e deixa metade do catalogo ligado e metade nao — pior que nao
// ter comecado, porque esconde o que falta.
async function bling(caminho, token, tentativa = 1) {
    await espera(400);

    const r = await fetch(API + caminho, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });

    if (r.status === 429 && tentativa <= 5) {
        await espera(2000 * tentativa);
        return bling(caminho, token, tentativa + 1);
    }

    if (!r.ok) throw new Error(`Bling ${r.status} em ${caminho}`);
    return r.json();
}

try {
    await cliente.connect();

    const { rows: t } = await cliente.query('select access_token from bling_tokens limit 1');
    if (!t.length) throw new Error('sem token do Bling no banco');
    const token = t[0].access_token;

    const { rows: produtos } = await cliente.query(`
        select p.id, p.code, p.name, p.bling_id
        from products p
        where p.active = true
          and p.code is not null
          and exists (
              select 1 from products_skus s
              where s.product_id = p.id and s.bling_id is null
          )
        order by p.code
    `);

    console.log(`${produtos.length} produto(s) com variacao sem vinculo\n`);

    let produtosLigados = 0;
    let variacoesLigadas = 0;
    const semPar = [];

    for (const produto of produtos) {
        const busca = await bling(`/produtos?codigo=${encodeURIComponent(produto.code)}`, token);
        const achado = (busca.data ?? [])[0];

        if (!achado) {
            semPar.push(`${produto.code} — nao existe no Bling`);
            continue;
        }

        const detalhe = await bling(`/produtos/${achado.id}`, token);
        const variacoes = detalhe.data?.variacoes ?? [];
        const porCodigo = new Map(variacoes.map((v) => [String(v.codigo), v.id]));

        if (!produto.bling_id) {
            if (APLICAR) {
                await cliente.query('update products set bling_id = $1, updated_at = now() where id = $2', [
                    String(achado.id),
                    produto.id,
                ]);
            }
            produtosLigados++;
        }

        const { rows: skus } = await cliente.query(
            'select id, reference from products_skus where product_id = $1 and bling_id is null',
            [produto.id],
        );

        for (const sku of skus) {
            const idNoBling = sku.reference ? porCodigo.get(String(sku.reference)) : undefined;

            if (!idNoBling) {
                semPar.push(`${produto.code} — variacao ${sku.reference ?? '(sem codigo)'}`);
                continue;
            }

            if (APLICAR) {
                await cliente.query('update products_skus set bling_id = $1, updated_at = now() where id = $2', [
                    String(idNoBling),
                    sku.id,
                ]);
            }
            variacoesLigadas++;
        }
    }

    console.log(`produtos a ligar:  ${produtosLigados}`);
    console.log(`variacoes a ligar: ${variacoesLigadas}`);
    console.log(`sem par:           ${semPar.length}`);

    if (semPar.length) {
        console.log('\nsem par (decisao da Chris):');
        for (const linha of semPar.slice(0, 40)) console.log('   ' + linha);
        if (semPar.length > 40) console.log(`   ... e mais ${semPar.length - 40}`);
    }

    if (!APLICAR) console.log('\n(ensaio: nada foi gravado — rode com --aplicar)');
} catch (e) {
    console.error('ERRO:', e.message);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
