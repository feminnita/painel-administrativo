import { useProductsAdmin } from "../useProductsAdmin";
import { ProductForm } from "./ProductForm";
import { ProductListView } from "./ProductListView";

export function ProductsPage() {
  const vm = useProductsAdmin();
  return vm.editing !== null ? <ProductForm vm={vm} /> : <ProductListView vm={vm} />;
}
