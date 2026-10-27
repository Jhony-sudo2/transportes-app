import { NavBar } from "./NavBar";
import { BranchWorkspaceProvider } from "./BranchWorkspaceProvider";

export function TransportShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="transport-app">
      <BranchWorkspaceProvider>
        <NavBar />
        <main>{children}</main>
      </BranchWorkspaceProvider>
    </div>
  );
}
