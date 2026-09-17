export type PositionStatus = "ocupado" | "vacante-activa" | "vacante-inactiva";

/**
 * "staff" advises the level it reports to rather than being part of the
 * chain of command (connects with a dashed line); "outsourcing" is an
 * externally contracted position (distinct color + label).
 */
export type PositionType = "normal" | "staff" | "outsourcing";

export interface OrgNode {
  id: string;
  title: string;
  name: string;
  status: PositionStatus;
  positionType: PositionType;
  /** Person temporarily covering a "vacante inactiva" position, if any. */
  interimName: string;
  managerId: string | null;
  /** true once the user has explicitly confirmed this node's manager */
  confirmed: boolean;
}

export interface ParsedRow {
  title: string;
  name: string;
  status: PositionStatus;
  positionType: PositionType;
  interimName: string;
  managerHint: string;
}

export type AppStep = "upload" | "confirm" | "chart";

/** Roles that can carry an authorization signature line on the printed chart. */
export type SignatureRole = "presidente" | "vicepresidente" | "gerente-general";

export const SIGNATURE_ROLE_LABEL: Record<SignatureRole, string> = {
  presidente: "Presidente",
  vicepresidente: "Vicepresidente",
  "gerente-general": "Gerente General",
};

export interface SavedChart {
  id: string;
  companyName: string;
  nodes: OrgNode[];
  logoDataUrl: string | null;
  /** Date shown on the printed/exported chart (YYYY-MM-DD), set by the user. */
  updateDate: string;
  /** Which authorization signature lines to print, if any (none by default). */
  signatureRoles: SignatureRole[];
  updatedAt: number;
}
