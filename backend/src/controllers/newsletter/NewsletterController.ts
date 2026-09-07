import { Request, Response } from 'express';
import * as NewsletterRepository from '../../repository/newsletter/NewsletterRepository';

type Situacao = 'ativos' | 'sairam' | 'todos';

function filtroDaBusca(req: Request) {
    const situacao = req.query.situacao;
    return {
        busca: typeof req.query.busca === 'string' ? req.query.busca : undefined,
        situacao: (situacao === 'sairam' || situacao === 'todos' ? situacao : 'ativos') as Situacao,
        origem: typeof req.query.origem === 'string' ? req.query.origem : undefined,
    };
}

export async function list(req: Request, res: Response) {
    const filtro = filtroDaBusca(req);
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const limite = Math.min(200, Math.max(10, Number(req.query.limite) || 50));

    const [linhas, total, resumo, origens] = await Promise.all([
        NewsletterRepository.listar({ ...filtro, limite, deslocamento: (pagina - 1) * limite }),
        NewsletterRepository.contar(filtro),
        NewsletterRepository.resumo(),
        NewsletterRepository.origens(),
    ]);

    res.json({ linhas, total, pagina, limite, resumo, origens });
}

// CSV com ; e BOM: e o que o Excel em portugues abre sem embaralhar coluna nem
// comer acento. Virgula abriria tudo numa coluna so.
function paraCsv(linhas: Record<string, unknown>[]): string {
    const cabecalho = ['E-mail', 'Nome', 'Origem', 'Inscrito em', 'Saiu em'];
    const campo = (v: unknown) => {
        const texto = v == null ? '' : String(v);
        return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const data = (v: unknown) => (v ? new Date(v as string).toLocaleDateString('pt-BR') : '');

    const corpo = linhas.map((l) =>
        [campo(l.email), campo(l.name), campo(l.source), data(l.createdAt), data(l.unsubscribedAt)].join(';'),
    );
    return '﻿' + [cabecalho.join(';'), ...corpo].join('\r\n');
}

export async function exportCsv(req: Request, res: Response) {
    const linhas = await NewsletterRepository.todosParaExportar(filtroDaBusca(req));
    const hoje = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="newsletter-feminnita-${hoje}.csv"`);
    res.send(paraCsv(linhas as unknown as Record<string, unknown>[]));
}
