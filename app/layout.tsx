import "@fontsource-variable/nunito-sans";
import "./globals.css";

export const metadata = {
  title: "Finance Cockpit",
  description: "A personal finance command center",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
