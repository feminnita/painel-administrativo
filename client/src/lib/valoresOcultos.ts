// Olho que esconde os valores em R$ do painel (início e Vendas).
//
// Pedido da Chris (05/11/2026): ela apresenta o painel para outras empresas e
// não quer o faturamento da loja aparecendo na tela. A escolha fica guardada no
// navegador, para continuar escondido depois de recarregar ou trocar de página.
import { useSyncExternalStore } from "react";

const CHAVE = "painel.valoresOcultos";
const ouvintes = new Set<() => void>();

function ler(): boolean {
    try {
        return localStorage.getItem(CHAVE) === "1";
    } catch {
        return false;
    }
}

let oculto = ler();

function assinar(fn: () => void): () => void {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
}

export function alternarValoresOcultos(): void {
    oculto = !oculto;
    try {
        localStorage.setItem(CHAVE, oculto ? "1" : "0");
    } catch {
        // sem localStorage, vale só até recarregar
    }
    for (const fn of ouvintes) fn();
}

/** true quando os valores em R$ devem aparecer mascarados. */
export function useValoresOcultos(): boolean {
    return useSyncExternalStore(assinar, () => oculto);
}

/** Formata em reais, ou devolve a máscara quando os valores estão ocultos. */
export function fmtValor(value: number, ocultar: boolean): string {
    return ocultar
        ? "••••••"
        : value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
