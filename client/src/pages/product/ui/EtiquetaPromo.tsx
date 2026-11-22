// Arte de cada etiqueta da promoção especial (22/11, Chris: "a gente não criou uma
// para cada situação e agora fica tudo igual? Não faz sentido nenhum").
// Este MESMO arquivo existe no painel (client/src/pages/product/ui/EtiquetaPromo.tsx)
// para a prévia mostrar exatamente o que o site mostra — mudou aqui, muda lá.
// Sem dependência de Next: a letra de pincel vem pela classe `pincel` recebida.

type Props = { selo: string; pct: number; termina?: string | null; compacta?: boolean; pincel?: string };

function Brilho({ className = "", cor = "#fff6cc" }: { className?: string; cor?: string }) {
    return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
            <path d="M20 0 C22 13 27 18 40 20 C27 22 22 27 20 40 C18 27 13 22 0 20 C13 18 18 13 20 0 Z" fill={cor} />
        </svg>
    );
}

function Coracao({ className = "" }: { className?: string }) {
    return (
        <svg viewBox="0 0 64 58" className={className} aria-hidden="true">
            <path d="M32 56 C10 40 2 28 2 17 C2 8 9 2 17 2 C24 2 29 6 32 11 C35 6 40 2 47 2 C55 2 62 8 62 17 C62 28 54 40 32 56 Z" fill="#f0435e" />
            <path d="M12 12 C14 8 19 7 22 9" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".85" />
        </svg>
    );
}

const norm = (s: string) => s.trim().toLowerCase();

export function EtiquetaPromo({ selo, pct, termina = null, compacta = false, pincel = "" }: Props) {
    const s = norm(selo);
    const c = compacta;

    // PREÇO DE LANÇAMENTO — preta e dourada (opção B escolhida por ela)
    if (s === "preço de lançamento") {
        return (
            <div className="inline-flex items-stretch overflow-hidden rounded-lg shadow-lg">
                {pct > 0 && (
                    <span className={`flex items-center bg-[#111] font-black text-[#f5b301] ${c ? "px-2 text-base" : "px-4 text-3xl"}`}>
                        {pct}%<span className={`ml-1 font-extrabold text-white ${c ? "text-[9px]" : "text-sm"}`}>OFF</span>
                    </span>
                )}
                <span className={`relative flex flex-col justify-center bg-gradient-to-br from-[#ffe082] via-[#f5b301] to-[#d98c00] text-[#111] ${c ? "px-2 py-0.5" : "px-4 py-2"}`}>
                    <span className={`font-extrabold uppercase ${c ? "text-[7px] tracking-[.2em]" : "text-[11px] tracking-[.25em]"}`}>Preço de</span>
                    <span className={`${pincel} leading-none ${c ? "text-[17px]" : "text-3xl"}`}>lançamento</span>
                    {termina && <span className="text-[10px] font-medium">{termina}</span>}
                    <Brilho className={`absolute ${c ? "-right-0.5 -top-0.5 h-3 w-3" : "right-1 top-1 h-5 w-5"}`} />
                </span>
            </div>
        );
    }

    // BLACK FRIDAY — preta com neon vermelho
    if (s === "black friday") {
        return (
            <div className={`inline-flex items-stretch overflow-hidden rounded-lg border-2 border-[#ff2d55] bg-[#0b0b0b] shadow-[0_0_14px_rgba(255,45,85,.45)]`}>
                {pct > 0 && (
                    <span className={`flex items-center border-r border-[#ff2d55]/60 font-black text-white ${c ? "px-2 text-base" : "px-4 text-3xl"}`}>
                        {pct}%<span className={`ml-1 font-extrabold text-[#ff2d55] ${c ? "text-[9px]" : "text-sm"}`}>OFF</span>
                    </span>
                )}
                <span className={`flex flex-col justify-center leading-none ${c ? "px-2 py-1" : "px-4 py-2"}`}>
                    <span className={`font-black uppercase tracking-[.15em] text-white ${c ? "text-[11px]" : "text-2xl"}`}>Black</span>
                    <span
                        className={`font-black uppercase italic tracking-[.12em] text-[#ff2d55] ${c ? "text-[11px]" : "text-2xl"}`}
                        style={{ textShadow: "0 0 8px rgba(255,45,85,.9)" }}
                    >
                        Friday
                    </span>
                    {termina && <span className="mt-1 text-[10px] font-medium text-gray-300">{termina}</span>}
                </span>
            </div>
        );
    }

    // SÓ HOJE — vermelha e amarela, cara de urgência
    if (s === "só hoje") {
        return (
            <div className="inline-flex items-stretch overflow-hidden rounded-lg bg-gradient-to-r from-[#d90f0f] to-[#ff6a00] shadow-lg">
                {pct > 0 && (
                    <span className={`flex items-center bg-black/25 font-black text-[#ffe14d] ${c ? "px-2 text-base" : "px-4 text-3xl"}`}>
                        {pct}%<span className={`ml-1 font-extrabold text-white ${c ? "text-[9px]" : "text-sm"}`}>OFF</span>
                    </span>
                )}
                <span className={`flex flex-col justify-center text-white ${c ? "px-2 py-1" : "px-4 py-2"}`}>
                    <span className={`font-black uppercase tracking-wide text-[#ffe14d] ${c ? "text-[12px]" : "text-2xl"}`}>⏰ Só hoje</span>
                    {!c && <span className="text-[11px] font-bold uppercase tracking-wider">corre, acaba hoje!</span>}
                    {termina && <span className="text-[10px] font-medium opacity-90">{termina}</span>}
                </span>
            </div>
        );
    }

    // OFERTA ESPECIAL (e qualquer outro texto) — rosa, irmã da "Chegou reposição"
    return (
        <div className={`relative inline-flex items-stretch rounded-xl border-2 border-pink-300 bg-white shadow-md`}>
            <Coracao className={`absolute ${c ? "-left-1.5 -top-1.5 h-3.5 w-3.5" : "-left-2.5 -top-2.5 h-7 w-7"} -rotate-12`} />
            {pct > 0 && (
                <span className={`flex items-center rounded-l-[10px] bg-pink-500 font-black text-white ${c ? "px-2 text-base" : "px-4 text-3xl"}`}>
                    {pct}%<span className={`ml-1 font-extrabold ${c ? "text-[9px]" : "text-sm"}`}>OFF</span>
                </span>
            )}
            <span className={`flex flex-col justify-center text-[#111] ${c ? "px-2 py-0.5" : "px-4 py-1.5"}`}>
                <span className={`${pincel} leading-none text-pink-600 ${c ? "text-[17px]" : "text-3xl"}`}>{s === "oferta especial" ? "Oferta" : selo}</span>
                {s === "oferta especial" && (
                    <span className={`font-extrabold uppercase ${c ? "text-[7px] tracking-[.25em]" : "text-[11px] tracking-[.3em]"}`}>especial</span>
                )}
                {termina && <span className="text-[10px] font-medium text-gray-600">{termina}</span>}
            </span>
            <Coracao className={`absolute ${c ? "-bottom-1.5 -right-1.5 h-3 w-3" : "-bottom-2 -right-2 h-5 w-5"} rotate-12`} />
        </div>
    );
}
