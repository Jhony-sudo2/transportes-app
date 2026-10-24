import type { Metadata } from "next";
import { DM_Sans, Roboto } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-google-sans",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
