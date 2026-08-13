import type { CategoryRow } from "@/lib/categories";

export type { CategoryRow, CategoryNode } from "@/lib/categories";

export type CategoryInput = Omit<CategoryRow, "id" | "created_at">;

export type EditingState = {
  id?: string;
  level: 1 | 2 | 3;
  parentId: string | null;
  parentName?: string;
  values: CategoryInput;
};

export type PropsEdit = {
  levelLabel: string;
  contextLabel?: string;
  values: CategoryInput;
  saving: boolean;
  error: string | null;
  onChange: (values: Partial<CategoryInput>) => void;
  onSave: () => void;
  onCancel: () => void;
  slugify: (text: string) => string;
};
