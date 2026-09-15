import type { CSSProperties } from "react";
import type { OrgNode } from "../types";
import type { PrintPageLayout } from "../lib/printExport";
import OrgChart from "./OrgChart";

interface Props {
  nodes: OrgNode[];
  layout: PrintPageLayout;
  contentWidth: number;
  contentHeight: number;
  logoDataUrl: string | null;
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

export default function PrintPage({ nodes, layout, contentWidth, contentHeight, logoDataUrl }: Props) {
  const { pageWidth, pageHeight, marginPx, logoRowPx, scale, offsetX, offsetY } = layout;

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
      {logoDataUrl && (
        <div
          style={{
            position: "absolute",
            left: marginPx,
            right: marginPx,
            top: marginPx,
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
