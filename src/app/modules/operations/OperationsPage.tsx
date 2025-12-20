import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { PageLink, PageTitle } from '../../../_metronic/layout/core'
import { CreateReport } from './components/CreateReport'
import { OperationsList } from './components/OperationsList'
import { LibraryPage } from './components/LibraryPage'
import { PreviewReportModal } from './components/PreviewReportModal'
import { VoyageList } from './components/VoyageList'
import PositionReportsTabs from './components/PositionReportsTabs'
import DefectListPage from '../QHSE/components/DefectListPage'
import CargoPage from './CargoOperations/CargoPage'

// const operationsBreadCrumbs: Array<PageLink> = [
//     {
//         title: 'Operations',
//         path: '/operations',
//         isSeparator: false,
//         isActive: false,
//     },
//     {
//         title: '',
//         path: '',
//         isSeparator: true,
//         isActive: false,
//     },
// ]

const OperationsPage = () => {
    return (
        <Routes>
            <Route element={<Outlet />}>
                <Route
                    index
                    element={<Navigate to='overview' replace />}  // ✅ Default to overview
                />
                <Route
                    path='voyages'
                    element={<VoyageList />}
                />
                                <Route path='overview' element={<PositionReportsTabs />} />
                <Route
                    path='create/:assignmentId'
                    element={<CreateReport />}
                />
                <Route
                    path='library'
                    element={<LibraryPage />}
                />
                <Route
                    path='report-preview'
                    element={<PreviewReportModal />}
                />
                 <Route
                    path='defects-list'
                    element={<DefectListPage />}
                />
                <Route
        path='cargo-operations'
        element={<CargoPage />}
      />
            </Route>
        </Routes>
    )
}

export default OperationsPage
