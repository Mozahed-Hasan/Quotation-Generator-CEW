import "../bill-entry/entry.css";
import "./admin.css";

export const metadata = {
  title: "Admin Panel | CEW",
  description: "Manage system administrators, moderators, and role-based permissions.",
};

export default function AdminLayout({ children }) {
  return <>{children}</>;
}
