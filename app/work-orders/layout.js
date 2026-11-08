import "../bill-entry/entry.css";
import "../expenses/expenses.css";
import "./work-orders.css";

export const metadata = {
  title: "Work Orders & Production | Management Portal",
  description: "Track factory work orders, fabrication specifications, production stages, and delivery status.",
};

export default function WorkOrdersLayout({ children }) {
  return <>{children}</>;
}

