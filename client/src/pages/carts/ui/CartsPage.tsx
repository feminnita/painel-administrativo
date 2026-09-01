import { MessageCircle, Package, RefreshCw, ShoppingBag } from "lucide-react";
import { useCartsAdmin } from "../useCartsAdmin";
import type { AbandonedCart } from "../types";

function fmtBRL(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function timeAgo(iso: string): string {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days} dia${days > 1 ? "s" : ""}`;
}

function whatsappLink(cart: AbandonedCart): string {
    const phone = (cart.customerPhone ?? "").replace(/\D/g, "");
    const firstName = cart.customerName.split(" ")[0];
    const message =
        `Oi ${firstName}! Aqui é da Feminnita` +
        `Vimos que você deixou ${cart.items.length > 1 ? "alguns itens" : "um item"} no carrinho. ` +
        `Podemos te ajudar a finalizar a compra?`;
    return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
}

export function CartsPage() {
    const { carts, loading, load, totalValue } = useCartsAdmin();

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Carrinhos Abandonados
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Clientes logadas com itens parados há mais de 1 hora
                    </p>
                </div>
                <button
                    onClick={load}
                    className="rounded-lg border bg-white p-2 text-gray-500 hover:bg-gray-50"
                    aria-label="Atualizar"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {/* Resumo */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:max-w-md">
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                        Carrinhos
                    </p>
                    <p className="mt-1 text-2xl font-bold">{carts.length}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-gray-400">
                        Valor parado
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#8C2F39]">
                        R$ {fmtBRL(totalValue)}
                    </p>
                </div>
            </div>

            {!loading && carts.length === 0 && (
                <div className="flex flex-col items-center rounded-xl border border-dashed bg-white py-16 text-gray-400">
                    <ShoppingBag size={40} className="mb-3" />
                    <p className="font-medium">Nenhum carrinho abandonado 🎉</p>
                    <p className="text-sm">
                        Quando alguém deixar itens parados, eles aparecem aqui.
                    </p>
                </div>
            )}

            <div className="space-y-4">
                {carts.map((cart) => (
                    <div
                        key={cart.customerId}
                        className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="font-semibold">{cart.customerName}</p>
                                <p className="text-xs text-gray-500">
                                    {cart.customerEmail}
                                    {cart.customerPhone ? ` · ${cart.customerPhone}` : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                    abandonado há {timeAgo(cart.updatedAt)}
                                </span>
                                {cart.customerPhone && (
                                    <a
                                        href={whatsappLink(cart)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 rounded-lg bg-green-500 px-3 py-2 text-xs font-medium text-white hover:bg-green-600"
                                    >
                                        <MessageCircle size={13} /> Recuperar no WhatsApp
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="divide-y">
                            {cart.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-3 py-2">
                                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Package size={14} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {item.size}
                                            {item.color ? ` · ${item.color}` : ""} ·{" "}
                                            {item.quantity}× R$ {fmtBRL(item.unitPrice)}
                                        </p>
                                    </div>
                                    <p className="text-sm font-semibold">
                                        R$ {fmtBRL(item.totalPrice)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 flex justify-end border-t pt-3 text-sm font-bold">
                            <span>
                                Total:{" "}
                                <span className="text-[#8C2F39]">
                                    R$ {fmtBRL(cart.total)}
                                </span>
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
