// 22/11 Chris: etiqueta da promoção especial no site ("Black Friday", "Preço de lançamento"...). Só acrescenta a coluna.
import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
if (process.argv.includes('--aplicar')) await c.query('alter table products add column if not exists promo_prog_selo text');
console.log((await c.query(`select column_name, data_type from information_schema.columns where table_name='products' and column_name='promo_prog_selo'`)).rows);
await c.end();
