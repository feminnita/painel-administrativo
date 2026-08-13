import {
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import type { CategoryNode } from "../types";

type Props = {
  items: CategoryNode[];
  parentId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  productCounts: Record<string, number>;
  onCreate: (parentId: string, level: 1 | 2 | 3) => void;
  onEdit: (item: CategoryNode) => void;
  onDelete: (id: string) => void;
  onToggleActive: (item: CategoryNode) => void;
  onReorder: (parentId: string | null, orderedIds: string[]) => void;
};

export function CategoryAccordionList({
  items,
  parentId,
  expandedIds,
  onToggleExpand,
  productCounts,
  onCreate,
  onEdit,
  onDelete,
  onToggleActive,
  onReorder,
}: Props) {
  const dragId = useRef<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    setDragOver(null);
    if (!dragId.current || dragId.current === targetId) return;
    const ids = items.map((i) => i.id);
    const fromIdx = ids.indexOf(dragId.current);
    const toIdx = ids.indexOf(targetId);
    ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);
    dragId.current = null;
    onReorder(parentId, ids);
  };

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const isExpandable = item.level < 3;
        const isExpanded = expandedIds.has(item.id);

        return (
          <div
            key={item.id}
            className="rounded-xl border border-gray-100 bg-white"
          >
            <div
              draggable
              onDragStart={() => (dragId.current = item.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(item.id);
              }}
              onDrop={() => handleDrop(item.id)}
              onDragEnd={() => setDragOver(null)}
              className={`flex items-center gap-4 px-5 py-5 text-base ${
                dragOver === item.id ? "border-t-2 border-[#8C2F39]" : ""
              }`}
            >
              <GripVertical
                size={22}
                className="shrink-0 cursor-grab text-gray-300"
              />

              <button
                onClick={() => isExpandable && onToggleExpand(item.id)}
                disabled={!isExpandable}
                className="shrink-0 rounded p-1.5 hover:bg-gray-100 disabled:opacity-0"
              >
                {isExpanded ? (
                  <ChevronDown size={22} />
                ) : (
                  <ChevronRight size={22} />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-medium text-gray-900">
                  {item.name}
                </p>
                <p className="text-sm text-gray-400">
                  {item.level === 3
                    ? `${productCounts[item.id] ?? 0} produto${(productCounts[item.id] ?? 0) === 1 ? "" : "s"}`
                    : `${item.children.length} subcategoria${item.children.length === 1 ? "" : "s"}`}
                </p>
              </div>

              {isExpandable && (
                <button
                  onClick={() =>
                    onCreate(item.id, (item.level + 1) as 1 | 2 | 3)
                  }
                  className="shrink-0 rounded-lg p-2.5 hover:bg-gray-100"
                  title="Nova subcategoria"
                >
                  <Plus size={21} className="text-gray-500" />
                </button>
              )}
              <button
                onClick={() => onToggleActive(item)}
                className="shrink-0 rounded-lg p-2.5 hover:bg-gray-100"
                title={item.active ? "Ativa" : "Inativa"}
              >
                {item.active ? (
                  <Eye size={21} className="text-green-600" />
                ) : (
                  <EyeOff size={21} className="text-gray-400" />
                )}
              </button>
              <button
                onClick={() => onEdit(item)}
                className="shrink-0 rounded-lg p-2.5 hover:bg-gray-100"
              >
                <Edit size={21} className="text-gray-500" />
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="shrink-0 rounded-lg p-2.5 hover:bg-red-50"
              >
                <Trash2 size={21} className="text-red-400" />
              </button>
            </div>

            {isExpandable && isExpanded && (
              <div className="border-t border-gray-50 py-4 pl-10 pr-4">
                {item.children.length === 0 ? (
                  <p className="py-2 text-sm text-gray-400">Nada aqui ainda</p>
                ) : (
                  <CategoryAccordionList
                    items={item.children}
                    parentId={item.id}
                    expandedIds={expandedIds}
                    onToggleExpand={onToggleExpand}
                    productCounts={productCounts}
                    onCreate={onCreate}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleActive={onToggleActive}
                    onReorder={onReorder}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
