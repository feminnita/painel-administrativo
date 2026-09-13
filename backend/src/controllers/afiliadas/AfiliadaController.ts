import { Request, Response } from 'express';
import * as AfiliadaRepository from '../../repository/afiliadas/AfiliadaRepository';

// String(req.params.id): nesta versao do Express o parametro e tipado como
// string | string[], e uma rota repetida (?id=a&id=b) chegaria como array.

export async function listar(_req: Request, res: Response) {
    try {
        res.json(await AfiliadaRepository.listar());
    } catch (error) {
        console.error('Falha ao listar afiliadas:', error);
        res.status(500).json({ error: 'Não foi possível carregar as afiliadas.' });
    }
}

export async function detalhe(req: Request, res: Response) {
    try {
        const [pedidos, pagamentos] = await Promise.all([
            AfiliadaRepository.pedidosDa(String(req.params.id)),
            AfiliadaRepository.pagamentosDe(String(req.params.id)),
        ]);
        res.json({ pedidos, pagamentos });
    } catch (error) {
        console.error('Falha ao abrir afiliada:', error);
        res.status(500).json({ error: 'Não foi possível abrir esta afiliada.' });
    }
}

export async function atualizar(req: Request, res: Response) {
    try {
        await AfiliadaRepository.atualizar(String(req.params.id), req.body ?? {});
        res.json({ ok: true });
    } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        // Código é único: duas afiliadas com o mesmo link creditariam a errada.
        if (msg.includes('affiliates_code_unique') || msg.includes('duplicate key')) {
            return res.status(409).json({ error: 'Já existe uma afiliada com esse código.' });
        }
        console.error('Falha ao atualizar afiliada:', error);
        res.status(500).json({ error: 'Não foi possível salvar.' });
    }
}

export async function pagar(req: Request, res: Response) {
    try {
        const valor = Number(req.body?.valor);
        // Pagamento é dinheiro: valor inválido tem que parar aqui, não virar
        // linha zerada no extrato dela.
        if (!Number.isFinite(valor) || valor <= 0) {
            return res.status(400).json({ error: 'Informe um valor maior que zero.' });
        }
        res.status(201).json(
            await AfiliadaRepository.registrarPagamento(
                String(req.params.id),
                valor,
                req.body?.forma,
                req.body?.observacao,
            ),
        );
    } catch (error) {
        console.error('Falha ao registrar pagamento:', error);
        res.status(500).json({ error: 'Não foi possível registrar o pagamento.' });
    }
}
