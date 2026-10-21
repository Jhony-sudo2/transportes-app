"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  Bug,
  Building2,
  CalendarDays,
  Users,
  DoorOpen,
  Activity,
  Megaphone,
  FileText,
  ClipboardCheck,
  BarChart2,
  Settings,
  CheckSquare,
  UserPlus,
} from "lucide-react";
import type { Role } from "@/types/auth";
import { cn } from "@/lib/utils";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const CONGRESS_ADMIN_ITEMS: SidebarItem[] = [
  { href: "/congress-admin/congresses",     label: "Mis congresos",      icon: <CalendarDays size={18} strokeWidth={1.5} /> },
  { href: "/congress-admin/rooms",          label: "Salas",              icon: <DoorOpen size={18} strokeWidth={1.5} /> },
  { href: "/congress-admin/activities",     label: "Actividades",        icon: <Activity size={18} strokeWidth={1.5} /> },
  { href: "/congress-admin/calls",          label: "Convocatorias",      icon: <Megaphone size={18} strokeWidth={1.5} /> },
  { href: "/congress-admin/proposals",      label: "Propuestas",         icon: <FileText size={18} strokeWidth={1.5} /> },
  { href: "/congress-admin/committee",      label: "Comite",             icon: <Users size={18} strokeWidth={1.5} /> },
  { href: "/congress-admin/guest-speakers", label: "Ponentes invitados", icon: <UserPlus size={18} strokeWidth={1.5} /> },
  { href: "/congress-admin/attendance",     label: "Asistencia",         icon: <CheckSquare size={18} strokeWidth={1.5} /> },
  { href: "/congress-admin/reports",        label: "Reportes",           icon: <BarChart2 size={18} strokeWidth={1.5} /> },
];

const SYSTEM_ADMIN_ITEMS: SidebarItem[] = [
  { href: "/system-admin/users",        label: "Usuarios",      icon: <Users size={18} strokeWidth={1.5} /> },
  { href: "/system-admin/institutions", label: "Instituciones", icon: <Building2 size={18} strokeWidth={1.5} /> },
  { href: "/system-admin/config",       label: "Configuracion", icon: <Settings size={18} strokeWidth={1.5} /> },
  { href: "/system-admin/reports",      label: "Reportes",      icon: <ClipboardCheck size={18} strokeWidth={1.5} /> },
];

const ROLE_LABELS: Partial<Record<Role, string>> = {
  CONGRESS_ADMIN: "Admin. de Congreso",
  SYSTEM_ADMIN: "Admin. del Sistema",
};

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const items =
    role === "CONGRESS_ADMIN"
      ? CONGRESS_ADMIN_ITEMS
      : role === "SYSTEM_ADMIN"
        ? SYSTEM_ADMIN_ITEMS
        : [];

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-300",
        collapsed ? "w-14" : "w-60",
      )}
      data-testid="sidebar"
      aria-label="Navegacion lateral"
    >
      {/* Floating collapse toggle on the right edge */}
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className={cn(
          "absolute right-0 top-8 z-20 translate-x-1/2",
          "flex h-6 w-6 items-center justify-center",
          "rounded-full border border-[var(--color-border)] bg-[var(--color-white)]",
          "text-[var(--color-text-secondary)] shadow-[var(--shadow-elevated)]",
          "transition-all duration-200 hover:border-[var(--color-primary)]",
          "hover:text-[var(--color-primary-text)] hover:shadow-[var(--shadow-high)]",
        )}
        aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
        data-testid="sidebar-toggle"
      >
        <ChevronLeft
          size={13}
          strokeWidth={2.5}
          className={cn("transition-transform duration-300", collapsed && "rotate-180")}
        />
      </button>

      {/* Role header */}
      <div
        className={cn(
          "flex items-center gap-2.5 border-b border-[var(--color-border)] px-3 py-3.5",
          collapsed && "justify-center px-0",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)] text-white shadow-[var(--shadow-raised)]">
          <Bug size={14} strokeWidth={2} />
        </span>
        <span
          className={cn(
            "overflow-hidden text-ellipsis whitespace-nowrap font-sans text-xs font-medium text-[var(--color-text-secondary)] transition-all duration-300",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
          )}
        >
          {ROLE_LABELS[role] ?? role}
        </span>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item, index) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              data-testid={`sidebar-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "group relative mx-2 flex items-center gap-3 rounded-full py-2 no-underline transition-all duration-200",
                "animate-slide-in-left",
                collapsed ? "justify-center px-2" : "px-3",
                isActive
                  ? "bg-[var(--color-pale-blue)] text-[var(--color-primary-text)]"
                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-primary-text)]",
              )}
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <span
                className={cn(
                  "shrink-0 transition-transform duration-200",
                  !isActive && "group-hover:scale-110",
                  isActive && "text-[var(--color-primary-text)]",
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "overflow-hidden text-ellipsis whitespace-nowrap font-secondary text-sm font-medium transition-all duration-300",
                  collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
