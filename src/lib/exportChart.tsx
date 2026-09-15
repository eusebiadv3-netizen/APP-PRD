import { createRoot } from "react-dom/client";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import type { OrgNode } from "../types";
import { computeLayout } from "./layout";
import { computePrintPageLayout, waitForImagesToLoad, type PageSize, type PrintPageLayout } from "./printExport";
import { saveGeneratedFile, saveBlob } from "./exportImage";
import PrintPage from "../components/PrintPage";

interface RenderedPage {
  dataUrl: string;
  layout: PrintPageLayout;
}

/**
 * Renders the org chart onto an offscreen page (Letter/Oficio, with
 * margins, blue frame, and the company logo if set) and captures it as a
 * PNG data URL. Shared by the PNG/PDF export paths — printing uses the
 * same PrintPage component but keeps the DOM node instead of a snapshot.
 */
async function renderPrintPageToDataUrl(
  nodes: OrgNode[],
  logoDataUrl: string | null,
  pageSize: PageSize
): Promise<RenderedPage> {
  const { width: contentWidth, height: contentHeight } = computeLayout(nodes);
  const layout = computePrintPageLayout(contentWidth, contentHeight, !!logoDataUrl, pageSize);

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
    return { dataUrl, layout };
  } finally {
    root.unmount();
    container.remove();
  }
}

export async function exportOrgChartAsPng(
  nodes: OrgNode[],
  filename: string,
  logoDataUrl: string | null,
  pageSize: PageSize
): Promise<void> {
  const { dataUrl } = await renderPrintPageToDataUrl(nodes, logoDataUrl, pageSize);
  await saveGeneratedFile(dataUrl, filename);
}

export async function exportOrgChartAsPdf(
  nodes: OrgNode[],
  filename: string,
  logoDataUrl: string | null,
  pageSize: PageSize
): Promise<void> {
  const { dataUrl, layout } = await renderPrintPageToDataUrl(nodes, logoDataUrl, pageSize);
  const widthIn = layout.pageWidth / 96;
  const heightIn = layout.pageHeight / 96;
  const doc = new jsPDF({
    orientation: widthIn > heightIn ? "landscape" : "portrait",
    unit: "in",
    format: [widthIn, heightIn],
  });
  doc.addImage(dataUrl, "PNG", 0, 0, widthIn, heightIn, undefined, "SLOW");
  const blob = doc.output("blob");
  const finalName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  await saveBlob(blob, finalName);
}

/**
 * Opens the browser's native print dialog on the same Letter/Oficio page
 * used for the image/PDF exports — a dedicated DOM region (hidden on
 * screen, shown only under @media print via .print-capture-root in
 * styles.css) is populated and printed, then torn down afterward.
 */
export async function printOrgChart(
  nodes: OrgNode[],
  logoDataUrl: string | null,
  pageSize: PageSize
): Promise<void> {
  const { width: contentWidth, height: contentHeight } = computeLayout(nodes);
  const layout = computePrintPageLayout(contentWidth, contentHeight, !!logoDataUrl, pageSize);

  const container = document.createElement("div");
  container.className = "print-capture-root";
  document.body.appendChild(container);

  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { size: ${layout.pageWidth / 96}in ${layout.pageHeight / 96}in; margin: 0; }`;
  document.head.appendChild(pageStyle);

  const root = createRoot(container);
  root.render(
    <PrintPage
      nodes={nodes}
      layout={layout}
      contentWidth={contentWidth}
      contentHeight={contentHeight}
      logoDataUrl={logoDataUrl}
    />
  );

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await waitForImagesToLoad(container);

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener("afterprint", cleanup);
    root.unmount();
    container.remove();
    pageStyle.remove();
  }
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Some hosts never fire afterprint (e.g. a sandboxed preview) — don't
  // leave the print-only DOM mounted forever.
  setTimeout(cleanup, 60000);
}
