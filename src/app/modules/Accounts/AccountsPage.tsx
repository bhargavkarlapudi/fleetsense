import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { AccountsList } from './components/AccountsList'

const AccountsPage = () => {
    return (
        <Routes>
            <Route element={<Outlet />}>
                <Route
                    index
                    element={<Navigate to='accounts' replace />}  // ✅ Default to overview
                />
                <Route
                    path='accounts'
                    element={<AccountsList />}
                />
            </Route>
        </Routes>
    )
}

export default AccountsPage
