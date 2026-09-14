import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import type { OrgNode } from "../types";
import { computeLayout } from "./layout";
import { computePrintPageLayout, waitForImagesToLoad } from "./printExport";
import { saveGeneratedFile } from "./exportImage";
import PrintPage from "../components/PrintPage";

/**
 * Renders the org chart onto an offscreen Letter-size page (with margins,
 * and the company logo if set), captures it as PNG, and offers it as a
 * download. The on-screen chart itself is left untouched.
 */
export async function exportOrgChartAsLetterPng(
  nodes: OrgNode[],
  filename: string,
  logoDataUrl: string | null
): Promise<void> {
  const { width: contentWidth, height: contentHeight } = computeLayout(nodes);
  const layout = computePrintPageLayout(contentWidth, contentHeight, !!logoDataUrl);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  document.body.appendChild(container);

  const root = createRoot(container);
  try {
    root.render(
      <PrintPage
        nodes={nodes}
        layout={layout}
        contentWidth={contentWidth}
        contentHeight={contentHeight}
        logoDataUrl={logoDataUrl}
      />
    );

    // Let React commit and the browser lay it out before measuring/capturing.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await waitForImagesToLoad(container);

    const pageEl = container.firstElementChild as HTMLElement;
    const dataUrl = await toPng(pageEl, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      width: layout.pageWidth,
      height: layout.pageHeight,
    });

    await saveGeneratedFile(dataUrl, filename);
  } finally {
    root.unmount();
    container.remove();
  }
}
