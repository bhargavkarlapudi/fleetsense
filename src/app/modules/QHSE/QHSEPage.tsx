import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { DocumentLibrary } from './components/DocumentLibrary'
import { useAuth } from '../auth'
import { VesselCertificates } from './components/VesselCertificates';
import ManualsAndPlans from './components/ManualsAndPlans';
import InspectionIndex from './components/InspectionIndex';
import InspectionPlanning from './components/InspectionPlanning';
import NCRIndex from './components/NCRIndex';
import IncidentReport from './components/IncidentReport';
import DefectListPage from './components/DefectListPage';
import { ComingSoon } from '../common/ComingSoon';
import InspectionFindingIndex from './components/InspectionFindingIndex';
import AuditIndex from './components/AuditIndex';
import AuditPlanning from './components/AuditPlanning';
import AuditFindingIndex from './components/AuditFindingIndex';
import NearMissReports from './components/NearMissReports';
import RiskAssessmentForms from './components/RiskAssessmentForms/RiskAssessmentForms';

const QHSEPage = () => {
    return (
        <Routes>
            <Route element={<Outlet />}>
                <Route
                    index
                    element={<Navigate to={'document-library'} replace />}  // ✅ Default to overview
                />
                <Route
                    path='document-library'
                    element={<DocumentLibrary />}
                />
                <Route
                    path='vessel-certificates'
                    element={<VesselCertificates />}
                />
                <Route
                    path='manuals-and-plans'
                    element={<ManualsAndPlans />}
                />

                <Route
                    path='ncr-index'  
                    element={<NCRIndex />}
                />

                <Route
                    path='incident-report'  
                    element={<IncidentReport />}
                />

                <Route
                    path='inspindex'
                    element={<InspectionIndex />}
                />

                <Route
                    path='insplanning'
                    element={<InspectionPlanning />}
                />

                {/* <Route
                    path='inspfindings'
                    element={<InspectionFindingsIndex />}
                /> */}
                <Route
                    path='inspection-findings'
                    element={<InspectionFindingIndex  />}
                />
                <Route
                    path='defects-list'
                    element={<DefectListPage />}
                />
                {/* 🔹 NEW QHSE Coming Soon pages */}
      <Route
        path='audit-index'
        element={<AuditIndex/>}
      />
      <Route
        path='audit-planning'
        element={<AuditPlanning  />}
      />
      <Route
        path='audit-findings'
        element={<AuditFindingIndex  />}
      />

      <Route
        path='masters-sms-review'
        element={<ComingSoon title="Master's SMS Review" />}
      />
      <Route
        path='accident-near-miss-reports'
        element={<NearMissReports />}
      />
      <Route
        path='risk-assessment-form'
        element={<RiskAssessmentForms />}
      />
      <Route
        path='safety-committee-meeting'
        element={<ComingSoon title='Safety committee meeting' />}
      />
      <Route
        path='work-permits-and-checklists'
        element={<ComingSoon title='Work Permits and Checklists' />}
      />

      <Route
        path='month-end-reports'
        element={<ComingSoon title='Month End Reports' />}
      />

      <Route
        path='emergency-drills/planner'
        element={<ComingSoon title='Drill Planner' />}
      />
      <Route
        path='emergency-drills/report'
        element={<ComingSoon title='Emergency Drill Report' />}
      />
      <Route
        path='emergency-drills/review'
        element={<ComingSoon title='Emergency Drill Review' />}
      />
            </Route>

        </Routes>
    )
}

export default QHSEPage
