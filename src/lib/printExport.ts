export const LETTER_DPI = 96;
export const PAGE_MARGIN_IN = 0.5;
export const LOGO_ROW_IN = 0.9;
const MAX_CONTENT_SCALE = 2;

const ORIENTATIONS = [
  { w: 8.5, h: 11 }, // portrait
  { w: 11, h: 8.5 }, // landscape
];

export interface PrintPageLayout {
  pageWidth: number;
  pageHeight: number;
  marginPx: number;
  logoRowPx: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Picks whichever Letter orientation (portrait/landscape) fits the chart's
 * natural size with the least shrinking, then returns everything needed to
 * center it on the page inside a 0.5in margin (plus a reserved logo row).
 */
export function computePrintPageLayout(
  contentWidth: number,
  contentHeight: number,
  hasLogo: boolean
): PrintPageLayout {
  const marginPx = Math.round(PAGE_MARGIN_IN * LETTER_DPI);
  const logoRowPx = hasLogo ? Math.round(LOGO_ROW_IN * LETTER_DPI) : 0;

  let best: PrintPageLayout | null = null;
  for (const o of ORIENTATIONS) {
    const pageWidth = Math.round(o.w * LETTER_DPI);
    const pageHeight = Math.round(o.h * LETTER_DPI);
    const availW = pageWidth - 2 * marginPx;
    const availH = pageHeight - 2 * marginPx - logoRowPx;
    const scale = Math.min(availW / contentWidth, availH / contentHeight, MAX_CONTENT_SCALE);
    const offsetX = marginPx + (availW - contentWidth * scale) / 2;
    const offsetY = marginPx + logoRowPx + (availH - contentHeight * scale) / 2;
    const candidate: PrintPageLayout = { pageWidth, pageHeight, marginPx, logoRowPx, scale, offsetX, offsetY };
    if (!best || candidate.scale > best.scale) best = candidate;
  }
  return best!;
}

/** Resolves once every <img> under `el` has finished loading (or failed/timed out). */
export function waitForImagesToLoad(el: HTMLElement, timeoutMs = 3000): Promise<void> {
  const imgs = Array.from(el.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
        setTimeout(resolve, timeoutMs);
      });
    })
  ).then(() => undefined);
}
