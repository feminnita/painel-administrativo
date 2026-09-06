import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveColorImages, FolderInput } from './resolveColorImages';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolvetest-'));
function mk(name: string, content: string): string { const p = path.join(dir, name); fs.writeFileSync(p, content); return p; }

// arquivos
const A1 = mk('A1.jpg', 'FOTO-1'); const A2 = mk('A2.jpg', 'FOTO-2');
const B1 = mk('B1.jpg', 'FOTO-1'); const B2 = mk('B2.jpg', 'FOTO-2'); // B = copia byte-identica de A
const C1 = mk('C1.jpg', 'FOTO-1-REEXPORT'); // parecida, bytes diferentes
const CAPA = mk('CAPA.jpg', 'CAPA-COVER');
const CAPAdup = mk('CAPAdup.jpg', 'FOTO-1'); // capa igual (bytes) a A1

let pass = 0, fail = 0;
function check(label: string, cond: boolean) { console.log((cond ? 'OK  ' : 'FALHA ') + label); cond ? pass++ : fail++; }

// 1) duas pastas regulares IDENTICAS (byte) -> junta, mantem uma
const r1 = resolveColorImages('AzulX', [
  { name: 'past1', isCapa: false, files: [A1, A2] },
  { name: 'past2', isCapa: false, files: [B1, B2] },
]);
check('colisao byte-identica -> ok, 2 imagens (uma copia)', r1.status === 'ok' && r1.images.length === 2);

// 2) duas pastas regulares DIFERENTES -> pendencia
const r2 = resolveColorImages('AzulX', [
  { name: 'past1', isCapa: false, files: [A1, A2] },
  { name: 'past2', isCapa: false, files: [C1, A2] }, // C1 difere de A1
]);
check('colisao com hash diferente -> PENDENCIA', r2.status === 'pendencia');
if (r2.status === 'pendencia') console.log('   motivo:', r2.reason);

// 3) capa + galeria (fotos diferentes) -> ok, capa na posicao 0
const r3 = resolveColorImages('AzulX', [
  { name: 'CAPAx', isCapa: true, files: [CAPA] },
  { name: 'gal', isCapa: false, files: [A1, A2] },
]);
check('capa+galeria -> ok, capa primeira, 3 imagens', r3.status === 'ok' && r3.images.length === 3 && r3.images[0] === CAPA);

// 4) capa byte-identica a uma da galeria -> dedup, capa vence posicao (1 copia)
const r4 = resolveColorImages('AzulX', [
  { name: 'CAPAx', isCapa: true, files: [CAPAdup] }, // == A1
  { name: 'gal', isCapa: false, files: [A1, A2] },
]);
check('capa==galeria(byte) -> dedup, 2 imagens, capa primeira', r4.status === 'ok' && r4.images.length === 2 && r4.images[0] === CAPAdup);

console.log(`\n${pass} OK / ${fail} FALHA`);
fs.rmSync(dir, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
