import type { OrgNode } from "../types";
import { getChildrenMap, getLayoutRootIds } from "./hierarchy";

export const BOX_WIDTH = 280;
export const BOX_HEIGHT = 140;
export const H_GAP = 32;
export const V_GAP = 76;

/**
 * A layout root can still carry a real (unrendered) managerId — e.g. a
 * "solo jefe directo" area view. STUB_LENGTH reserves headroom above it so
 * OrgChart can draw a short, unconnected line showing it still reports to
 * someone, without revealing who.
 */
export const STUB_LENGTH = 32;

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Record<string, NodePosition>;
  width: number;
  height: number;
  /** ids of nodes that need a stub line drawn above them (see STUB_LENGTH) */
  stubIds: Set<string>;
}

/**
 * Simple tree layout: leaves are placed left-to-right in visiting order,
 * internal nodes are centered above their children. Positions are the
 * top-left corner of each box.
 */
export function computeLayout(nodes: OrgNode[]): LayoutResult {
  const childrenMap = getChildrenMap(nodes);
  const roots = getLayoutRootIds(nodes);
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

  // A layout root with a real managerId means that manager exists but isn't
  // part of this node set — reserve stub headroom and shift everything down.
  const stubIds = new Set(nodes.filter((n) => n.managerId && !positions[n.managerId]).map((n) => n.id));
  const topOffset = stubIds.size > 0 ? STUB_LENGTH : 0;
  if (topOffset) {
    for (const id in positions) positions[id].y += topOffset;
  }

  const maxDepth = Object.keys(positions).length
    ? Math.max(...Object.values(positions).map((p) => p.y))
    : 0;
  const width = Math.max(nextSlot * (BOX_WIDTH + H_GAP), BOX_WIDTH) - H_GAP;
  const height = maxDepth + BOX_HEIGHT;

  return { positions, width: Math.max(width, BOX_WIDTH), height, stubIds };
}
