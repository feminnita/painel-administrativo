import * as MeTokenService from './TokenService';

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // ~15 min

async function tick(): Promise<void> {
    if (!MeTokenService.isMeConfigured()) return;

    try {
        // getAccessToken renova sozinho se estiver perto de expirar (<5min).
        const token = await MeTokenService.getAccessToken();
        if (!token) return; // sem token no banco: aguardando primeira autorizacao
        console.log(`[MELHOR ENVIO] token renovado/valido em ${new Date().toISOString()}`);
    } catch (error) {
        // Token morto silencioso e o pior modo de falha: tem que gritar no log.
        console.error('[MELHOR ENVIO] refresh FALHOU', error);
    }
}

export function startMeTokenRefreshJob(): void {
    if (!MeTokenService.isMeConfigured()) {
        console.log('[MELHOR ENVIO] refresh job nao iniciado (integracao nao configurada)');
        return;
    }

    void tick();
    setInterval(() => void tick(), REFRESH_INTERVAL_MS);
    console.log('[MELHOR ENVIO] refresh job iniciado (a cada 15min)');
}
