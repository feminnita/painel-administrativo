import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAtendimento } from "@/pages/atendimento/useAtendimento";

function bip() {
    try {
        const ctx = new AudioContext();
        [0, 0.45].forEach((inicio) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = 880;
            o.connect(g);
            g.connect(ctx.destination);
            g.gain.setValueAtTime(0.25, ctx.currentTime + inicio);
            o.start(ctx.currentTime + inicio);
            o.stop(ctx.currentTime + inicio + 0.3);
        });
    } catch {
        // navegador bloqueia som ate o primeiro clique na pagina
    }
}

// Fica montado no layout do painel: em qualquer tela, quando chega cliente
// aguardando, toca um bip e mostra um aviso fixo ate alguem clicar.
export function AvisoAtendimento() {
    const { abertos } = useAtendimento(20000);
    const vistos = useRef<Set<string> | null>(null);
    const [novos, setNovos] = useState(0);
    const navigate = useNavigate();
    const { pathname } = useLocation();

    useEffect(() => {
        const ids = new Set(abertos.map((c) => c.id));
        if (vistos.current) {
            const chegaram = abertos.filter((c) => !vistos.current!.has(c.id)).length;
            if (chegaram > 0) {
                bip();
                setNovos((n) => n + chegaram);
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Cliente aguardando atendimento", { body: "A Lia passou uma cliente para a equipe." });
                }
            }
        }
        vistos.current = ids;
    }, [abertos]);

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().catch(() => undefined);
        }
    }, []);

    if (novos === 0 || pathname === "/atendimento") return null;

    return (
        <div role="alert" className="fixed right-4 top-4 z-50 max-w-sm rounded-lg border border-red-300 bg-white p-4 shadow-xl">
            <p className="font-semibold text-[#1A1A1A]">🔔 {novos} cliente(s) aguardando atendimento</p>
            <div className="mt-3 flex gap-2">
                <button className="rounded bg-[#1A1A1A] px-3 py-1 text-white" onClick={() => { setNovos(0); navigate("/atendimento"); }}>
                    Ver agora
                </button>
                <button className="rounded border px-3 py-1" onClick={() => setNovos(0)}>Fechar</button>
            </div>
        </div>
    );
}
