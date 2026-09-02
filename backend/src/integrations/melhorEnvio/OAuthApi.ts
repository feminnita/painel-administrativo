import { env } from '../../config/env';

export interface MeTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope?: string;
}

// O OAuth do Melhor Envio (authorize/token) fica na RAIZ do dominio,
// nao no /api/v2. Derivamos a origem do ME_BASE_URL.
// ex.: https://www.melhorenvio.com.br/api/v2 -> https://www.melhorenvio.com.br
export function oauthOrigin(): string {
    return new URL(env.melhorEnvio.baseUrl).origin;
}

async function tokenRequest(body: Record<string, unknown>): Promise<MeTokenResponse> {
    const res = await fetch(`${oauthOrigin()}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': `Feminnita (${env.store.email})`,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        throw new Error(`Melhor Envio oauth/token ${res.status}: ${await res.text()}`);
    }
    return res.json() as Promise<MeTokenResponse>;
}

export function exchangeCodeForToken(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string,
): Promise<MeTokenResponse> {
    return tokenRequest({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
    });
}

export function refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
): Promise<MeTokenResponse> {
    return tokenRequest({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
    });
}
