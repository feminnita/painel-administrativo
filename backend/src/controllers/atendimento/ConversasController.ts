import type { Request, Response as Resposta } from 'express';
import { Readable } from 'stream';
import type { ReadableStream as WebReadableStream } from 'stream/web';
import { env } from '../../config/env';
import * as AtendimentoRepository from '../../repository/atendimento/AtendimentoRepository';
import * as AuthRepository from '../../repository/auth/AuthRepository';
import { conversaVisivel, ehAdmin } from '../../services/atendimento/Permissoes';

// Tela "Conversas": o painel e so um repassador autenticado para o sistema de
// marketing (onde a Lia guarda as conversas do WhatsApp). O segredo
// ATENDIMENTO_SECRET fica AQUI no servidor; o navegador nunca o recebe.

const TIMEOUT_MS = 20_000;
// Midia (foto, audio, video) pode ser grande: tempo maior so para ela.
const TIMEOUT_MIDIA_MS = 60_000;
// Foto que a equipe manda para a cliente. O limite geral do JSON (25 MB, em
// server.ts) ja deixa a foto em base64 chegar ate aqui; quem barra o tamanho e esta conta.
const MAX_IMAGEM_BYTES = 8 * 1024 * 1024;
const MIMES_IMAGEM = ['image/jpeg', 'image/png']; // o marketing recusa outros formatos (mime_invalido)
// PDF, audio e video. O arquivo viaja em base64 dentro do JSON, que cresce 1/3:
// 15 MB de arquivo viram 20 MB de texto, dentro do limite geral de 25 MB.
const MAX_ARQUIVO_BYTES = 15 * 1024 * 1024;

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
    if (erro === 'mime_invalido') return 'O WhatsApp nao aceita esse tipo de arquivo. Vale PDF, Word, Excel, PowerPoint, texto, foto JPG/PNG, audio e video MP4.';
    if (erro === 'arquivo_grande') return 'Arquivo grande demais para o WhatsApp.';
    if (erro === 'audio_nao_convertido') return 'Nao foi possivel preparar o audio. Grave de novo.';
    if (erro === 'chave_invalida') return 'O atalho precisa ter de 1 a 40 letras ou numeros (sem acento), comecando por letra ou numero.';
    if (erro === 'texto_invalido') return 'Escreva o texto da mensagem rapida (ate 4096 caracteres).';
    if (erro === 'chave_repetida') return 'Ja existe uma mensagem rapida com esse atalho.';
    if (erro === 'motivo_invalido') return 'Escolha o motivo do fechamento.';
    if (erro === 'assunto_invalido') return 'Assunto invalido.';
    if (erro === 'nome_invalido') return 'Informe o nome da etiqueta (ate 40 letras).';
    if (erro === 'etiqueta_repetida') return 'Ja existe uma etiqueta com esse nome.';
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

type ConversaDoMarketing = { telefone: string; atendimento?: { assunto?: string | null; responsavel?: string | null } | null };

// Conversas que ESTA pessoa pode ver (a administradora ve todas). Guardado por
// 3 segundos: a tela pergunta a lista o tempo todo e cada clique numa conversa
// confere a permissao, entao sem isso seriam varias idas ao marketing por clique.
const visiveisCache = new Map<string, { ate: number; telefones: Set<string> }>();
async function telefonesVisiveis(req: Request): Promise<Set<string>> {
    const chave = `${req.admin?.id}|${req.admin?.role}|${req.admin?.name}`;
    const c = visiveisCache.get(chave);
    if (c && c.ate > Date.now()) return c.telefones;
    const r = await chamarMarketing('/api/atendimento/conversas?limite=500');
    if (!r.ok) throw new FalhaMarketing(502, 'Nao foi possivel conferir as conversas no sistema de marketing');
    const lista = (await r.json()) as ConversaDoMarketing[];
    const telefones = new Set(lista.filter((x) => conversaVisivel(x, req.admin)).map((x) => x.telefone));
    visiveisCache.set(chave, { ate: Date.now() + 3000, telefones });
    return telefones;
}

// true = pode seguir. false = ja respondeu 403 (ou a falha do marketing).
async function podeAbrir(req: Request, res: Resposta, telefone: string): Promise<boolean> {
    if (ehAdmin(req.admin)) return true;
    try {
        if ((await telefonesVisiveis(req)).has(telefone)) return true;
    } catch (e) {
        responderFalha(res, e);
        return false;
    }
    res.status(403).json({ error: 'Essa conversa nao esta com voce.' });
    return false;
}

export async function listarConversas(req: Request, res: Resposta) {
    try {
        const r = await chamarMarketing(`/api/atendimento/conversas?limite=${limite(req.query.limite, 100, 300)}`);
        if (ehAdmin(req.admin) || !r.ok) return repassarJson(r, res);
        const lista = (await r.json()) as ConversaDoMarketing[];
        return res.json(lista.filter((c) => conversaVisivel(c, req.admin)));
    } catch (e) {
        return responderFalha(res, e);
    }
}

// Nomes de quem tem login no painel, para a tela escolher para quem transferir.
// So os nomes: a lista completa (com e-mail e papel) e so da administradora.
export async function equipe(_req: Request, res: Resposta) {
    const todos = await AuthRepository.listAdmins();
    res.json(todos.map((u) => u.name));
}

export async function mensagens(req: Request, res: Resposta) {
    const telefone = String(req.params.telefone);
    if (!TELEFONE.test(telefone)) return res.status(400).json({ error: 'telefone invalido' });
    if (!(await podeAbrir(req, res, telefone))) return;
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
    if (!(await podeAbrir(req, res, telefone))) return;
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
    const { telefone, texto, imagem_base64, arquivo_base64, nome_arquivo, mime, legenda, nota, responde_a } = req.body ?? {};
    if (!TELEFONE.test(String(telefone ?? ''))) return res.status(400).json({ error: 'telefone invalido' });
    if (!(await podeAbrir(req, res, String(telefone)))) return;

    let corpo: Record<string, string | boolean>;
    let comArquivo = false;
    if (nota === true) {
        // Nota interna: o marketing grava e NAO manda para o WhatsApp.
        const t = String(texto ?? '').trim();
        if (!t) return res.status(400).json({ error: 'Nota vazia' });
        if (t.length > 4096) return res.status(400).json({ error: 'Nota longa demais (limite de 4096 caracteres)' });
        corpo = { telefone: String(telefone), texto: t, nota: true };
    } else if (arquivo_base64) {
        const base64 = String(arquivo_base64).replace(/^data:[^,]*,/, '');
        if (Math.floor((base64.length * 3) / 4) > MAX_ARQUIVO_BYTES) {
            return res.status(413).json({ error: 'Arquivo grande demais (limite de 15 MB)' });
        }
        corpo = { telefone: String(telefone), arquivo_base64: base64, mime: String(mime ?? '') };
        if (nome_arquivo && String(nome_arquivo).trim()) corpo.nome_arquivo = String(nome_arquivo).trim().slice(0, 120);
        if (legenda && String(legenda).trim()) corpo.legenda = String(legenda).trim().slice(0, 1024);
        comArquivo = true;
    } else if (imagem_base64) {
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
        // Responder citando: o id da mensagem citada (so para texto).
        if (Number.isInteger(Number(responde_a)) && Number(responde_a) > 0) corpo.responde_a = String(Number(responde_a));
    }
    // Quem esta logado no painel: o marketing guarda para a equipe saber quem respondeu.
    const quem = (req.admin?.name ?? '').trim().slice(0, 40);
    if (quem) corpo.atendente = quem;

    try {
        const r = await chamarMarketing(
            '/api/atendimento/enviar',
            { method: 'POST', body: JSON.stringify(corpo) },
            comArquivo ? TIMEOUT_MIDIA_MS : TIMEOUT_MS,
        );
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
    if (!(await podeAbrir(req, res, telefone))) return;
    try {
        const r = await chamarMarketing('/api/atendimento/liberar', {
            method: 'POST',
            body: JSON.stringify({ telefone, atendente: req.admin?.name ?? '', motivo: 'Devolvida para a Lia' }),
        });
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
    if (!(await podeAbrir(req, res, telefone))) return;
    const c = await AtendimentoRepository.clientePorTelefone(telefone);
    return res.json({ cliente: c });
}

// ---- Mensagens rapidas: textos prontos que a equipe chama com "/" no campo de mensagem.
// Ficam guardadas no marketing, junto das conversas; o painel so repassa.
const ROTA_RAPIDAS = '/api/atendimento/respostas-rapidas';

export async function listarRapidas(_req: Request, res: Resposta) {
    try {
        return repassarJson(await chamarMarketing(ROTA_RAPIDAS), res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

function corpoRapida(req: Request) {
    return JSON.stringify({ chave: String(req.body?.chave ?? ''), texto: String(req.body?.texto ?? '') });
}

export async function criarRapida(req: Request, res: Resposta) {
    try {
        return repassarJson(await chamarMarketing(ROTA_RAPIDAS, { method: 'POST', body: corpoRapida(req) }), res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function editarRapida(req: Request, res: Resposta) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id invalido' });
    try {
        return repassarJson(await chamarMarketing(`${ROTA_RAPIDAS}/${id}`, { method: 'PUT', body: corpoRapida(req) }), res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function excluirRapida(req: Request, res: Resposta) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id invalido' });
    try {
        return repassarJson(await chamarMarketing(`${ROTA_RAPIDAS}/${id}`, { method: 'DELETE' }), res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

// ---- Atendimento: fechar com motivo, transferir, fechados e etiquetas. Tudo guardado no marketing.
// Fechar tambem da baixa no caso da tela Atendimento (o mesmo que "Devolver para a Lia" faz).
export async function fechar(req: Request, res: Resposta) {
    const telefone = String(req.params.telefone);
    if (!TELEFONE.test(telefone)) return res.status(400).json({ error: 'telefone invalido' });
    if (!(await podeAbrir(req, res, telefone))) return;
    const motivo = String(req.body?.motivo ?? '').trim().slice(0, 60);
    if (!motivo) return res.status(400).json({ error: 'Escolha o motivo do fechamento.' });
    const quem = req.admin?.name ?? req.admin?.email ?? 'equipe';
    try {
        const r = await chamarMarketing(`/api/atendimento/conversas/${telefone}/fechar`, {
            method: 'POST',
            body: JSON.stringify({ motivo, atendente: quem }),
        });
        if (!r.ok) return repassarJson(r, res);
    } catch (e) {
        return responderFalha(res, e);
    }
    const casosFechados = await AtendimentoRepository.marcarAtendidoPorTelefone(telefone, quem);
    return res.json({ ok: true, casosFechados });
}

export async function transferir(req: Request, res: Resposta) {
    const telefone = String(req.params.telefone);
    if (!TELEFONE.test(telefone)) return res.status(400).json({ error: 'telefone invalido' });
    if (!(await podeAbrir(req, res, telefone))) return;
    const corpo: Record<string, string> = { atendente: req.admin?.name ?? '' };
    if (typeof req.body?.responsavel === 'string') corpo.responsavel = req.body.responsavel.trim().slice(0, 40);
    if (typeof req.body?.assunto === 'string' && req.body.assunto) corpo.assunto = req.body.assunto;
    if (typeof req.body?.observacao === 'string') corpo.observacao = req.body.observacao.trim().slice(0, 500);
    try {
        return repassarJson(
            await chamarMarketing(`/api/atendimento/conversas/${telefone}/transferir`, { method: 'POST', body: JSON.stringify(corpo) }),
            res,
        );
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function fechados(req: Request, res: Resposta) {
    try {
        const r = await chamarMarketing(`/api/atendimento/fechados?limite=${limite(req.query.limite, 50, 200)}`);
        if (ehAdmin(req.admin) || !r.ok) return repassarJson(r, res);
        const lista = (await r.json()) as { responsavel?: string | null; fechado_por?: string | null }[];
        const eu = req.admin?.name;
        return res.json(lista.filter((f) => f.responsavel === eu || f.fechado_por === eu));
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function listarEtiquetas(_req: Request, res: Resposta) {
    try {
        return repassarJson(await chamarMarketing('/api/atendimento/etiquetas'), res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function criarEtiqueta(req: Request, res: Resposta) {
    if (!ehAdmin(req.admin)) return res.status(403).json({ error: 'So a administradora cadastra etiquetas.' });
    try {
        const corpo = JSON.stringify({ nome: String(req.body?.nome ?? ''), cor: String(req.body?.cor ?? '') });
        return repassarJson(await chamarMarketing('/api/atendimento/etiquetas', { method: 'POST', body: corpo }), res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function excluirEtiqueta(req: Request, res: Resposta) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'id invalido' });
    if (!ehAdmin(req.admin)) return res.status(403).json({ error: 'So a administradora exclui etiquetas.' });
    try {
        return repassarJson(await chamarMarketing(`/api/atendimento/etiquetas/${id}`, { method: 'DELETE' }), res);
    } catch (e) {
        return responderFalha(res, e);
    }
}

export async function marcarEtiquetas(req: Request, res: Resposta) {
    const telefone = String(req.params.telefone);
    if (!TELEFONE.test(telefone)) return res.status(400).json({ error: 'telefone invalido' });
    if (!(await podeAbrir(req, res, telefone))) return;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0) : [];
    try {
        return repassarJson(
            await chamarMarketing(`/api/atendimento/conversas/${telefone}/etiquetas`, { method: 'PUT', body: JSON.stringify({ ids }) }),
            res,
        );
    } catch (e) {
        return responderFalha(res, e);
    }
}
