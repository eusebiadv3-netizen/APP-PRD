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

export interface SavedChart {
  id: string;
  companyName: string;
  nodes: OrgNode[];
  logoDataUrl: string | null;
  updatedAt: number;
}
