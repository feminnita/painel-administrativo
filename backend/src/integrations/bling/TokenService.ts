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
        const token = await BlingApi.refreshAccessToken(
            refreshToken,
            env.bling.clientId,
            env.bling.clientSecret,
        );
        await upsertTokenRow(token);
        return token.access_token;
    })().finally(() => {
        renovacaoEmCurso = null;
    });

    return renovacaoEmCurso;
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
    expired: boolean;
}> {
    const row = await db.query.blingTokens.findFirst({
        where: eq(blingTokens.id, TOKEN_ROW_ID),
    });

    // "Conectado" tem que significar conectado. Antes bastava existir a linha no
    // banco: com o token vencido as 17:40, o painel continuou verde a noite
    // inteira e a Chris so descobriu porque a venda nao subiu para o Bling. Um
    // aviso que nao avisa e pior que nenhum — ele ensina a confiar.
    const vencido = !row || row.expiresAt.getTime() <= Date.now();

    return {
        connected: !vencido,
        expiresAt: row?.expiresAt ?? null,
        // Para a tela distinguir "nunca conectou" de "conectou e venceu": a
        // primeira precisa de conexao, a segunda de reconexao.
        expired: Boolean(row) && vencido,
    };
}