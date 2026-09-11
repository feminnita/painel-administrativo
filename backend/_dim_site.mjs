// SOMENTE LEITURA. Mede a dimensao real das imagens que o site usa.
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

const urls = new Set();
for (const r of (await c.query(`select images from products where jsonb_array_length(images) > 0 limit 40`)).rows)
  for (const u of r.images || []) urls.add(u);
for (const r of (await c.query(`select images from product_color_images limit 60`)).rows)
  for (const u of r.images || []) urls.add(u);
await c.end();

const lista = [...urls].slice(0, 24);
console.log(`medindo ${lista.length} imagens do site...\n`);

// Le largura/altura do cabecalho do arquivo, sem baixar tudo quando da.
async function dims(url) {
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  // PNG
  if (buf.slice(0, 8).toString('hex') === '89504e470d0a1a0a')
    return [buf.readUInt32BE(16), buf.readUInt32BE(20), buf.length];
  // JPEG
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m))
      return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5), buf.length];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return [0, 0, buf.length];
}

const contagem = new Map();
for (const u of lista) {
  try {
    const [w, h, bytes] = await dims(u);
    const chave = `${w}x${h}`;
    contagem.set(chave, (contagem.get(chave) || 0) + 1);
    const prop = h ? (w / h).toFixed(3) : '?';
    console.log(`  ${String(chave).padEnd(12)} | ${String(Math.round(bytes / 1024)).padStart(5)} KB | proporcao ${prop}`);
  } catch (e) {
    console.log(`  erro: ${String(e.message).slice(0, 50)}`);
  }
}

console.log('\nresumo por dimensao:');
for (const [k, n] of [...contagem].sort((a, b) => b[1] - a[1]))
  console.log(`  ${k.padEnd(12)} -> ${n} imagem(ns)`);
