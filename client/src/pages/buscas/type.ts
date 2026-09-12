export type TermoSemResultado = {
    termo: string;
    /** quantas vezes o termo foi buscado no periodo */
    vezes: number;
    /** quantas visitantes diferentes buscaram — 10 buscas de 1 pessoa pesa menos que de 10 */
    visitas: number;
    ultima: string;
};

export type ResumoDeBuscas = {
    total: number;
    sem_resultado: number;
    visitas_que_buscaram: number;
};

export type RelatorioDeBuscas = {
    dias: number;
    resumo: ResumoDeBuscas;
    termos: TermoSemResultado[];
};
