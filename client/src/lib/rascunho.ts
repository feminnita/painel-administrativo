// Rascunho local do formulário de produto.
//
// Existe por um problema real: a Chris edita um produto de muitas variações à
// noite, deixa a tela aberta, e de manhã o "Salvar" volta erro. O formulário
// vive só na memória do React — então recarregar, fechar a aba ou desistir
// significa refazer horas de trabalho do zero.
//
// Daqui em diante o que ela digita fica gravado no navegador dela enquanto
// digita. Não substitui o save (o servidor continua sendo a verdade); é a rede
// de proteção para quando o save falha, a aba morre ou a luz cai.
//
// Fica só no navegador dela: não sobe para o servidor, não vai para outro
// computador. É exatamente o que precisa ser — é o trabalho não terminado.

const PREFIXO = 'feminnita_rascunho_produto_';
const MAXIMO = 3; // guarda os 3 produtos mexidos mais recentemente

export type Rascunho<T> = {
    salvoEm: string; // ISO
    dados: T;
};

function chaveDe(produtoId: string | undefined) {
    return `${PREFIXO}${produtoId ?? 'novo'}`;
}

function chavesExistentes(): string[] {
    const achadas: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIXO)) achadas.push(k);
    }
    return achadas;
}

/** Descarta os rascunhos mais antigos, mantendo os `manter` mais recentes. */
function podar(manter: number) {
    const comData = chavesExistentes().map((k) => {
        let salvoEm = '';
        try {
            salvoEm = JSON.parse(localStorage.getItem(k) ?? '{}').salvoEm ?? '';
        } catch {
            /* rascunho corrompido: trata como o mais antigo de todos */
        }
        return { k, salvoEm };
    });
    comData.sort((a, b) => b.salvoEm.localeCompare(a.salvoEm));
    for (const { k } of comData.slice(manter)) {
        try {
            localStorage.removeItem(k);
        } catch {
            /* nada a fazer */
        }
    }
}

export function salvarRascunho<T>(produtoId: string | undefined, dados: T): void {
    const registro: Rascunho<T> = { salvoEm: new Date().toISOString(), dados };
    const texto = JSON.stringify(registro);
    try {
        localStorage.setItem(chaveDe(produtoId), texto);
        podar(MAXIMO);
    } catch {
        // Cota estourada (produto gigante, ou lixo acumulado). Abre espaço
        // jogando fora os outros rascunhos e tenta de novo — o rascunho do
        // produto que está na tela AGORA é o que não pode se perder.
        try {
            podar(0);
            localStorage.setItem(chaveDe(produtoId), texto);
        } catch {
            /* desistiu: navegador sem espaço ou em aba anônima com storage bloqueado */
        }
    }
}

export function lerRascunho<T>(produtoId: string | undefined): Rascunho<T> | null {
    try {
        const texto = localStorage.getItem(chaveDe(produtoId));
        if (!texto) return null;
        const registro = JSON.parse(texto) as Rascunho<T>;
        return registro && registro.dados !== undefined ? registro : null;
    } catch {
        return null;
    }
}

export function apagarRascunho(produtoId: string | undefined): void {
    try {
        localStorage.removeItem(chaveDe(produtoId));
    } catch {
        /* nada a fazer */
    }
}

/** "hoje às 23:14" / "ontem às 22:40" / "12/09 às 19:03" — para a pergunta de recuperar. */
export function quandoFoi(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'há pouco';

    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dia = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diferenca = (dia(new Date()) - dia(d)) / 86400000;

    if (diferenca === 0) return `hoje às ${hora}`;
    if (diferenca === 1) return `ontem às ${hora}`;
    return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
}
