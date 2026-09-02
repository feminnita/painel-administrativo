import { env } from '../../../config/env';
import * as MeTokenService from '../TokenService';

async function request<T>(path: string, options: {
    method?: string;
    body?: unknown
} = {}): Promise<T> {
    const accessToken = await MeTokenService.getAccessToken();
    if (!accessToken) {
        throw new Error('MELHOR_ENVIO_NOT_CONNECTED');
    }

    const response = await fetch(`${env.melhorEnvio.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': `Feminnita (${env.store.email})`,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
        const detail = await response.text();
        throw new Error(`MELHOR_ENVIO_ERROR ${response.status}: ${detail}`);
    }

    return response.json() as Promise<T>;
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
    return request<Record<string, {
        tracking?: string;
        status?: string
    }>>('/me/shipment/tracking', {
        method: 'POST',
        body: {
            orders: meOrderIds
        },
    });
}