// Formato que o sistema de marketing (onde a Lia guarda o WhatsApp) devolve.
// O painel so repassa: os campos ficam com os nomes de la.

export type Autor = "cliente" | "lia" | "equipe";
export type TipoMensagem = "texto" | "imagem" | "audio" | "documento" | "video" | "outro";

export type Conversa = {
    telefone: string;
    nome: string | null;
    ultima: {
        autor: Autor; tipo: TipoMensagem; texto: string | null; criado_em: string;
        // Nota interna (so a equipe ve) e quem da equipe escreveu.
        interna?: boolean; atendente?: string | null;
    } | null;
    nao_lidas: number;
    ultima_cliente_em: string | null;
    pausado_ate: string | null;
    motivo_pausa: string | null;
    etiquetas?: Etiqueta[];
    // Atendimento aberto com a equipe (protocolo, assunto e quem esta cuidando); null = com a Lia.
    atendimento?: { protocolo: number; assunto: Assunto; responsavel: string | null; aberto_em: string | null } | null;
};

export type Assunto = "geral" | "financeiro" | "expedicao" | "afiliada";
export type Etiqueta = { id: number; nome: string; cor: string };
export type Fechado = {
    protocolo: number; telefone: string; nome: string | null; assunto: Assunto; responsavel: string | null;
    aberto_em: string | null; fechado_em: string | null; motivo: string | null; fechado_por: string | null;
};

export type Mensagem = {
    id: number | string;
    autor: Autor;
    tipo: TipoMensagem;
    texto: string | null;
    legenda: string | null;
    midia_id: string | null;
    midia_mime: string | null;
    criado_em: string;
    status: string | null;
    // Quem da equipe respondeu (o nome do login) e se e nota interna (nunca enviada a cliente).
    atendente?: string | null;
    interna?: boolean;
    // id da mensagem citada, quando esta e uma resposta.
    resposta_de?: number | null;
};

// Mensagem rapida: texto pronto chamado com "/" + atalho no campo de mensagem.
export type RespostaRapida = { id: number; chave: string; texto: string };

// Painel "Cliente": cadastro da loja que casou com o telefone do WhatsApp.
export type PedidoDaCliente = {
    id: string;
    numero: string;
    criadoEm: string;
    total: number;
    situacao: string;
    pagamento: string;
    rastreio: string | null;
    rastreioUrl: string | null;
    enviadoEm: string | null;
};

export type ClienteDoTelefone = {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    cidade: string | null;
    uf: string | null;
    pedidos: PedidoDaCliente[];
};
