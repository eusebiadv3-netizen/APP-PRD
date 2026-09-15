import { useState } from "react";
import type { OrgNode } from "../types";
import { slugify, DownloadCancelledError } from "../lib/exportImage";
import { exportOrgChartAsPng, exportOrgChartAsPdf, printOrgChart } from "../lib/exportChart";
import { PAGE_SIZE_LABEL, type PageSize } from "../lib/printExport";

const FULL_VALUE = "__full__";

interface Props {
  allNodes: OrgNode[];
  exportNodes: OrgNode[];
  logoDataUrl: string | null;
  viewRootId: string | null;
  onViewRootChange: (id: string | null) => void;
  chainMode: "direct" | "full";
  onChainModeChange: (mode: "direct" | "full") => void;
}

type BusyAction = "png" | "pdf" | "print" | null;

export default function DownloadControls({
  allNodes,
  exportNodes,
  logoDataUrl,
  viewRootId,
  onViewRootChange,
  chainMode,
  onChainModeChange,
}: Props) {
  const [pageSize, setPageSize] = useState<PageSize>("carta");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);

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
        Tamaño de página:
        <select value={pageSize} onChange={(e) => setPageSize(e.target.value as PageSize)}>
          {(Object.keys(PAGE_SIZE_LABEL) as PageSize[]).map((size) => (
            <option key={size} value={size}>
              {PAGE_SIZE_LABEL[size]}
            </option>
          ))}
        </select>
      </label>

      <button
        className="btn-primary"
        disabled={busy !== null}
        onClick={() =>
          run("png", () =>
            exportOrgChartAsPng(exportNodes, currentFilename(), logoDataUrl, pageSize, currentTitle())
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
            exportOrgChartAsPdf(exportNodes, currentFilename(), logoDataUrl, pageSize, currentTitle())
          )
        }
      >
        {busy === "pdf" ? "Generando PDF..." : "Descargar PDF"}
      </button>
      <button
        className="btn-secondary"
        disabled={busy !== null}
        onClick={() => run("print", () => printOrgChart(exportNodes, logoDataUrl, pageSize, currentTitle()))}
      >
        {busy === "print" ? "Preparando impresión..." : "Imprimir"}
      </button>
      {error && <span className="download-error">{error}</span>}
    </div>
  );
}
