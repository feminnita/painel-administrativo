import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "@/lib/api/client";
import { ROTULO_TIPO, horaCurta } from "../formatos";
import type { Mensagem } from "../type";

const rotaMidia = (id: string) => `/api/admin/atendimento/midia/${encodeURIComponent(id)}`;

// A rota da midia exige o token no cabecalho Authorization, entao um <img src>
// direto daria 401. Busca com o token e vira um endereco local (blob:). Guarda
// por id: a foto de uma mensagem nao muda e o polling nao baixa de novo.
const cacheMidia = new Map<string, Promise<string>>();
function urlDaMidia(id: string) {
    let p = cacheMidia.get(id);
    if (!p) {
        p = api.getBlob(rotaMidia(id)).then((b) => URL.createObjectURL(b));
        p.catch(() => cacheMidia.delete(id));
        cacheMidia.set(id, p);
    }
    return p;
}

function ImagemAutenticada({ midiaId, alt, onCarregou }: { midiaId: string; alt: string; onCarregou?: () => void }) {
    const [url, setUrl] = useState<string | null>(null);
    const [falhou, setFalhou] = useState(false);

    useEffect(() => {
        let vivo = true;
        urlDaMidia(midiaId).then((u) => { if (vivo) setUrl(u); }).catch(() => { if (vivo) setFalhou(true); });
        return () => { vivo = false; };
    }, [midiaId]);

    if (falhou) return <p className="text-xs italic opacity-70">[foto não carregou]</p>;
    if (!url) return <div className="h-40 w-56 animate-pulse rounded bg-black/10" />;
    return (
        <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={alt} onLoad={onCarregou} className="max-h-72 max-w-full rounded" />
        </a>
    );
}

// Audio, documento e video: so o rotulo e o botao de baixar.
function BaixarMidia({ midiaId, rotulo, mime }: { midiaId: string; rotulo: string; mime: string | null }) {
    const [baixando, setBaixando] = useState(false);
    async function baixar() {
        setBaixando(true);
        try {
            const url = await urlDaMidia(midiaId);
            const a = document.createElement("a");
            a.href = url;
            const ext = mime?.split("/")[1]?.split(";")[0] ?? "bin";
            a.download = `${rotulo.replace(/[[\]]/g, "")}-${midiaId}.${ext}`;
            a.click();
        } catch {
            alert("Não foi possível baixar o arquivo.");
        } finally {
            setBaixando(false);
        }
    }
    return (
        <button type="button" onClick={baixar} disabled={baixando}
            className="inline-flex items-center gap-1 underline disabled:opacity-50">
            <Download size={14} /> {rotulo} {baixando ? "baixando…" : "baixar"}
        </button>
    );
}

const ESTILO = {
    cliente: { lado: "justify-start", balao: "bg-white border text-[#1A1A1A]", rotulo: null },
    lia: { lado: "justify-end", balao: "bg-[#F3E8EA] text-[#1A1A1A]", rotulo: "Lia" },
    equipe: { lado: "justify-end", balao: "bg-[#8C2F39] text-white", rotulo: "Equipe" },
} as const;

export function Balao({ m, onImagemCarregou }: { m: Mensagem; onImagemCarregou?: () => void }) {
    const e = ESTILO[m.autor] ?? ESTILO.cliente;
    const legenda = m.legenda || (m.tipo !== "texto" ? m.texto : null);

    return (
        <div className={`flex ${e.lado}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm md:max-w-[70%] ${e.balao}`}>
                {e.rotulo && <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide opacity-70">{e.rotulo}</p>}

                {m.tipo === "texto" && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}

                {m.tipo === "imagem" && (m.midia_id
                    ? <ImagemAutenticada midiaId={m.midia_id} alt={legenda ?? "foto"} onCarregou={onImagemCarregou} />
                    : <p className="italic opacity-70">[foto]</p>)}

                {m.tipo !== "texto" && m.tipo !== "imagem" && (m.midia_id
                    ? <BaixarMidia midiaId={m.midia_id} rotulo={ROTULO_TIPO[m.tipo] ?? "[arquivo]"} mime={m.midia_mime} />
                    : <p className="italic opacity-70">{ROTULO_TIPO[m.tipo] ?? "[mensagem]"}</p>)}

                {legenda && m.tipo !== "texto" && <p className="mt-1 whitespace-pre-wrap break-words">{legenda}</p>}

                <p className="mt-1 text-right text-[11px] opacity-60">
                    {horaCurta(m.criado_em)}
                    {m.status && m.autor !== "cliente" && m.status !== "recebida" ? ` · ${m.status}` : ""}
                </p>
            </div>
        </div>
    );
}
