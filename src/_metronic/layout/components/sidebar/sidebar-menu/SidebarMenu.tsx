// import { menus } from '../../../../../myMenus'


// import { useAuth } from '../../../../../app/modules/auth';
// import { getMenusByRole  } from '../../../../../myMenus'
// import SidebarMenuMain from './SidebarMenuMain'

import React from 'react'
import { useAuth } from '../../../../../app/modules/auth'
import { getMenusByRoleSync, getMenusByRoleAsync } from '../../../../../myMenus'
import SidebarMenuMain from './SidebarMenuMain'


// const SidebarMenu = () => {
//   const { currentUser } = useAuth()
//     const roleId = currentUser?.role?.id || 0;
//   const menus = getMenusByRole(roleId);
//   return (

const SidebarMenu = () => {
  const { currentUser } = useAuth()
  const roleId = currentUser?.role?.id || 0
  const roleType = currentUser?.role?.roleType || (currentUser as any)?.role?.roleName
  const roleIdByType: Record<string, number> = {
    SUPER_ADMIN: 1,
    COMPANY_ADMIN: 2,
    COMPANY_GROUP_ADMIN: 5,
    CREW: 4,
    OPERATOR: 6,
  }
  const effectiveRoleId = roleType && roleIdByType[roleType] ? roleIdByType[roleType] : roleId
  const rankId = currentUser?.rank?.id || undefined

  const [menus, setMenus] = React.useState(() => getMenusByRoleSync(effectiveRoleId, rankId))

  React.useEffect(() => {
    let alive = true

    const load = async () => {
      if (effectiveRoleId === 6) {
        // If you keep token in currentUser, pass it. Otherwise remove token field.
        const token = (currentUser as any)?.token || undefined
        const dynamicMenus = await getMenusByRoleAsync(6, { token })
        if (alive) setMenus(dynamicMenus)
      } else {
        const staticMenus = getMenusByRoleSync(effectiveRoleId, rankId)
        if (alive) setMenus(staticMenus)
      }
    }

    load()
    return () => {
      alive = false
    }
  }, [effectiveRoleId, currentUser, rankId])

  return (

    
    <div className='app-sidebar-menu overflow-hidden flex-column-fluid'>
      <div
        id='kt_app_sidebar_menu_wrapper'
        className='app-sidebar-wrapper hover-scroll-overlay-y my-5'
        data-kt-scroll='true'
        data-kt-scroll-activate='true'
        data-kt-scroll-height='auto'
        data-kt-scroll-dependencies='#kt_app_sidebar_logo, #kt_app_sidebar_footer'
        data-kt-scroll-wrappers='#kt_app_sidebar_menu'
        data-kt-scroll-offset='5px'
        data-kt-scroll-save-state='true'
      >
        <div
          className='menu menu-column menu-rounded menu-sub-indention px-3'
          id='kt_app_sidebar_menu'
          data-kt-menu='true'
          data-kt-menu-expand='false'
        >
          <SidebarMenuMain menus={menus} />
        </div>
      </div>
    </div>
  )
}

export { SidebarMenu }
