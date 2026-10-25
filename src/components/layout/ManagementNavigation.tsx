import Link from "next/link";
import { BusFront, LogOut, type LucideIcon } from "lucide-react";
import { DarkModeToggle } from "@/components/ui/dark-mode-toggle";
import { AccountLinks } from "./AccountLinks";

type ManagementNavItem = {
  label: string;
  icon: LucideIcon;
  href: string | null;
  disabledReason?: string;
};
type Props = {
  name: string;
  role: string;
  navigationLabel: string;
  items: readonly ManagementNavItem[];
  note: string;
  children?: React.ReactNode;
};
export function ManagementNavigation({
  name,
  role,
  navigationLabel,
  items,
  note,
  children,
}: Props) {
  const itemClass =
    "flex shrink-0 items-center gap-2.5 rounded-lg border border-[var(--tg-line)] px-4 py-3 text-sm text-[var(--tg-ink)]";
  return (
    <header className="border-b border-[var(--tg-line)] bg-[var(--tg-paper)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-5 md:px-8">
        <Link href="/" className="tg-brand">
          <span className="tg-brand-mark">
            <BusFront size={23} aria-hidden="true" />
          </span>
          <span>
            TRANSPORTES<small>GUATEMALA</small>
          </span>
        </Link>
        <div className="flex w-full flex-wrap items-center justify-between gap-3 text-xs md:w-auto">
          <span className="rounded-full border border-[var(--tg-line)] bg-[var(--color-surface)] px-3 py-2 font-semibold text-[var(--tg-green)]">
            {role}
          </span>
          <span className="hidden max-w-48 truncate text-[var(--tg-muted)] lg:inline">{name}</span>
          <div className="flex flex-wrap items-center gap-4">
            <AccountLinks />
            <DarkModeToggle />
            <form action="/api/auth/logout" method="post">
              <button className="flex cursor-pointer items-center gap-2 py-2" type="submit">
                <LogOut size={16} aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5 pb-4 md:px-8">
        {children}
        <nav aria-label={navigationLabel} className="flex gap-2 overflow-x-auto pb-2">
          {items.map(({ label, icon: Icon, href, disabledReason }) =>
            href ? (
              <Link
                key={label}
                href={href}
                className={
                  itemClass +
                  " bg-[var(--color-surface)] font-semibold hover:border-[var(--tg-green)]"
                }
              >
                <Icon size={18} className="text-[var(--tg-green)]" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            ) : (
              <button
                key={label}
                type="button"
                disabled
                title={disabledReason ?? label + ": próximamente"}
                className={itemClass + " disabled:cursor-default disabled:opacity-100"}
              >
                <Icon size={18} className="text-[var(--tg-green)]" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ),
          )}
        </nav>
        <p className="mt-1 text-xs text-[var(--tg-muted)]">{note}</p>
      </div>
    </header>
  );
}
