import { env } from '../../config/env';

// Canal de alerta maquina -> equipe (@feminnita_alerta_bot). WhatsApp nao serve
// para alerta: fora da janela de 24h a Meta aceita e nao entrega.
export async function enviarAlertaTelegram(texto: string): Promise<boolean> {
    if (!env.telegramAlertaToken || !env.telegramAlertaChatId) return false;
    try {
        const r = await fetch(`https://api.telegram.org/bot${env.telegramAlertaToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: env.telegramAlertaChatId, text: texto }),
        });
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean };
        return j.ok === true;
    } catch {
        return false;
    }
}
