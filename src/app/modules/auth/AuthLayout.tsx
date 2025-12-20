/* eslint-disable jsx-a11y/anchor-is-valid */
import { useEffect } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { toAbsoluteUrl } from '../../../_metronic/helpers'

const AuthLayout = () => {
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) {
      document.body.style.backgroundImage = `linear-gradient(0deg, rgba(19, 19, 21, 0.3), rgba(26, 27, 30, 0.3)), url(${toAbsoluteUrl('/media/auth/login_bg.png')})` 
      document.body.style.backgroundSize = `cover`
      document.body.style.backgroundRepeat = `no-repeat`
      document.body.style.backgroundPosition = `center`
      document.body.style.backgroundAttachment = `fixed`

      root.style.height = '100%'
    }

    return () => {
      if (root) {
        root.style.height = 'auto'
        document.body.style.backgroundImage = ''
        document.body.style.backgroundSize = ''
        document.body.style.backgroundRepeat = ''
        document.body.style.backgroundPosition = ''
        document.body.style.backgroundAttachment = ''
      }
    }
  }, [])


  return (
    <div className=''>
        <Outlet />
    </div>
  )
}

export { AuthLayout }
