import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
    BarChart,
    BarChart2, BookOpen, Camera, ChevronRight, ExternalLink, Image, LayoutDashboard,
    LayoutGrid, Link2, LogOut, Mail, Megaphone, Menu, Package, Palette, Ruler, Settings,
    ShoppingBag, ShoppingCart, Star, Tag, Truck, Users, Users2, X, Zap,
    FileText,
} from "lucide-react";
import { api, clearToken } from "@/lib/api/client";

type NavLeaf = { href: string; label: string; icon: typeof Package };
type NavGroup = { label: string; icon: typeof Package; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

function isGroup(item: NavEntry): item is NavGroup {
    return "children" in item;
}

const SITE_URL = import.meta.env.VITE_SITE_URL ?? "http://localhost:3000";

const navItems: NavEntry[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },

    {
        label: "Vendas", icon: BarChart2,
        children: [
            { href: "/vendas", label: "Vendas", icon: BarChart },
            { href: "/pedidos", label: "Pedidos", icon: ShoppingCart },
            { href: "/carrinhos", label: "Carrinhos Abandonados", icon: ShoppingBag },
        ]
    },

    { href: "/clientes", label: "Clientes", icon: Users },
    {
        label: "Produtos", icon: Package,
        children: [
            { href: "/produtos", label: "Produtos", icon: Package },
            { href: "/categorias", label: "Categorias", icon: Tag },
            { href: "/avaliacoes", label: "Avaliações", icon: Star },
            { href: "/estoque", label: "Estoque SKU", icon: Package },
            { href: "/caracteristicas", label: "Características", icon: Palette },
            { href: "/visitas", label: "Visitas", icon: BarChart2 },
        ],
    },
    {
        label: "Marketing", icon: Megaphone,
        children: [
            { href: "/marketing", label: "Marketing", icon: Megaphone },
            { href: "/campanhas", label: "Campanhas", icon: Tag },
            { href: "/cupons", label: "Cupons", icon: Tag },
            { href: "/newsletter", label: "Newsletter", icon: Mail },
            { href: "/afiliados", label: "Afiliados", icon: Users2 },
            { href: "/lookbook", label: "Lookbook", icon: Camera },
            { href: "/blog", label: "Blog", icon: BookOpen },
        ],
    },
    { href: "/slides", label: "Carrossel Hero", icon: Image },
    { href: "/vitrine", label: "Vitrine", icon: LayoutGrid },
    {
        label: "Configurações", icon: Settings,
        children: [
            { href: "/frete", label: "Frete", icon: Truck },
            { href: "/tabela-medidas", label: "Tabela de Medidas", icon: Ruler },
            { href: "/termo-revenda", label: "Termo de Revenda", icon: FileText },
            { href: "/integracoes", label: "Integrações", icon: Zap },
            { href: "/reconciliar-bling", label: "Reconciliar Bling", icon: Link2 },
        ],
    },
];

export function AdminLayout() {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Sair de verdade: invalida a sessão no servidor (deleta o token), limpa o
    // token local e volta pro login. Sem isso, num PC compartilhado a próxima
    // pessoa continuaria logada. O logout do servidor não pode bloquear a saída.
    const handleLogout = async () => {
        try {
            await api.post("/api/admin/auth/logout");
        } catch {
            // se o servidor falhar, ainda assim desloga localmente
        }
        clearToken();
        navigate("/login", { replace: true });
    };

    const activedGroupLabel = navItems.find(
        (item) =>
            isGroup(item) &&
            item.children.some(
                (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
            ),
    )?.label;

    const [openGroup, setOpenGroup] = useState<string | null>(
        activedGroupLabel ?? null,
    );

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 shrink-0 flex-col bg-[#1A1A1A] text-white md:static md:flex ${sidebarOpen ? "flex" : "hidden"
                    }`}
            >
                <div className="flex items-center justify-between border-b border-white/10 p-6">
                    <Link to="/" className="block" onClick={() => setSidebarOpen(false)}>
                        <span className="text-xl font-bold tracking-widest">FEMINNITA</span>
                        <p className="mt-1 text-xs text-gray-400">Painel Administrativo</p>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="text-gray-400 hover:text-white md:hidden"
                        aria-label="Fechar menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto p-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;

                        if (isGroup(item)) {
                            const groupActive = item.children.some(
                                (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
                            );
                            const expanded = openGroup === item.label;

                            return (
                                <div key={item.label}>
                                    <button
                                        type="button"
                                        onClick={() => setOpenGroup(expanded ? null : item.label)}
                                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors ${groupActive
                                            ? "text-white"
                                            : "text-gray-400 hover:bg-white/10 hover:text-white"
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span className="text-sm font-medium">{item.label}</span>
                                        <ChevronRight
                                            size={16}
                                            className={`ml-auto transition-transform ${expanded ? "rotate-90" : ""
                                                }`}
                                        />
                                    </button>

                                    {expanded && (
                                        <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-4">
                                            {item.children.map((child) => {
                                                const ChildIcon = child.icon;
                                                const active =
                                                    pathname === child.href ||
                                                    pathname.startsWith(`${child.href}/`);
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        to={child.href}
                                                        onClick={() => setSidebarOpen(false)}
                                                        className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors ${active
                                                            ? "bg-[#8C2F39] text-white"
                                                            : "text-gray-400 hover:bg-white/10 hover:text-white"
                                                            }`}
                                                    >
                                                        <ChildIcon size={16} />
                                                        <span className="font-medium">{child.label}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const active =
                            pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${active
                                    ? "bg-[#8C2F39] text-white"
                                    : "text-gray-400 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="text-sm font-medium">{item.label}</span>
                                {active && <ChevronRight size={16} className="ml-auto" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="space-y-1 border-t border-white/10 p-4">
                    <a
                        href={SITE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                        <ExternalLink size={18} />
                        <span className="text-sm font-medium">Ver o site</span>
                    </a>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    >
                        <LogOut size={18} />
                        <span className="text-sm font-medium">Sair</span>
                    </button>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-3 border-b bg-white p-4 md:hidden">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-700 hover:text-gray-900"
                        aria-label="Abrir menu"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold tracking-widest text-[#1A1A1A]">
                        FEMINNITA
                    </span>
                </div>

                <main className="flex-1 overflow-y-auto overflow-x-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
