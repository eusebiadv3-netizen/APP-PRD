import { useState } from "react";
import type { OrgNode, PositionStatus, PositionType } from "../types";

interface Props {
  allNodes: OrgNode[];
  onAdd: (
    title: string,
    name: string,
    status: PositionStatus,
    positionType: PositionType,
    interimName: string,
    managerId: string | null
  ) => void;
  onClose: () => void;
}

const ROOT_VALUE = "__root__";

export default function AddPositionModal({ allNodes, onAdd, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<PositionStatus>("ocupado");
  const [positionType, setPositionType] = useState<PositionType>("normal");
  const [interimName, setInterimName] = useState("");
  const [managerId, setManagerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAdd() {
    if (!title.trim()) {
      setError("El cargo es obligatorio.");
      return;
    }
    const isVacant = status !== "ocupado";
    onAdd(
      title.trim(),
      isVacant ? "" : name.trim(),
      status,
      positionType,
      status === "vacante-inactiva" ? interimName.trim() : "",
      managerId
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Agregar posición nueva</h2>
        {error && <div className="error-banner">{error}</div>}
        <label>
          Cargo
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
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
            {allNodes.map((n) => (
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
          <button className="btn-primary" onClick={handleAdd}>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
