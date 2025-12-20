import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { PageLink, PageTitle } from '../../../_metronic/layout/core'
import { CompaniesList } from './components/CompaniesList'
import { VesselsList } from './components/VesselsList'
import { CompanyAdminList } from './components/CompanyAdminList'
import { VoyageList } from '../operations/components/VoyageList'
import UserManagement from './components/UserManagement'
import VendorManagement from './components/VendorManagement'

const ManagePage = () => {
    return (
        <Routes>
            <Route element={<Outlet />}>
                <Route
                    index
                    element={<Navigate to='vessels' replace />}  // ✅ Default to overview
                />
                <Route
                    path='subcompanies'
                    element={<CompaniesList />}
                />
                <Route
                    path='companies'
                    element={<CompanyAdminList />}
                />
                <Route
                    path='vessels'
                    element={<VesselsList />}
                />
                <Route
                    path='voyages'
                    element={<VoyageList />}
                />
                                <Route
                    path='usermanagement'
                    element={<UserManagement />}
                />
                <Route
                    path='vendormanagement'
                    element={<VendorManagement />}
                />
            </Route>
        </Routes>
    )
}

export default ManagePage
