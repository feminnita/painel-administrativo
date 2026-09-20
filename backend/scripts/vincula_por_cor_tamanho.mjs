/**
 * Segunda passada do vinculo com o Bling: casa por COR + TAMANHO.
 *
 * A primeira passada (vincula_por_referencia) casa pelo codigo e resolveu o que
 * dava. Sobrou o que tem grafia diferente — a loja escreve 67850PRETOM, o Bling
 * escreve 67850PRM — e o que nao tem codigo nenhum na loja.
 *
 * O Bling guarda a variacao de forma estruturada no nome:
 *     "...Ipanema Cor:Preto;Tamanho:M"
 * Entao da para casar por cor e tamanho sem adivinhar texto livre.
 *
 * Por que isso e seguro aqui, e nao seria em geral: a busca acontece DENTRO de
 * um produto que ja foi casado pelo codigo. "Preto M" e ambiguo na loja toda,
 * mas dentro de um unico produto e uma peca so. Onde houver duas variacoes com
 * a mesma cor e tamanho, o script NAO escolhe — prefere deixar sem vinculo a
 * mandar a venda baixar o estoque da peca errada.
 *
 * Uso:
 *   node scripts/vincula_por_cor_tamanho.mjs             (ensaio)
 *   node scripts/vincula_por_cor_tamanho.mjs --aplicar
 */
import 'dotenv/config';
import pg from 'pg';

const APLICAR = process.argv.includes('--aplicar');
const API = 'https://api.bling.com.br/Api/v3';

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

const cliente = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

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

// "Preto" e "PRETO " e "prêto" sao a mesma cor para efeito de casamento.
const limpa = (v) =>
    String(v ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

// "...Cor:Preto;Tamanho:M" -> { cor: 'preto', tamanho: 'm' }
function leCorETamanho(nome) {
    const cor = /cor\s*:\s*([^;]+)/i.exec(nome ?? '')?.[1];
    const tamanho = /tamanho\s*:\s*([^;]+)/i.exec(nome ?? '')?.[1];
    if (!cor || !tamanho) return null;
    return { cor: limpa(cor), tamanho: limpa(tamanho) };
}

try {
    await cliente.connect();

    const { rows: t } = await cliente.query('select access_token from bling_tokens limit 1');
    if (!t.length) throw new Error('sem token do Bling no banco');
    const token = t[0].access_token;

    const { rows: produtos } = await cliente.query(`
        select p.id, p.code, p.bling_id
        from products p
        where p.active = true
          and p.bling_id is not null
          and exists (
              select 1 from products_skus s
              where s.product_id = p.id and s.bling_id is null
          )
        order by p.code
    `);

    console.log(`${produtos.length} produto(s) ja casados, com variacao pendente\n`);

    let ligadas = 0;
    const semPar = [];
    const ambiguas = [];

    for (const produto of produtos) {
        const detalhe = await bling(`/produtos/${produto.bling_id}`, token);
        const variacoes = detalhe.data?.variacoes ?? [];

        // Chave cor+tamanho -> id. Quando a mesma chave aparece duas vezes, ela
        // vira "ambigua" e sai do mapa: nao da para escolher com seguranca.
        const porCorTamanho = new Map();
        const repetidas = new Set();

        for (const v of variacoes) {
            const lido = leCorETamanho(v.nome);
            if (!lido) continue;
            const chave = `${lido.cor}|${lido.tamanho}`;
            if (porCorTamanho.has(chave)) repetidas.add(chave);
            porCorTamanho.set(chave, v.id);
        }

        const { rows: skus } = await cliente.query(
            `select s.id, s.size, pc.name as cor
             from products_skus s
             left join products_colors pc on pc.id = s.color_id
             where s.product_id = $1 and s.bling_id is null`,
            [produto.id],
        );

        for (const sku of skus) {
            const chave = `${limpa(sku.cor)}|${limpa(sku.size)}`;

            if (repetidas.has(chave)) {
                ambiguas.push(`${produto.code} — ${sku.cor} ${sku.size}`);
                continue;
            }

            const idNoBling = porCorTamanho.get(chave);
            if (!idNoBling) {
                semPar.push(`${produto.code} — ${sku.cor ?? '(sem cor)'} ${sku.size}`);
                continue;
            }

            if (APLICAR) {
                await cliente.query(
                    'update products_skus set bling_id = $1, updated_at = now() where id = $2',
                    [String(idNoBling), sku.id],
                );
            }
            ligadas++;
        }
    }

    console.log(`variacoes a ligar por cor+tamanho: ${ligadas}`);
    console.log(`ambiguas (nao toquei):             ${ambiguas.length}`);
    console.log(`sem par no Bling:                  ${semPar.length}`);

    if (ambiguas.length) {
        console.log('\nambiguas — duas variacoes com a mesma cor e tamanho:');
        for (const l of ambiguas.slice(0, 15)) console.log('   ' + l);
    }
    if (semPar.length) {
        console.log('\nsem par — existe na loja e nao no Bling:');
        for (const l of semPar.slice(0, 20)) console.log('   ' + l);
        if (semPar.length > 20) console.log(`   ... e mais ${semPar.length - 20}`);
    }

    if (!APLICAR) console.log('\n(ensaio: nada foi gravado — rode com --aplicar)');
} catch (e) {
    console.error('ERRO:', e.message);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
