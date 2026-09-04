import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api/client";
import type { ResaleTerm } from "./type";

const EMPTY: ResaleTerm = { version: 1, content: "", updatedAt: null };

export function useResaleTermAdmin() {
    // Versão vigente salva no servidor (fonte da verdade da versão exibida).
    const [term, setTerm] = useState<ResaleTerm>(EMPTY);
    // Conteúdo em edição no textarea.
    const [content, setContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            const rows = await api.get<{ key: string; value: any }[]>(
                "/api/admin/settings",
            );
            const stored = rows.find((r) => r.key === "resale_term")?.value;
            const loaded: ResaleTerm = {
                version:
                    typeof stored?.version === "number" && stored.version > 0
                        ? stored.version
                        : 1,
                content: typeof stored?.content === "string" ? stored.content : "",
                updatedAt:
                    typeof stored?.updatedAt === "string" ? stored.updatedAt : null,
            };
            setTerm(loaded);
            setContent(loaded.content);
        } catch (error) {
            console.error("Erro ao carregar o termo de revenda:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Salva mantendo a MESMA versão (corrige typo sem forçar reaceite geral).
    const saveSameVersion = async () => {
        await persist(term.version);
    };

    // Salva INCREMENTANDO a versão (novos checkouts pedem reaceite da versão nova).
    const saveNewVersion = async () => {
        await persist(term.version + 1);
    };

    const persist = async (version: number) => {
        setSaving(true);
        try {
            const payload: ResaleTerm = {
                version,
                content,
                updatedAt: new Date().toISOString(),
            };
            await api.put("/api/admin/settings/resale_term", payload);
            setTerm(payload);
            toast.success(
                version > term.version
                    ? `Nova versão v${version} publicada`
                    : `Versão v${version} atualizada`,
            );
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const dirty = content !== term.content;

    return {
        term,
        content,
        setContent,
        loading,
        saving,
        dirty,
        saveSameVersion,
        saveNewVersion,
    };
}
