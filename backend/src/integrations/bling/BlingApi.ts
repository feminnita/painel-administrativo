import type { BlingContact, BlingProductDetail, BlingProductListItem, BlingStockDeposit, BlingTokenResponse } from './types';

const BLING_BASE = 'https://api.bling.com.br/Api/v3';
export const BLING_SYNC_PAGE_SIZE = 25;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function basicAuthHeader(clientId: string, clientSecret: string): string {
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

async function tokenRequest(
    body: URLSearchParams,
    clientId: string,
    clientSecret: string,
): Promise<BlingTokenResponse> {
    const res = await fetch(`${BLING_BASE}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: basicAuthHeader(clientId, clientSecret),
        },
        body,
    });

    if (!res.ok) {
        throw new Error(`Bling oauth/token: ${await res.text()}`);
    }
    return res.json();
}

export function exchangeCodeForToken(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string,
): Promise<BlingTokenResponse> {
    return tokenRequest(
        new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        }),
        clientId,
        clientSecret,
    );
}

export function refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
): Promise<BlingTokenResponse> {
    return tokenRequest(
        new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
        clientId,
        clientSecret,
    );
}

export function createBlingQueue(minIntervalMs = 400) {
    let chain: Promise<unknown> = Promise.resolve();

    return <T>(fn: () => Promise<T>): Promise<T> => {
        const run = chain.then(async () => {
            await sleep(minIntervalMs);
            return fn();
        });

        chain = run.catch(() => undefined);
        return run;
    };
}

const defaultQueue = createBlingQueue(600);

async function blingFetch<T>(
    token: string,
    path: string,
    init: RequestInit = {},
    params?: Record<string, string>,
    queue = defaultQueue,
): Promise<T> {
    return queue(async () => {
        const url = new URL(`${BLING_BASE}${path}`);
        if (params) {
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        }

        let retries = 4;

        while (retries >= 0) {
            const res = await fetch(url.toString(), {
                ...init,
                headers: {
                    'Content-Type': 'application/json',
                    ...init.headers,
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.status === 429 && retries > 0) {
                retries--;

                const retryAfter = res.headers.get('Retry-After');
                await sleep(retryAfter ? Number(retryAfter) * 1000 : 2000);
                continue;
            }

            if (!res.ok) {
                const text = await res.text();
                const isRateLimit =
                    res.status === 429 ||
                    text.toLocaleLowerCase().includes('limite de requisições');

                if (isRateLimit && retries > 0) {
                    retries--;

                    const retryAfter = res.headers.get('Retry-After');
                    const waitTime = retryAfter
                        ? Number(retryAfter) * 1000
                        : (5 - retries) * 2000;

                    console.warn(
                        `[BLING API] Rate limit atingido. Aguardando ${waitTime}ms...`,
                    );
                    await sleep(waitTime);
                    continue;
                }

                let errorMessage = `Bling API ${res.status}`;

                try {
                    const errorObj = JSON.parse(text);
                    errorMessage = errorObj?.error?.message || errorMessage;
                } catch {
                    errorMessage = `${errorMessage} - ${text.substring(0, 100)}`;
                }
                throw new Error(errorMessage);
            }

            return res.json() as Promise<T>;
        }
        throw new Error('Max retries reached for bling API ');
    });
}

export async function getProductsPage(
    token: string,
    page: number,
): Promise<BlingProductListItem[]> {
    const data = await blingFetch<{ data: BlingProductListItem[] }>(
        token,
        '/produtos',
        { method: 'GET' },
        {
            pagina: String(page),
            limite: String(BLING_SYNC_PAGE_SIZE),
            situacao: 'A',
        },
    );
    return data?.data ?? [];
}

export async function getContactsPage(
    token: string,
    page: number,
): Promise<BlingContact[]> {
    const data = await blingFetch<{ data: BlingContact[] }>(
        token,
        '/contatos',
        { method: 'GET' },
        { pagina: String(page), limite: String(BLING_SYNC_PAGE_SIZE) },
    );
    return data?.data ?? [];
}

export async function getProductDetail(
    token: string,
    id: string,
): Promise<BlingProductDetail | null> {
    try {
        const data = await blingFetch<{ data: BlingProductDetail }>(
            token,
            `/produtos/${id}`,
        );
        return data?.data ?? null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function getProductStock(
    token: string,
    id: number,
): Promise<BlingStockDeposit[]> {
    try {
        const data = await blingFetch<{ data: BlingStockDeposit[] }>(
            token,
            '/estoques',
            { method: 'GET' },
            { idProduto: String(id) },
        );
        return data?.data ?? [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getContactDetail(
    token: string,
    id: number,
): Promise<any | null> {
    try {
        const data = await blingFetch<{ data: any }>(token, `/contatos/${id}`);
        return data?.data ?? null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function postSalesOrder(
    token: string,
    payload: object,
): Promise<{ data?: { id: number } }> {
    return blingFetch(token, '/pedidos/vendas', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}
