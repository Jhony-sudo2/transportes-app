"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Session } from "@/types/auth";

interface NavLink {
  href: string;
  label: string;
}

interface MobileMenuProps {
  links: NavLink[];
  session: Session | null;
}

export function MobileMenu({ links, session }: MobileMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  function handleClose(): void {
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-[var(--color-text-primary)] transition-colors duration-200 hover:bg-[var(--color-surface-hover)]"
        aria-label="Abrir menu de navegacion"
        data-testid="mobile-menu-trigger"
      >
        <Menu size={20} strokeWidth={1.5} />
      </SheetTrigger>

      <SheetContent side="left" className="w-[280px] p-0" data-testid="mobile-menu-content">
        <SheetHeader className="border-b border-[var(--color-border)] px-6 py-4">
          <SheetTitle className="font-sans text-xl font-medium text-[var(--color-primary-text)]">
            Congress n Bugs
          </SheetTitle>
        </SheetHeader>

        {session !== null && (
          <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
            <p className="font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
              {session.fullName}
            </p>
            <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
              {session.email}
            </p>
          </div>
        )}

        <nav className="py-2" aria-label="Navegacion movil" data-testid="mobile-menu-nav">
          {links.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleClose}
              className="block min-h-[44px] px-6 py-3 font-secondary text-sm text-[var(--color-text-primary)] no-underline transition-colors duration-200 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary-text)]"
              style={{ animationDelay: `${index * 40}ms` }}
              data-testid={`mobile-menu-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
