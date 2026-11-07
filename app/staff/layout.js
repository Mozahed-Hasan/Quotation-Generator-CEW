import "../bill-entry/entry.css";
import "../expenses/expenses.css";
import "./staff.css";

export const metadata = {
  title: "Staff Attendance & Salary | Management Portal",
  description: "Record daily staff attendance, overtime, previous balances, and download salary slips.",
};

export default function StaffLayout({ children }) {
  return <>{children}</>;
}
