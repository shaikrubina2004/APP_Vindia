// src/routes/SiteEngineerRoutes.jsx
// FIX: React Router v6 does NOT allow a component that returns <Route> elements
    // inside <Routes>. The solution is to export an ARRAY of <Route> elements,
    // then spread them inside <Routes> in AppRoutes.jsx using {SiteEngineerRoutes}
    //
    // Usage in AppRoutes.jsx:
    //   import SiteEngineerRoutes from "./SiteEngineerRoutes";
    //   ...
    //   <Routes>
    //     {SiteEngineerRoutes}   ← spread the array directly, no wrapper component
    //   </Routes>

    import React from "react";
    import { Route } from "react-router-dom";
    import ProtectedRoute from "./ProtectedRoute";
    import { ROLES } from "../roles";
    import SiteEngineerLayout from "../layouts/SiteEngineerLayout";

    // ── Core pages ─────────────────────────────────────────────
    import SiteEngineerDashboard from "../pages/siteEngineer/SiteEngineerDashboard";
    import DailyDiary            from "../pages/siteEngineer/DailyDiary";
    import Progress              from "../pages/siteEngineer/Progress";
    import RFI                   from "../pages/StructuralEngineer/RFI";
    import NCR                   from "../pages/siteEngineer/NCR";
    import Checklist             from "../pages/siteEngineer/Checklist";
    import ActivityLog           from "../pages/siteEngineer/ActivityLog";

    // ── New pages ──────────────────────────────────────────────
    import SnagList         from "../pages/siteEngineer/Snaglist";
    import ApprovalWorkflow from "../pages/siteEngineer/Approvalworkflow";
    import PhotoGallery     from "../pages/siteEngineer/Photogallery";
    import SiteInstruction  from "../pages/siteEngineer/Siteinstruction";
    import MaterialRequest  from "../pages/siteEngineer/Materialrequest";
    import LabourReport from "../pages/siteEngineer/Labourreport";``

    // ── Shared ─────────────────────────────────────────────────
    import AppShell from "../components/incidents/AppShell";
import QSMeasurements from "../pages/siteEngineer/Qsmeasurements";
import ArchitectDesigns     from "../pages/Architect/ArchitectDesigns";
import LabourRegistry from "../pages/siteEngineer/Labourregistry";


    // ── Allowed roles ──────────────────────────────────────────
    const SE_ROLES = [ROLES.SITE_ENGINEER, ROLES.PROJECT_MANAGER, ROLES.CEO];

    // ── Exported as an ARRAY (not a component) ────────────────
    // React Router v6 requires all children of <Routes> to be
    // <Route> elements. Exporting an array and spreading it
    // inside <Routes> satisfies that constraint.
    const SiteEngineerRoutes = [

    <Route
        key="se-dashboard"
        path="/site-engineer/dashboard"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><SiteEngineerDashboard /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-diary"
        path="/site-engineer/daily-diary"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><DailyDiary /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-progress"
        path="/site-engineer/progress"
        element={
        <ProtectedRoute allowedRoles={[...SE_ROLES, ROLES.QUANTITY_SURVEYOR]}>
            <SiteEngineerLayout><Progress /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    // <Route
    //     key="se-rfi"
    //     path="/site-engineer/rfi"
    //     element={
    //     <ProtectedRoute allowedRoles={[...SE_ROLES, ROLES.ARCHITECT]}>
    //         <SiteEngineerLayout><RFI /></SiteEngineerLayout>
    //     </ProtectedRoute>
    //     }
    // />,

    <Route
        key="se-ncr"
        path="/site-engineer/ncr"
        element={
        <ProtectedRoute allowedRoles={[...SE_ROLES, ROLES.QC_ENGINEER]}>
            <SiteEngineerLayout><NCR /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-checklist"
        path="/site-engineer/checklist"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><Checklist /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-architect-drawings"
        path="/site-engineer/ArchitectDrawings"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout>< ArchitectDesigns/></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,
    <Route
        key="se-activity"
        path="/site-engineer/activity"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><ActivityLog /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-incidents"
        path="/site-engineer/incidents"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><AppShell source="site-engineer" /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-snag-list"
        path="/site-engineer/snag-list"
        element={
        <ProtectedRoute allowedRoles={[...SE_ROLES, ROLES.ARCHITECT, ROLES.QC_ENGINEER]}>
            <SiteEngineerLayout><SnagList /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-materials"
        path="/site-engineer/materials"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><MaterialRequest /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,
    
    <Route
        key="labour"
        path="/site-engineer/labour-registry"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><LabourRegistry /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,


    <Route
        key="se-approvals"
        path="/site-engineer/approvals"
        element={
        <ProtectedRoute allowedRoles={[...SE_ROLES, ROLES.QC_ENGINEER]}>
            <SiteEngineerLayout><ApprovalWorkflow /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,


<Route
  key="se-labour-report"
  path="/site-engineer/labour-report"
  element={
    <ProtectedRoute allowedRoles={SE_ROLES}>
      <SiteEngineerLayout>
        <LabourReport />
      </SiteEngineerLayout>
    </ProtectedRoute>
  }
/>,

    <Route
        key="se-photos"
        path="/site-engineer/photos"
        element={
        <ProtectedRoute allowedRoles={[...SE_ROLES, ROLES.ARCHITECT]}>
            <SiteEngineerLayout><PhotoGallery /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-site-instructions"
        path="/site-engineer/site-instructions"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><SiteInstruction /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,

    <Route
        key="se-qs-measurements"
        path="/site-engineer/qs-measurements"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><QSMeasurements /></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,
    <Route
        key="se-rfi"
        path="/site-engineer/rfi"
        element={
        <ProtectedRoute allowedRoles={SE_ROLES}>
            <SiteEngineerLayout><RFI/></SiteEngineerLayout>
        </ProtectedRoute>
        }
    />,
    <Route
    key="se-approvals"
    path="/site-engineer/approvals"
    element={
    <ProtectedRoute allowedRoles={[...SE_ROLES, ROLES.QC_ENGINEER]}>
        <SiteEngineerLayout>
            <ApprovalWorkflow />
        </SiteEngineerLayout>
    </ProtectedRoute>
    }
/>,
    

    ];

    export default SiteEngineerRoutes;