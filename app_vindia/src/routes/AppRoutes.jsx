
import { Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";

import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";
import SignInMobile from "../pages/SignInMobile";
import SignUpMobile from "../pages/SignUpMobile";

/* CEO */
import Dashboard from "../pages/ceo/Dashboard";
import CEOPanel from "../pages/ceo/CEOPanel";
import UserManagement from "../pages/ceo/UserManagement";
import ProjectManagement from "../pages/ceo/ProjectManagement";

/* HR */
import HRDashboard from "../pages/hr/HRDashboard";
import Employees from "../pages/hr/Employees";
import AddEmployee from "../pages/hr/AddEmployee";
import EmployeeDetails from "../pages/hr/EmployeeDetails";
import Attendance from "../pages/hr/Attendance";
import Documents from "../pages/hr/Documents";
import Leaves from "../pages/hr/Leaves";
import Payroll from "../pages/hr/Payroll";
import Travel from "../pages/hr/Travel";

/* Roles */
import { ROLES } from "../roles";
import ProtectedRoute from "./ProtectedRoute";

/* Layouts */
import CEOLayout from "../layouts/CEOLayout";
import HRLayout from "../layouts/HRLayout";
import ProjectManagerLayout from "../layouts/ProjectManagerLayout";
import SiteEngineerLayout from "../layouts/SiteEngineerLayout";
import StructuralEngineerLayout from "../layouts/StructuralEngineerLayout";

/* Site Engineer */
import SiteEngineerDashboard from "../pages/siteEngineer/SiteEngineerDashboard";
import DailyDiary from "../pages/siteEngineer/DailyDiary";
import RFI from "../pages/siteEngineer/RFI";
import NCR from "../pages/siteEngineer/NCR";
import Checklist from "../pages/siteEngineer/Checklist";
import Progress from "../pages/siteEngineer/Progress";
import ActivityLog from "../pages/siteEngineer/ActivityLog";

/* Structural Engineer */
import StructuralEngineerDashboard from "../pages/Structural Engineer/StructuralEngineerDashboard";
import RFIDetails from "../pages/Structural Engineer/RFIDetails";
import StructuralRoutes from "./StructuralRoutes";

/* Others */
import Timesheet from "../pages/timesheet/Timesheet";

const AppRoutes = () => {
  const useIsMobile = () => {
    const [mobile, setMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
      const handleResize = () => setMobile(window.innerWidth <= 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    return mobile;
  };

  const SignInWrapper = () => {
    const isMobile = useIsMobile();
    return isMobile ? <SignInMobile /> : <SignIn />;
  };

  const SignUpWrapper = () => {
    const isMobile = useIsMobile();
    return isMobile ? <SignUpMobile /> : <SignUp />;
  };

  return (
    <Routes>
      {/* AUTH */}
      <Route path="/" element={<SignInWrapper />} />
      <Route path="/signup" element={<SignUpWrapper />} />

      {/* CEO DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}>
            <CEOLayout>
              <Dashboard />
            </CEOLayout>
          </ProtectedRoute>
        }
      />

      {/* HR */}
      <Route
        path="/hr"
        element={
          <ProtectedRoute allowedRoles={[ROLES.HR]}>
            <HRLayout>
              <HRDashboard />
            </HRLayout>
          </ProtectedRoute>
        }
      />

      {/* SITE ENGINEER */}
      <Route
        path="/site-engineer/dashboard"
        element={
          <ProtectedRoute allowedRoles={[ROLES.SITE_ENGINEER]}>
            <SiteEngineerLayout>
              <SiteEngineerDashboard />
            </SiteEngineerLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/site-engineer/daily-diary"
        element={
          <SiteEngineerLayout>
            <DailyDiary />
          </SiteEngineerLayout>
        }
      />

      <Route
        path="/site-engineer/rfi"
        element={
          <SiteEngineerLayout>
            <RFI />
          </SiteEngineerLayout>
        }
      />

      <Route
        path="/site-engineer/ncr"
        element={
          <SiteEngineerLayout>
            <NCR />
          </SiteEngineerLayout>
        }
      />

      {/* STRUCTURAL ENGINEER */}
      <Route path="/structural-engineer/*" element={<StructuralRoutes />} />

      <Route
        path="/structural-engineer/rfi/:id"
        element={<RFIDetails />}
      />

      {/* TIMESHEET */}
      <Route
        path="/timesheet"
        element={
          <ProtectedRoute allowedRoles={[ROLES.CEO, ROLES.HR]}>
            <CEOLayout>
              <Timesheet />
            </CEOLayout>
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
      <Route path="*" element={<h2>Page Not Found</h2>} />
    </Routes>
  );
};


export default AppRoutes;

