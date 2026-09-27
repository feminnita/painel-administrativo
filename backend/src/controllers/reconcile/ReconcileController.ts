import { Request, Response } from 'express';
import * as ReconcileService from '../../services/reconcile/ReconcileService';
import * as ReconcilePorCodigo from '../../services/reconcile/ReconcilePorCodigo';

function handle(error: unknown, res: Response, fallback: string) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'SEM_TOKEN_BLING') {
        return res.status(400).json({
            error:
                'O Bling não está conectado. Reconecte em Integrações antes de ' +
                'religar as variações pelo código.',
        });
    }
    if (message === 'NO_BACKUP') {
        return res.status(400).json({
            error:
                'Nenhum snapshot do vínculo encontrado (site_settings.bling_id_backup). ' +
                'Clique em "Atualizar backup do vínculo" antes de recadastrar as variações.',
        });
    }
    console.error(fallback, error);
    res.status(500).json({ error: fallback });
}

export async function dryRun(_req: Request, res: Response) {
    try {
        res.json(await ReconcileService.dryRun());
    } catch (error) {
        handle(error, res, 'Erro ao gerar prévia da reconciliação');
    }
}

export async function apply(_req: Request, res: Response) {
    try {
        res.json(await ReconcileService.apply());
    } catch (error) {
        handle(error, res, 'Erro ao aplicar a reconciliação');
    }
}

export async function dryRunPorCodigo(_req: Request, res: Response) {
    try {
        res.json(await ReconcilePorCodigo.dryRunPorCodigo());
    } catch (error) {
        handle(error, res, 'Erro ao gerar a prévia pelo código');
    }
}

export async function applyPorCodigo(_req: Request, res: Response) {
    try {
        res.json(await ReconcilePorCodigo.applyPorCodigo());
    } catch (error) {
        handle(error, res, 'Erro ao religar as variações pelo código');
    }
}

export async function refreshBackup(_req: Request, res: Response) {
    try {
        res.json(await ReconcileService.refreshBackup());
    } catch (error) {
        handle(error, res, 'Erro ao atualizar o backup do vínculo');
    }
}
