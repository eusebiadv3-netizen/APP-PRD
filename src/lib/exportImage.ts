import { toPng } from "html-to-image";

interface DownloadsNamespace {
  save(request: { filename: string; data: Blob }): Promise<{ status: string }>;
}

/**
 * Some hosting environments (like a sandboxed preview) block plain
 * `<a download>` links. When available, the page's `downloads` runtime
 * capability shows the viewer a save confirmation instead.
 */
async function getDownloadsCapability(): Promise<DownloadsNamespace | null> {
  const claudeApi = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } })
    .claude;
  if (!claudeApi?.use) return null;
  try {
    return (await claudeApi.use("downloads")) as DownloadsNamespace | null;
  } catch {
    return null;
  }
}

export class DownloadCancelledError extends Error {}

export async function downloadNodeAsPng(node: HTMLElement, filename: string): Promise<void> {
  const finalName = filename.endsWith(".png") ? filename : `${filename}.png`;
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  const downloads = await getDownloadsCapability();
  if (downloads) {
    const blob = await (await fetch(dataUrl)).blob();
    try {
      await downloads.save({ filename: finalName, data: blob });
    } catch (e) {
      const code = (e as { code?: string } | undefined)?.code;
      if (code === "declined") throw new DownloadCancelledError();
      throw new Error("No se pudo guardar la imagen. Inténtalo de nuevo.");
    }
    return;
  }

  const link = document.createElement("a");
  link.download = finalName;
  link.href = dataUrl;
  link.click();
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "organigrama"
  );
}
