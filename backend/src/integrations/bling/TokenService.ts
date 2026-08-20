import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { blingTokens } from '../../config/db/schema';
import { env } from '../../config/env';
import * as BlingApi from './BlingApi';
import type { BlingTokenResponse } from './types';

const TOKEN_ROW_ID = '00000000-0000-0000-0000-000000000001';

export function isBlingConfigured(): boolean {
    return Boolean(env.bling.clientId && env.bling.clientSecret);
}

async function upsertTokenRow(token: BlingTokenResponse): Promise<void> {
    const values = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        scope: token.scope ?? null,
        updateAt: new Date(),
    };

    await db
        .insert(blingTokens)
        .values({ id: TOKEN_ROW_ID, ...values })
        .onConflictDoUpdate({ target: blingTokens.id, set: values });
}

export async function saveInitialTokens(code: string): Promise<void> {
    const token = await BlingApi.exchangeCodeForToken(
        code,
        env.bling.redirectUri,
        env.bling.clientId,
        env.bling.clientSecret,
    );

    await upsertTokenRow(token);
}

async function refreshStoredToken(refreshToken: string): Promise<string> {
    const token = await BlingApi.refreshAccessToken(
        refreshToken,
        env.bling.clientId,
        env.bling.clientSecret
    );
    await upsertTokenRow(token);
    return token.access_token;
}

export async function getAccessToken(): Promise<string | null> {
    const row = await db.query.blingTokens.findFirst({
        where: eq(blingTokens.id, TOKEN_ROW_ID),
    });

    if (!row) return null;

    const expiringSoon = row.expiresAt.getTime() < Date.now() + 5 * 60 * 1000;
    if (!expiringSoon) return row.accessToken;

    try {
        return await refreshStoredToken(row.refreshToken);
    } catch (error) {
        const fresh = await db.query.blingTokens.findFirst({
            where: eq(blingTokens.id, TOKEN_ROW_ID),
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
    const row = await db.query.blingTokens.findFirst({
        where: eq(blingTokens.id, TOKEN_ROW_ID),
    });

    return {
        connected: Boolean(row),
        expiresAt: row?.expiresAt ?? null
    };
}