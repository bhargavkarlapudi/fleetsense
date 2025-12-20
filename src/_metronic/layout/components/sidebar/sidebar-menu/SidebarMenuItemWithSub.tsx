import React from 'react'
import clsx from 'clsx'
import { useLocation, useNavigate } from 'react-router'
import { checkIsActive, getCurrentUrl, KTSVG, WithChildren } from '../../../../helpers'
import { useLayout } from '../../../core'

type Props = {
  to: string
  title: string
  icon?: string
  fontIcon?: string
  hasBullet?: boolean
  tooltip?: string;
  submenuRoutes?: string[]
}

const SidebarMenuItemWithSub: React.FC<Props & WithChildren> = ({
  children,
  to,
  title,
  icon,
  fontIcon,
  hasBullet,
  tooltip,
  submenuRoutes = [],
}) => {
  const { pathname } = useLocation()
  const currentPath = getCurrentUrl(pathname) // cleans up query strings etc.
  const isActive = React.useMemo(() => {
    return checkIsActive(currentPath, to) ||
      submenuRoutes?.some((route) => checkIsActive(currentPath, route))
  }, [currentPath, to, submenuRoutes])

  const { config } = useLayout()
  const { app } = config
  const navigate = useNavigate();

  // Navigate to the menu route when clicking the title (only for leaf nodes)
  const handleNavigation = (e: React.MouseEvent<HTMLSpanElement>) => {
    // Don't navigate if this has submenu items, let it expand/collapse instead
    if (children) {
      return; // Let the default accordion behavior handle it
    }
    e.stopPropagation();
    navigate(to);
  };

  return (
    <div
      className={clsx('menu-item', { 'here show': isActive }, 'menu-accordion')}
      data-kt-menu-trigger='click'
      data-kt-menu-placement='right-start'
    >
      <span 
      className={clsx('menu-link', { active: isActive })} 
      onClick={handleNavigation}
        >
        {hasBullet && (
          <span className='menu-bullet'>
            <span className='bullet bullet-dot'></span>
          </span> 
        )}
        {icon && app?.sidebar?.default?.menu?.iconType === 'svg' && (
          <span className='menu-icon'>
            <KTSVG path={icon} className='svg-icon-3x' />
          </span>
        )}
        {fontIcon && app?.sidebar?.default?.menu?.iconType === 'font' && (
          <i className={clsx('bi fs-3', fontIcon)}></i>
        )}
        <span className='menu-title'>{title}</span>
        <span className='menu-arrow'></span>
      </span>
      <div className={clsx('menu-sub menu-sub-accordion', { 'menu-active-bg': isActive })}>
        {children}
      </div>
    </div>
  )
}

export { SidebarMenuItemWithSub }
