"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
const WorkspaceContext = createContext({ busy: false, setBusy: (_busy: boolean) => {} });
export function BranchWorkspaceProvider({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <WorkspaceContext.Provider value={{ busy, setBusy }}>{children}</WorkspaceContext.Provider>
  );
}
export function useBranchWorkspace() {
  return useContext(WorkspaceContext);
}
