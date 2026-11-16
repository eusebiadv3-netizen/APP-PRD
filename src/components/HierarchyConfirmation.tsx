import { useState } from "react";
import type { OrgNode } from "../types";
import { validateHierarchy } from "../lib/hierarchy";

interface Props {
  initialNodes: OrgNode[];
  initialCompanyName: string;
  onConfirmed: (nodes: OrgNode[], companyName: string) => void;
  onBack: () => void;
}

const ROOT_VALUE = "__root__";

export default function HierarchyConfirmation({
  initialNodes,
  initialCompanyName,
  onConfirmed,
  onBack,
}: Props) {
  const [nodes, setNodes] = useState<OrgNode[]>(initialNodes);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [error, setError] = useState<string | null>(null);

  function setManager(nodeId: string, managerId: string | null) {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, managerId, confirmed: false } : n))
    );
  }

  function handleSubmit() {
    if (!companyName.trim()) {
      setError("Escribe el nombre de la empresa para poder guardar y buscar este organigrama después.");
      return;
    }
    const allConfirmed = nodes.map((n) => ({ ...n, confirmed: true }));
    const err = validateHierarchy(allConfirmed);
    if (err) {
      setError(err);
      setNodes(allConfirmed);
      return;
    }
    onConfirmed(allConfirmed, companyName.trim());
  }

  const rootCount = nodes.filter((n) => n.managerId === null).length;

  return (
    <div className="confirm-screen">
      <h1>Confirma la jerarquía</h1>
      <p className="subtitle">
        Detectamos {nodes.length} cargo(s). Para cada uno, indica quién es su jefe directo (o
        marca "Nivel superior" si no reporta a nadie). No asumimos nada: revisa cada relación
        antes de continuar.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <label className="company-name-field">
        Nombre de la empresa
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Ej. Acme S.A."
        />
      </label>
      <div className="confirm-table-wrap">
        <table className="confirm-table">
          <thead>
            <tr>
              <th>Cargo</th>
              <th>Nombre</th>
              <th>Reporta a</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => (
              <tr key={node.id} className={node.managerId === null ? "row-is-root" : ""}>
                <td>{node.title}</td>
                <td>{node.name || <em>Vacante</em>}</td>
                <td>
                  <select
                    value={node.managerId ?? ROOT_VALUE}
                    onChange={(e) =>
                      setManager(node.id, e.target.value === ROOT_VALUE ? null : e.target.value)
                    }
                  >
                    <option value={ROOT_VALUE}>— Nivel superior (sin jefe) —</option>
                    {nodes
                      .filter((other) => other.id !== node.id)
                      .map((other) => (
                        <option key={other.id} value={other.id}>
                          {other.name ? `${other.name} — ${other.title}` : other.title}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        {rootCount} cargo(s) quedarán marcados como "Nivel superior" (sin jefe). Revisa que sea
        correcto antes de confirmar.
      </p>
      <div className="actions">
        <button className="btn-secondary" onClick={onBack}>
          Volver a subir archivo
        </button>
        <button className="btn-primary" onClick={handleSubmit}>
          Confirmar jerarquía y generar organigrama
        </button>
      </div>
    </div>
  );
}
