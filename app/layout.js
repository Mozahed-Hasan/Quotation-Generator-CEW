import "./globals.css";

export const metadata = {
  title: "Quotation Generator | CEW",
  description: "Create and download professional PDF quotations with custom columns and rows.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans text-slate-800 antialiased">{children}</body>
    </html>
  );
}
