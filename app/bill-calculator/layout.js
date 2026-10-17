import "./bill.css";

export const metadata = {
  title: "Purchase | CEW",
  description: "CEW dealer and supplier billing, payment and balance ledger calculator.",
};

export default function BillLayout({ children }) {
  return (
    <div className="bill-calc-scope font-sans">
      {children}
    </div>
  );
}
