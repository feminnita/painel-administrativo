/**
 * Onde a Chris deixa o pacote, por transportadora.
 *
 * Transportadora que posta em agencia recusa o envio sem saber o ponto — foi
 * o que travou o FEM-1028, a primeira venda de verdade: "A agencia e
 * obrigatoria ao selecionar este servico".
 *
 * O ponto principal e a CLARAMEL (15134), em Nova Friburgo, onde coletam
 * Correios, Jadlog, JeT, Loggi e Buslog — cinco das seis transportadoras que o
 * checkout oferece. A Total Express nao passa la: as unicas da cidade sao MAP
 * Olaria, GOOD PAPERS e MIABR. A MAP tambem e perto, entao e a dela.
 *
 * Isto e escolha FISICA, nao tecnica. Se ela mudar de ponto, muda aqui.
 */

/** Claramel — Nova Friburgo/RJ. O ponto de sempre. */
export const CLARAMEL = 15134;

/** MAP Olaria — Alameda Barao de Nova Friburgo, 131. So a Total Express. */
export const MAP_OLARIA = 39564;

/**
 * Excecoes por servico do Melhor Envio. O que nao estiver aqui usa a Claramel.
 * 35 = Total Express Standard, a unica que nao coleta la.
 */
const POR_SERVICO: Record<number, number | null> = {
    35: MAP_OLARIA,
};

export function agenciaDoServico(serviceId: number | null | undefined): number | null {
    if (!serviceId) return null;
    return serviceId in POR_SERVICO ? POR_SERVICO[serviceId] : CLARAMEL;
}
