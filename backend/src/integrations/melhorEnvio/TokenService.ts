import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { meTokens } from '../../config/db/schema';
import { env } from '../../config/env';
import * as OAuthApi from './OAuthApi';
import type { MeTokenResponse } from './OAuthApi';

const TOKEN_ROW_ID = 'me-oauth-singleton';

// Escopos de producao: cobrem cotacao + carrinho + etiqueta.
export const ME_SCOPES = [
    'shipping-calculate',
    'shipping-checkout',
    'shipping-generate',
    'shipping-print',
    'shipping-tracking',
    'cart-read',
    'cart-write',
    'orders-read',
    'ecommerce-shipping',
].join(' ');

export function isMeConfigured(): boolean {
    return Boolean(env.melhorEnvio.clientId && env.melhorEnvio.clientSecret);
}

async function upsertTokenRow(token: MeTokenResponse): Promise<void> {
    const values = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope ?? null,
        updatedAt: new Date(),
    };

    await db
        .insert(meTokens)
        .values({ id: TOKEN_ROW_ID, ...values })
        .onConflictDoUpdate({ target: meTokens.id, set: values });
}

export async function saveInitialTokens(code: string): Promise<void> {
    const token = await OAuthApi.exchangeCodeForToken(
        code,
        env.melhorEnvio.redirectUri,
        env.melhorEnvio.clientId,
        env.melhorEnvio.clientSecret,
    );

    await upsertTokenRow(token);
}

async function refreshStoredToken(refreshToken: string): Promise<string> {
    const token = await OAuthApi.refreshAccessToken(
        refreshToken,
        env.melhorEnvio.clientId,
        env.melhorEnvio.clientSecret,
    );
    await upsertTokenRow(token);
    return token.access_token;
}

export async function getAccessToken(): Promise<string | null> {
    const row = await db.query.meTokens.findFirst({
        where: eq(meTokens.id, TOKEN_ROW_ID),
    });

    if (!row) return null;

    const expiringSoon = row.expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
    if (!expiringSoon) return row.accessToken;

    try {
        return await refreshStoredToken(row.refreshToken);
    } catch (error) {
        // Guarda de concorrencia: se outra execucao ja renovou, usa o token novo.
        const fresh = await db.query.meTokens.findFirst({
            where: eq(meTokens.id, TOKEN_ROW_ID),
        });

        if (fresh && fresh.refreshToken !== row.refreshToken) {
            return fresh.accessToken;
        }

        throw error;
    }
}

export async function getConnectionStatus(): Promise<{
    connected: boolean;
    expiresAt: Date | null;
}> {
    const row = await db.query.meTokens.findFirst({
        where: eq(meTokens.id, TOKEN_ROW_ID),
    });

    return {
        connected: Boolean(row),
        expiresAt: row?.expiresAt ?? null,
    };
}
