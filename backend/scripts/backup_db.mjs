/**
 * Backup diário do banco do painel.
 *
 * Le TODAS as tabelas do schema public e grava um unico arquivo .json.gz por
 * execucao. Somente leitura no banco — nunca escreve, nunca apaga nada la.
 *
 * Uso:
 *   node scripts/backup_db.mjs                 # grava em C:\Backups\painel-administrativo
 *   node scripts/backup_db.mjs D:\outro\lugar  # grava noutro lugar
 *
 * Guarda os ultimos DIAS_MANTER arquivos e apaga os mais velhos.
 */
import 'dotenv/config';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DESTINO = process.argv[2] || 'C:\\Backups\\painel-administrativo';
const DIAS_MANTER = 14;

const log = (m) => console.log(`[${new Date().toISOString().slice(0, 19)}] ${m}`);

if (!process.env.DATABASE_URL) {
  console.error('ERRO: DATABASE_URL nao encontrada. O .env do backend foi movido?');
  process.exit(1);
}

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await c.connect();
  fs.mkdirSync(DESTINO, { recursive: true });

  const { rows: tabelas } = await c.query(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`,
  );
  log(`${tabelas.length} tabelas a copiar`);

  const dump = { gerado_em: new Date().toISOString(), tabelas: {} };
  let totalLinhas = 0;

  for (const { tablename } of tabelas) {
    const { rows } = await c.query(`select * from "${tablename}"`);
    dump.tabelas[tablename] = rows;
    totalLinhas += rows.length;
    log(`  ${tablename}: ${rows.length} linha(s)`);
  }

  const carimbo = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const arquivo = path.join(DESTINO, `painel-${carimbo}.json.gz`);
  fs.writeFileSync(arquivo, zlib.gzipSync(JSON.stringify(dump), { level: 9 }));

  const mb = (fs.statSync(arquivo).size / 1024 / 1024).toFixed(2);
  log(`OK: ${arquivo} (${mb} MB, ${totalLinhas} linhas)`);

  // Rotacao: mantem os mais recentes, apaga o resto.
  const antigos = fs
    .readdirSync(DESTINO)
    .filter((f) => f.startsWith('painel-') && f.endsWith('.json.gz'))
    .sort()
    .reverse()
    .slice(DIAS_MANTER);
  for (const f of antigos) {
    fs.unlinkSync(path.join(DESTINO, f));
    log(`removido (rotacao): ${f}`);
  }
} catch (e) {
  console.error(`FALHOU: ${e.message}`);
  process.exitCode = 1;
} finally {
  await c.end().catch(() => {});
}
