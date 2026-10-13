import type { Request, Response } from 'express';
import { timingSafeEqual } from 'crypto';
import { env } from '../../config/env';
import * as AtendimentoRepository from '../../repository/atendimento/AtendimentoRepository';

function segredoOk(recebido: string | undefined) {
    if (!env.atendimentoSecret || !recebido) return false;
    const a = Buffer.from(env.atendimentoSecret);
    const b = Buffer.from(recebido);
    return a.length === b.length && timingSafeEqual(a, b);
}

// Entrada do sistema de marketing: a Lia passou uma cliente para a equipe.
// (O alerta no Telegram sai do proprio sistema da Lia, so para caso novo.)
export async function receberCaso(req: Request, res: Response) {
    if (!segredoOk(req.header('x-atendimento-secret'))) return res.sendStatus(401);
    const { telefone, nome, resumo, ultimaMensagem, origem } = req.body ?? {};
    if (!/^\d{10,15}$/.test(String(telefone ?? '')) || !String(resumo ?? '').trim()) {
        return res.status(400).json({ erro: 'telefone e resumo obrigatorios' });
    }
    const r = await AtendimentoRepository.abrirOuAtualizar({
        telefone: String(telefone),
        nome: nome ? String(nome).slice(0, 120) : undefined,
        resumo: String(resumo).slice(0, 500),
        ultimaMensagem: String(ultimaMensagem ?? '').slice(0, 500),
        origem: origem ? String(origem) : undefined,
    });
    return res.status(r.repetido ? 200 : 201).json(r);
}

export async function listar(_req: Request, res: Response) {
    const [abertos, recentes] = await Promise.all([
        AtendimentoRepository.listarAbertos(),
        AtendimentoRepository.listarAtendidosRecentes(),
    ]);
    res.json({ abertos, recentes });
}

export async function atendido(req: Request, res: Response) {
    const quem = req.admin?.name ?? req.admin?.email ?? 'equipe';
    const caso = await AtendimentoRepository.marcarAtendido(String(req.params.id), quem);
    if (!caso) return res.status(404).json({ erro: 'caso nao encontrado ou ja atendido' });
    // Avisa o sistema da Lia: ela volta a poder responder esta cliente (as outras nunca pararam).
    if (env.liaUrl && env.atendimentoSecret) {
        await fetch(`${env.liaUrl}/api/atendimento/liberar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-atendimento-secret': env.atendimentoSecret },
            body: JSON.stringify({ telefone: caso.telefone }),
        }).catch(() => undefined);
    }
    return res.json({ ok: true });
}
