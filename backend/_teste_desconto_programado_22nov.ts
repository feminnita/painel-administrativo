// 22/11 teste do job do desconto programado num produto INATIVO (21200, fora do site), banco de produção.
// Passos: programa (já começou) -> roda -> confere especial no ar e normal guardado ->
//         simula alguém salvando outro sale_price -> roda -> confere especial reposto e normal novo ->
//         encerra (fim no passado) -> roda -> confere preço do dia a dia de volta -> limpa tudo como estava.
//   npx tsx _teste_desconto_programado_22nov.ts
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './src/config/db';
import { rodarDescontoProgramado } from './src/jobs/descontoProgramado.Job';

const COD = '21200';
const ler = async () => (await db.execute<Record<string, unknown>>(sql`
    select active, visible_in_store, sale_price, promo_prog_preco, promo_prog_aplicada, promo_prog_preco_normal
    from products where code = ${COD}`)).rows[0];
const ok = (cond: boolean, msg: string) => { console.log(cond ? 'OK  ' : 'FALHOU', msg); if (!cond) process.exitCode = 1; };

async function main() {
const antes = await ler();
console.log('antes', antes);
if (antes.active) throw new Error('produto de teste precisa estar inativo');
const outros = (await db.execute(sql`select count(*)::int n from products where promo_prog_preco is not null or promo_prog_aplicada`)).rows[0];
if ((outros as { n: number }).n) throw new Error('já existe desconto programado em outro produto; teste abortado');
const vis = antes.visible_in_store;

try {
    await db.execute(sql`update products set promo_prog_preco = 9.99, promo_prog_inicio = now() - interval '1 minute',
        promo_prog_fim = now() + interval '10 minutes', promo_prog_lancamento = false where code = ${COD}`);
    await rodarDescontoProgramado();
    let a = await ler();
    ok(a.sale_price === '9.99' && a.promo_prog_aplicada === true && a.promo_prog_preco_normal === antes.sale_price, `entrou: ${JSON.stringify(a)}`);


    await rodarDescontoProgramado();
    const b = await ler();
    ok(JSON.stringify(a) === JSON.stringify(b), 'rodar de novo não muda nada');

    await db.execute(sql`update products set sale_price = 15.55 where code = ${COD}`);
    await rodarDescontoProgramado();
    a = await ler();
    ok(a.sale_price === '9.99' && a.promo_prog_preco_normal === '15.55', `mexeram no preço durante: ${JSON.stringify(a)}`);

    await db.execute(sql`update products set promo_prog_fim = now() - interval '1 second' where code = ${COD}`);
    await rodarDescontoProgramado();
    a = await ler();
    ok(a.sale_price === '15.55' && a.promo_prog_aplicada === false && a.promo_prog_preco_normal === null, `saiu: ${JSON.stringify(a)}`);
} finally {
    await db.execute(sql`update products set sale_price = ${antes.sale_price as string | null}, visible_in_store = ${vis as boolean},
        promo_prog_preco = null, promo_prog_inicio = null, promo_prog_fim = null, promo_prog_lancamento = false,
        promo_prog_aplicada = false, promo_prog_preco_normal = null where code = ${COD}`);
    console.log('limpo, como estava:', await ler());
    process.exit();
}
}
main();
