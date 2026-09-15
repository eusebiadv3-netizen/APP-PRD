import { useEffect, useMemo, useState } from "react";
import type { AppStep, OrgNode, ParsedRow, PositionStatus, SavedChart } from "./types";
import { buildInitialNodes, getSubtreeIds, getAncestors, createNode, deleteNode } from "./lib/hierarchy";
import { loadPersistedState, savePersistedState, clearPersistedState } from "./lib/persistence";
import { saveChart, makeChartId } from "./lib/db";
import FileUpload from "./components/FileUpload";
import HierarchyConfirmation from "./components/HierarchyConfirmation";
import OrgChart from "./components/OrgChart";
import EditModal from "./components/EditModal";
import AddPositionModal from "./components/AddPositionModal";
import DownloadControls from "./components/DownloadControls";
import LogoUpload from "./components/LogoUpload";
import PositionsTable from "./components/PositionsTable";
import SavedChartsBrowser from "./components/SavedChartsBrowser";

type ViewMode = "chart" | "table";

export default function App() {
  const [step, setStep] = useState<AppStep>(() => loadPersistedState()?.step ?? "upload");
  const [initialNodes, setInitialNodes] = useState<OrgNode[]>(
    () => loadPersistedState()?.initialNodes ?? []
  );
  const [nodes, setNodes] = useState<OrgNode[]>(() => loadPersistedState()?.nodes ?? []);
  const [chartId, setChartId] = useState<string | null>(() => loadPersistedState()?.chartId ?? null);
  const [companyName, setCompanyName] = useState<string>(
    () => loadPersistedState()?.companyName ?? ""
  );
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const [addingPosition, setAddingPosition] = useState(false);
  const [browsingSaved, setBrowsingSaved] = useState(false);
  const [editingCompanyName, setEditingCompanyName] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [viewRootId, setViewRootId] = useState<string | null>(
    () => loadPersistedState()?.viewRootId ?? null
  );
  const [chainMode, setChainMode] = useState<"direct" | "full">("direct");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(
    () => loadPersistedState()?.logoDataUrl ?? null
  );

  // Autosave so a page reload (a published fix, an accidental refresh,
  // reopening the tab later) doesn't force starting over from scratch.
  useEffect(() => {
    if (step === "upload") {
      clearPersistedState();
      return;
    }
    savePersistedState({ step, initialNodes, nodes, logoDataUrl, viewRootId, chartId, companyName });
  }, [step, initialNodes, nodes, logoDataUrl, viewRootId, chartId, companyName]);

  // Every confirmed org chart lives permanently in the app's own storage
  // (the "archivero interno"), searchable later by company name.
  useEffect(() => {
    if (step !== "chart" || !chartId || !companyName) return;
    saveChart({ id: chartId, companyName, nodes, logoDataUrl, updatedAt: Date.now() });
  }, [step, chartId, companyName, nodes, logoDataUrl]);

  function handleParsed(rows: ParsedRow[]) {
    setInitialNodes(buildInitialNodes(rows));
    setStep("confirm");
  }

  function handleConfirmed(confirmedNodes: OrgNode[], name: string) {
    setNodes(confirmedNodes);
    setCompanyName(name);
    setChartId((prev) => prev ?? makeChartId());
    setViewRootId(null);
    setStep("chart");
  }

  function handleOpenSavedChart(chart: SavedChart) {
    setChartId(chart.id);
    setCompanyName(chart.companyName);
    setNodes(chart.nodes);
    setLogoDataUrl(chart.logoDataUrl);
    setViewRootId(null);
    setBrowsingSaved(false);
    setStep("chart");
  }

  function handleSaveEdit(updated: OrgNode) {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setEditingNode(null);
  }

  function handleDeleteNode(nodeId: string, strategy: "reassign" | "root") {
    setNodes((prev) => deleteNode(prev, nodeId, strategy));
    setEditingNode(null);
    if (viewRootId === nodeId) setViewRootId(null);
  }

  function handleAddPosition(
    title: string,
    name: string,
    status: PositionStatus,
    managerId: string | null
  ) {
    setNodes((prev) => [...prev, createNode(title, name, status, managerId)]);
    setAddingPosition(false);
  }

  function handleStartOver() {
    setStep("upload");
    setInitialNodes([]);
    setNodes([]);
    setChartId(null);
    setCompanyName("");
    setViewRootId(null);
    setLogoDataUrl(null);
    clearPersistedState();
  }

  // An "area" view always shows the head's full subtree (everyone who
  // reports to them). Above that, it shows either just the direct manager
  // (capped there, so this view stops one level up) or the full chain up
  // to the company's top — never the managers' other branches either way.
  const chartNodes = useMemo(() => {
    if (!viewRootId) return nodes;
    const subtreeIds = getSubtreeIds(nodes, viewRootId);
    const subtreeNodes = nodes.filter((n) => subtreeIds.has(n.id));
    const ancestors = getAncestors(nodes, viewRootId);
    if (ancestors.length === 0) return subtreeNodes;
    if (chainMode === "full") return [...ancestors, ...subtreeNodes];
    return [{ ...ancestors[0], managerId: null }, ...subtreeNodes];
  }, [nodes, viewRootId, chainMode]);

  return (
    <div className="app">
      {step === "upload" && (
        <FileUpload onParsed={handleParsed} onBrowseSaved={() => setBrowsingSaved(true)} />
      )}

      {step === "confirm" && (
        <HierarchyConfirmation
          initialNodes={initialNodes}
          initialCompanyName={companyName}
          onConfirmed={handleConfirmed}
          onBack={handleStartOver}
        />
      )}

      {step === "chart" && (
        <div className="chart-screen">
          <header className="chart-header">
            <div className="chart-title-block">
              <h1>Organigrama</h1>
              {editingCompanyName ? (
                <input
                  className="company-name-inline-input"
                  value={companyName}
                  autoFocus
                  onChange={(e) => setCompanyName(e.target.value)}
                  onBlur={() => setEditingCompanyName(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingCompanyName(false)}
                />
              ) : (
                <button className="company-name-label" onClick={() => setEditingCompanyName(true)}>
                  {companyName || "Sin nombre de empresa"} ✎
                </button>
              )}
            </div>
            <div className="header-actions">
              <div className="view-mode-toggle">
                <button
                  className={viewMode === "chart" ? "toggle-btn toggle-btn-active" : "toggle-btn"}
                  onClick={() => setViewMode("chart")}
                >
                  Organigrama
                </button>
                <button
                  className={viewMode === "table" ? "toggle-btn toggle-btn-active" : "toggle-btn"}
                  onClick={() => setViewMode("table")}
                >
                  Tabla de cargos
                </button>
              </div>
              <button className="btn-secondary" onClick={() => setAddingPosition(true)}>
                Agregar posición
              </button>
              <button className="btn-secondary" onClick={() => setBrowsingSaved(true)}>
                Organigramas guardados
              </button>
              <button className="btn-secondary" onClick={handleStartOver}>
                Subir otro archivo
              </button>
            </div>
          </header>

          {viewMode === "chart" ? (
            <>
              <LogoUpload logoDataUrl={logoDataUrl} onChange={setLogoDataUrl} />
              <DownloadControls
                allNodes={nodes}
                exportNodes={chartNodes}
                logoDataUrl={logoDataUrl}
                viewRootId={viewRootId}
                onViewRootChange={setViewRootId}
                chainMode={chainMode}
                onChainModeChange={setChainMode}
              />
              <div className="chart-scroll">
                <OrgChart
                  nodes={chartNodes}
                  onNodeClick={(clicked) => {
                    // chartNodes may show a fabricated root (see above) for the
                    // filtered view; edit the real node so its true manager loads.
                    setEditingNode(nodes.find((n) => n.id === clicked.id) ?? clicked);
                  }}
                />
              </div>
            </>
          ) : (
            <PositionsTable nodes={nodes} />
          )}
        </div>
      )}

      {editingNode && (
        <EditModal
          node={editingNode}
          allNodes={nodes}
          onSave={handleSaveEdit}
          onDelete={handleDeleteNode}
          onClose={() => setEditingNode(null)}
        />
      )}

      {addingPosition && (
        <AddPositionModal
          allNodes={nodes}
          onAdd={handleAddPosition}
          onClose={() => setAddingPosition(false)}
        />
      )}

      {browsingSaved && (
        <SavedChartsBrowser onOpen={handleOpenSavedChart} onClose={() => setBrowsingSaved(false)} />
      )}
    </div>
  );
}
