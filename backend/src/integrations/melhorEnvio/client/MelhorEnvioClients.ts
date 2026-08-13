import { PackageDimensions, RawQuoteOption } from "../types";


async function request<T>(path: string, options: {
    method?: string;
    body?: unknown
} = {}): Promise<T> {
    const response = await fetch(`${process.env.ME_BASE_URL}${path}`, {
        method: options.method ?? 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${process.env.ME_TOKEN}`,
            'User-Agent': 'Feminnita (feminita@gmail.com)',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`MELHOR_ENVIO_ERROR ${response.status}: ${detail}`);
    }

    return response.json() as Promise<T>;
}

export function calculate(toCep: string, pkg: PackageDimensions): Promise<RawQuoteOption[]> {
    return request<RawQuoteOption[]>('/me/shipment/calculate', {
        method: 'POST',
        body: {
            from: { postal_code: process.env.STORE_CEP },
            to: { postal_code: toCep },
            package: pkg,
        },
    });
}

export function addToCart(shipment: Record<string, unknown>) {
    return request<{ id: string }>('/me/cart', {
        method: 'POST',
        body: shipment,
    });
}

export function checkout(meOrderIds: string[]) {
    return request('/me/shipment/checkout', {
        method: 'POST',
        body: {
            order_ids: meOrderIds
        }
    });
}

export function generateLabel(meOrderIds: string[]) {
    return request('/me/shipment/generate', {
        method: 'POST',
        body: {
            orders: meOrderIds
        }
    });
}

export function printLabel(meOrderIds: string[]) {
    return request<{ url: string }>('/me/shipment/print', {
        method: 'POST',
        body: {
            mode: 'private',
            orders: meOrderIds
        },
    });
}

export function tracking(meOrderIds: string[]) {
    return request<Record<string, { tracking?: string; status?: string }>>('/me/shipment/tracking', {
        method: 'POST',
        body: { orders: meOrderIds },
    });
}

export function cancelShipment(meOrderIds: string[]) {
    return request('/me/shipment/cancel', {
        method: 'POST',
        body: {
            order: {
                id: meOrderIds,
                reason_id: '2',
                descripiton: 'Cacelado pela loja'
            }
        },
    });
}