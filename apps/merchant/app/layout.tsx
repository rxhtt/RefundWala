import "./globals.css";

export const metadata = {
  title: "RefundWala Merchant HQ",
  description: "RefundWala merchant dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
