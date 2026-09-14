export type PositionStatus = "ocupado" | "vacante-activa" | "vacante-inactiva";

export interface OrgNode {
  id: string;
  title: string;
  name: string;
  status: PositionStatus;
  managerId: string | null;
  /** true once the user has explicitly confirmed this node's manager */
  confirmed: boolean;
}

export interface ParsedRow {
  title: string;
  name: string;
  status: PositionStatus;
  managerHint: string;
}

export type AppStep = "upload" | "confirm" | "chart";
