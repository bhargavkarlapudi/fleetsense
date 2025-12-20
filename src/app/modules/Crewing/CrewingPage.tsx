import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { CrewList } from './components/CrewList'
import { AssignmentPage } from './components/AssignmentPage'
import { CrewDetails } from './components/CrewDetailsPage'
import { useAuth } from '../auth'
import { SignPage } from './components/SignPage'
import RestHour from './CrewFormTabs/RestHour'
import CrewOvertime from './CrewFormTabs/CrewOvertime'
import CrewAllotment from './CrewFormTabs/CrewAllotment'
import CrewAdvance from './CrewFormTabs/CrewAdvance'
import CrewClaims from './CrewFormTabs/CrewClaims'
import Appraisal from './CrewFormTabs/Appraisal'
import CrewTraining from './CrewFormTabs/CrewTraining'
import CrewComplaints from './CrewFormTabs/CrewComplaints'
import CrewTestAndVerification from './CrewFormTabs/CrewTestAndVerification'

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

const CrewingPage = () => {
    const { currentUser } = useAuth();
  const roleId = currentUser?.role?.id; // Fetch role ID from user data

  // Default to 'overview' if role is not 4, else 'crewdetails'
  const defaultRoute = roleId === 4 ? 'crewdetails' : 'overview';

    return (
        <Routes>
            <Route element={<Outlet />}>
                <Route
                    index
                    element={<Navigate to={defaultRoute} replace />}  // ✅ Default to crew
                />
                <Route
                    path='overview'
                    element={<CrewList />}
                />
                <Route
                    path='assignment'
                    element={<AssignmentPage />}
                />
                <Route
                    path='crewdetails'
                    element={<CrewDetails />}
                />
                <Route
                    path='signing'
                    element={<SignPage />}
                />
                <Route
                    path='resthours'
                    element={<RestHour />}
                />
                <Route
                    path='crewovertime'
                    element={<CrewOvertime />}
                />
                <Route
                    path='crewallotment'
                    element={<CrewAllotment />}
                />
                <Route
                    path='crewadvance'
                    element={<CrewAdvance />}
                />
                <Route
                    path='crewclaims'
                    element={<CrewClaims />}
                />
                <Route
                    path='appraisal'
                    element={<Appraisal />}
                />
                <Route
                    path='crewtraining'
                    element={<CrewTraining />}
                />
                <Route
                    path='crewcomplaints'
                    element={<CrewComplaints />}
                />
                <Route
                    path='crewtestverification'
                    element={<CrewTestAndVerification />}
                />
            </Route>
        </Routes>
    )
}

export default CrewingPage
