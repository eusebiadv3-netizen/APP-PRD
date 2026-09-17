import type { OrgNode, ParsedRow, PositionStatus, PositionType } from "../types";

function makeId(index: number): string {
  return `n${index}`;
}

function makeNewNodeId(): string {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Builds initial nodes from parsed rows and tries to resolve each manager
 * hint to exactly one other row. Ambiguous or missing hints are left
 * unresolved (managerId = null, confirmed = false) so the UI must ask.
 */
export function buildInitialNodes(rows: ParsedRow[]): OrgNode[] {
  const nodes: OrgNode[] = rows.map((row, i) => ({
    id: makeId(i),
    title: row.title,
    name: row.name,
    status: row.status,
    positionType: row.positionType,
    managerId: null,
    confirmed: false,
  }));

  rows.forEach((row, i) => {
    const hint = row.managerHint;
    if (!hint) return;
    const hintNorm = normalize(hint);
    const matches = nodes.filter(
      (n, j) => j !== i && (normalize(n.name) === hintNorm || normalize(n.title) === hintNorm)
    );
    if (matches.length === 1) {
      nodes[i].managerId = matches[0].id;
    }
    // zero or multiple matches stay unresolved -> user must pick explicitly
  });

  return nodes;
}

/** Detects a cycle in the manager chain starting at a node. */
function hasCycle(nodes: OrgNode[]): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    const seen = new Set<string>();
    let current: OrgNode | undefined = node;
    while (current?.managerId) {
      if (seen.has(current.id)) return true;
      seen.add(current.id);
      current = byId.get(current.managerId);
    }
  }
  return false;
}

export function validateHierarchy(nodes: OrgNode[]): string | null {
  if (nodes.some((n) => !n.confirmed)) {
    return "Faltan relaciones de jerarquía por confirmar.";
  }
  if (hasCycle(nodes)) {
    return "Se detectó un ciclo en la jerarquía (alguien reporta indirectamente a sí mismo). Revisa las relaciones.";
  }
  return null;
}

export function getChildrenMap(nodes: OrgNode[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const node of nodes) {
    if (node.managerId) {
      if (!map[node.managerId]) map[node.managerId] = [];
      map[node.managerId].push(node.id);
    }
  }
  return map;
}

export function getRootIds(nodes: OrgNode[]): string[] {
  return nodes.filter((n) => !n.managerId).map((n) => n.id);
}

/**
 * Roots for LAYOUT purposes: a true root (no manager) OR a node whose
 * manager isn't part of this set — e.g. a "solo jefe directo" area view,
 * where that manager still carries its real (unrendered) managerId so
 * OrgChart can draw a stub line above it. Without this, such a node would
 * never get positioned at all (computeLayout only walks down from roots).
 */
export function getLayoutRootIds(nodes: OrgNode[]): string[] {
  const ids = new Set(nodes.map((n) => n.id));
  return nodes.filter((n) => !n.managerId || !ids.has(n.managerId)).map((n) => n.id);
}

/** All descendant ids of a node (inclusive of the node itself). */
export function getSubtreeIds(nodes: OrgNode[], rootId: string): Set<string> {
  const childrenMap = getChildrenMap(nodes);
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const c of childrenMap[id] ?? []) stack.push(c);
  }
  return result;
}

/** A node's managers, nearest first, up to (and including) the top of the org. */
export function getAncestors(nodes: OrgNode[], nodeId: string): OrgNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const result: OrgNode[] = [];
  const seen = new Set<string>();
  let current = byId.get(nodeId);
  while (current?.managerId && !seen.has(current.managerId)) {
    const manager = byId.get(current.managerId);
    if (!manager) break;
    result.push(manager);
    seen.add(manager.id);
    current = manager;
  }
  return result;
}

/**
 * Keeps only nodes up to `maxDepth` levels below this set's own layout
 * roots (0 = just the roots themselves, 2 = roots + primera línea +
 * segunda línea, etc.) — so a large org or area can still be printed
 * legibly on one page. Depth is measured from whatever is currently at
 * the top of THIS set (the whole org for "completo", or an area's head),
 * not from the true top of the company.
 */
export function limitDepth(nodes: OrgNode[], maxDepth: number): OrgNode[] {
  const childrenMap = getChildrenMap(nodes);
  const roots = getLayoutRootIds(nodes);
  const keep = new Set<string>();

  function walk(id: string, depth: number) {
    if (depth > maxDepth || keep.has(id)) return;
    keep.add(id);
    for (const childId of childrenMap[id] ?? []) walk(childId, depth + 1);
  }
  roots.forEach((r) => walk(r, 0));

  return nodes.filter((n) => keep.has(n.id));
}

export function createNode(
  title: string,
  name: string,
  status: PositionStatus,
  positionType: PositionType,
  managerId: string | null
): OrgNode {
  return { id: makeNewNodeId(), title, name, status, positionType, managerId, confirmed: true };
}

/**
 * Removes a node. Its direct subordinates (if any) either move up to the
 * deleted node's own manager ("reassign"), or become top-level ("root") —
 * the caller must choose explicitly, never assumed.
 */
export function deleteNode(
  nodes: OrgNode[],
  nodeId: string,
  strategy: "reassign" | "root"
): OrgNode[] {
  const target = nodes.find((n) => n.id === nodeId);
  if (!target) return nodes;
  const replacementManagerId = strategy === "reassign" ? target.managerId : null;
  return nodes
    .filter((n) => n.id !== nodeId)
    .map((n) => (n.managerId === nodeId ? { ...n, managerId: replacementManagerId } : n));
}
