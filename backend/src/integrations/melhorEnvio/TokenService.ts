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


/**
 * Uma renovacao por vez, por processo.
 *
 * O refresh_token e de uso UNICO: quem usa primeiro recebe um par novo e
 * invalida o antigo. Com dois relogios no mesmo servidor — o que empurra
 * pedidos e o que renova o token — os dois acordavam juntos na hora em que o
 * token estava vencendo, pediam com o mesmo refresh_token, e o segundo levava
 * "invalid_grant". Dai em diante nao havia mais como renovar: so reconectando
 * na mao.
 *
 * Com esta trava, o primeiro que chega faz a chamada e os outros esperam a
 * MESMA promessa. Ninguem gasta o refresh_token duas vezes.
 */
let renovacaoEmCurso: Promise<string> | null = null;

async function refreshStoredToken(refreshToken: string): Promise<string> {
    if (renovacaoEmCurso) return renovacaoEmCurso;

    renovacaoEmCurso = (async () => {
        const token = await OAuthApi.refreshAccessToken(
            refreshToken,
            env.melhorEnvio.clientId,
            env.melhorEnvio.clientSecret,
        );
        await upsertTokenRow(token);
        return token.access_token;
    })().finally(() => {
        renovacaoEmCurso = null;
    });

    return renovacaoEmCurso;
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
