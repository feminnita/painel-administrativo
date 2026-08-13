import type { CategoryNode, CategoryRow } from "../types";

export function buildTree(rows: CategoryRow[]): CategoryNode[] {
  const ids = new Set(rows.map((r) => r.id));
  const byParent = new Map<string | null, CategoryRow[]>();

  rows.forEach((row) => {
    const key = row.parent_id && ids.has(row.parent_id) ? row.parent_id : null;

    const siblings = byParent.get(key) ?? [];
    siblings.push(row);
    byParent.set(key, siblings);
  });

  function buildLevel(
    parentId: string | null,
    level: 1 | 2 | 3,
  ): CategoryNode[] {
    const children = (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index);

    return children.map((row) => ({
      ...row,
      level,
      children: level < 3 ? buildLevel(row.id, (level + 1) as 1 | 2 | 3) : [],
    }));
  }

  return buildLevel(null, 1);
}

export function levelOf(rows: CategoryRow[], id: string): 1 | 2 | 3 | null {
  const byId = new Map(rows.map((r) => [r.id, r]));
  let current = byId.get(id);
  if (!current) return null;

  let depth: 1 | 2 | 3 = 1;
  const visited = new Set<string>();

  while (current.parent_id) {
    if (visited.has(current.id)) return null;
    visited.add(current.id);

    const parent = byId.get(current.parent_id);
    if (!parent) break;

    if (depth >= 3) return null;
    depth = (depth + 1) as 1 | 2 | 3;
    current = parent;
  }

  return depth;
}

export function listFatherCandidates(rows: CategoryRow[]): CategoryRow[] {
  return rows.filter((r) => r.parent_id === null);
}

export function listChildrenCandidates(
  rows: CategoryRow[],
  parentPaiId?: string,
): CategoryRow[] {
  const paiIds = new Set(listFatherCandidates(rows).map((r) => r.id));
  return rows.filter(
    (r) =>
      r.parent_id !== null &&
      paiIds.has(r.parent_id) &&
      (!parentPaiId || r.parent_id === parentPaiId),
  );
}

export function listGrandchildCategories(rows: CategoryRow[]): CategoryRow[] {
  const filhosIds = new Set(listChildrenCandidates(rows).map((r) => r.id));
  return rows.filter((r) => r.parent_id !== null && filhosIds.has(r.parent_id));
}

export function collectDescendantGrandchildrenIds(
  rows: CategoryRow[],
  categoryId: string,
): string[] {
  const tree = buildTree(rows);

  function findNode(nodes: CategoryNode[], id: string): CategoryNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children, id);
      if (found) return found;
    }

    return null;
  }

  function collectLeaves(node: CategoryNode): string[] {
    if (node.level === 3) return [node.id];
    return node.children.flatMap(collectLeaves);
  }

  const target = findNode(tree, categoryId);
  return target ? collectLeaves(target) : [];
}

export function findAncestor(
  rows: CategoryRow[],
  categoryId: string,
): { father?: CategoryRow; child?: CategoryRow } {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const current = byId.get(categoryId);
  if (!current || !current.parent_id) return {};

  const child = byId.get(current.parent_id);
  if (!child || !child.parent_id) return { child };

  const father = byId.get(child.parent_id);
  return { father, child };
}

function collectAllDescendantIds(
  rows: CategoryRow[],
  categoryId: string,
): string[] {
  const children = rows.filter((r) => r.parent_id === categoryId);
  return children.flatMap((c) => [
    c.id,
    ...collectAllDescendantIds(rows, c.id),
  ]);
}

export function canAttachTo(
  rows: CategoryRow[],
  categoryId: string | null,
  parentId: string | null,
): { ok: true } | { ok: false; reason: string } {
  if (parentId === null) return { ok: true };

  if (categoryId === parentId) {
    return { ok: false, reason: " Uma categoria não ser pai dela mesma" };
  }

  const parentLevel = levelOf(rows, parentId);
  if (parentLevel === null) {
    return {
      ok: false,
      reason: "Categoria pai não encontrada",
    };
  }

  if (parentLevel >= 3) {
    return {
      ok: false,
      reason:
        "Essa categoria já exite no Nivel mais profundo(neto) e não pode ter subcategorias",
    };
  }

  if (categoryId) {
    const descendantIds = new Set(collectAllDescendantIds(rows, categoryId));

    if (descendantIds.has(parentId)) {
      return {
        ok: false,
        reason:
          "Não é possível mover uma categoria para dentro de suas próprias subcategorias",
      };
    }
  }
  return { ok: true };
}

export function canDelete(
  rows: CategoryRow[],
  categoryId: string,
  productCounts: Record<string, number>,
): { ok: true } | { ok: false; reason: string } {
  const hasChildren = rows.some((r) => r.parent_id === categoryId);

  if (hasChildren) {
    return {
      ok: false,
      reason: "Essa categoria possui subcategorias. remova-as primeiro.",
    };
  }

  const count = productCounts[categoryId] ?? 0;
  if (count > 0) {
    return {
      ok: false,
      reason: `${count} produto${count === 1 ? "" : "s"} usa${count === 1 ? "" : "m"} essa categoria. Mova-os primeiro.`,
    };
  }
  return { ok: true };
}
