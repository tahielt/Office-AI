import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Office AI",
  description: "Oficina visual para coordinar agentes de IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}
