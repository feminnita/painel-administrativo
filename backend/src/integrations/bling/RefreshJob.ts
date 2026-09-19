import * as BlingTokenService from './TokenService';

// O access_token do Bling dura 6 horas. Ate hoje ele so era renovado quando
// ALGUEM usava o Bling: uma sincronizacao, um pedido, uma nota. Enquanto a loja
// trabalha todo dia isso se sustenta sozinho — mas basta um feriado prolongado,
// uma semana sem sincronizar ou o servico ficar parado, e o refresh_token vence
// junto. Ai nao tem conserto automatico: alguem precisa entrar no painel e
// refazer a autorizacao na mao.
//
// Foi exatamente o que aconteceu. A integracao caiu calada e so apareceu quando
// deu erro na operacao.
//
// Este job faz o que o Melhor Envio ja fazia: acorda de tempos em tempos e pede
// o token. Quem renova de fato e o getAccessToken, que troca sozinho quando
// falta menos de 5 minutos para vencer. Cada renovacao devolve um refresh_token
// novo, entao o prazo nunca chega perto do fim.
const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // ~15 min

async function tick(): Promise<void> {
    if (!BlingTokenService.isBlingConfigured()) return;

    try {
        const token = await BlingTokenService.getAccessToken();
        if (!token) return; // sem token no banco: aguardando a primeira autorizacao
        console.log(`[BLING] token renovado/valido em ${new Date().toISOString()}`);
    } catch (error) {
        // Token morto silencioso e o pior modo de falha: tem que gritar no log.
        console.error('[BLING] refresh FALHOU', error);
    }
}

export function startBlingTokenRefreshJob(): void {
    if (!BlingTokenService.isBlingConfigured()) {
        console.log('[BLING] refresh job nao iniciado (integracao nao configurada)');
        return;
    }

    void tick();
    setInterval(() => void tick(), REFRESH_INTERVAL_MS);
    console.log('[BLING] refresh job iniciado (a cada 15min)');
}
