import { NavBar } from "@/components/layout/NavBar";
import { BranchWorkspaceProvider } from "@/components/layout/BranchWorkspaceProvider";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps): React.ReactElement {
  return (
    <div className="transport-app">
      <BranchWorkspaceProvider>
        <NavBar />
        <main className="">{children}</main>
      </BranchWorkspaceProvider>
    </div>
  );
}
