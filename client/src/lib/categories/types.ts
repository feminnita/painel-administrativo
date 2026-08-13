export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  active: boolean;
  order_index: number;
  created_at: string;
};

export type CategoryNode = CategoryRow & {
  level: 1 | 2 | 3;
  children: CategoryNode[];
};
