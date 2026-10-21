import { ArrowUpRight, MapPin, ShieldCheck, Route } from "lucide-react";
export function AuthFrame({
  title,
  description,
  children,
  wide = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="tg-auth">
      <div className="tg-intro">
        <p className="tg-eyebrow">
          <span />
          EL CAMINO EMPIEZA AQUÍ
        </p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className={`tg-auth-grid ${wide ? "tg-auth-wide" : ""}`}>
        <section className="tg-form-card">{children}</section>
        <aside className="tg-journey">
          <div className="tg-journey-top">
            <Route size={22} aria-hidden="true" />
            <span>HECHO PARA MOVERTE</span>
            <ArrowUpRight size={22} aria-hidden="true" />
          </div>
          <h2>
            Más cerca de
            <br />
            tu próximo destino.
          </h2>
          <p>Una cuenta. Un lugar para conectar con Transportes Guatemala.</p>
          <div className="tg-route-art" aria-hidden="true">
            <svg viewBox="0 0 300 130" fill="none">
              <path
                d="M25 105C70 105 50 25 130 25S200 105 275 35"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5 6"
              />
              <circle cx="25" cy="105" r="7" fill="currentColor" />
              <circle cx="275" cy="35" r="11" stroke="currentColor" strokeWidth="2" />
              <circle cx="275" cy="35" r="4" fill="currentColor" />
            </svg>
          </div>
          <div className="tg-location">
            <MapPin size={16} aria-hidden="true" />
            Guatemala, nuestro punto de encuentro.
          </div>
          <div className="tg-security">
            <ShieldCheck size={19} aria-hidden="true" />
            <span>
              Tus datos, en buenas manos.<small>Accede y administra tu cuenta.</small>
            </span>
          </div>
        </aside>
      </div>
      <p className="tg-footer">
        TRANSPORTES GUATEMALA <span>·</span> Conectamos personas y destinos.
      </p>
    </div>
  );
}
