import { useEffect, useMemo, useState } from "react";
import type { AppStep, OrgNode, ParsedRow, PositionStatus } from "./types";
import { buildInitialNodes, getSubtreeIds, createNode, deleteNode } from "./lib/hierarchy";
import { loadPersistedState, savePersistedState, clearPersistedState } from "./lib/persistence";
import FileUpload from "./components/FileUpload";
import HierarchyConfirmation from "./components/HierarchyConfirmation";
import OrgChart from "./components/OrgChart";
import EditModal from "./components/EditModal";
import AddPositionModal from "./components/AddPositionModal";
import DownloadControls from "./components/DownloadControls";
import LogoUpload from "./components/LogoUpload";
import PositionsTable from "./components/PositionsTable";

type ViewMode = "chart" | "table";

export default function App() {
  const [step, setStep] = useState<AppStep>(() => loadPersistedState()?.step ?? "upload");
  const [initialNodes, setInitialNodes] = useState<OrgNode[]>(
    () => loadPersistedState()?.initialNodes ?? []
  );
  const [nodes, setNodes] = useState<OrgNode[]>(() => loadPersistedState()?.nodes ?? []);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
  const [addingPosition, setAddingPosition] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [viewRootId, setViewRootId] = useState<string | null>(
    () => loadPersistedState()?.viewRootId ?? null
  );
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
    savePersistedState({ step, initialNodes, nodes, logoDataUrl, viewRootId });
  }, [step, initialNodes, nodes, logoDataUrl, viewRootId]);

  function handleParsed(rows: ParsedRow[]) {
    setInitialNodes(buildInitialNodes(rows));
    setStep("confirm");
  }

  function handleConfirmed(confirmedNodes: OrgNode[]) {
    setNodes(confirmedNodes);
    setViewRootId(null);
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
    setViewRootId(null);
    setLogoDataUrl(null);
    clearPersistedState();
  }

  // An "area" view shows the area head's own manager (so it's clear who the
  // area reports to) plus the head's full subtree (everyone who reports to
  // them) — never the manager's other branches, and never further up than
  // that one direct manager.
  const chartNodes = useMemo(() => {
    if (!viewRootId) return nodes;
    const subtreeIds = getSubtreeIds(nodes, viewRootId);
    const subtreeNodes = nodes.filter((n) => subtreeIds.has(n.id));
    const areaHead = nodes.find((n) => n.id === viewRootId);
    const managerNode = areaHead?.managerId ? nodes.find((n) => n.id === areaHead.managerId) : null;
    if (!managerNode) return subtreeNodes;
    // Shown without ITS OWN manager, so this filtered view stops one level up.
    return [{ ...managerNode, managerId: null }, ...subtreeNodes];
  }, [nodes, viewRootId]);

  return (
    <div className="app">
      {step === "upload" && <FileUpload onParsed={handleParsed} />}

      {step === "confirm" && (
        <HierarchyConfirmation
          initialNodes={initialNodes}
          onConfirmed={handleConfirmed}
          onBack={handleStartOver}
        />
      )}

      {step === "chart" && (
        <div className="chart-screen">
          <header className="chart-header">
            <h1>Organigrama</h1>
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
    </div>
  );
}
