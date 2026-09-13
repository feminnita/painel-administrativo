export type StatusAfiliada = 'pendente' | 'aprovada' | 'pausada' | 'bloqueada';

export type Afiliada = {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
    instagram: string | null;
    codigo: string;
    status: StatusAfiliada;
    percentual: number;
    chave_pix: string | null;
    observacoes: string | null;
    criada_em: string;
    /** pedidos pagos e não cancelados que ela trouxe */
    pedidos: number;
    /** quanto a loja faturou com eles */
    vendido: number;
    /** comissão gerada por esses pedidos */
    comissao: number;
    /** quanto já saiu para ela */
    pago: number;
    /** comissão menos o que já foi pago */
    a_pagar: number;
};
