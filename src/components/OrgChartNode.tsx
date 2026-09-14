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
  const statusClass =
    node.status === "vacante-activa"
      ? "node-vacant-active"
      : node.status === "vacante-inactiva"
      ? "node-vacant-inactive"
      : "node-occupied";

  return (
    <div
      className={`org-node ${statusClass}`}
      style={{ left: x, top: y, width: BOX_WIDTH, height: BOX_HEIGHT }}
      onClick={() => onClick(node)}
      role="button"
      tabIndex={0}
    >
      <div className="org-node-title">{node.title}</div>
      <div className="org-node-name">{node.name || "— Vacante —"}</div>
      {statusLabel[node.status] && <div className="org-node-status">{statusLabel[node.status]}</div>}
    </div>
  );
}
