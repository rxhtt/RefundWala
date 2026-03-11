import "./globals.css";

export const metadata = {
  title: "RefundWala Agent Console",
  description: "RefundWala agent console"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
