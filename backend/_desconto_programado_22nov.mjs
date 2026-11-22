// 22/11 Chris: "dentro do próprio produto, que já tem um preço riscado, ... um preço diferente numa data específica".
// Cria as colunas do DESCONTO PROGRAMADO em products. Só acrescenta (add column if not exists): nada existente muda.
//   node _desconto_programado_22nov.mjs            -> mostra o que existe
//   node _desconto_programado_22nov.mjs --aplicar  -> cria as colunas
import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const COLS = [
  ['promo_prog_preco', 'numeric(10,2)'],          // preço especial
  ['promo_prog_inicio', 'timestamptz'],
  ['promo_prog_fim', 'timestamptz'],
  ['promo_prog_lancamento', 'boolean not null default false'], // produto só aparece na loja no início
  ['promo_prog_aplicada', 'boolean not null default false'],   // a rotina já pôs o preço especial no ar
  ['promo_prog_preco_normal', 'numeric(10,2)'],   // sale_price do dia a dia guardado enquanto o especial está no ar
];
const antes = await c.query(`select column_name from information_schema.columns where table_name='products' and column_name like 'promo_prog%'`);
console.log('já existem:', antes.rows.map((r) => r.column_name));
if (process.argv.includes('--aplicar')) {
  await c.query('begin');
  for (const [n, t] of COLS) await c.query(`alter table products add column if not exists ${n} ${t}`);
  await c.query('commit');
  const d = await c.query(`select column_name, data_type, column_default from information_schema.columns where table_name='products' and column_name like 'promo_prog%' order by column_name`);
  console.table(d.rows);
}
await c.end();
