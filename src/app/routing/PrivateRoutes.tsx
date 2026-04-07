import { FC } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { MasterLayout } from '../../_metronic/layout/MasterLayout'
import { DashboardWrapper } from '../pages/dashboard/DashboardWrapper'
import { MenuTestPage } from '../pages/MenuTestPage'
import BuilderPageWrapper from '../pages/layout-builder/BuilderPageWrapper'
import OperationsPage from '../modules/operations/OperationsPage'
import ProcurementPage from '../modules/Procurement/ProcurementPage'
import ManagePage from '../modules/Management/ManagePage'
import CrewingPage from '../modules/Crewing/CrewingPage'
import CrewingTestPage from '../modules/CrewingTest/CrewingPage'
import QHSEPage from '../modules/QHSE/QHSEPage'
import AccountsPage from '../modules/Accounts/AccountsPage'
import TechnicalPage from '../modules/Technical/TechnicalPage'
import PositionReportsTabs from '../modules/operations/components/PositionReportsTabs'

const PrivateRoutes: FC = () => {
  // lazy‐load whatever you need

  return (
    <Routes>
      {/* If someone hits /auth/*, just send them to the dashboard */}
      <Route path='auth/*' element={<Navigate to='/dashboard' />} />

      <Route element={<MasterLayout />}>
                  <Route path='operations/position-reports' element={<PositionReportsTabs />} />
        <Route path='operations/*' element={<OperationsPage />} />
        <Route path='crewing/*' element={<CrewingPage />} />
        <Route path='crewingtest/*' element={<CrewingTestPage />} />
        <Route path='manage/*' element={<ManagePage />} />
        <Route path='qhse/*' element={<QHSEPage />} />
        <Route path='accounts/*' element={<AccountsPage />} />
        <Route path='technical/*' element={<TechnicalPage />} />
        <Route path='procurement/*' element={<ProcurementPage />} />

        <Route path='dashboard/*' element={<DashboardWrapper />} />
        <Route path='builder' element={<BuilderPageWrapper />} />
        <Route path='menu-test' element={<MenuTestPage />} />

        {/* Lazily loaded sections
        <Route
          path='crafted/pages/profile/*'
          element={
            <SuspensedView>
              <ProfilePage />
            </SuspensedView>
          }
        /> */}
        {/* Catch-all → 404 */}
        <Route path='*' element={<Navigate to='/error/404' />} />
      </Route>
    </Routes>
  )
}

// const SuspensedView: FC<WithChildren> = ({ children }) => {
//   const baseColor = getCSSVariableValue('--kt-primary')
//   TopBarProgress.config({
//     barColors: { '0': baseColor },
//     barThickness: 1,
//     shadowBlur: 5,
//   })
//   return <Suspense fallback={<TopBarProgress />}>{children}</Suspense>
// }

export { PrivateRoutes }
