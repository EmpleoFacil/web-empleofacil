import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Empleo Fácil - Portal Empresas",
  description: "Portal de gestión para empresas - Empleo Fácil",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>{children}</body>
    </html>
  );
}
