import UsageGuide from "./UsageGuide";
import FlowDiagram from "./FlowDiagram";

interface Props {
  onClose: () => void;
}

export default function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>¿Cómo se usa?</h2>
        <FlowDiagram />
        <UsageGuide />
        <div className="actions">
          <button className="btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
