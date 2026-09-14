import { useEffect, useMemo, useState } from "react";
import type { AppStep, OrgNode, ParsedRow } from "./types";
import { buildInitialNodes, getSubtreeIds } from "./lib/hierarchy";
import { loadPersistedState, savePersistedState, clearPersistedState } from "./lib/persistence";
import FileUpload from "./components/FileUpload";
import HierarchyConfirmation from "./components/HierarchyConfirmation";
import OrgChart from "./components/OrgChart";
import EditModal from "./components/EditModal";
import DownloadControls from "./components/DownloadControls";
import LogoUpload from "./components/LogoUpload";

export default function App() {
  const [step, setStep] = useState<AppStep>(() => loadPersistedState()?.step ?? "upload");
  const [initialNodes, setInitialNodes] = useState<OrgNode[]>(
    () => loadPersistedState()?.initialNodes ?? []
  );
  const [nodes, setNodes] = useState<OrgNode[]>(() => loadPersistedState()?.nodes ?? []);
  const [editingNode, setEditingNode] = useState<OrgNode | null>(null);
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

  function handleStartOver() {
    setStep("upload");
    setInitialNodes([]);
    setNodes([]);
    setViewRootId(null);
    setLogoDataUrl(null);
    clearPersistedState();
  }

  const visibleNodes = useMemo(() => {
    if (!viewRootId) return nodes;
    const ids = getSubtreeIds(nodes, viewRootId);
    return nodes.filter((n) => ids.has(n.id) && (n.id === viewRootId || n.managerId));
  }, [nodes, viewRootId]);

  // When filtering to a subtree, the subtree root should render without its
  // (now hidden) manager line, so treat it as a root for this view only.
  const chartNodes = useMemo(() => {
    if (!viewRootId) return visibleNodes;
    return visibleNodes.map((n) => (n.id === viewRootId ? { ...n, managerId: null } : n));
  }, [visibleNodes, viewRootId]);

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
            <button className="btn-secondary" onClick={handleStartOver}>
              Subir otro archivo
            </button>
          </header>
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
        </div>
      )}

      {editingNode && (
        <EditModal
          node={editingNode}
          allNodes={nodes}
          onSave={handleSaveEdit}
          onClose={() => setEditingNode(null)}
        />
      )}
    </div>
  );
}
