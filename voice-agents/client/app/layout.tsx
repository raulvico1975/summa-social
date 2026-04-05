import type { ReactNode } from "react";

export const metadata = {
  title: "Summa Voice Agents · Web-Agent",
  description: "Pilot text-first per diagnosticar l'encaix de Summa Social",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ca">
      <body
        style={{
          margin: 0,
          background: "#f4efe4",
          color: "#173120",
          fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
