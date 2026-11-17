// Quem ve o que na tela Conversas.
//
// Regra da Chris (17/11/2026): "eu tenho acesso a todas as conversas mas os
// funcionarios nao quero que tenham". A administradora ve tudo. O funcionario
// (atendente) so ve a conversa que esta com ele, mais as que estao SEM
// responsavel nos assuntos que a administradora liberou para ele. Conversa com
// a Lia, de outra pessoa ou de outro assunto nao aparece nem pode ser aberta.
//
// O papel fica na coluna que ja existia, admin_users.role:
//   "admin"                      -> ve tudo
//   "atendente:geral,expedicao"  -> atendente com esses assuntos

export const ASSUNTOS = ['geral', 'financeiro', 'expedicao', 'afiliada'] as const;
export type Assunto = (typeof ASSUNTOS)[number];
export type Papel = 'admin' | 'atendente';

type Quem = { name?: string | null; role?: string | null } | undefined | null;

const ehAssunto = (v: string): v is Assunto => (ASSUNTOS as readonly string[]).includes(v);

export function lerPapel(role: string | null | undefined): { papel: Papel; assuntos: Assunto[] } {
    const r = String(role ?? 'admin').trim();
    if (!r.startsWith('atendente')) return { papel: 'admin', assuntos: [...ASSUNTOS] };
    const lista = r.includes(':') ? r.slice(r.indexOf(':') + 1).split(',').map((s) => s.trim()).filter(ehAssunto) : [];
    return { papel: 'atendente', assuntos: lista };
}

export function montarRole(papel: Papel, assuntos: unknown): string {
    if (papel === 'admin') return 'admin';
    const lista = Array.isArray(assuntos) ? [...new Set(assuntos.map(String).filter(ehAssunto))] : [];
    return `atendente:${lista.join(',')}`;
}

export const ehAdmin = (quem: Quem) => lerPapel(quem?.role).papel === 'admin';

type ConversaMin = { atendimento?: { assunto?: string | null; responsavel?: string | null } | null };

export function conversaVisivel(c: ConversaMin, quem: Quem): boolean {
    if (ehAdmin(quem)) return true;
    const a = c.atendimento;
    if (!a) return false; // com a Lia: so a administradora
    if (a.responsavel) return a.responsavel === quem?.name;
    return lerPapel(quem?.role).assuntos.includes((a.assunto ?? 'geral') as Assunto);
}
