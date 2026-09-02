import { randomBytes } from "node:crypto";
import { Request, Response } from "express";
import { env } from '../../config/env';
import * as TokenService from '../../integrations/bling/TokenService';
import * as BlingSyncService from '../../integrations/bling/BlingSyncService';
import * as BlingOrderService from '../../integrations/bling/BlingOrderService';
import * as OrderRepository from '../../repository/orders/OrderRepository';


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

export async function syncStep(req: Request, res: Response) {
    try {
        const result = await BlingSyncService.syncStep({
            page: req.body?.page ? Number(req.body.page) : undefined,
            logId: req.body?.logId,
        });

        res.json(result);
    } catch (error) {
        if (error instanceof Error && error.message === 'BLING_NOT_CONNECTED') {
            return res.status(409).json({ error: 'Conecte o Bling antes de fazer o sync' });
        }
        console.error('Bling sync falhou:', error);
        res.status(500).json({
            error: 'Erro ao fazer o sync com o bling'
        });
    }
}

export async function syncLogs(_req: Request, res: Response) {
    res.json(await BlingSyncService.getSyncLogs());
}
export async function pushOrder(req: Request, res: Response) {
    const orderId = req.params.orderId as string;

    // Retry manual: se estava marcado como erro, limpa a pendencia antes de reprocessar.
    await OrderRepository.resetPushToPending(orderId).catch(() => { });

    try {
        const result = await BlingOrderService.pushOrder(orderId);
        await OrderRepository.markPushed(orderId).catch(() => { });
        res.json(result);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'ORDER_NOT_FOUND') {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }
            if (error.message.startsWith('ALREADY_PUSHED')) {
                await OrderRepository.markPushed(orderId).catch(() => { });
                return res.status(409).json({
                    error: 'Pedido já enviado ao Bling',
                    blingOrderId: Number(error.message.split(':')[1]),
                });
            }
            if (error.message === 'BLING_NOT_CONNECTED') {
                return res.status(409).json({ error: 'Conecte o Bling primeiro' });
            }
        }
        const msg = error instanceof Error ? error.message : String(error);
        await OrderRepository.saveBlingPushError(orderId, msg).catch(() => { });
        console.error(`Bling push-order falhou (${orderId}):`, error);
        res.status(500).json({ error: 'Erro ao enviar pedido ao Bling' });
    }
}
