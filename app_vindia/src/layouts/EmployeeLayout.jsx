import "../styles/rolePortal.css";
import AppLayout from "./AppLayout";
import employeeMenu from "../menus/employeeMenu";

export default function EmployeeLayout({ children }) {
  return (
    <div className="role-portal">
      <AppLayout menuItems={employeeMenu}>
        {children}
      </AppLayout>
    </div>
  );
}
