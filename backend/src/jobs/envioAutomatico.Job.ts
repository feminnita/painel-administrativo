import * as OrderRepository from '../repository/orders/OrderRepository';
import * as ShippingService from '../services/shipping/ShippingService';
import * as OrderService from '../services/orders/OrderService';
import * as MelhorEnvio from '../integrations/melhorEnvio/service/MelhorEnvio';
import * as MeTokenService from '../integrations/melhorEnvio/TokenService';

/**
 * O envio anda sozinho. O unico clique que sobra e o da Chris pagando.
 *
 * O desenho anterior pedia tres cliques dela — mandar ao carrinho, voltar
 * depois de pagar, mandar gerar — e ela cortou, com razao: o sistema sabe
 * quando o pedido foi pago, sabe quando o carrinho foi pago, e sabe quando a
 * etiqueta ficou pronta. Nada disso precisa de gente para acontecer.
 *
 * Tres filas, uma por etapa:
 *   1. pedido pago e fora do carrinho      -> manda para o carrinho
 *   2. no carrinho e ja pago la (released) -> gera a etiqueta
 *   3. com etiqueta e sem rastreio         -> busca o rastreio, marca enviado
 *
 * O painel NUNCA paga nada: a Chris paga o carrinho no Melhor Envio, por PIX.
 * A etapa 2 so age quando o Melhor Envio diz que o envio esta "released", que
 * e o que ele responde depois do pagamento.
 *
 * Retirada na fabrica fica de fora das tres — nao tem transportadora.
 *
 * Cada pedido roda isolado: falha em um nunca derruba os outros, e vira linha
 * no log. Nao marco erro no pedido porque estas etapas sao repetidas de tres em
 * tres minutos; o que falhou agora tenta de novo sozinho.
 */
const INTERVALO_MS = 3 * 60 * 1000;

let rodando = false;

async function mandarParaOCarrinho(): Promise<void> {
    const fila = await OrderRepository.findPaidOrdersToCart();

    for (const pedido of fila) {
        try {
            await ShippingService.sendToCart(pedido.id);
            console.log(`[ENVIO] ${pedido.orderNumber} -> carrinho do Melhor Envio`);
        } catch (erro) {
            const msg = erro instanceof Error ? erro.message : String(erro);
            // Pedido de retirada, sem CPF, sem dados de envio: nao e falha do
            // job, e pedido que nunca vai ter etiqueta. Silencioso de proposito.
            if (['ORDER_IS_PICKUP', 'CUSTOMER_MISSING_CPF', 'ORDER_MISSING_SHIPPING_DATA'].includes(msg)) continue;
            console.error(`[ENVIO] ${pedido.orderNumber} nao entrou no carrinho: ${msg}`);
        }
    }
}

async function gerarEtiquetasPagas(): Promise<void> {
    const fila = await OrderRepository.findCartOrdersWithoutLabel();

    for (const pedido of fila) {
        if (!pedido.meOrderId) continue;

        const situacao = await MelhorEnvio.getOrderStatus(pedido.meOrderId);

        // "pending" = no carrinho, ainda nao pago. Esperar e o certo: gerar
        // antes de pagar so produz erro e enche o log.
        if (situacao !== 'released') continue;

        try {
            await ShippingService.generateLabel(pedido.id);
            console.log(`[ENVIO] ${pedido.orderNumber} -> etiqueta gerada`);
        } catch (erro) {
            console.error(
                `[ENVIO] ${pedido.orderNumber} pago mas a etiqueta falhou:`,
                erro instanceof Error ? erro.message : erro,
            );
        }
    }
}

async function buscarRastreios(): Promise<void> {
    const fila = await OrderRepository.findLabeledOrdersWithoutTracking();

    for (const pedido of fila) {
        if (!pedido.meOrderId) continue;

        try {
            const codigo = await MelhorEnvio.getTrackingCode(pedido.meOrderId);
            if (!codigo) continue; // a transportadora ainda nao devolveu

            // setManualTracking faz as tres coisas de uma vez: grava o rastreio,
            // marca o pedido como enviado e manda o e-mail para a cliente.
            await OrderService.setManualTracking(pedido.id, codigo);
            console.log(`[ENVIO] ${pedido.orderNumber} -> rastreio ${codigo}, cliente avisada`);
        } catch (erro) {
            console.error(
                `[ENVIO] ${pedido.orderNumber} sem rastreio:`,
                erro instanceof Error ? erro.message : erro,
            );
        }
    }
}

async function ciclo(): Promise<void> {
    if (rodando) return; // trava em memoria: ciclos nao se sobrepoem
    rodando = true;

    try {
        if (!MeTokenService.isMeConfigured()) return;

        await mandarParaOCarrinho();
        await gerarEtiquetasPagas();
        await buscarRastreios();
    } catch (erro) {
        console.error('[ENVIO] ciclo falhou:', erro);
    } finally {
        rodando = false;
    }
}

export function startEnvioAutomatico(): void {
    if (!MeTokenService.isMeConfigured()) {
        console.log('[ENVIO] automatico nao iniciado (Melhor Envio nao configurado)');
        return;
    }

    setTimeout(() => void ciclo(), 30 * 1000);
    setInterval(() => void ciclo(), INTERVALO_MS);
    console.log('[ENVIO] automatico iniciado (a cada 3min)');
}
