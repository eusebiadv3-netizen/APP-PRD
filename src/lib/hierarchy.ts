import type { OrgNode, ParsedRow, PositionStatus } from "../types";

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

export function createNode(
  title: string,
  name: string,
  status: PositionStatus,
  managerId: string | null
): OrgNode {
  return { id: makeNewNodeId(), title, name, status, managerId, confirmed: true };
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
