import { Request, Response } from 'express';
import * as SiteSettingsService from '../../services/settings/SiteSettings';

export async function list(req: Request, res: Response) {
    res.json(await SiteSettingsService.listSettings());
}

export async function save(req: Request, res: Response) {
    const key = req.params.key as string;

    try {
        res.json(await SiteSettingsService.saveSetting(key, req.body));
    } catch (error) {
        const message = error instanceof Error ? error.message : '';

        if (message === 'UNKNOWN_SETTINGS_KEY') {
            return res.status(400).json({
                error:
                    `Chave de configuração desconhecida: válidas ${SiteSettingsService.ALLOWED_KEYS.join(', ')}`,
            });
        }
        if (message === 'INVALID_SETTING_VALUE') {
            return res.status(400).json({
                error: 'Valor de configuração inválido, precisa ser JSON',

            });
        }
        console.error(`Erro ao salvar configuração ${key}:`, error);
        res.status(500).json({ error: 'Erro ao salvar  configuração' })
    }
}