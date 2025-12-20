import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { TechnicalList } from './components/TechnicalList'
import DefectListPage from '../QHSE/components/DefectListPage'

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
                    path='defects-list'
                    element={<DefectListPage />}
                />
            </Route>
            
        </Routes>
    )
}

export default TechnicalPage
