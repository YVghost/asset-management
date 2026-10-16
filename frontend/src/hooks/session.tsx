import { createContext, useContext } from "react";
import type { Session, Membership } from "../types";
export const SessionContext = createContext<{
  session: Session;
  org: Membership;
  selectOrg: (id: string) => void;
  logout: () => void;
}>(null!);
export const useSession = () => useContext(SessionContext);
export const useCanWrite = () => useSession().org.role !== "VIEWER";
