import { useMemo } from "react";
import type { OrgNode } from "../types";
import { computeLayout, BOX_WIDTH, BOX_HEIGHT, STUB_LENGTH } from "../lib/layout";
import OrgChartNode from "./OrgChartNode";

interface Props {
  nodes: OrgNode[];
  onNodeClick: (node: OrgNode) => void;
}

export default function OrgChart({ nodes, onNodeClick }: Props) {
  const { positions, width, height, stubIds } = useMemo(() => computeLayout(nodes), [nodes]);

  const lines = useMemo(() => {
    const result: { id: string; path: string; dashed: boolean }[] = [];
    for (const n of nodes) {
      const to = positions[n.id];
      if (!to) continue;
      const dashed = n.positionType === "staff";
      const x2 = to.x + BOX_WIDTH / 2;
      const y2 = to.y;
      if (stubIds.has(n.id)) {
        // Manager exists but isn't part of this view — a short, unconnected
        // line shows it still reports to someone without revealing who.
        result.push({ id: n.id, path: `M ${x2} ${y2 - STUB_LENGTH} L ${x2} ${y2}`, dashed });
        continue;
      }
      if (!n.managerId) continue;
      const from = positions[n.managerId];
      if (!from) continue;
      const x1 = from.x + BOX_WIDTH / 2;
      const y1 = from.y + BOX_HEIGHT;
      const midY = (y1 + y2) / 2;
      result.push({ id: n.id, path: `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`, dashed });
    }
    return result;
  }, [nodes, positions, stubIds]);

  return (
    <div className="org-chart-canvas" style={{ width, height, position: "relative" }}>
      <svg className="org-chart-lines" width={width} height={height}>
        {lines.map((l) => (
          <path
            key={l.id}
            d={l.path}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray={l.dashed ? "6 5" : undefined}
          />
        ))}
      </svg>
      {nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;
        return (
          <OrgChartNode key={node.id} node={node} x={pos.x} y={pos.y} onClick={onNodeClick} />
        );
      })}
    </div>
  );
}
