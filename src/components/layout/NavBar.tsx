import Link from "next/link";
import { BusFront, ArrowUpRight } from "lucide-react";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
export function NavBar(): React.ReactElement {
  return (
    <header className="tg-nav">
      <div className="tg-nav-inner">
        <Link href="/" className="tg-brand">
          <span className="tg-brand-mark">
            <BusFront size={23} aria-hidden="true" />
          </span>
          <span>
            TRANSPORTES<small>GUATEMALA</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal">
          <Link href="/login">Ingresar</Link>
          <Link href="/register" className="tg-nav-register">
            Crear cuenta <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <DarkModeToggle />
        </nav>
      </div>
    </header>
  );
}
