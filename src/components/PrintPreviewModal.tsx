import { useMemo } from "react";
import type { OrgNode, SignatureRole } from "../types";
import { computeLayout } from "../lib/layout";
import { computePrintPageLayout, type PageSize } from "../lib/printExport";
import PrintPage from "./PrintPage";

export type TitleCase = "normal" | "upper" | "lower";

interface Props {
  nodes: OrgNode[];
  logoDataUrl: string | null;
  pageSize: PageSize;
  titleInput: string;
  defaultTitle: string;
  onTitleInputChange: (title: string) => void;
  titleCase: TitleCase;
  onTitleCaseChange: (titleCase: TitleCase) => void;
  renderedTitle: string;
  updateDate: string;
  signatureRoles: SignatureRole[];
  busy: boolean;
  onClose: () => void;
  onDownloadPng: () => void;
  onDownloadPdf: () => void;
}

const PREVIEW_MAX_WIDTH = 620;
const PREVIEW_MAX_HEIGHT = 650;

/**
 * Shows the exact same PrintPage used to generate the PNG/PDF, live and at
 * true layout (logo, title, date, signatures, frame), just scaled down to
 * fit the modal — so what the user sees here is what the download will
 * look like, not an approximation. The title can be edited and its case
 * changed right here, with the preview updating immediately.
 */
export default function PrintPreviewModal({
  nodes,
  logoDataUrl,
  pageSize,
  titleInput,
  defaultTitle,
  onTitleInputChange,
  titleCase,
  onTitleCaseChange,
  renderedTitle,
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
      hasUpdateDate: !!updateDate,
      hasSignatures: signatureRoles.length > 0,
    });
    return { contentWidth: width, contentHeight: height, layout: printLayout };
  }, [nodes, pageSize, logoDataUrl, updateDate, signatureRoles]);

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
        <div className="preview-title-controls">
          <label className="view-select">
            Título del organigrama:
            <input
              type="text"
              value={titleInput}
              placeholder={defaultTitle}
              onChange={(e) => onTitleInputChange(e.target.value)}
            />
          </label>
          <label className="view-select">
            Mayúsculas / minúsculas:
            <select
              value={titleCase}
              onChange={(e) => onTitleCaseChange(e.target.value as TitleCase)}
            >
              <option value="normal">Normal</option>
              <option value="upper">MAYÚSCULAS</option>
              <option value="lower">minúsculas</option>
            </select>
          </label>
        </div>
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
              title={renderedTitle}
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
