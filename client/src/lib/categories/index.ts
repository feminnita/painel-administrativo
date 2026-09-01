export type { CategoryRow, CategoryNode } from "./types";
export {
  buildTree,
  levelOf,
  listFatherCandidates,
  listChildrenCandidates,
  listGrandchildCategories,
  collectDescendantGrandchildrenIds,
  findAncestor,
  canAttachTo,
  canDelete,
} from "./domain/tree";
