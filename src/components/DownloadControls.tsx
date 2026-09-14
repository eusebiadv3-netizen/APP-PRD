import { useState } from "react";
import type { OrgNode } from "../types";
import { downloadNodeAsPng, slugify } from "../lib/exportImage";

const FULL_VALUE = "__full__";

interface Props {
  nodes: OrgNode[];
  chartRef: React.RefObject<HTMLDivElement>;
  viewRootId: string | null;
  onViewRootChange: (id: string | null) => void;
}

export default function DownloadControls({ nodes, chartRef, viewRootId, onViewRootChange }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    if (!chartRef.current) return;
    setDownloading(true);
    try {
      const rootNode = viewRootId ? nodes.find((n) => n.id === viewRootId) : null;
      const filename = rootNode
        ? `organigrama-${slugify(rootNode.title)}`
        : "organigrama-completo";
      await downloadNodeAsPng(chartRef.current, filename);
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
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              Área de: {n.name ? `${n.name} — ${n.title}` : n.title}
            </option>
          ))}
        </select>
      </label>
      <button className="btn-primary" onClick={handleDownload} disabled={downloading}>
        {downloading ? "Generando imagen..." : "Descargar imagen (PNG)"}
      </button>
    </div>
  );
}
