import { NavBar } from "@/components/layout/NavBar";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps): React.ReactElement {
  return (
    <div className="transport-app">
      <NavBar />
      <main className="">{children}</main>
    </div>
  );
}
