/* eslint-disable jsx-a11y/anchor-is-valid */
import { useState } from 'react'
import * as Yup from 'yup'
import clsx from 'clsx'
import { Link, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import { getUserByToken, login } from '../core/_requests'
import { toAbsoluteUrl } from '../../../../_metronic/helpers'
import { useAuth } from '../core/Auth'
import axios from 'axios'

const loginSchema = Yup.object().shape({
  username: Yup.string()
    .min(3, 'Minimum 3 symbols')
    .max(50, 'Maximum 50 symbols')
    .required('Username is required'),
  password: Yup.string()
    .min(3, 'Minimum 3 symbols')
    .max(50, 'Maximum 50 symbols')
    .required('Password is required'),
})

// const initialValues = {
//   username: 'Superadmin',
//   password: 'Superadmin@123',
// }
const initialValues = {
  username: '',
  password: '',
}

/*
  Formik+YUP+Typescript:
  https://jaredpalmer.com/formik/docs/tutorial#getfieldprops
  https://medium.com/@maurice.de.beijer/yup-validation-and-typescript-and-formik-6c342578a20e
*/

export function Login() {
  const [loading, setLoading] = useState(false)
  const { saveAuth, setCurrentUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const formik = useFormik({
    initialValues,
    validationSchema: loginSchema,
    onSubmit: async (values, { setStatus, setSubmitting }) => {
      setLoading(true)
      try {
        const { data: auth } = await login(values.username, values.password)
        saveAuth(auth)
        console.log("User logged in", auth);
        const roleId = auth.role?.id;
        console.log(auth.roleEntityId);
        const roleEntityId
          = auth.roleEntityId;
        const roleEntityName
          = auth.roleEntityName;
        if (roleId) {
          // Store roleId in sessionStorage
          console.log(roleId);
          sessionStorage.setItem('roleId', roleId.toString());
        }
        const userName = auth.userDetails?.username;
        if (userName) {
          // Store roleId in sessionStorage
          sessionStorage.setItem('userName', userName.toString());
        }
        if (roleEntityId) {
          // Store roleId in sessionStorage
          sessionStorage.setItem('roleEntityId', roleEntityId.toString());
        }
        if (roleEntityName) {
          // Store roleId in sessionStorage
          sessionStorage.setItem('roleEntityName', roleEntityName.toString());
        }
        console.log('roleEntityId', roleEntityId);
        console.log('roleEntityName', roleEntityName);
        const { data: user } = await getUserByToken()
        console.log(user);
        setCurrentUser(user)
      } catch (error: any) {
        console.error(error)
        saveAuth(undefined)
        // setStatus('The login details are incorrect')
        // Default to credentials error…
  let message = 'The login details are incorrect'

  if (axios.isAxiosError(error)) {
    // 1) We got a proper HTTP response (if CORS was set up), check for 503:
    if (error.response?.status === 503) {
      message = 'Our service is temporarily unavailable for maintenance. Please try again in a few minutes.'
    }
    // 2) No response object at all — likely a CORS/network error on the 503:
    else if (!error.response && error.request) {
      message = 'Our service is temporarily unavailable for maintenance. Please try again in a few minutes.'
    }
  }

        setStatus(message)
        setSubmitting(false)
        setLoading(false)
      }
    },
  })

  return (
    <form
      className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
      onSubmit={formik.handleSubmit}
      noValidate
      id='kt_login_signin_form'
    >
      <div className="container-fluid">
        <div className="row justify-content-end min-vh-100 align-items-center p-4">
          <div className="col-xl-8 col-lg-7 col-md-6"></div>
          <div className="col-xl-3 col-lg-4 col-md-5">
            <h3 className="mb-5 text-white fw-bolder" style={{ fontSize: '3.2rem' }}>Elecmeksolutions<sup></sup></h3>
            <div style={{ marginTop: '6rem' }}>
              <label htmlFor="username" className="form-label">User name</label>
              <input type="text" className="form-control cp_input" id="username"
                {...formik.getFieldProps('username')} />
              {formik.touched.username && formik.errors.username && (
                <div className="text-danger mt-1">{formik.errors.username}</div>
              )}
            </div>

            <div style={{ marginTop: '2.2rem' }}>
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control cp_input"
                  id="password"
                  autoComplete="new-password"
                  {...formik.getFieldProps('password')}
                />
                <span className="input-group-text">
                  <button className="view_password" type="button" onClick={togglePassword}>
                    {showPassword ? (
                      // Eye Closed Icon
                      <svg width="31" height="21" viewBox="0 0 31 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L30 20" stroke="#11195F" strokeWidth="2" />
                        <path d="M30 1L1 20" stroke="#11195F" strokeWidth="2" />
                      </svg>
                    ) : (
                      // Eye Open Icon (your original SVG)
                      <svg width="31" height="21" viewBox="0 0 31 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M29.9477 10.1077C29.9053 10.012 28.8796 7.73664 26.5994 5.45645C23.5612 2.4182 19.7237 0.8125 15.5 0.8125C11.2762 0.8125 7.43878 2.4182 4.40054 5.45645C2.12034 7.73664 1.08983 10.0156 1.05229 10.1077C0.997211 10.2315 0.96875 10.3656 0.96875 10.5012C0.96875 10.6368 0.997211 10.7709 1.05229 10.8948C1.09468 10.9904 2.12034 13.2646 4.40054 15.5448C7.43878 18.5818 11.2762 20.1875 15.5 20.1875C19.7237 20.1875 23.5612 18.5818 26.5994 15.5448C28.8796 13.2646 29.9053 10.9904 29.9477 10.8948C30.0028 10.7709 30.0312 10.6368 30.0312 10.5012C30.0312 10.3656 30.0028 10.2315 29.9477 10.1077ZM15.5 18.25C11.7727 18.25 8.51651 16.895 5.82096 14.2236C4.71495 13.1237 3.77398 11.8695 3.02733 10.5C3.77378 9.13036 4.71477 7.87611 5.82096 6.77637C8.51651 4.10504 11.7727 2.75 15.5 2.75C19.2273 2.75 22.4835 4.10504 25.179 6.77637C26.2872 7.87585 27.2302 9.13009 27.9787 10.5C27.1056 12.1299 23.3021 18.25 15.5 18.25ZM15.5 4.6875C14.3504 4.6875 13.2266 5.0284 12.2707 5.66708C11.3149 6.30577 10.5699 7.21356 10.1299 8.27565C9.69 9.33775 9.5749 10.5064 9.79917 11.634C10.0235 12.7615 10.577 13.7972 11.3899 14.6101C12.2028 15.423 13.2385 15.9765 14.366 16.2008C15.4935 16.4251 16.6622 16.31 17.7243 15.8701C18.7864 15.4301 19.6942 14.6851 20.3329 13.7293C20.9716 12.7734 21.3125 11.6496 21.3125 10.5C21.3109 8.95892 20.698 7.48142 19.6083 6.39171C18.5186 5.302 17.0411 4.6891 15.5 4.6875ZM15.5 14.375C14.7336 14.375 13.9844 14.1477 13.3472 13.7219C12.7099 13.2962 12.2132 12.691 11.92 11.9829C11.6267 11.2748 11.5499 10.4957 11.6994 9.74403C11.849 8.99235 12.218 8.30189 12.7599 7.75996C13.3019 7.21803 13.9923 6.84897 14.744 6.69946C15.4957 6.54994 16.2748 6.62668 16.9829 6.91997C17.691 7.21326 18.2961 7.70993 18.7219 8.34717C19.1477 8.98441 19.375 9.7336 19.375 10.5C19.375 11.5277 18.9667 12.5133 18.24 13.24C17.5133 13.9667 16.5277 14.375 15.5 14.375Z" fill="#11195F" />
                      </svg>
                    )}
                  </button>
                </span>
              </div>
              {formik.touched.password && formik.errors.password && (
                <div className="text-danger mt-1">{formik.errors.password}</div>
              )}
            </div>

            <div className="mt-1 text-end">
              <a href="/auth/forgot-password" className="text-decoration-none forgot_password text-white"><u>Forgot Password</u></a>
            </div>
            <div className="d-grid mt-4">
              <button
                type="submit"
                id="loginbtn"
                className="btn btn_login text-white px-5 py-5"
                style={{ backgroundColor: '#3b4e71', transition: 'all 0.3s ease' }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'rgb(26, 52, 99)';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = '#3b4e71';
                }}
              > Login
              </button>
            </div>

            {/* Loader and Status */}
            <div className="text-center mt-3">
              {loading && (
                <div className="spinner-border text-default" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              )}
              {formik.status && <div className="text-danger mt-2">{formik.status}</div>}
            </div>
          </div>
          <div className="col-xl-1 col-lg-1 col-md-1"></div>
        </div>
      </div>



    </form>
  )
}
