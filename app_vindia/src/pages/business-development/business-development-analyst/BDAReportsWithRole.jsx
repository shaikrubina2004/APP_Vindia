import { useAuth } from "../../../context/useAuth";  // ← 3 levels up since it's deeper
import BDAReports from "./BDAReports";
const BDAReportsWithRole = () => {
  const { user } = useAuth();
  return <BDAReports role={user?.role} />;
};

export default BDAReportsWithRole;