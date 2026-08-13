import { products } from '../../../config/db/schema';
import * as MelhorEnvio from '../client/MelhorEnvioClients';
import { combinePackage } from '../domain/MelhorEnvioDomain';
import type { ShippingQuoteOption, LabelOrderData } from '../types';

export type QuotableItem = Parameters<typeof combinePackage>[0][number];

export async function quoteShipping(toCep: string, items: QuotableItem[]): Promise<ShippingQuoteOption[]> {
    const pkg = combinePackage(items);
    const rawOptions = await MelhorEnvio.calculate(toCep, pkg);

    return rawOptions
        .filter((option) => !option.error && option.price)
        .map((option) => ({
            id: option.id,
            name: option.name,
            company: option.company?.name ?? '',
            price: option.price!,
            deliveryDays: option.delivery_time ?? 0,
        }));
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function buyLabelForOrder(data: LabelOrderData) {
    const cartItem = await MelhorEnvio.addToCart({
        service: data.serviceId,
        from: {
            name: process.env.FEMINNITA_NAME,
            email: process.env.FEMINNITA_EMAIL,
            phone: process.env.FEMINNITA_PHONE,
            company_document: process.env.FEMINNITA_DOCUMENT,
            address: process.env.FEMINNITA_ADDRESS,
            number: process.env.FEMINNITA_NUMBER,
            district: process.env.FEMINNITA_DISTRICT,
            city: process.env.FEMINNITA_CITY,
            state_abbr: process.env.FEMINNITA_STATE,
            postal_code: process.env.STORE_CEP,
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

