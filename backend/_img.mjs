import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

const p = (await c.query(
    `select id, code, name, images, updated_at from products where code ilike '%31700%'`,
)).rows;

for (const row of p) {
    console.log(`\n== ${row.code}  ${String(row.name).slice(0, 45)}  alterado=${String(row.updated_at).slice(4, 21)}`);
    const capa = Array.isArray(row.images) ? row.images : JSON.parse(row.images || '[]');
    console.log(`   fotos de capa (products.images): ${capa.length}`);
    for (const u of capa) console.log(`     ${String(u).slice(-60)}`);

    const gal = (await c.query(
        `select i.id, pc.name cor, i.color_id, i.images, i.updated_at,
                exists (select 1 from products_skus s
                        where s.product_id = i.product_id and s.color_id = i.color_id) tem_variacao
         from product_color_images i
         left join products_colors pc on pc.id = i.color_id
         where i.product_id = $1
         order by pc.name`,
        [row.id],
    )).rows;

    console.log(`   galerias por cor: ${gal.length}`);
    for (const g of gal) {
        const fotos = Array.isArray(g.images) ? g.images : [];
        console.log(`     ${(g.cor || '(cor apagada)').padEnd(18)} ${String(fotos.length).padStart(2)} fotos  variacao=${g.tem_variacao ? 'sim' : 'NAO (orfa)'}  alt=${String(g.updated_at).slice(4, 21)}`);
        for (const u of fotos) console.log(`         ${String(u).slice(-58)}`);
    }
}
await c.end();
