import { randomBytes } from 'node:crypto';
import { Request, Response } from 'express';
import { env } from '../../config/env';
import * as MeTokenService from '../../integrations/melhorEnvio/TokenService';
import { oauthOrigin } from '../../integrations/melhorEnvio/OAuthApi';

const STATE_COOKIE = 'me_oauth_state';
const isProduction = env.nodeEnv === 'production';

export async function oauthStart(_req: Request, res: Response) {
    if (!MeTokenService.isMeConfigured()) {
        return res.status(503).json({ error: 'Melhor Envio nao configurado' });
    }

    const state = randomBytes(16).toString('hex');

    res.cookie(STATE_COOKIE, state, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
    });

    const url = new URL(`${oauthOrigin()}/oauth/authorize`);
    url.searchParams.set('client_id', env.melhorEnvio.clientId);
    url.searchParams.set('redirect_uri', env.melhorEnvio.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', MeTokenService.ME_SCOPES);
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
        return res.redirect(`${panel}?melhor_envio=error&msg=${encodeURIComponent(oauthError)}`);
    }

    if (!code || !state || !expectedState || state !== expectedState) {
        return res.redirect(`${panel}?melhor_envio=error&msg=state_invalido`);
    }

    try {
        await MeTokenService.saveInitialTokens(code);
        return res.redirect(`${panel}?melhor_envio=success`);
    } catch (error) {
        console.error('Melhor Envio callback falhou:', error);
        return res.redirect(`${panel}?melhor_envio=error&msg=token_exchange`);
    }
}

export async function status(_req: Request, res: Response) {
    res.json({
        configured: MeTokenService.isMeConfigured(),
        ...(await MeTokenService.getConnectionStatus()),
    });
}
