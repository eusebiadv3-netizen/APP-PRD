import type { CSSProperties } from "react";
import type { OrgNode, SignatureRole } from "../types";
import { SIGNATURE_ROLE_LABEL } from "../types";
import type { PrintPageLayout } from "../lib/printExport";
import { formatDateEs } from "../lib/formatDate";
import OrgChart from "./OrgChart";

interface Props {
  nodes: OrgNode[];
  layout: PrintPageLayout;
  contentWidth: number;
  contentHeight: number;
  logoDataUrl: string | null;
  title: string;
  updateDate: string;
  signatureRoles: SignatureRole[];
}

// Printed output always uses the light palette, regardless of the viewer's
// theme, so a downloaded org chart looks the same and prints cleanly.
const LIGHT_TOKENS = {
  "--color-surface": "#ffffff",
  "--color-border": "#e2e8f0",
  "--color-text": "#1e293b",
  "--color-muted": "#64748b",
  "--color-primary": "#2563eb",
  "--color-vacant-active": "#fde68a",
  "--color-vacant-active-border": "#d97706",
  "--color-vacant-active-text": "#92400e",
  "--color-vacant-inactive": "#f1f5f9",
  "--color-vacant-inactive-border": "#94a3b8",
  "--color-vacant-inactive-text": "#475569",
  "--color-outsourcing": "#ddd6fe",
  "--color-outsourcing-border": "#7c3aed",
  "--color-outsourcing-text": "#5b21b6",
  "--color-shadow": "rgba(0, 0, 0, 0.08)",
  "--color-shadow-hover": "rgba(0, 0, 0, 0.12)",
} as CSSProperties;

const FRAME_INSET = 24; // sits inside the 0.5in margin, never touches content

export default function PrintPage({
  nodes,
  layout,
  contentWidth,
  contentHeight,
  logoDataUrl,
  title,
  updateDate,
  signatureRoles,
}: Props) {
  const {
    pageWidth,
    pageHeight,
    marginPx,
    titleRowPx,
    logoRowPx,
    updateDateRowPx,
    signatureRowPx,
    scale,
    offsetX,
    offsetY,
  } = layout;

  return (
    <div
      style={{
        ...LIGHT_TOKENS,
        width: pageWidth,
        height: pageHeight,
        background: "#ffffff",
        position: "relative",
        overflow: "hidden",
        fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          position: "absolute",
          left: FRAME_INSET,
          top: FRAME_INSET,
          right: FRAME_INSET,
          bottom: FRAME_INSET,
          border: "3px solid #2563eb",
          borderRadius: 6,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: marginPx,
          right: marginPx,
          top: marginPx,
          height: titleRowPx,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          fontWeight: 700,
          color: "#1e293b",
        }}
      >
        {title}
      </div>
      {updateDate && (
        <div
          style={{
            position: "absolute",
            left: marginPx,
            right: marginPx,
            top: marginPx + titleRowPx,
            height: updateDateRowPx,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#64748b",
          }}
        >
          Fecha de actualización: {formatDateEs(updateDate)}
        </div>
      )}
      {logoDataUrl && (
        <div
          style={{
            position: "absolute",
            left: marginPx,
            right: marginPx,
            top: marginPx + titleRowPx + updateDateRowPx,
            height: logoRowPx - 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={logoDataUrl} style={{ maxHeight: "100%", maxWidth: 340, objectFit: "contain" }} />
        </div>
      )}
      {signatureRoles.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: marginPx + 20,
            right: marginPx + 20,
            top: pageHeight - marginPx - signatureRowPx,
            height: signatureRowPx,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-evenly",
            gap: 24,
          }}
        >
          {signatureRoles.map((role) => (
            <div
              key={role}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div style={{ width: "100%", borderTop: "1.5px solid #1e293b" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                {SIGNATURE_ROLE_LABEL[role]}
              </div>
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: offsetX,
          top: offsetY,
          width: contentWidth,
          height: contentHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <OrgChart nodes={nodes} onNodeClick={() => {}} />
      </div>
    </div>
  );
}
