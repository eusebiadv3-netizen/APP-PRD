import { useRef, useState } from "react";
import type { OrgNode } from "../types";
import { exportPositionsAsXlsx, exportTableAsPng } from "../lib/exportTable";
import { DownloadCancelledError } from "../lib/exportImage";

interface Props {
  nodes: OrgNode[];
  companyName: string;
}

const STATUS_LABEL: Record<OrgNode["status"], string> = {
  ocupado: "Ocupado",
  "vacante-activa": "Vacante activa",
  "vacante-inactiva": "Vacante inactiva",
};

function managerLabel(node: OrgNode, nodes: OrgNode[]): string {
  if (!node.managerId) return "— Nivel superior —";
  const manager = nodes.find((n) => n.id === node.managerId);
  if (!manager) return "";
  return manager.name ? `${manager.name} (${manager.title})` : manager.title;
}

export default function PositionsTable({ nodes, companyName }: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(kind: "xlsx" | "png") {
    setBusy(true);
    setError(null);
    try {
      if (kind === "xlsx") {
        await exportPositionsAsXlsx(nodes, "tabla-de-cargos", companyName);
      } else if (tableRef.current) {
        await exportTableAsPng(tableRef.current, "tabla-de-cargos", companyName);
      }
    } catch (e) {
      if (!(e instanceof DownloadCancelledError)) {
        setError(e instanceof Error ? e.message : "No se pudo descargar la tabla.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="download-controls">
        <button className="btn-primary" disabled={busy} onClick={() => handleExport("xlsx")}>
          Descargar tabla (Excel)
        </button>
        <button className="btn-secondary" disabled={busy} onClick={() => handleExport("png")}>
          Descargar tabla (imagen)
        </button>
        {error && <span className="download-error">{error}</span>}
      </div>
      <div className="table-scroll">
        <table className="positions-table" ref={tableRef}>
          <thead>
            <tr>
              <th>Cargo</th>
              <th>Nombre</th>
              <th>Estado</th>
              <th>Encargado temporal</th>
              <th>Reporta a</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((n) => (
              <tr key={n.id}>
                <td>{n.title}</td>
                <td>{n.name || <em>Vacante</em>}</td>
                <td>{STATUS_LABEL[n.status]}</td>
                <td>{n.interimName || ""}</td>
                <td>{managerLabel(n, nodes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
