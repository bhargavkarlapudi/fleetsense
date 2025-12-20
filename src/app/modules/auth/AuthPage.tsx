import {Route, Routes} from 'react-router-dom'
import {Registration} from './components/Registration'
import {ForgotPassword} from './components/ForgotPassword'
import {Login} from './components/Login'
import {AuthLayout} from './AuthLayout'
import { FleetLogin } from './components/FleetLogin'
import { TabbedLogin } from './components/TabbedLogin'

const AuthPage = () => (
  <Routes>
    <Route element={<AuthLayout />}>
      <Route path='login' element={<Login />} />
      <Route path=':companyUsername' element={<TabbedLogin />} />
      <Route path=':companyUsername/ship-login' element={<TabbedLogin />} />
      {/* Deprecated: Comment out or remove for new architecture */}
      {/* <Route path=':vesselType/:imoNumber/ship-login' element={<FleetLogin />} /> */}
      <Route path='registration' element={<Registration />} />
      <Route path='forgot-password' element={<ForgotPassword />} />
      <Route index element={<Login />} />
    </Route>
  </Routes>
)

export {AuthPage}
