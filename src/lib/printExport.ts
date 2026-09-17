export const LETTER_DPI = 96;
export const PAGE_MARGIN_IN = 0.4;
export const LOGO_ROW_IN = 1.3;
export const TITLE_ROW_IN = 0.55;
export const SIGNATURE_ROW_IN = 0.9;
const MAX_CONTENT_SCALE = 2.5;

export type PageSize = "carta" | "oficio";

export const PAGE_SIZE_LABEL: Record<PageSize, string> = {
  carta: "Carta (8.5 x 11 in)",
  oficio: "Oficio (8.5 x 14 in)",
};

const PAGE_DIMENSIONS_IN: Record<PageSize, { w: number; h: number }> = {
  carta: { w: 8.5, h: 11 },
  oficio: { w: 8.5, h: 14 },
};

function orientationsFor(pageSize: PageSize): { w: number; h: number }[] {
  const { w, h } = PAGE_DIMENSIONS_IN[pageSize];
  return [
    { w, h }, // portrait
    { w: h, h: w }, // landscape
  ];
}

export interface PrintPageLayout {
  pageWidth: number;
  pageHeight: number;
  marginPx: number;
  titleRowPx: number;
  logoRowPx: number;
  signatureRowPx: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface PrintPageOptions {
  hasLogo: boolean;
  hasSignatures: boolean;
}

/**
 * Picks whichever orientation of the chosen page size (Carta/Oficio,
 * portrait/landscape) fits the chart's natural size with the least
 * shrinking, then returns everything needed to center it inside a 0.4in
 * margin (below a title row — the update date, when set, shares that same
 * row rather than reserving its own — and a logo row when there's a logo;
 * above an optional signature row).
 */
export function computePrintPageLayout(
  contentWidth: number,
  contentHeight: number,
  pageSize: PageSize = "carta",
  options: PrintPageOptions = { hasLogo: false, hasSignatures: false }
): PrintPageLayout {
  const marginPx = Math.round(PAGE_MARGIN_IN * LETTER_DPI);
  const titleRowPx = Math.round(TITLE_ROW_IN * LETTER_DPI);
  const logoRowPx = options.hasLogo ? Math.round(LOGO_ROW_IN * LETTER_DPI) : 0;
  const signatureRowPx = options.hasSignatures ? Math.round(SIGNATURE_ROW_IN * LETTER_DPI) : 0;
  const topReservedPx = titleRowPx + logoRowPx;
  const bottomReservedPx = signatureRowPx;

  let best: PrintPageLayout | null = null;
  for (const o of orientationsFor(pageSize)) {
    const pageWidth = Math.round(o.w * LETTER_DPI);
    const pageHeight = Math.round(o.h * LETTER_DPI);
    const availW = pageWidth - 2 * marginPx;
    const availH = pageHeight - 2 * marginPx - topReservedPx - bottomReservedPx;
    const scale = Math.min(availW / contentWidth, availH / contentHeight, MAX_CONTENT_SCALE);
    const offsetX = marginPx + (availW - contentWidth * scale) / 2;
    const offsetY = marginPx + topReservedPx + (availH - contentHeight * scale) / 2;
    const candidate: PrintPageLayout = {
      pageWidth,
      pageHeight,
      marginPx,
      titleRowPx,
      logoRowPx,
      signatureRowPx,
      scale,
      offsetX,
      offsetY,
    };
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
