import "./bill.css";

export const metadata = {
  title: "Bill Calculator | CEW",
  description: "CEW client and dealer billing, payment and balance ledger calculator.",
};

export default function BillLayout({ children }) {
  return (
    <div className="bill-calc-scope font-sans">
      {children}
    </div>
  );
}
