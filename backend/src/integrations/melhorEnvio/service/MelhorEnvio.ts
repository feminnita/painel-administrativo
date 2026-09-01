import * as MelhorEnvio from '../client/MelhorEnvioClients';
import { env } from '../../../config/env';
import type { LabelOrderData } from '../types';

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function buyLabelForOrder(data: LabelOrderData) {
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

    await MelhorEnvio.checkout([cartItem.id]);
    await MelhorEnvio.generateLabel([cartItem.id]);

    let labelUrl: string | null = null;
    for (const waitMs of [2000, 4000, 8000]) {
        await sleep(waitMs);

        try {
            const printed = await MelhorEnvio.printLabel([cartItem.id]);
            labelUrl = printed.url;
            break;

        } catch (error) {
            console.error('Erro ao gerar etiqueta:', error);
        }
    }

    if (!labelUrl) throw Error('LABEL_NOT_READY');

    const trackingInfo = await MelhorEnvio.tracking([cartItem.id]);
    const trackingCode = trackingInfo[cartItem.id]?.tracking ?? null;

    return {
        meOrderId: cartItem.id,
        labelUrl,
        trackingCode,
    };
}

export async function getTrackingCode(meOrderId: string): Promise<string | null> {
    const trackingInfo = await MelhorEnvio.tracking([meOrderId]);
    return trackingInfo[meOrderId]?.tracking ?? null;
}
