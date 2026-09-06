import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
    title: string;
    message: string;
    confirmLabel?: string;
    // Rotulo do botao de recusar. Serve para perguntas de DUAS escolhas positivas
    // (ex.: "Usar a cor existente" x "Criar cor separada"), em que "Cancelar" mente.
    cancelLabel?: string;
    danger?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
    const ctx = useContext(ConfirmContext);
    if (!ctx) {
        throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>");
    }
    return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    const close = (value: boolean) => {
        resolver.current?.(value);
        resolver.current = null;
        setOptions(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}

            {options && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => close(false)}
                    />
                    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-3 flex items-center gap-3">
                            {options.danger && (
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500">
                                    <AlertTriangle size={18} />
                                </div>
                            )}
                            <h4 className="font-semibold text-gray-900">
                                {options.title}
                            </h4>
                        </div>
                        <p className="mb-6 text-sm text-gray-600">{options.message}</p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => close(false)}
                                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                {options.cancelLabel ?? "Cancelar"}
                            </button>
                            <button
                                type="button"
                                onClick={() => close(true)}
                                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${options.danger
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-[#8C2F39] hover:bg-[#7a2832]"
                                    }`}
                            >
                                {options.confirmLabel ?? "Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
