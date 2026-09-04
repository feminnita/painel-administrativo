import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/auth/LoginPage";
import { ProtectedRoute } from "@/components/ProtectedRouter";
import { AdminLayout } from "@/components/AdminLayout";
import { DashboardPage } from "@/pages/dashboard/ui/DashboardPage";
import { ProductsPage } from "@/pages/product/ui/ProductsPage";
import { OrdersPage } from "@/pages/orders/ui/OrdersPage";
import { UnderConstructionPage } from "@/pages/UnderConstructionPage";
import { CharacteristicsPage } from "./pages/characteristics/ui/CharacteristicsPage";
import { CategoryBoard } from "./pages/categories/ui/CategoryBoard";
import { StockPage } from "./pages/stock/ui/StockPage";
import { CouponsPage } from "./pages/coupons/ui/CouponsPage";
import { BannersPage } from './pages/banners/ui/BannersPage';
import { VitrinePage } from './pages/vitrine/ui/VitrinePage';
import { IntegracoesPage } from "./pages/integrations/ui/IntegracoesPage";
import { CartsPage } from "./pages/carts/ui/CartsPage";
import { VendasPage } from "./pages/vendas/ui/VendasPage";
import { CustomersPage } from "./pages/customers/ui/CustomersPage";
import { VisitasPage } from "./pages/visitas/ui/VisitasPage";
import { FretePage } from "./pages/frete/ui/FretePage";
import { ReconcilePage } from "./pages/reconcile/ui/ReconcilePage";
import { ConfirmProvider } from "./components/confirm/ConfirmProvider";


export default function App() {
  return (

    <ConfirmProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/pedidos" element={<OrdersPage />} />
            <Route path="/caracteristicas" element={<CharacteristicsPage />} />
            <Route path="/categorias" element={<CategoryBoard />} />
            <Route path="/estoque" element={<StockPage />} />
            <Route path="/cupons" element={<CouponsPage />} />
            <Route path="/slides" element={<BannersPage />} />
            <Route path="/vitrine" element={<VitrinePage />} />
            <Route path="/integracoes" element={<IntegracoesPage />} />
            <Route path="/carrinhos" element={<CartsPage />} />
            <Route path="/vendas" element={<VendasPage />} />
            <Route path="/clientes" element={<CustomersPage />} />
            <Route path="/visitas" element={<VisitasPage />} />
            <Route path="/frete" element={<FretePage />} />
            <Route path="/reconciliar-bling" element={<ReconcilePage />} />
            <Route path="*" element={<UnderConstructionPage />} />
          </Route>
        </Route>

      </Routes>
    </ConfirmProvider>

  );
}
