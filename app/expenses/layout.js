import "../bill-entry/entry.css";
import "./expenses.css";

export const metadata = {
  title: "Expense | CEW",
  description: "Record and review daily, weekly, monthly and yearly business expenses.",
};

export default function ExpensesLayout({ children }) {
  return <>{children}</>;
}
