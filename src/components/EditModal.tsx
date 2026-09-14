import { useState } from "react";
import type { OrgNode, PositionStatus } from "../types";
import { getSubtreeIds } from "../lib/hierarchy";

interface Props {
  node: OrgNode;
  allNodes: OrgNode[];
  onSave: (updated: OrgNode) => void;
  onClose: () => void;
}

const ROOT_VALUE = "__root__";

export default function EditModal({ node, allNodes, onSave, onClose }: Props) {
  const [title, setTitle] = useState(node.title);
  const [name, setName] = useState(node.name);
  const [status, setStatus] = useState<PositionStatus>(node.status);
  const [managerId, setManagerId] = useState<string | null>(node.managerId);

  // A node can't report to itself or to any of its own subordinates
  // (that would create a cycle), so those are excluded as choices.
  const ownSubtree = getSubtreeIds(allNodes, node.id);
  const managerOptions = allNodes.filter((n) => !ownSubtree.has(n.id));

  function handleSave() {
    const isVacant = status !== "ocupado";
    onSave({
      ...node,
      title: title.trim() || node.title,
      name: isVacant ? "" : name.trim(),
      status,
      managerId,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Editar cargo</h2>
        <label>
          Cargo
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value as PositionStatus)}>
            <option value="ocupado">Ocupado</option>
            <option value="vacante-activa">Vacante (activa)</option>
            <option value="vacante-inactiva">Vacante (inactiva)</option>
          </select>
        </label>
        <label>
          Nombre
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={status !== "ocupado"}
            placeholder={status !== "ocupado" ? "Vacante" : ""}
          />
        </label>
        <label>
          Reporta a
          <select
            value={managerId ?? ROOT_VALUE}
            onChange={(e) => setManagerId(e.target.value === ROOT_VALUE ? null : e.target.value)}
          >
            <option value={ROOT_VALUE}>— Nivel superior (sin jefe) —</option>
            {managerOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name ? `${n.name} — ${n.title}` : n.title}
              </option>
            ))}
          </select>
        </label>
        <div className="actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
