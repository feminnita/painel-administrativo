/**
 * Encolhe a foto NO ENDERECO, antes de baixar.
 *
 * O painel mostrava as miniaturas assim:
 *
 *     <img src={url} className="h-24 w-20" />
 *
 * Uma caixa de 80x96 pixels baixando o arquivo ORIGINAL, de ~1,5 MB. Com 28
 * fotos por produto em media, abrir UM produto custava ~42 MB; abrir os 91 uma
 * vez custava 3,7 GB. Foi assim que a conta do Cloudinary estourou o plano
 * gratuito em 12/09/2026 (25,9 de 25 creditos) — num dia de cadastro.
 *
 * O Cloudinary redimensiona pelo proprio endereco. Pedindo 160px de largura em
 * vez do original, a mesma foto sai de ~1,5 MB para ~15 KB.
 *
 * Nao mexe em URL que nao seja do Cloudinary, nem em URL que ja traga
 * transformacao — encadear transformacao daria resultado errado (a segunda
 * poderia aumentar de volta o que a primeira reduziu).
 */
const MARCA = "/image/upload/";

// Um segmento como "w_160", "c_fill" ou "f_auto" e transformacao.
// Um segmento como "v1789049358" e versao, e pode ficar depois da nossa.
const JA_TEM_TRANSFORMACAO = /^[a-z]{1,2}_/;

/**
 * Uma largura so para o painel inteiro: 160.
 *
 * Cada largura pedida vira uma imagem derivada NOVA no Cloudinary, e cada
 * derivada conta como transformacao — e o f_auto ainda multiplica por formato
 * (webp, avif, jpg). Pedir 160 num lugar e 200 no outro dobrava a conta para
 * mostrar a mesma miniatura. As transformacoes foram 13,6 dos 32,49 creditos
 * que estouraram o plano gratuito.
 *
 * Se um dia precisar de outro tamanho, pense duas vezes: o barato e reusar a
 * largura que ja existe.
 */
export function miniatura(url: string | null | undefined, largura = 160): string {
    if (!url) return "";
    const limpa = url.trim();

    const i = limpa.indexOf(MARCA);
    if (i === -1) return limpa; // nao e Cloudinary: devolve como veio

    const depois = limpa.slice(i + MARCA.length);
    const primeiroSegmento = depois.split("/")[0] ?? "";
    if (JA_TEM_TRANSFORMACAO.test(primeiroSegmento)) return limpa;

    // q_auto: o Cloudinary escolhe a compressao. f_auto: entrega webp/avif
    // para quem aceita. Os dois juntos costumam valer mais que o resize sozinho.
    return `${limpa.slice(0, i + MARCA.length)}w_${largura},q_auto,f_auto/${depois}`;
}
