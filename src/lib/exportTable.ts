import * as XLSX from "xlsx";
import { toPng } from "html-to-image";
import type { OrgNode, PositionStatus, PositionType } from "../types";
import { saveBlob, dataUrlToBlob, withCompanyFolder } from "./exportImage";

const STATUS_LABELS: Record<PositionStatus, string> = {
  ocupado: "Ocupado",
  "vacante-activa": "Vacante activa",
  "vacante-inactiva": "Vacante inactiva",
};

const TYPE_LABELS: Record<PositionType, string> = {
  normal: "Normal",
  staff: "Staff",
  outsourcing: "Outsourcing",
};

/**
 * A single value — never "Nombre (Cargo)" combined into one cell — so the
 * column holds exactly what the upload parser looks a "Reporta a" hint up
 * against (a name or a title, one or the other).
 */
function managerLabel(node: OrgNode, nodes: OrgNode[]): string {
  if (!node.managerId) return "";
  const manager = nodes.find((n) => n.id === node.managerId);
  if (!manager) return "";
  return manager.name || manager.title;
}

export async function exportPositionsAsXlsx(
  nodes: OrgNode[],
  filename: string,
  companyName: string
): Promise<void> {
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
  await saveBlob(blob, withCompanyFolder(companyName, finalName));
}

export async function exportTableAsPng(
  tableEl: HTMLElement,
  filename: string,
  companyName: string
): Promise<void> {
  const dataUrl = await toPng(tableEl, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
  const finalName = filename.endsWith(".png") ? filename : `${filename}.png`;
  await saveBlob(dataUrlToBlob(dataUrl), withCompanyFolder(companyName, finalName));
}

/**
 * The org chart's own Excel export: every field the upload file recognizes
 * (Cargo, Nombre, Reporta a, Estado, Tipo, Encargado temporal), one value
 * per column, in the same column order as the sample file — so the download
 * both documents the organigrama and is itself a valid file to re-upload.
 */
export async function exportOrgChartFullAsXlsx(
  nodes: OrgNode[],
  filename: string,
  companyName: string
): Promise<void> {
  const rows = nodes.map((n) => ({
    Cargo: n.title,
    Nombre: n.name,
    "Reporta a": managerLabel(n, nodes),
    Estado: STATUS_LABELS[n.status],
    Tipo: TYPE_LABELS[n.positionType],
    "Encargado temporal": n.interimName,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 28 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Organigrama");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const finalName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  await saveBlob(blob, withCompanyFolder(companyName, finalName));
}
