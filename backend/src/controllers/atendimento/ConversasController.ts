import type { Request, Response as Resposta } from 'express';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { env } from '../../config/env';
import * as AtendimentoRepository from '../../repository/atendimento/AtendimentoRepository';

// Tela "Conversas": o painel e so um repassador autenticado para o sistema de
// marketing (onde a Lia guarda as conversas do WhatsApp). O segredo
// ATENDIMENTO_SECRET fica AQUI no servidor; o navegador nunca o recebe.

const TIMEOUT_MS = 20_000;
// Midia (foto, audio, video) pode ser grande: tempo maior so para ela.
const TIMEOUT_MIDIA_MS = 60_000;
// Foto que a equipe manda para a cliente. O limite geral do JSON (25 MB, em
// server.ts) ja deixa a foto em base64 chegar ate aqui; quem barra o tamanho e esta conta.
const MAX_IMAGEM_BYTES = 8 * 1024 * 1024;
const MIMES_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'];

const TELEFONE = /^\d{10,15}$/;
const MIDIA_ID = /^[\w.-]{1,200}$/;

class FalhaMarketing extends Error {
    constructor(public status: number, message: string) {
        super(message);
    }
}

async function chamarMarketing(caminho: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS) {
    if (!env.liaUrl || !env.atendimentoSecret) {
        throw new FalhaMarketing(503, 'ATENDIMENTO_SECRET ou LIA_URL nao configurado no servidor do painel');
    }
    try {
        return await fetch(`${env.liaUrl}${caminho}`, {
            ...init,
            headers: {
                ...(init.body ? { 'Content-Type': 'application/json' } : {}),
                'x-atendimento-secret': env.atendimentoSecret,
            },
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (e) {
        const nome = (e as { name?: string })?.name;
        if (nome === 'TimeoutError' || nome === 'AbortError') {
            throw new FalhaMarketing(504, `O sistema de marketing nao respondeu em ${Math.round(timeoutMs / 1000)}s`);
        }
        throw new FalhaMarketing(502, 'Nao foi possivel falar com o sistema de marketing');
    }
}

// Texto curto para a tela a partir do erro que o marketing devolveu. O corpo
// original vai junto (erro, detalhe) para quem quiser olhar no navegador.
function mensagemDoErro(status: number, corpo: Record<string, unknown>) {
    const erro = String(corpo.erro ?? '');
    if (erro === 'fora_da_janela_24h') return 'Passaram 24 horas da ultima mensagem da cliente: o WhatsApp so deixa responder quando ela escrever de novo.';
    if (erro === 'modo_teste') return 'O WhatsApp da Lia esta em modo teste: so manda mensagem para os numeros liberados.';
    if (erro === 'meta') return `O WhatsApp (Meta) recusou o envio${corpo.detalhe ? `: ${String(corpo.detalhe)}` : ''}`;
    return erro || `O sistema de marketing respondeu com erro ${status}`;
}

// Repassa a resposta JSON do marketing com o mesmo status. O client do painel
// le a mensagem do campo `error`; o marketing usa `erro`, entao os dois vao.
// 401 do marketing vira 502: um 401 aqui faria o painel deslogar a pessoa,
// mas quem errou foi o segredo entre os dois servidores, nao o login dela.
async function repassarJson(r: Response, res: Resposta) {
    const texto = await r.text();
    let corpo: unknown = null;
    try {
        corpo = texto ? JSON.parse(texto) : null;
    } catch {
        corpo = { erro: texto.slice(0, 300) };
    }
    if (r.status === 401) {
        return res.status(502).json({ error: 'O sistema de marketing recusou o segredo do painel (ATENDIMENTO_SECRET diferente nos dois lados)' });
    }
    if (!r.ok) {
        const obj = corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : {};
        return res.status(r.status).json({ ...obj, error: mensagemDoErro(r.status, obj) });
    }
    return res.status(r.status).json(corpo ?? { ok: true });
}

function responderFalha(res: Resposta, e: unknown) {
    if (e instanceof FalhaMarketing) return res.status(e.status).json({ error: e.message });
    throw e;
}

function limite(valor: unknown, padrao: number, max: number) {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 ? Math.min(n, max) : padrao;
}

export async function listarConversas(req: Request, res: Resposta) {
    try {
        const r = await chamarMarketing(`/api/atendimento/conversas?limite=${limite(req.query.limite, 100, 300)}`);
        return repassarJson(r, res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function mensagens(req: Request, res: Resposta) {
    const telefone = String(req.params.telefone);
    if (!TELEFONE.test(telefone)) return res.status(400).json({ error: 'telefone invalido' });
    const qs = new URLSearchParams({ limite: String(limite(req.query.limite, 50, 200)) });
    if (req.query.antes) qs.set('antes', String(req.query.antes));
    try {
        const r = await chamarMarketing(`/api/atendimento/conversas/${telefone}/mensagens?${qs}`);
        return repassarJson(r, res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function marcarLida(req: Request, res: Resposta) {
    const telefone = String(req.params.telefone);
    if (!TELEFONE.test(telefone)) return res.status(400).json({ error: 'telefone invalido' });
    try {
        const r = await chamarMarketing(`/api/atendimento/conversas/${telefone}/lida`, { method: 'POST' });
        return repassarJson(r, res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

// Foto/audio/documento da conversa: passa o binario adiante sem guardar nada
// no painel, com o mesmo Content-Type que o marketing mandou.
export async function midia(req: Request, res: Resposta) {
    const midiaId = String(req.params.midiaId);
    if (!MIDIA_ID.test(midiaId)) return res.status(400).json({ error: 'midia invalida' });
    try {
        const r = await chamarMarketing(`/api/atendimento/midia/${encodeURIComponent(midiaId)}`, {}, TIMEOUT_MIDIA_MS);
        if (!r.ok || !r.body) return repassarJson(r, res);
        res.status(200);
        res.setHeader('Content-Type', r.headers.get('content-type') ?? 'application/octet-stream');
        const tamanho = r.headers.get('content-length');
        if (tamanho) res.setHeader('Content-Length', tamanho);
        // A midia de uma mensagem nao muda: o navegador pode guardar.
        res.setHeader('Cache-Control', 'private, max-age=86400');
        Readable.fromWeb(r.body as unknown as WebReadableStream<Uint8Array>)
            .on('error', () => res.destroy())
            .pipe(res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function enviar(req: Request, res: Resposta) {
    const { telefone, texto, imagem_base64, mime, legenda } = req.body ?? {};
    if (!TELEFONE.test(String(telefone ?? ''))) return res.status(400).json({ error: 'telefone invalido' });

    let corpo: Record<string, string>;
    if (imagem_base64) {
        if (!MIMES_IMAGEM.includes(String(mime))) return res.status(400).json({ error: 'A foto precisa ser JPG, PNG ou WEBP' });
        const base64 = String(imagem_base64).replace(/^data:[^,]*,/, '');
        if (Math.floor((base64.length * 3) / 4) > MAX_IMAGEM_BYTES) {
            return res.status(413).json({ error: 'Foto grande demais (limite de 8 MB)' });
        }
        corpo = { telefone: String(telefone), imagem_base64: base64, mime: String(mime) };
        if (legenda && String(legenda).trim()) corpo.legenda = String(legenda).trim().slice(0, 1024);
    } else {
        const t = String(texto ?? '').trim();
        if (!t) return res.status(400).json({ error: 'Mensagem vazia' });
        if (t.length > 4096) return res.status(400).json({ error: 'Mensagem longa demais (limite do WhatsApp: 4096 caracteres)' });
        corpo = { telefone: String(telefone), texto: t };
    }

    try {
        const r = await chamarMarketing('/api/atendimento/enviar', { method: 'POST', body: JSON.stringify(corpo) });
        return repassarJson(r, res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

// "Devolver para a Lia": libera a conversa no marketing e, se a Lia tinha
// passado essa cliente para a equipe, fecha o caso na tela Atendimento com o
// nome de quem devolveu (o mesmo que o botao "Atendido" faz). So fecha o caso
// depois que o marketing confirmou, para a fila nao mentir.
export async function devolver(req: Request, res: Resposta) {
    const telefone = String(req.params.telefone);
    if (!TELEFONE.test(telefone)) return res.status(400).json({ error: 'telefone invalido' });
    try {
        const r = await chamarMarketing('/api/atendimento/liberar', { method: 'POST', body: JSON.stringify({ telefone }) });
        if (!r.ok) return repassarJson(r, res);
    } catch (e) {
        return responderFalha(res, e);
    }
    const quem = req.admin?.name ?? req.admin?.email ?? 'equipe';
    const casosFechados = await AtendimentoRepository.marcarAtendidoPorTelefone(telefone, quem);
    return res.json({ ok: true, casosFechados });
}

// Painel "Cliente" ao lado da conversa: cadastro e ultimos pedidos da loja,
// lidos do banco do proprio painel (nao passa pelo marketing). So leitura.
export async function cliente(req: Request, res: Resposta) {
    const telefone = String(req.params.telefone);
    if (!TELEFONE.test(telefone)) return res.status(400).json({ error: 'telefone invalido' });
    const c = await AtendimentoRepository.clientePorTelefone(telefone);
    return res.json({ cliente: c });
}
