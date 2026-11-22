// 22/11 Chris: etiqueta "Chegou reposição" por 7 dias, ligada por cor no cadastro do produto. Só acrescenta colunas.
import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
if (process.argv.includes('--aplicar')) {
  await c.query('alter table products add column if not exists reposicao_ate timestamptz');
  await c.query("alter table products add column if not exists reposicao_cores text[] not null default '{}'");
}
console.log((await c.query(`select column_name, data_type, column_default from information_schema.columns where table_name='products' and column_name like 'reposicao%'`)).rows);
await c.end();
