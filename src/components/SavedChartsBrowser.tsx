import { useEffect, useMemo, useState } from "react";
import type { SavedChart } from "../types";
import { listCharts, deleteChart } from "../lib/db";

interface Props {
  onOpen: (chart: SavedChart) => void;
  onClose: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
}

export default function SavedChartsBrowser({ onOpen, onClose }: Props) {
  const [charts, setCharts] = useState<SavedChart[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCharts()
      .then(setCharts)
      .catch(() => setError("No se pudieron cargar los organigramas guardados."));
  }, []);

  const filtered = useMemo(() => {
    if (!charts) return [];
    const q = query.trim().toLowerCase();
    if (!q) return charts;
    return charts.filter((c) => c.companyName.toLowerCase().includes(q));
  }, [charts, query]);

  async function handleDelete(id: string) {
    await deleteChart(id);
    setCharts((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>Organigramas guardados</h2>
        {error && <div className="error-banner">{error}</div>}
        <input
          className="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre de empresa..."
          autoFocus
        />
        <div className="saved-charts-list">
          {charts === null && <p className="hint">Cargando...</p>}
          {charts !== null && filtered.length === 0 && (
            <p className="hint">
              {charts.length === 0
                ? "Todavía no has guardado ningún organigrama."
                : "No hay resultados para esa búsqueda."}
            </p>
          )}
          {filtered.map((chart) => (
            <div key={chart.id} className="saved-chart-row">
              <div className="saved-chart-info">
                <div className="saved-chart-name">{chart.companyName}</div>
                <div className="saved-chart-meta">
                  {chart.nodes.length} cargo(s) — actualizado {formatDate(chart.updatedAt)}
                </div>
              </div>
              <div className="saved-chart-actions">
                <button className="btn-primary" onClick={() => onOpen(chart)}>
                  Abrir
                </button>
                <button className="btn-danger-text" onClick={() => handleDelete(chart.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
