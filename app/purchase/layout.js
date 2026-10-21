import "../bill-calculator/bill.css";

export const metadata = {
  title: "Purchase | CEW",
  description: "CEW supplier billing, payment and balance ledger calculator.",
};

export default function PurchaseLayout({ children }) {
  return (
    <div className="bill-calc-scope font-sans">
      {children}
    </div>
  );
}
