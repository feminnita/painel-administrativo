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

    const origin = oauthOrigin();
    const baseUrl = env.melhorEnvio.baseUrl;
    // Loga contra qual ambiente estamos autorizando — sem isso não dá pra saber
    // de que host o token foi emitido.
    console.log(`[MELHOR ENVIO] oauth/start: authorize host=${origin} | ME_BASE_URL=${baseUrl} | client_id=${env.melhorEnvio.clientId}`);

    // TRAVA: o host de autorização SEGUE o ME_BASE_URL. Se ele apontar pra
    // SANDBOX enquanto o app é de produção, autorizar grava token errado no
    // me_tokens e a falha só aparece depois como "frete estranho". Recusa
    // explícito, a menos que ME_ALLOW_SANDBOX=true (sandbox intencional).
    const isSandbox = /sandbox\.melhorenvio/i.test(origin) || /sandbox\.melhorenvio/i.test(baseUrl);
    if (isSandbox && process.env.ME_ALLOW_SANDBOX !== 'true') {
        console.error(`[MELHOR ENVIO] BLOQUEADO: ME_BASE_URL=${baseUrl} é SANDBOX. Corrija para https://www.melhorenvio.com.br/api/v2 (ou ME_ALLOW_SANDBOX=true se for intencional).`);
        return res.status(409).json({
            error: 'ME_BASE_URL aponta para SANDBOX mas o app é de produção. Autorização recusada para não gravar token errado no me_tokens. Corrija ME_BASE_URL para produção e reinicie o serviço.',
            me_base_url: baseUrl,
            authorize_host: origin,
        });
    }

    const state = randomBytes(16).toString('hex');

    res.cookie(STATE_COOKIE, state, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
    });

    const url = new URL(`${origin}/oauth/authorize`);
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
