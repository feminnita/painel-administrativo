// O papel vem do servidor em admin.role: "admin" (ve tudo) ou
// "atendente:geral,expedicao" (so as conversas dela). Login antigo, sem papel, e administradora.
// Isto so decide o que a TELA mostra; quem barra de verdade e o servidor.
export function ehAdmin(role: string | null | undefined) {
    return !String(role ?? "admin").trim().startsWith("atendente");
}
