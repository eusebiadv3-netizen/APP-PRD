import { forwardRef, useMemo } from "react";
import type { OrgNode } from "../types";
import { computeLayout, BOX_WIDTH, BOX_HEIGHT } from "../lib/layout";
import OrgChartNode from "./OrgChartNode";

interface Props {
  nodes: OrgNode[];
  onNodeClick: (node: OrgNode) => void;
}

const OrgChart = forwardRef<HTMLDivElement, Props>(({ nodes, onNodeClick }, ref) => {
  const { positions, width, height } = useMemo(() => computeLayout(nodes), [nodes]);

  const lines = useMemo(() => {
    return nodes
      .filter((n) => n.managerId)
      .map((n) => {
        const from = positions[n.managerId!];
        const to = positions[n.id];
        if (!from || !to) return null;
        const x1 = from.x + BOX_WIDTH / 2;
        const y1 = from.y + BOX_HEIGHT;
        const x2 = to.x + BOX_WIDTH / 2;
        const y2 = to.y;
        const midY = (y1 + y2) / 2;
        return { id: n.id, path: `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}` };
      })
      .filter((l): l is { id: string; path: string } => l !== null);
  }, [nodes, positions]);

  return (
    <div
      ref={ref}
      className="org-chart-canvas"
      style={{ width, height, position: "relative" }}
    >
      <svg className="org-chart-lines" width={width} height={height}>
        {lines.map((l) => (
          <path key={l.id} d={l.path} fill="none" stroke="#94a3b8" strokeWidth={2} />
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
});

OrgChart.displayName = "OrgChart";
export default OrgChart;
