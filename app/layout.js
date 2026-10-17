import "./globals.css";

export const metadata = {
  title: "Chowdhury Engineering Works | CEW Portal",
  description: "Management Portal: Quotation Generator, Purchase, Sales, Expense and Admin Control Panel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans text-slate-800 antialiased">{children}</body>
    </html>
  );
}
