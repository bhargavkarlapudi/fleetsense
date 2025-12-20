import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { KTSVG, toAbsoluteUrl } from '../../../helpers'
import { useLayout } from '../../core'
import { useEffect, useState } from 'react'

const SidebarLogo = () => {
  const { config } = useLayout()
  const appSidebarDefaultMinimizeDesktopEnabled =
    config?.app?.sidebar?.default?.minimize?.desktop?.enabled
  const appSidebarDefaultCollapseDesktopEnabled =
    config?.app?.sidebar?.default?.collapse?.desktop?.enabled
  const toggleType = appSidebarDefaultCollapseDesktopEnabled
    ? 'collapse'
    : appSidebarDefaultMinimizeDesktopEnabled
      ? 'minimize'
      : ''
  const toggleState = appSidebarDefaultMinimizeDesktopEnabled ? 'active' : ''
  const appSidebarDefaultMinimizeDefault = config.app?.sidebar?.default?.minimize?.desktop?.default

  const [isMinimized, setIsMinimized] = useState(false)

  // Monitor class on body to reflect state
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isNowMinimized = document.body.getAttribute(`data-kt-app-sidebar-${toggleType}`) === 'on'
      setIsMinimized(isNowMinimized)
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-kt-app-sidebar-minimize', 'data-kt-app-sidebar-collapse'],
    })

    // Set initial state on load
    const initialState = document.body.getAttribute(`data-kt-app-sidebar-${toggleType}`) === 'on'
    setIsMinimized(initialState)

    return () => observer.disconnect()
  }, [toggleType])


  return (
    <div className='app-sidebar-logo px-6' id='kt_app_sidebar_logo'>
      {/* Show logo only when sidebar is expanded */}
      {!isMinimized && (
        <div></div>
        // <img
        //   alt='Full Logo'
        //   src={toAbsoluteUrl('/media/logos/polar_marine_logo_white.svg')}
        //   className='svg-3x'
        // />
      )}

      {/* Chevron icon toggle (controlled by Metronic toggle system) */}
      {(appSidebarDefaultMinimizeDesktopEnabled ||
        appSidebarDefaultCollapseDesktopEnabled) && (
          <div
            className='cursor-pointer rotate'
            onClick={() => {
              const currentState = document.body.getAttribute(`data-kt-app-sidebar-${toggleType}`) === 'on'
              document.body.setAttribute(`data-kt-app-sidebar-${toggleType}`, currentState ? 'off' : 'on')
              setIsMinimized(!currentState)
            }}
          >
            <img
              alt='Toggle Icon'
              src={toAbsoluteUrl('/media/icons/duotune/arrows/chevron-right.svg')}
              className={clsx('h-30px transition-transform', {
                'rotate-180': !isMinimized,
              })}
            />
          </div>
        )}
    </div>
  )
}

export { SidebarLogo }
