import { Plus, X } from "lucide-react";
import { useCategoriesAdmin } from "../useCategoriesAdmin";
import { CategoryAccordionList } from "./CategoryAccordionList";
import { CategoryEditModal } from "./CategoEditModal";

const LEVEL_LABELS: Record<1 | 2 | 3, string> = {
  1: "Categoria",
  2: "Subcategoria",
  3: "Subcategoria específica",
};

export function CategoryBoard() {
  const vm = useCategoriesAdmin();

  if (vm.loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categorias</h1>
          <p className="mt-1 text-gray-500">
            Organize em até 3 níveis: categoria → subcategoria → subcategoria
            específica
          </p>
        </div>
        <button
          onClick={() => vm.openCreate(1, null)}
          className="flex items-center gap-2 rounded-xl bg-[#8C2F39] px-5 py-2.5 font-semibold text-white hover:bg-[#7a2832]"
        >
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      {vm.error && !vm.editing && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <span>{vm.error}</span>
          <button
            onClick={() => vm.setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {vm.tree.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-400 shadow-sm">
          <p className="font-medium">Nenhuma categoria ainda</p>
        </div>
      ) : (
        <CategoryAccordionList
          items={vm.tree}
          parentId={null}
          expandedIds={vm.expandedIds}
          onToggleExpand={vm.toggleExpand}
          productCounts={vm.productCounts}
          onCreate={(parentId, level) => vm.openCreate(level, parentId)}
          onEdit={vm.openEdit}
          onDelete={vm.remove}
          onToggleActive={vm.toggleActive}
          onReorder={vm.reorder}
        />
      )}

      {vm.editing && (
        <CategoryEditModal
          levelLabel={
            vm.editing.id
              ? `Editar ${LEVEL_LABELS[vm.editing.level]}`
              : `Nova ${LEVEL_LABELS[vm.editing.level]}`
          }
          contextLabel={
            vm.editing.parentName
              ? `Dentro de: ${vm.editing.parentName}`
              : undefined
          }
          values={vm.editing.values}
          saving={vm.saving}
          error={vm.error}
          onChange={vm.updateEditingValues}
          onSave={vm.save}
          onCancel={vm.closeEditing}
          slugify={vm.slugify}
        />
      )}
    </div>
  );
}
