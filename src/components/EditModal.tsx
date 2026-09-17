import { useState } from "react";
import type { OrgNode, PositionStatus, PositionType } from "../types";
import { getSubtreeIds } from "../lib/hierarchy";

interface Props {
  node: OrgNode;
  allNodes: OrgNode[];
  onSave: (updated: OrgNode) => void;
  onDelete: (nodeId: string, strategy: "reassign" | "root") => void;
  onClose: () => void;
}

const ROOT_VALUE = "__root__";

export default function EditModal({ node, allNodes, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(node.title);
  const [name, setName] = useState(node.name);
  const [status, setStatus] = useState<PositionStatus>(node.status);
  const [positionType, setPositionType] = useState<PositionType>(node.positionType);
  const [interimName, setInterimName] = useState(node.interimName);
  const [managerId, setManagerId] = useState<string | null>(node.managerId);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteStrategy, setDeleteStrategy] = useState<"reassign" | "root">("reassign");

  // A node can't report to itself or to any of its own subordinates
  // (that would create a cycle), so those are excluded as choices.
  const ownSubtree = getSubtreeIds(allNodes, node.id);
  const managerOptions = allNodes.filter((n) => !ownSubtree.has(n.id));
  const subordinates = allNodes.filter((n) => n.managerId === node.id);
  const managerOfNode = node.managerId ? allNodes.find((n) => n.id === node.managerId) : null;

  function handleSave() {
    const isVacant = status !== "ocupado";
    onSave({
      ...node,
      title: title.trim() || node.title,
      name: isVacant ? "" : name.trim(),
      status,
      positionType,
      interimName: status === "vacante-inactiva" ? interimName.trim() : "",
      managerId,
    });
  }

  if (confirmingDelete) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>Eliminar "{node.title}"</h2>
          {subordinates.length > 0 ? (
            <>
              <p className="modal-warning">
                {subordinates.length === 1
                  ? "1 posición le reporta a este cargo."
                  : `${subordinates.length} posiciones le reportan a este cargo.`}{" "}
                ¿Qué debe pasar con {subordinates.length === 1 ? "ella" : "ellas"}?
              </p>
              <label className="radio-option">
                <input
                  type="radio"
                  name="delete-strategy"
                  checked={deleteStrategy === "reassign"}
                  onChange={() => setDeleteStrategy("reassign")}
                />
                <span>
                  Reasignarlas a{" "}
                  {managerOfNode
                    ? managerOfNode.name
                      ? `${managerOfNode.name} (${managerOfNode.title})`
                      : managerOfNode.title
                    : "nivel superior (sin jefe)"}
                  , el jefe de "{node.title}"
                </span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="delete-strategy"
                  checked={deleteStrategy === "root"}
                  onChange={() => setDeleteStrategy("root")}
                />
                <span>Dejarlas sin jefe visible por ahora (nivel superior)</span>
              </label>
            </>
          ) : (
            <p className="modal-warning">Esta acción no se puede deshacer.</p>
          )}
          <div className="actions">
            <button className="btn-secondary" onClick={() => setConfirmingDelete(false)}>
              Cancelar
            </button>
            <button className="btn-danger" onClick={() => onDelete(node.id, deleteStrategy)}>
              Confirmar eliminación
            </button>
          </div>
        </div>
      </div>
    );
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
          Tipo de posición
          <select
            value={positionType}
            onChange={(e) => setPositionType(e.target.value as PositionType)}
          >
            <option value="normal">Normal (línea de mando)</option>
            <option value="staff">Staff / Asesoría (línea punteada)</option>
            <option value="outsourcing">Outsourcing (contrato externo)</option>
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
          Encargado temporal
          <input
            value={interimName}
            onChange={(e) => setInterimName(e.target.value)}
            disabled={status !== "vacante-inactiva"}
            placeholder={
              status === "vacante-inactiva"
                ? "Nombre de quien cubre el cargo"
                : "Solo aplica a vacante inactiva"
            }
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
        <div className="actions actions-split">
          <button className="btn-danger-text" onClick={() => setConfirmingDelete(true)}>
            Eliminar posición
          </button>
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
    </div>
  );
}
