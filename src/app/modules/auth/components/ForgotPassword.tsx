import { useState } from 'react'
import * as Yup from 'yup'
import clsx from 'clsx'
import { Link, useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'

interface ForgotPasswordFormValues {
  email: string
  otp: string
  newPassword: string
  confirmPassword: string
}

export function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState('')
  const [message, setMessage] = useState('')

  const navigate =  useNavigate();
  const initialValues = {
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  }

  const toggleNewPassword = () => {
    setShowNewPassword((prev) => !prev);
  };

  const toggleConfirmPassword = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const forgotPasswordSchema = Yup.object().shape({
    email: Yup.string()
      .email('Wrong email format')
      .min(3, 'Minimum 3 symbols')
      .max(50, 'Maximum 50 symbols')
      .required('Email is required'),
    otp: step === 2
      ? Yup.string()
        .required('OTP is required')
        .test('otp-match', 'Invalid OTP', (value) => value === generatedOTP) // OTP validation
      : Yup.string(), newPassword: step === 2 ? Yup.string().required('New Password is required') : Yup.string(),
    confirmPassword: step === 2
      ? Yup.string()
        .oneOf([Yup.ref('newPassword')], 'Passwords must match')
        .required('Confirm Password is required')
      : Yup.string(),
  })


  const formik = useFormik<ForgotPasswordFormValues>({
    initialValues: {
      email: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values, formikHelpers) => {
      // Perform form validation
      const errors = await formikHelpers.validateForm(values);

      // If there are no validation errors, proceed with submission logic
      if (Object.keys(errors).length === 0) {
        if (step === 1) {
          const otp = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOTP(otp);
          setStep(2);
        } else if (step === 2) {
          if (values.otp !== generatedOTP) {
            setMessage('❌ Invalid OTP');
          } else if (values.newPassword !== values.confirmPassword) {
            setMessage('❌ Passwords do not match');
          } else {
            setMessage('✅ Password has been reset successfully (demo only)');
            formikHelpers.resetForm();
            navigate("/auth/login");
          }
        }
      }
    },
  });


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
            <h3 className="mb-5 text-white fw-bolder" style={{ fontSize: '3.2rem' }}>Forgot Password</h3>

            {step === 1 && (
              <>
                <div style={{ marginTop: '6rem' }}>
                  <label htmlFor="username" className="form-label mb-5">
                    Enter your email to reset your password.
                  </label>
                  <label htmlFor="username" className="form-label mt-5">Email</label>
                  <input
                    type='email'
                    placeholder=''
                    autoComplete='off'
                    {...formik.getFieldProps('email')}
                    className={clsx(
                      'form-control cp_input',
                      { 'is-invalid': formik.touched.email && formik.errors.email },
                      {
                        'is-valid': formik.touched.email && !formik.errors.email,
                      }
                    )}
                  />
                  {formik.touched.email && formik.errors.email && (
                    <div className='fv-plugins-message-container'>
                      <div className='fv-help-block'>
                        <span role='alert'>{formik.errors.email}</span>
                      </div>
                    </div>
                  )}
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
                  > Get OTP
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="alert alert-info text-center">
                  OTP: <strong>{generatedOTP}</strong> (displayed for demo)
                </div>
                <div style={{ marginTop: '6rem' }}>
                  <label className="form-label mt-5">Enter OTP</label>
                  <input
                    type='text'
                    placeholder=''
                    autoComplete='off'
                    {...formik.getFieldProps('otp')}
                    className="form-control cp_input"
                  />
                  {formik.touched.otp && formik.errors.otp && (
                    <div className="text-danger mt-1">{formik.errors.otp}</div>
                  )}
                </div>

                <div style={{ marginTop: '2.2rem' }}>
                  <label htmlFor="password" className="form-label">New Password</label>
                  <div className="input-group">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      className="form-control cp_input"
                      id="password"
                      autoComplete="new-password"
                      {...formik.getFieldProps('newPassword')}
                    />
                    <span className="input-group-text">
                      <button className="view_password" type="button" onClick={toggleNewPassword}>
                        {showNewPassword ? (
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
                  {formik.touched.newPassword && formik.errors.newPassword && (
                    <div className="text-danger mt-1">{formik.errors.newPassword}</div>
                  )}
                </div>

                <div style={{ marginTop: '2.2rem' }}>
                  <label htmlFor="password" className="form-label">Confirm Password</label>
                  <div className="input-group">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="form-control cp_input"
                      id="password"
                      autoComplete="new-password"
                      {...formik.getFieldProps('confirmPassword')}
                    />
                    <span className="input-group-text">
                      <button className="view_password" type="button" onClick={toggleConfirmPassword}>
                        {showConfirmPassword ? (
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
                  {formik.touched.confirmPassword && formik.errors.confirmPassword && (
                    <div className="text-danger mt-1">{formik.errors.confirmPassword}</div>
                  )}
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
                  >
                    Reset Password
                  </button>
                </div>
              </>
            )
            }
            <div className="mt-3 text-center">
              <a href="/auth/login" className="text-decoration-none forgot_password text-white">
                ← Back to login
              </a>
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
    // <form
    //   className='form w-100 fv-plugins-bootstrap5 fv-plugins-framework'
    //   noValidate
    //   id='kt_login_password_reset_form'
    //   onSubmit={formik.handleSubmit}
    // >
    //   <div className='text-center mb-10'>
    //     {/* begin::Title */}
    //     <h1 className='text-dark fw-bolder mb-3'>Forgot Password ?</h1>
    //     {/* end::Title */}

    //     {/* begin::Link */}
    //     <div className='text-gray-500 fw-semibold fs-6'>
    //       Enter your email to reset your password.
    //     </div>
    //     {/* end::Link */}
    //   </div>

    //   {/* begin::Title */}
    //   {hasErrors === true && (
    //     <div className='mb-lg-15 alert alert-danger'>
    //       <div className='alert-text font-weight-bold'>
    //         Sorry, looks like there are some errors detected, please try again.
    //       </div>
    //     </div>
    //   )}

    //   {hasErrors === false && (
    //     <div className='mb-10 bg-light-info p-8 rounded'>
    //       <div className='text-info'>Sent password reset. Please check your email</div>
    //     </div>
    //   )}
    //   {/* end::Title */}

    //   {/* begin::Form group */}
    //   <div className='fv-row mb-8'>
    //     <label className='form-label fw-bolder text-gray-900 fs-6'>Email</label>
    //     <input
    //       type='email'
    //       placeholder=''
    //       autoComplete='off'
    //       {...formik.getFieldProps('email')}
    //       className={clsx(
    //         'form-control bg-transparent',
    //         {'is-invalid': formik.touched.email && formik.errors.email},
    //         {
    //           'is-valid': formik.touched.email && !formik.errors.email,
    //         }
    //       )}
    //     />
    //     {formik.touched.email && formik.errors.email && (
    //       <div className='fv-plugins-message-container'>
    //         <div className='fv-help-block'>
    //           <span role='alert'>{formik.errors.email}</span>
    //         </div>
    //       </div>
    //     )}
    //   </div>
    //   {/* end::Form group */}

    //   {/* begin::Form group */}
    //   <div className='d-flex flex-wrap justify-content-center pb-lg-0'>
    //     <button type='submit' id='kt_password_reset_submit' className='btn btn-primary me-4'>
    //       <span className='indicator-label'>Submit</span>
    //       {loading && (
    //         <span className='indicator-progress'>
    //           Please wait...
    //           <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
    //         </span>
    //       )}
    //     </button>
    //     <Link to='/auth/login'>
    //       <button
    //         type='button'
    //         id='kt_login_password_reset_form_cancel_button'
    //         className='btn btn-light'
    //         disabled={formik.isSubmitting || !formik.isValid}
    //       >
    //         Cancel
    //       </button>
    //     </Link>{' '}
    //   </div>
    //   {/* end::Form group */}
    // </form>
  )
}
