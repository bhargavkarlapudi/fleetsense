import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { TechnicalList } from './components/TechnicalList'
import MachineryDetails from './components/Machinery/MachineryDetails'
import ManualsAndPlans from '../QHSE/components/ManualsAndPlans'
import DefectListPage from '../QHSE/components/DefectListPage'
import { ComingSoon } from '../common/ComingSoon'
import PmsDashboard from './components/PMS/PmsDashboard'
import PmsJobListPage from './components/PMS/PmsJobListPage'
import PmsPlanListPage from './components/PMS/PmsPlanListPage'
import RunningHoursPage from './components/PMS/RunningHoursPage'
import PmsTemplateListPage from './components/PMS/PmsTemplateListPage'
import WeeklyPlanningBoard from './components/PMS/WeeklyPlanningBoard'

const TechnicalPage = () => {
    return (
        <Routes>
            <Route element={<Outlet />}>
                <Route
                    index
                    element={<Navigate to='technical' replace />}  // ✅ Default to overview
                />
                <Route
                    path='technical'
                    element={<TechnicalList />}
                />

                <Route
                    path='machinery'
                    element={<MachineryDetails />}
                />
            </Route>
            {/* PMS Routes */}
            <Route path='pms' element={<PmsDashboard />} />
            <Route path='pms/jobs' element={<PmsJobListPage />} />
            <Route path='pms/plans' element={<PmsPlanListPage />} />
            <Route path='pms/templates' element={<PmsTemplateListPage />} />
            <Route path='pms/running-hours' element={<RunningHoursPage />} />
            <Route path='pms/weekly-planning' element={<WeeklyPlanningBoard />} />
            <Route
          path='monthly-log'
          element={<ComingSoon title='Monthly Log' />}
        />
            <Route
                    path='defects-list'
                    element={<DefectListPage />}
                />
        </Routes>
    )
}

export default TechnicalPage
