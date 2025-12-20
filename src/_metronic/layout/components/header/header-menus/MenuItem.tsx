import { FC } from 'react'
import { useLocation } from 'react-router'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { checkIsActive, getCurrentUrl, KTSVG } from '../../../../helpers'

type Props = {
  to: string
  title: string
  icon?: string
  fontIcon?: string
  hasArrow?: boolean
  hasBullet?: boolean
  submenuRoutes?: string[]
}

const MenuItem: FC<Props> = ({ to, title, icon, fontIcon, hasArrow = false, hasBullet = false, submenuRoutes = [], }) => {
  const { pathname } = useLocation()
  const currentPath = getCurrentUrl(pathname) // cleans up query strings etc.
  const isActive =
    checkIsActive(currentPath, to) ||
    submenuRoutes.some((route) => checkIsActive(currentPath, route))
  return (
    <div className='menu-item me-lg-1'>
      <Link
        title={title}
        className={clsx('menu-link py-3', {
          'active menu-here': isActive,
        })}
        to={to}
      >
        {hasBullet && (
          <span className='menu-bullet'>
            <span className='bullet bullet-dot'></span>
          </span>
        )}

        {icon && (
          <span className={clsx('menu-icon', { 'text-white': isActive })}>
            <KTSVG path={icon} className='svg-icon-2' />
          </span>
        )}

        {fontIcon && (
          <span className='menu-icon'>
            <i className={clsx('bi fs-3', fontIcon)}></i>
          </span>
        )}

        <span className='menu-title'>{title}</span>

        {hasArrow && <span className='menu-arrow'></span>}
      </Link>
    </div>
  )
}

export { MenuItem }
