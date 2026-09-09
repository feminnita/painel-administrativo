// Marca que existe um formulário aberto cujo conteúdo se perde num recarregamento.
//
// Existe por um erro meu: o aviso de "versão nova do painel" oferecia um botão
// "Recarregar agora". Quem estava no meio do cadastro de um produto clicava,
// o navegador perguntava "Sair do site? É possível que as alterações não sejam
// salvas", e bastava um clique errado para perder tudo. O aviso empurrava para
// o recarregamento sem saber que havia trabalho na mesa.
//
// Contador em vez de booleano: pode haver mais de um formulário montado, e o
// primeiro a desmontar não pode zerar o aviso dos outros.
let abertos = 0;
const ouvintes = new Set<() => void>();

function avisar() {
    for (const fn of ouvintes) fn();
}

/** Chame ao montar o formulário. Devolve a função de baixa, para o cleanup. */
export function marcarTrabalhoAberto(): () => void {
    abertos += 1;
    avisar();
    let baixado = false;
    return () => {
        if (baixado) return; // React pode chamar o cleanup mais de uma vez
        baixado = true;
        abertos = Math.max(0, abertos - 1);
        avisar();
    };
}

export function temTrabalhoAberto(): boolean {
    return abertos > 0;
}

export function observarTrabalhoAberto(fn: () => void): () => void {
    ouvintes.add(fn);
    return () => ouvintes.delete(fn);
}
