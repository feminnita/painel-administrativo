import { randomBytes } from "node:crypto";
import { Request, Response } from "express";
import { env } from '../../config/env';
import * as TokenService from '../../integrations/bling/TokenService';

const STATE_COOKIE = 'bling_oauth_state';
const isProduction = env.nodeEnv === 'production';

export async function oauthStart(_req: Request, res: Response) {
    if (!TokenService.isBlingConfigured()) {
        return res.status(503).json({ error: 'Bling não configurado' });
    }

    const state = randomBytes(16).toString('hex');

    res.cookie(STATE_COOKIE, state, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
    });

    const url = new URL('https://www.bling.com.br/Api/v3/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', env.bling.clientId);
    url.searchParams.set('redirect_uri', env.bling.redirectUri);
    url.searchParams.set('state', state);

    res.redirect(url.toString());
}

export async function oauthCallback(req: Request, res: Response) {
    const panel = `${env.panelUrl}/integracoes`;
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const oauthError = req.query.error as string | undefined;
    const expectedState = req.cookies?.[STATE_COOKIE];

    res.clearCookie(STATE_COOKIE);

    if (oauthError) {
        return res.redirect(`${panel}?bling=error&msg=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state || !expectedState || state !== expectedState) {
        return res.redirect(`${panel}?bling=error&msg=state_invalido`);
    }

    try {
        await TokenService.saveInitialTokens(code);
        return res.redirect(`${panel}?bling=success`);
    } catch (error) {
        console.error('Bling callback falhou:', error);
        return res.redirect(`${panel}?bling=error&msg=token_exchange`);
    }
}

export async function status(_req: Request, res: Response) {
    res.json({
        configured: TokenService.isBlingConfigured(),
        ...(await TokenService.getConnectionStatus()),
    });
}