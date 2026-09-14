import { useState } from "react";
import type { OrgNode } from "../types";
import { slugify, DownloadCancelledError } from "../lib/exportImage";
import { exportOrgChartAsLetterPng } from "../lib/exportChart";

const FULL_VALUE = "__full__";

interface Props {
  allNodes: OrgNode[];
  exportNodes: OrgNode[];
  logoDataUrl: string | null;
  viewRootId: string | null;
  onViewRootChange: (id: string | null) => void;
}

export default function DownloadControls({
  allNodes,
  exportNodes,
  logoDataUrl,
  viewRootId,
  onViewRootChange,
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const rootNode = viewRootId ? allNodes.find((n) => n.id === viewRootId) : null;
      const filename = rootNode
        ? `organigrama-${slugify(rootNode.title)}`
        : "organigrama-completo";
      await exportOrgChartAsLetterPng(exportNodes, filename, logoDataUrl);
    } catch (e) {
      if (!(e instanceof DownloadCancelledError)) {
        setError(e instanceof Error ? e.message : "No se pudo descargar la imagen.");
      }
    } finally {
      setDownloading(false);
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
      <button className="btn-primary" onClick={handleDownload} disabled={downloading}>
        {downloading ? "Generando imagen..." : "Descargar imagen (PNG, tamaño carta)"}
      </button>
      {error && <span className="download-error">{error}</span>}
    </div>
  );
}
