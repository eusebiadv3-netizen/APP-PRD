import type { OrgNode } from "../types";
import { getChildrenMap, getRootIds } from "./hierarchy";

export const BOX_WIDTH = 200;
export const BOX_HEIGHT = 92;
export const H_GAP = 32;
export const V_GAP = 70;

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Record<string, NodePosition>;
  width: number;
  height: number;
}

/**
 * Simple tree layout: leaves are placed left-to-right in visiting order,
 * internal nodes are centered above their children. Positions are the
 * top-left corner of each box.
 */
export function computeLayout(nodes: OrgNode[]): LayoutResult {
  const childrenMap = getChildrenMap(nodes);
  const roots = getRootIds(nodes);
  const positions: Record<string, NodePosition> = {};

  let nextSlot = 0;
  function assign(id: string, depth: number): number {
    const children = childrenMap[id] ?? [];
    let centerX: number;
    if (children.length === 0) {
      centerX = nextSlot * (BOX_WIDTH + H_GAP) + BOX_WIDTH / 2;
      nextSlot++;
    } else {
      const childCenters = children.map((c) => assign(c, depth + 1));
      centerX = (Math.min(...childCenters) + Math.max(...childCenters)) / 2;
    }
    positions[id] = { x: centerX - BOX_WIDTH / 2, y: depth * (BOX_HEIGHT + V_GAP) };
    return centerX;
  }

  roots.forEach((r) => assign(r, 0));

  const maxDepth = Object.keys(positions).length
    ? Math.max(...Object.values(positions).map((p) => p.y))
    : 0;
  const width = Math.max(nextSlot * (BOX_WIDTH + H_GAP), BOX_WIDTH) - H_GAP;
  const height = maxDepth + BOX_HEIGHT;

  return { positions, width: Math.max(width, BOX_WIDTH), height };
}
