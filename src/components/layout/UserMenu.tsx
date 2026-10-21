"use client";

import { useRouter } from "next/navigation";
import { User, LogOut, Wallet, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Session } from "@/types/auth";

interface UserMenuProps {
  session: Session;
}

export function UserMenu({ session }: UserMenuProps): React.ReactElement {
  const router = useRouter();

  function getInitials(fullName: string): string {
    return fullName
      .split(" ")
      .map((part) => part[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  async function handleSignOut(): Promise<void> {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-md px-2 outline-none transition-colors duration-200 hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary-text)]"
        data-testid="user-menu-trigger"
        aria-label="Menu de usuario"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-[var(--color-pale-blue)] font-sans text-xs font-medium text-[var(--color-primary-text)]">
            {getInitials(session.fullName)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate font-secondary text-sm text-[var(--color-text-primary)] lg:block">
          {session.fullName}
        </span>
        <ChevronDown size={16} className="text-[var(--color-text-secondary)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="min-w-[200px] animate-fade-in-down"
      >
        <DropdownMenuLabel>
          <p className="font-sans text-sm font-medium text-[var(--color-text-primary-black)]">
            {session.fullName}
          </p>
          <p className="font-secondary text-xs text-[var(--color-text-secondary)]">
            {session.email}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild data-testid="user-menu-profile">
          <a href="/participant/profile" className="flex cursor-pointer items-center gap-2">
            <User size={16} />
            Mi perfil
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild data-testid="user-menu-wallet">
          <a href="/participant/wallet" className="flex cursor-pointer items-center gap-2">
            <Wallet size={16} />
            Mi cartera
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => { void handleSignOut(); }}
          className="flex cursor-pointer items-center gap-2 text-[var(--color-error)] focus:text-[var(--color-error)]"
          data-testid="user-menu-logout"
        >
          <LogOut size={16} />
          Cerrar sesion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
