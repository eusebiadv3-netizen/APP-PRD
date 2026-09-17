import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import type { OrgNode, PositionStatus } from "../types";
import { saveBlob, dataUrlToBlob } from "./exportImage";

const STATUS_LABELS: Record<PositionStatus, string> = {
  ocupado: "Ocupado",
  "vacante-activa": "Vacante activa",
  "vacante-inactiva": "Vacante inactiva",
};

function managerLabel(node: OrgNode, nodes: OrgNode[]): string {
  if (!node.managerId) return "";
  const manager = nodes.find((n) => n.id === node.managerId);
  if (!manager) return "";
  return manager.name ? `${manager.name} (${manager.title})` : manager.title;
}

export async function exportPositionsAsXlsx(nodes: OrgNode[], filename: string): Promise<void> {
  const rows = nodes.map((n) => ({
    Cargo: n.title,
    Nombre: n.name,
    Estado: STATUS_LABELS[n.status],
    "Encargado temporal": n.interimName,
    "Reporta a": managerLabel(n, nodes),
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 24 }, { wch: 32 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cargos");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const finalName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  await saveBlob(blob, finalName);
}

export async function exportTableAsPng(tableEl: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(tableEl, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  const finalName = filename.endsWith(".png") ? filename : `${filename}.png`;
  await saveBlob(dataUrlToBlob(dataUrl), finalName);
}
