"use client";
import Link from "next/link";
import { UserRound, KeyRound } from "lucide-react";
import { useBranchWorkspace } from "./BranchWorkspaceProvider";

export function AccountLinks() {
  const { busy } = useBranchWorkspace();
  const items = [
    { label: "Mi perfil", href: "/mi-cuenta", icon: UserRound },
    { label: "Cambiar contraseña", href: "/mi-cuenta/contrasena", icon: KeyRound },
  ];
  return (
    <nav aria-label="Mi cuenta" className="flex flex-wrap items-center gap-3">
      {items.map(({ label, href, icon: Icon }) =>
        busy ? (
          <button
            key={href}
            type="button"
            disabled
            className="flex items-center gap-2 py-2 text-[var(--tg-muted)]"
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        ) : (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 py-2 text-[var(--tg-ink)] hover:text-[var(--tg-green)]"
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </Link>
        ),
      )}
    </nav>
  );
}
