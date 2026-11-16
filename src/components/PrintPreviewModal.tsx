import { useMemo } from "react";
import type { OrgNode, SignatureRole } from "../types";
import { computeLayout } from "../lib/layout";
import { computePrintPageLayout, type PageSize } from "../lib/printExport";
import PrintPage from "./PrintPage";

interface Props {
  nodes: OrgNode[];
  logoDataUrl: string | null;
  pageSize: PageSize;
  title: string;
  updateDate: string;
  signatureRoles: SignatureRole[];
  busy: boolean;
  onClose: () => void;
  onDownloadPng: () => void;
  onDownloadPdf: () => void;
}

const PREVIEW_MAX_WIDTH = 620;
const PREVIEW_MAX_HEIGHT = 720;

/**
 * Shows the exact same PrintPage used to generate the PNG/PDF, live and at
 * true layout (logo, title, date, signatures, frame), just scaled down to
 * fit the modal — so what the user sees here is what the download will
 * look like, not an approximation.
 */
export default function PrintPreviewModal({
  nodes,
  logoDataUrl,
  pageSize,
  title,
  updateDate,
  signatureRoles,
  busy,
  onClose,
  onDownloadPng,
  onDownloadPdf,
}: Props) {
  const { contentWidth, contentHeight, layout } = useMemo(() => {
    const { width, height } = computeLayout(nodes);
    const printLayout = computePrintPageLayout(width, height, pageSize, {
      hasLogo: !!logoDataUrl,
      hasSignatures: signatureRoles.length > 0,
    });
    return { contentWidth: width, contentHeight: height, layout: printLayout };
  }, [nodes, pageSize, logoDataUrl, signatureRoles]);

  const previewScale = Math.min(
    PREVIEW_MAX_WIDTH / layout.pageWidth,
    PREVIEW_MAX_HEIGHT / layout.pageHeight,
    1
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-preview" onClick={(e) => e.stopPropagation()}>
        <h2>Vista previa de la impresión</h2>
        <p className="hint">Así se va a ver la hoja al descargarla o imprimirla.</p>
        <div
          className="print-preview-frame"
          style={{ width: layout.pageWidth * previewScale, height: layout.pageHeight * previewScale }}
        >
          <div
            style={{
              width: layout.pageWidth,
              height: layout.pageHeight,
              transform: `scale(${previewScale})`,
              transformOrigin: "top left",
            }}
          >
            <PrintPage
              nodes={nodes}
              layout={layout}
              contentWidth={contentWidth}
              contentHeight={contentHeight}
              logoDataUrl={logoDataUrl}
              title={title}
              updateDate={updateDate}
              signatureRoles={signatureRoles}
            />
          </div>
        </div>
        <div className="actions actions-split">
          <button className="btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <div className="actions">
            <button className="btn-secondary" disabled={busy} onClick={onDownloadPng}>
              Descargar imagen (PNG)
            </button>
            <button className="btn-primary" disabled={busy} onClick={onDownloadPdf}>
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
