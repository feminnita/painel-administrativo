import * as MelhorEnvio from '../client/MelhorEnvioClients';
import { env } from '../../../config/env';
import type { LabelOrderData } from '../types';

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Coloca o envio no CARRINHO do Melhor Envio — e para por ai.
 *
 * Antes esta funcao seguia direto para checkout(), que paga com o saldo da
 * carteira. A Chris nao usa carteira: ela paga cada carrinho na hora, com PIX,
 * dentro do Melhor Envio. Com saldo zero, a compra da etiqueta morria em
 * "Seu saldo de R$ 0,00 e insuficiente" — depois de ja ter montado o envio.
 *
 * Agora sao dois passos, do jeito que ela trabalha: o painel monta e manda para
 * o carrinho; ela paga no Melhor Envio; o painel gera e imprime a etiqueta.
 */
export async function addOrderToCart(data: LabelOrderData) {
    const cartItem = await MelhorEnvio.addToCart({
        service: data.serviceId,
        from: {
            name: env.store.name,
            email: env.store.email,
            phone: env.store.phone,
            company_document: env.store.document,
            address: env.store.address,
            number: env.store.number,
            district: env.store.district,
            city: env.store.city,
            state_abbr: env.store.state,
            postal_code: env.store.cep,
        },
        to: {
            name: data.customer.name,
            email: data.customer.email,
            phone: data.customer.phone ?? undefined,
            document: data.customer.cpf,
            address: data.shippingAddress.street,
            number: data.shippingAddress.number,
            complement: data.shippingAddress.complement,
            district: data.shippingAddress.neighborhood,
            city: data.shippingAddress.city,
            state_abbr: data.shippingAddress.state,
            postal_code: data.shippingAddress.cep,
        },
        volumes: [data.package],
        products: data.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitary_value: Number(item.unitaryValue)
        })),
        options: {
            insurance_value: Number(data.total),
            receipt: false,
            own_hand: false,
            non_commercial: true,
        },
    });

    return { meOrderId: cartItem.id };
}

/**
 * Gera e imprime a etiqueta de um envio JA PAGO no Melhor Envio.
 *
 * Nao chama checkout: quem paga e a Chris, no site do Melhor Envio, por PIX.
 * Se ela ainda nao pagou, o proprio Melhor Envio recusa a geracao — e e por
 * isso que o erro dele sobe inteiro para a tela, em vez de virar uma mensagem
 * generica: "nao foi possivel" nao diz se falta pagar ou se algo quebrou.
 */
export async function generateLabelForCart(meOrderId: string) {
    await MelhorEnvio.generateLabel([meOrderId]);

    let labelUrl: string | null = null;
    for (const waitMs of [2000, 4000, 8000]) {
        await sleep(waitMs);

        try {
            const printed = await MelhorEnvio.printLabel([meOrderId]);
            labelUrl = printed.url;
            break;

        } catch (error) {
            console.error('Erro ao gerar etiqueta:', error);
        }
    }

    if (!labelUrl) throw Error('LABEL_NOT_READY');

    const trackingInfo = await MelhorEnvio.tracking([meOrderId]);
    const trackingCode = trackingInfo[meOrderId]?.tracking ?? null;

    return {
        meOrderId,
        labelUrl,
        trackingCode,
    };
}

/**
 * Situacao do envio dentro do Melhor Envio.
 *
 * Serve para o painel saber QUANDO pode gerar a etiqueta sem perguntar nada a
 * Chris: enquanto o carrinho nao foi pago o envio fica "pending"; depois do
 * pagamento vira "released", e so ai a geracao funciona.
 */
export async function getOrderStatus(meOrderId: string): Promise<string | null> {
    try {
        const pedido = await MelhorEnvio.getOrder(meOrderId);
        return pedido?.status ?? null;
    } catch (error) {
        console.error(`[MELHOR ENVIO] nao consegui ler o envio ${meOrderId}:`, error);
        return null;
    }
}

/**
 * Codigo de rastreio do envio.
 *
 * Lido em /me/orders/{id}, e NAO no /me/shipment/tracking, porque os dois
 * endereços do Melhor Envio discordam entre si: com a etiqueta ja gerada as
 * 10:57 e o rastreio 888030936042561 vivo no primeiro, o segundo ainda
 * respondia tracking: null e generated_at: null. O pedido ficou 40 minutos
 * sem rastreio por causa disso — e a cliente, sem o e-mail de "pedido
 * enviado".
 *
 * self_tracking e a rede: e o rastreio do proprio Melhor Envio, que existe
 * quando o da transportadora ainda nao saiu. Melhor um codigo que a cliente
 * consegue acompanhar do que nenhum.
 */
export async function getTrackingCode(meOrderId: string): Promise<string | null> {
    try {
        const pedido = await MelhorEnvio.getOrder(meOrderId);
        return pedido?.tracking || pedido?.self_tracking || null;
    } catch (error) {
        console.error(`[MELHOR ENVIO] nao consegui ler o rastreio de ${meOrderId}:`, error);
        return null;
    }
}
