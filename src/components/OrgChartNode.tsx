import type { OrgNode } from "../types";
import { BOX_WIDTH, BOX_HEIGHT } from "../lib/layout";

interface Props {
  node: OrgNode;
  x: number;
  y: number;
  onClick: (node: OrgNode) => void;
}

const statusLabel: Record<OrgNode["status"], string> = {
  ocupado: "",
  "vacante-activa": "Vacante (activa)",
  "vacante-inactiva": "Vacante (inactiva)",
};

export default function OrgChartNode({ node, x, y, onClick }: Props) {
  // Outsourcing gets its own distinct color regardless of vacancy status;
  // otherwise the box color follows whether the position is filled/vacant.
  const variantClass =
    node.positionType === "outsourcing"
      ? "node-outsourcing"
      : node.status === "vacante-activa"
      ? "node-vacant-active"
      : node.status === "vacante-inactiva"
      ? "node-vacant-inactive"
      : "node-occupied";

  return (
    <div
      className={`org-node ${variantClass}`}
      style={{ left: x, top: y, width: BOX_WIDTH, minHeight: BOX_HEIGHT }}
      onClick={() => onClick(node)}
      role="button"
      tabIndex={0}
    >
      <div className="org-node-title">
        {node.title}
        {node.positionType === "outsourcing" && (
          <span className="org-node-type-label"> (Outsourcing)</span>
        )}
      </div>
      <div className="org-node-name">{node.name || "— Vacante —"}</div>
      {node.status === "vacante-inactiva" && node.interimName && (
        <div className="org-node-interim">Encargado temporal: {node.interimName}</div>
      )}
      {statusLabel[node.status] && <div className="org-node-status">{statusLabel[node.status]}</div>}
    </div>
  );
}
