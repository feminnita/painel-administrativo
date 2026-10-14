import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAtendimento } from "@/pages/atendimento/useAtendimento";

// Um AudioContext so, destravado no primeiro clique/tecla. O Chrome cria o
// contexto "suspenso" quando ninguem interagiu com a pagina e o som sai MUDO,
// sem erro (14/10/2026: caso chegou, Telegram tocou, painel ficou calado).
let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
    try {
        ctx ??= new AudioContext();
        return ctx;
    } catch {
        return null;
    }
}
function somLiberado() {
    return audio()?.state === "running";
}

function bip() {
    const c = audio();
    if (!c) return;
    c.resume().catch(() => undefined);
    [0, 0.45].forEach((inicio) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.frequency.value = 880;
        o.connect(g);
        g.connect(c.destination);
        g.gain.setValueAtTime(0.25, c.currentTime + inicio);
        o.start(c.currentTime + inicio);
        o.stop(c.currentTime + inicio + 0.3);
    });
}

const REPETE_MS = 60_000;

// Fica montado no layout do painel: em qualquer tela, quando ha cliente
// aguardando, toca um bip e mostra um aviso fixo ate alguem clicar. O bip
// repete a cada minuto enquanto o aviso estiver aberto.
export function AvisoAtendimento() {
    const { abertos } = useAtendimento(20000);
    const vistos = useRef<Set<string> | null>(null);
    const [novos, setNovos] = useState(0);
    const [liberado, setLiberado] = useState(somLiberado());
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Destrava o som no primeiro clique ou tecla em qualquer lugar do painel.
    useEffect(() => {
        const destravar = () => {
            audio()?.resume().then(() => setLiberado(somLiberado())).catch(() => undefined);
        };
        window.addEventListener("pointerdown", destravar);
        window.addEventListener("keydown", destravar);
        return () => {
            window.removeEventListener("pointerdown", destravar);
            window.removeEventListener("keydown", destravar);
        };
    }, []);

    useEffect(() => {
        const ids = new Set(abertos.map((c) => c.id));
        // Na primeira leitura, quem JA esta esperando tambem conta: abrir o painel
        // com cliente na fila tem que avisar, nao so quem chega depois.
        const chegaram = vistos.current
            ? abertos.filter((c) => !vistos.current!.has(c.id)).length
            : abertos.length;
        if (chegaram > 0) {
            bip();
            setNovos((n) => n + chegaram);
            if (vistos.current && "Notification" in window && Notification.permission === "granted") {
                new Notification("Cliente aguardando atendimento", { body: "A Lia passou uma cliente para a equipe." });
            }
        }
        vistos.current = ids;
    }, [abertos]);

    // Na tela Atendimento a fila ja esta a vista; e sem ninguem esperando nao ha o que avisar.
    const visivel = novos > 0 && abertos.length > 0 && pathname !== "/atendimento";

    // Repete o bip enquanto o aviso estiver aberto, e mostra no titulo da aba.
    useEffect(() => {
        if (!visivel) return;
        const original = document.title.replace(/^🔔 \(\d+\) /, "");
        document.title = `🔔 (${novos}) ${original}`;
        const t = window.setInterval(bip, REPETE_MS);
        return () => {
            window.clearInterval(t);
            document.title = original;
        };
    }, [novos, visivel]);

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(() => undefined);
        }
    }, []);

    if (!visivel) return null;

    return (
        <div role="alert" className="fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-red-300 bg-white p-4 shadow-xl">
            <p className="font-semibold text-[#1A1A1A]">🔔 {novos} cliente(s) aguardando atendimento</p>
            {!liberado && (
                <button className="mt-2 text-sm text-red-700 underline" onClick={() => { audio()?.resume().then(() => { setLiberado(somLiberado()); bip(); }); }}>
                    Clique aqui para ativar o som
                </button>
            )}
            <div className="mt-3 flex gap-2">
                <button className="rounded bg-[#1A1A1A] px-3 py-1 text-white" onClick={() => { setNovos(0); navigate("/atendimento"); }}>
                    Ver agora
                </button>
                <button className="rounded border px-3 py-1" onClick={() => setNovos(0)}>Fechar</button>
            </div>
        </div>
    );
}
