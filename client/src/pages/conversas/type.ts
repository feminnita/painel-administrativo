// Formato que o sistema de marketing (onde a Lia guarda o WhatsApp) devolve.
// O painel so repassa: os campos ficam com os nomes de la.

export type Autor = "cliente" | "lia" | "equipe";
export type TipoMensagem = "texto" | "imagem" | "audio" | "documento" | "video" | "outro";

export type Conversa = {
    telefone: string;
    nome: string | null;
    ultima: { autor: Autor; tipo: TipoMensagem; texto: string | null; criado_em: string } | null;
    nao_lidas: number;
    ultima_cliente_em: string | null;
    pausado_ate: string | null;
    motivo_pausa: string | null;
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
};

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
