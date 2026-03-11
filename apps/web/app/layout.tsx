import "./globals.css";

export const metadata = {
  title: "RefundWala",
  description:
    "Recover stuck refunds fast. Submit evidence in minutes and let RefundWala handle escalations. Pay only if we win."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
