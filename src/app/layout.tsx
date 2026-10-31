import type { Metadata } from "next";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const dmSans = localFont({
  src: "./fonts/DMSans-variable.ttf",
  weight: "100 900",
  variable: "--font-google-sans",
  display: "swap",
});

const roboto = localFont({
  src: "./fonts/Roboto-variable.ttf",
  weight: "100 900",
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Transportes Guatemala | Iniciar sesión",
  description: "Acceso a la plataforma de Transportes Guatemala.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="es" className={`${dmSans.variable} ${roboto.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
