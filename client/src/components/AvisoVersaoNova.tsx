import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

// Avisa que existe versão nova do painel no ar.
//
// Sem isso, a Chris ficava horas numa aba aberta e continuava usando a versão
// antiga sem saber. Custou duas rodadas num mesmo dia: correções publicadas que
// ela testava na build velha, e — pior — um "Gerar variações" antigo que
// escondia variações da tela e a fez achar que tinha perdido o trabalho.
//
// Como descobre: o Vite gera o nome do pacote com um hash do conteúdo
// (index-ABC123.js). Basta comparar o nome que ESTA aba carregou com o que o
// servidor entrega agora. Nomes diferentes = build nova. Não precisa de
// endpoint de versão nem de nada no backend.
const INTERVALO_MS = 5 * 60 * 1000;

function pacoteDestaAba(): string | null {
    const tag = document.querySelector<HTMLScriptElement>('script[src*="/assets/index-"]');
    const src = tag?.getAttribute("src");
    return src ? (src.match(/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? null) : null;
}

async function pacoteNoServidor(): Promise<string | null> {
    try {
        const html = await fetch(`/?v=${Date.now()}`, { cache: "no-store" }).then((r) => r.text());
        return html.match(/index-[A-Za-z0-9_-]+\.js/)?.[0] ?? null;
    } catch {
        // Sem internet ou servidor fora: não é hora de incomodar com aviso.
        return null;
    }
}

export function AvisoVersaoNova() {
    const [temVersaoNova, setTemVersaoNova] = useState(false);

    useEffect(() => {
        const meu = pacoteDestaAba();
        if (!meu) return;

        let vivo = true;
        const verificar = async () => {
            const doServidor = await pacoteNoServidor();
            if (vivo && doServidor && doServidor !== meu) setTemVersaoNova(true);
        };

        const t = setInterval(verificar, INTERVALO_MS);
        // Voltar para a aba é o momento mais provável de ter perdido um deploy.
        const aoVoltar = () => document.visibilityState === "visible" && verificar();
        document.addEventListener("visibilitychange", aoVoltar);
        verificar();

        return () => {
            vivo = false;
            clearInterval(t);
            document.removeEventListener("visibilitychange", aoVoltar);
        };
    }, []);

    if (!temVersaoNova) return null;

    return (
        <div className="fixed bottom-4 left-1/2 z-[100] w-[min(92vw,30rem)] -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-lg">
            <p className="text-sm font-semibold text-amber-900">Existe uma versão nova do painel</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Esta aba está rodando a versão antiga. Salve o que estiver aberto e recarregue —
                trabalhar na versão antiga pode mostrar informação desatualizada.
            </p>
            <div className="mt-3 flex gap-2">
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#8C2F39] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#7a2832]"
                >
                    <RefreshCw size={14} />
                    Recarregar agora
                </button>
                <button
                    type="button"
                    onClick={() => setTemVersaoNova(false)}
                    className="rounded-lg px-3 py-2 text-xs text-amber-800 underline hover:text-amber-900"
                >
                    Agora não
                </button>
            </div>
        </div>
    );
}
