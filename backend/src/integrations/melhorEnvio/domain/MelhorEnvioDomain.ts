import { PackageDimensions, PackableItem } from "../types";

const DEFAULTS = { weight: 0.3, height: 5, width: 15, length: 20 };

/**
 * Monta a caixa que vai ser declarada a transportadora.
 *
 * O peso SOMA e a caixa CRESCE. Parece obvio, mas antes so o peso somava: as
 * dimensoes ficavam no maximo de um item, e um pedido de 39 pecas era
 * declarado como 30x30x5cm com 8,09kg — 1,80 kg por litro, mais denso que
 * agua. Nenhuma caixa de pijama e assim.
 *
 * Isso custou duas coisas no FEM-1028, a primeira venda de verdade:
 *
 * 1. A transportadora recusou a etiqueta ("Erro ao processar a solicitacao"),
 *    porque a densidade declarada e impossivel.
 * 2. A cotacao saia barata demais, e a diferenca era da Chris. Medido no mesmo
 *    pedido: Jadlog +R$ 95 a +R$ 123, JeT +R$ 17, Total Express +R$ 7.
 *
 * Como cresce: a caixa tende ao CUBO do volume total, e nunca fica menor que
 * a maior peca em nenhum lado. Cubo porque foi a primeira tentativa que nao
 * funcionou que ensinou: crescendo so a altura, 39 pecas viravam uma caixa de
 * 30x30x195cm — transportadora nenhuma aceita quase dois metros de lado.
 *
 * Nao e o empacotamento perfeito (isso seria resolver bin packing para
 * adivinhar a caixa que a Chris escolhe na mao), mas erra para o lado certo:
 * o frete cotado passa a cobrir o frete pago.
 */
export function combinePackage(items: PackableItem[]): PackageDimensions {
    let weight = 0;
    let volume = 0;
    let width = 0;
    let length = 0;
    let alturaDoMaiorItem = 0;

    for (const item of items) {
        const quantidade = item.quantity || 0;
        const peso = Number(item.weightKg) || DEFAULTS.weight;
        const altura = Number(item.pkgHeightCm) || DEFAULTS.height;
        const largura = Number(item.pkgWidthCm) || DEFAULTS.width;
        const comprimento = Number(item.pkgLengthCm) || DEFAULTS.length;

        weight += peso * quantidade;
        volume += altura * largura * comprimento * quantidade;

        width = Math.max(width, largura);
        length = Math.max(length, comprimento);
        alturaDoMaiorItem = Math.max(alturaDoMaiorItem, altura);
    }

    if (!width) width = DEFAULTS.width;
    if (!length) length = DEFAULTS.length;
    if (!alturaDoMaiorItem) alturaDoMaiorItem = DEFAULTS.height;

    // O lado do cubo de mesmo volume, que e a forma mais compacta possivel.
    const lado = Math.cbrt(volume);

    // Nenhum lado menor que a maior peca: nada entra numa caixa mais estreita
    // que o que vai dentro.
    const larguraFinal = Math.max(width, Math.ceil(lado));
    const comprimentoFinal = Math.max(length, Math.ceil(lado));
    const alturaFinal = Math.max(
        alturaDoMaiorItem,
        Math.ceil(volume / (larguraFinal * comprimentoFinal)),
    );

    return {
        weight,
        height: alturaFinal,
        width: larguraFinal,
        length: comprimentoFinal,
    };
}
