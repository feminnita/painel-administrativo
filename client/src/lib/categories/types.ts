export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  active: boolean;
  order_index: number;
  // Ordem de separacao (fila do estoque): 1,2,3... 0 = sem fila (vai pro fim).
  pick_order: number;
  created_at: string;
};

export type CategoryNode = CategoryRow & {
  level: 1 | 2 | 3;
  children: CategoryNode[];
};
