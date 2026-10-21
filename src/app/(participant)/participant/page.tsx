import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, BookOpen, Award, Users, CalendarDays, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";

interface QuickLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

function QuickLink({ href, icon, title, description, index }: QuickLinkProps): React.ReactElement {
  const delays = ["", "delay-75", "delay-150", "delay-225", "delay-300"];
  const delayClass = delays[index] ?? "";

  return (
    <Link
      href={href}
      className={`animate-fade-in-up ${delayClass} group flex items-start gap-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-white)] p-5 no-underline transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:shadow-[var(--shadow-high)]`}
      data-testid={`quick-link-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pale-blue)] text-[var(--color-primary-text)] transition-colors duration-200 group-hover:bg-[var(--color-primary)] group-hover:text-white">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-sans text-base font-medium text-[var(--color-text-primary-black)]">
          {title}
        </span>
        <span className="font-secondary text-sm text-[var(--color-text-secondary)]">
          {description}
        </span>
      </div>
      <ArrowRight
        size={18}
        strokeWidth={1.5}
        className="mt-0.5 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[var(--color-primary-text)]"
        aria-hidden="true"
      />
    </Link>
  );
}

export default async function ParticipantDashboard(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) {
    redirect("/login");
  }

  const firstName = session.fullName.split(" ")[0] ?? session.fullName;

  const links = [
    {
      href: "/congresses",
      icon: <CalendarDays size={20} strokeWidth={1.5} aria-hidden="true" />,
      title: "Explorar congresos",
      description: "Descubre y consulta los congresos disponibles.",
    },
    {
      href: "/participant/wallet",
      icon: <Wallet size={20} strokeWidth={1.5} aria-hidden="true" />,
      title: "Mi cartera",
      description: "Consulta tu saldo y recarga fondos para inscribirte.",
    },
    {
      href: "/participant/enrollments",
      icon: <BookOpen size={20} strokeWidth={1.5} aria-hidden="true" />,
      title: "Mis inscripciones",
      description: "Revisa los congresos en los que estas inscrito.",
    },
    {
      href: "/participant/reservations",
      icon: <Users size={20} strokeWidth={1.5} aria-hidden="true" />,
      title: "Mis reservaciones",
      description: "Administra tus reservas en talleres y actividades.",
    },
    {
      href: "/participant/diplomas",
      icon: <Award size={20} strokeWidth={1.5} aria-hidden="true" />,
      title: "Mis diplomas",
      description: "Descarga los certificados de tu participacion.",
    },
  ];

  return (
    <div data-testid="participant-dashboard" className="flex flex-col gap-8">
      <PageHeader
        title={`Bienvenido, ${firstName}`}
        description="Desde aqui puedes gestionar tus inscripciones, cartera y diplomas."
      />

      {/* Quick access grid */}
      <section aria-label="Accesos rapidos">
        <h2 className="mb-4 font-sans text-base font-medium text-[var(--color-text-primary)]">
          Accesos rapidos
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link, index) => (
            <QuickLink key={link.href} {...link} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
