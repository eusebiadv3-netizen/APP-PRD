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

/**
 * Decodes a base64 data: URL into a Blob without using fetch/XHR — some
 * sandboxed hosts block those network APIs entirely, even for data: URIs.
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(",");
  const header = dataUrl.slice(0, commaIndex);
  const base64 = dataUrl.slice(commaIndex + 1);
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export class DownloadCancelledError extends Error {}

/** Offers a data: URL to the viewer as a downloadable file named `filename`. */
export async function saveGeneratedFile(dataUrl: string, filename: string): Promise<void> {
  const finalName = filename.endsWith(".png") ? filename : `${filename}.png`;

  const downloads = await getDownloadsCapability();
  if (downloads) {
    const blob = dataUrlToBlob(dataUrl);
    try {
      await downloads.save({ filename: finalName, data: blob });
    } catch (e) {
      const code = (e as { code?: string } | undefined)?.code;
      if (code === "declined") throw new DownloadCancelledError();
      throw new Error(
        `No se pudo guardar la imagen (código: ${code ?? "desconocido"}). Inténtalo de nuevo.`
      );
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
