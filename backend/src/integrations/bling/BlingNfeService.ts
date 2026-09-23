import * as BlingApi from './BlingApi';
import * as TokenService from './TokenService';

export type NotaDoPedido = {
    chave: string;
    numero: string | null;
    pdf: string | null;
};

/**
 * Procura no Bling a NF-e ja emitida para um pedido, e devolve a chave.
 *
 * Existe por causa do FEM-1028, a primeira venda de verdade: R$ 1.240,06 no
 * cartao, cliente esperando. O Melhor Envio recusou a etiqueta com
 * "O valor segurado em envios nao comerciais nao pode ser maior que
 * R$ 1.000,00" — porque o painel declarava TODO envio como nao comercial.
 *
 * A Chris emitiu a nota no Bling e o erro continuou igual: a nota existia de
 * um lado e o painel nao sabia do outro. E isto que liga as duas pontas, sem
 * ela precisar copiar 44 digitos a mao a cada pedido.
 *
 * Devolve null quando nao ha nota, e quem chama decide o que fazer — aqui nao
 * se inventa nota, e envio sem nota continua sendo possivel (com o teto de
 * seguro que o Melhor Envio impoe).
 */
export async function buscarNotaDoPedido(
    blingOrderId: number | string | null,
): Promise<NotaDoPedido | null> {
    if (!blingOrderId) return null;

    const token = await TokenService.getAccessToken();
    if (!token) return null;

    try {
        const pedido = await BlingApi.getSalesOrder(token, blingOrderId);
        const nfeId = pedido?.notaFiscal?.id;
        if (!nfeId) return null;

        const nfe = await BlingApi.getNfe(token, nfeId);
        // 5 = autorizada. Rascunho, denegada ou rejeitada nao viaja com a carga.
        if (!nfe?.chaveAcesso || Number(nfe.situacao) !== 5) return null;

        const chave = String(nfe.chaveAcesso).replace(/\D/g, '');
        if (chave.length !== 44) return null;

        return {
            chave,
            numero: nfe.numero ? String(nfe.numero) : null,
            pdf: nfe.linkPDF ?? null,
        };
    } catch (error) {
        // Nao derruba a geracao da etiqueta: sem nota o envio sai como nao
        // comercial, que e o comportamento de antes.
        console.error('Falha ao buscar NF-e do pedido no Bling:', error);
        return null;
    }
}
