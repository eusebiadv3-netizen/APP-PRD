import { useState } from "react";
import type { OrgNode, PositionStatus } from "../types";

interface Props {
  node: OrgNode;
  onSave: (updated: OrgNode) => void;
  onClose: () => void;
}

export default function EditModal({ node, onSave, onClose }: Props) {
  const [title, setTitle] = useState(node.title);
  const [name, setName] = useState(node.name);
  const [status, setStatus] = useState<PositionStatus>(node.status);

  function handleSave() {
    const isVacant = status !== "ocupado";
    onSave({
      ...node,
      title: title.trim() || node.title,
      name: isVacant ? "" : name.trim(),
      status,
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
