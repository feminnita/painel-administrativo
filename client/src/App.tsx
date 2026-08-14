import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "@/auth/LoginPage";
import { ProtectedRoute } from "@/components/ProtectedRouter";
import { AdminLayout } from "@/components/AdminLayout";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ProductsPage } from "@/pages/product/ui/ProductsPage";
import { OrdersPage } from "@/pages/orders/ui/OrdersPage";
import { UnderConstructionPage } from "@/pages/UnderConstructionPage";
import { CharacteristicsPage } from "./pages/characteristics/ui/CharacteristicsPage";
import { CategoryBoard } from "./pages/categories/ui/CategoryBoard";
import { StockPage } from "./pages/stock/ui/StockPage";
import { CouponsPage } from "./pages/coupons/ui/CouponsPage";

export default function App() {
  return (
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
          <Route path="*" element={<UnderConstructionPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
