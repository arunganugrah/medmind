import "./globals.css";

export const metadata = {
  title: "MedMind & Quiz — Belajar Medis Visual",
  description: "Pahami konsep medis lewat peta pikiran, lalu uji dengan kuis interaktif.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export const viewport = {
  themeColor: "#0E3D3A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
