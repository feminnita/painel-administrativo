import crypto from 'crypto';
import fs from 'fs';

// Resolve as imagens FINAIS de UMA cor a partir das pastas de origem (Drive),
// aplicando: CAPA primeiro, dedup byte-identico, e a TRAVA de colisao do Chris.
//
// TRAVA (colisao): se uma cor tem 2+ pastas REGULARES (mesmo nome de cor, ex.: duplicata do Drive),
// so junta se forem BYTE-IDENTICAS. Se os hashes diferem (pode ser re-exportacao/versao parecida,
// que o hash nao pega como igual mas visualmente e a mesma), NAO junta e NAO escolhe -> PENDENCIA.
// Motivo: melhor travar 1 cor do que subir a galeria com foto repetida.
//
// CAPA + galeria NAO entram na trava: sao fotos diferentes de proposito (capa = principal, galeria = outros angulos).
// Capa vai na posicao 0; dedup byte-identico remove repeticao exata entre capa e galeria.

export type FolderInput = { name: string; isCapa: boolean; files: string[] }; // files = caminhos absolutos, ja ordenados alfabeticamente
export type ResolveResult =
  | { status: 'ok'; images: string[] }
  | { status: 'pendencia'; color: string; reason: string; folders: string[] };

function hashFile(p: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

export function resolveColorImages(color: string, folders: FolderInput[]): ResolveResult {
  const capaFolders = folders.filter((f) => f.isCapa);
  let regular = folders.filter((f) => !f.isCapa);

  // TRAVA de colisao: 2+ pastas regulares da mesma cor
  if (regular.length > 1) {
    const sig = regular.map((f) => [...f.files.map(hashFile)].sort().join('|'));
    const allIdentical = sig.every((s) => s === sig[0]);
    if (!allIdentical) {
      return {
        status: 'pendencia',
        color,
        reason:
          `Cor "${color}": ${regular.length} pastas regulares com conteudo DIFERENTE (hashes nao batem). ` +
          `Pode ser re-exportacao/versao parecida — o hash nao garante que nao e duplicata visual. Travado: nao junto nem escolho.`,
        folders: regular.map((f) => f.name),
      };
    }
    // identicas -> mantem so a primeira
    regular = [regular[0]];
  }

  // monta: capa primeiro, depois galeria; dedup byte-identico (capa vence a posicao)
  const images: string[] = [];
  const seen = new Set<string>();
  for (const f of [...capaFolders, ...regular]) {
    for (const file of f.files) {
      const h = hashFile(file);
      if (seen.has(h)) continue; // identica ja incluida -> nao duplica
      seen.add(h);
      images.push(file);
    }
  }
  return { status: 'ok', images };
}
