import * as XLSX from "xlsx";
import type { ParsedRow, PositionStatus, PositionType } from "../types";

export class FileParseError extends Error {}

const TITLE_KEYS = ["cargo", "titulo", "título", "puesto", "position", "title", "rol"];
const NAME_KEYS = ["nombre", "name", "empleado", "colaborador"];
const MANAGER_KEYS = [
  "reporta a",
  "reportaa",
  "jefe",
  "jefe directo",
  "supervisor",
  "manager",
  "reports to",
  "reporta",
];
const STATUS_KEYS = ["estado", "status"];
const TYPE_KEYS = ["tipo", "type"];
const INTERIM_KEYS = ["encargado temporal", "encargado", "interino", "temporal", "interim"];

function normalizeHeader(header: string): string {
  return header
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function findColumn(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  for (const candidate of candidates) {
    const match = normalized.find((h) => h.norm === candidate);
    if (match) return match.raw;
  }
  // fallback: partial match
  for (const candidate of candidates) {
    const match = normalized.find((h) => h.norm.includes(candidate));
    if (match) return match.raw;
  }
  return null;
}

function parseStatus(raw: string | undefined): PositionStatus {
  if (!raw) return "ocupado";
  const v = normalizeHeader(raw);
  if (v.includes("vacante") && v.includes("inactiv")) return "vacante-inactiva";
  if (v.includes("vacante") && v.includes("activ")) return "vacante-activa";
  if (v.includes("vacante")) return "vacante-activa";
  return "ocupado";
}

function parsePositionType(raw: string | undefined): PositionType {
  if (!raw) return "normal";
  const v = normalizeHeader(raw);
  if (v.includes("outsourcing") || v.includes("externo") || v.includes("contrat")) return "outsourcing";
  if (v.includes("staff") || v.includes("asesor")) return "staff";
  return "normal";
}

export async function parseOrgFile(file: File): Promise<ParsedRow[]> {
  let workbook: XLSX.WorkBook;
  try {
    const buffer = await file.arrayBuffer();
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new FileParseError(
      "No pude leer este archivo. Revisa que tenga el formato correcto e inténtalo de nuevo."
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new FileParseError(
      "No pude leer este archivo. Revisa que tenga el formato correcto e inténtalo de nuevo."
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!rows.length) {
    throw new FileParseError(
      "No pude leer este archivo. Revisa que tenga el formato correcto e inténtalo de nuevo."
    );
  }

  const headers = Object.keys(rows[0]);
  const titleCol = findColumn(headers, TITLE_KEYS);
  if (!titleCol) {
    throw new FileParseError(
      'No encontré una columna de "Cargo" en el archivo. Asegúrate de tener una columna con el título del puesto.'
    );
  }
  const nameCol = findColumn(headers, NAME_KEYS);
  const managerCol = findColumn(headers, MANAGER_KEYS);
  const statusCol = findColumn(headers, STATUS_KEYS);
  const typeCol = findColumn(headers, TYPE_KEYS);
  const interimCol = findColumn(headers, INTERIM_KEYS);

  const parsed: ParsedRow[] = [];
  for (const row of rows) {
    const title = String(row[titleCol] ?? "").trim();
    if (!title) continue;
    const name = nameCol ? String(row[nameCol] ?? "").trim() : "";
    const managerHint = managerCol ? String(row[managerCol] ?? "").trim() : "";
    const status = parseStatus(statusCol ? String(row[statusCol] ?? "") : undefined);
    const positionType = parsePositionType(typeCol ? String(row[typeCol] ?? "") : undefined);
    const interimName = interimCol ? String(row[interimCol] ?? "").trim() : "";
    parsed.push({
      title,
      name,
      managerHint,
      positionType,
      interimName: status === "vacante-inactiva" ? interimName : "",
      status: name ? status : status === "ocupado" ? "vacante-activa" : status,
    });
  }

  if (!parsed.length) {
    throw new FileParseError(
      "No pude leer este archivo. Revisa que tenga el formato correcto e inténtalo de nuevo."
    );
  }

  return parsed;
}
