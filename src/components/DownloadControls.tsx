import { useState } from "react";
import type { OrgNode, SignatureRole } from "../types";
import { SIGNATURE_ROLE_LABEL } from "../types";
import { slugify, DownloadCancelledError } from "../lib/exportImage";
import { exportOrgChartAsPng, exportOrgChartAsPdf, printOrgChart } from "../lib/exportChart";
import { exportOrgChartRelationsAsXlsx } from "../lib/exportTable";
import { PAGE_SIZE_LABEL, type PageSize } from "../lib/printExport";

const FULL_VALUE = "__full__";
const ALL_SIGNATURE_ROLES: SignatureRole[] = ["presidente", "vicepresidente", "gerente-general"];

interface Props {
  allNodes: OrgNode[];
  exportNodes: OrgNode[];
  logoDataUrl: string | null;
  companyName: string;
  viewRootId: string | null;
  onViewRootChange: (id: string | null) => void;
  chainMode: "direct" | "full";
  onChainModeChange: (mode: "direct" | "full") => void;
  depthLimit: number | null;
  onDepthLimitChange: (depth: number | null) => void;
  updateDate: string;
  onUpdateDateChange: (date: string) => void;
  signatureRoles: SignatureRole[];
  onSignatureRolesChange: (roles: SignatureRole[]) => void;
}

const DEPTH_ALL = "__all__";

type BusyAction = "png" | "pdf" | "print" | "xlsx" | null;

export default function DownloadControls({
  allNodes,
  exportNodes,
  logoDataUrl,
  companyName,
  viewRootId,
  onViewRootChange,
  chainMode,
  onChainModeChange,
  depthLimit,
  onDepthLimitChange,
  updateDate,
  onUpdateDateChange,
  signatureRoles,
  onSignatureRolesChange,
}: Props) {
  const [pageSize, setPageSize] = useState<PageSize>("carta");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleSignatureRole(role: SignatureRole) {
    if (signatureRoles.includes(role)) {
      onSignatureRolesChange(signatureRoles.filter((r) => r !== role));
    } else {
      onSignatureRolesChange([...signatureRoles, role]);
    }
  }

  function currentAreaNode(): OrgNode | null {
    return viewRootId ? allNodes.find((n) => n.id === viewRootId) ?? null : null;
  }

  function currentFilename(): string {
    const rootNode = currentAreaNode();
    return rootNode ? `organigrama-${slugify(rootNode.title)}` : "organigrama-completo";
  }

  function currentTitle(): string {
    const rootNode = currentAreaNode();
    return rootNode ? `Organigrama de ${rootNode.title}` : "Organigrama completo";
  }

  async function run(action: BusyAction, task: () => Promise<void>) {
    setBusy(action);
    setError(null);
    try {
      await task();
    } catch (e) {
      if (!(e instanceof DownloadCancelledError)) {
        setError(e instanceof Error ? e.message : "No se pudo completar la acción.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="download-controls">
      <label className="view-select">
        Vista:
        <select
          value={viewRootId ?? FULL_VALUE}
          onChange={(e) => onViewRootChange(e.target.value === FULL_VALUE ? null : e.target.value)}
        >
          <option value={FULL_VALUE}>Organigrama completo</option>
          {allNodes.map((n) => (
            <option key={n.id} value={n.id}>
              Área de: {n.name ? `${n.name} — ${n.title}` : n.title}
            </option>
          ))}
        </select>
      </label>

      {viewRootId && (
        <label className="view-select">
          Mostrar hacia arriba:
          <select
            value={chainMode}
            onChange={(e) => onChainModeChange(e.target.value as "direct" | "full")}
          >
            <option value="direct">Solo el jefe directo</option>
            <option value="full">Cadena completa hasta la cabeza</option>
          </select>
        </label>
      )}

      <label className="view-select">
        Niveles a mostrar:
        <select
          value={depthLimit == null ? DEPTH_ALL : String(depthLimit)}
          onChange={(e) =>
            onDepthLimitChange(e.target.value === DEPTH_ALL ? null : Number(e.target.value))
          }
        >
          <option value={DEPTH_ALL}>Todos los niveles</option>
          <option value="1">Primera línea (1 nivel)</option>
          <option value="2">Primeras 2 líneas</option>
          <option value="3">Primeras 3 líneas</option>
        </select>
      </label>

      <label className="view-select">
        Tamaño de página:
        <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSize)}>
          {(Object.keys(PAGE_SIZE_LABEL) as PageSize[]).map((size) => (
            <option key={size} value={size}>
              {PAGE_SIZE_LABEL[size]}
            </option>
          ))}
        </select>
      </label>

      <label className="view-select">
        Fecha de actualización:
        <input
          type="date"
          value={updateDate}
          onChange={(e) => onUpdateDateChange(e.target.value)}
        />
      </label>

      <div className="signature-select">
        <span>Firma de autorización (opcional):</span>
        {ALL_SIGNATURE_ROLES.map((role) => (
          <label key={role} className="signature-checkbox">
            <input
              type="checkbox"
              checked={signatureRoles.includes(role)}
              onChange={() => toggleSignatureRole(role)}
            />
            {SIGNATURE_ROLE_LABEL[role]}
          </label>
        ))}
      </div>

      <button
        className="btn-primary"
        disabled={busy !== null}
        onClick={() =>
          run("png", () =>
            exportOrgChartAsPng(
              exportNodes,
              currentFilename(),
              logoDataUrl,
              pageSize,
              currentTitle(),
              updateDate,
              signatureRoles,
              companyName
            )
          )
        }
      >
        {busy === "png" ? "Generando imagen..." : "Descargar imagen (PNG)"}
      </button>
      <button
        className="btn-secondary"
        disabled={busy !== null}
        onClick={() =>
          run("pdf", () =>
            exportOrgChartAsPdf(
              exportNodes,
              currentFilename(),
              logoDataUrl,
              pageSize,
              currentTitle(),
              updateDate,
              signatureRoles,
              companyName
            )
          )
        }
      >
        {busy === "pdf" ? "Generando PDF..." : "Descargar PDF"}
      </button>
      <button
        className="btn-secondary"
        disabled={busy !== null}
        onClick={() =>
          run("print", () =>
            printOrgChart(exportNodes, logoDataUrl, pageSize, currentTitle(), updateDate, signatureRoles)
          )
        }
      >
        {busy === "print" ? "Preparando impresión..." : "Imprimir"}
      </button>
      <button
        className="btn-secondary"
        disabled={busy !== null}
        onClick={() =>
          run("xlsx", () =>
            exportOrgChartRelationsAsXlsx(exportNodes, currentFilename(), companyName)
          )
        }
      >
        {busy === "xlsx" ? "Generando Excel..." : "Descargar Excel (Cargo/Nombre/Reporta a)"}
      </button>
      {error && <span className="download-error">{error}</span>}
    </div>
  );
}
