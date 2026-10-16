export type Row = Record<string, any>;
export type Page = {
  content: Row[];
  totalElements: number;
  page: number;
  size: number;
  totalPages?: number;
};
export type Membership = {
  id: string;
  name: string;
  role: "ORG_ADMIN" | "ASSET_MANAGER" | "VIEWER";
};
export type Session = {
  user: { id: string; email: string; full_name: string; system_admin: boolean };
  organizations: Membership[];
};
export const statuses: Record<string, string> = {
  AVAILABLE: "Disponible",
  ASSIGNED: "Asignado",
  IN_MAINTENANCE: "En mantenimiento",
  RETIRED: "Dado de baja",
  DISPOSED: "Descartado",
  LOST: "Extraviado",
};
export const lifeStates: Record<string, string> = {
  CURRENT: "Vida útil vigente",
  EXPIRING: "Próximo a finalizar",
  EXCEEDED: "Vida útil superada",
  NOT_CALCULABLE: "Información insuficiente",
};
export const events: Record<string, string> = {
  CREATED: "Activo registrado",
  UPDATED: "Información actualizada",
  ASSIGNED: "Entrega a empleado",
  RETURNED: "Devolución registrada",
  TRANSFERRED: "Transferencia realizada",
  STATUS_CHANGED: "Cambio de estado",
};
