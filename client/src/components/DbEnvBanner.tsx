import { useEffect, useState } from "react";

// Faixa fixa no topo que mostra em QUAL banco o painel esta conectado.
// A cor NAO e hardcoded pelo atalho: vem do endpoint /api/db-env (conexao real).
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3334";

type DbEnv = "producao" | "teste" | "desconhecido";

const STYLES: Record<DbEnv, { bg: string; text: string }> = {
  producao: { bg: "#c0392b", text: "PRODUÇÃO — DADOS REAIS" },
  teste: { bg: "#1e8e3e", text: "CLONE DE TESTE" },
  desconhecido: { bg: "#c8860a", text: "BANCO DESCONHECIDO — confira o .env" },
};

export function DbEnvBanner() {
  const [env, setEnv] = useState<DbEnv | null>(null);
  const [endpoint, setEndpoint] = useState<string>("");

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/api/db-env`)
      .then((r) => r.json())
      .then((d: { env: DbEnv; endpoint: string }) => {
        if (!alive) return;
        setEnv(d.env);
        setEndpoint(d.endpoint);
      })
      .catch(() => {
        if (alive) setEnv("desconhecido");
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!env) return null;
  const style = STYLES[env] ?? STYLES.desconhecido;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: style.bg,
        color: "#fff",
        textAlign: "center",
        padding: "6px 12px",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 1,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {style.text}
      {endpoint ? ` · ${endpoint}` : ""}
    </div>
  );
}
