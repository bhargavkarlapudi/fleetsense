import clsx from 'clsx'
import { KTSVG, toAbsoluteUrl } from '../../../helpers'
import { ThemeModeSwitcher } from '../../../partials'
import { useLayout } from '../../core'
import { HeaderUserMenu } from '../../../partials/layout/header-menus/HeaderUserMenu'
import { useAuth } from '../../../../app/modules/auth'

const itemClass = 'ms-1 ms-lg-6'
const btnClass =
  'btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary w-35px h-35px w-md-40px h-md-40px'
const userAvatarClass = 'symbol-35px symbol-md-35px'
const btnIconClass = 'svg-icon-1'

const Navbar = () => {
  const { currentUser } = useAuth()
  const roleId = currentUser?.role?.id;
  const roleEntityName = currentUser?.roleEntityName;
  const { config } = useLayout()
  const roleName = currentUser?.roleEntityName;
  const vesselname = currentUser?.vessel?.fleet_name;
  const rank = currentUser?.rank?.rank;
  const imoNumber = currentUser?.vessel?.imoNumber;
  // ADD: Resolve company/group label for operator banner.
// Tries a few common shapes; falls back to "Superadmin" when no CGA is present.
const companyGroupName =
  (currentUser as any)?.companyGroupAdmin?.name ??
  (currentUser as any)?.companyGroupAdmin?.uid?.username ??
  (currentUser as any)?.companyGroupAdminName ??
  (currentUser as any)?.companyName ??
  null;

const operatorBanner = roleId === 6
  ? `${companyGroupName ? companyGroupName : 'Superadmin'}'s operator`
  : null;

  return (
    <div className='app-navbar flex-shrink-0'>
      {/* <div className={clsx('app-navbar-item align-items-stretch', itemClass)}>
        <Search />
      </div> */}

      {/* <div className={clsx('app-navbar-item', itemClass)}>
        <div id='kt_activities_toggle' className={btnClass}>
          <KTSVG path='/media/icons/duotune/general/gen032.svg' className={btnIconClass} />
        </div>
      </div> */}

      {/* <div className={clsx('app-navbar-item', itemClass)}>
        <div
          data-kt-menu-trigger="{default: 'click'}"
          data-kt-menu-attach='parent'
          data-kt-menu-placement='bottom-end'
          className={btnClass}
        >
          <KTSVG path='/media/icons/duotune/general/gen022.svg' className={btnIconClass} />
        </div>
        <HeaderNotificationsMenu />
      </div> */}

      {/* <div className={clsx('app-navbar-item', itemClass)}>
        <div className={clsx('position-relative', btnClass)} id='kt_drawer_chat_toggle'>
          <KTSVG path='/media/icons/duotune/communication/com012.svg' className={btnIconClass} />
          <span className='bullet bullet-dot bg-success h-6px w-6px position-absolute translate-middle top-0 start-50 animation-blink' />
        </div>
      </div> */}
      {/* <div className={clsx('app-navbar-item', itemClass)}>
        <KTSVG path='/media/icons/duotune/menu/solar_widget.svg' className={btnIconClass} />
      </div>

      <div className={clsx('app-navbar-item', itemClass)}>
        <KTSVG path='/media/icons/duotune/menu/Bell.svg' className={btnIconClass} />
      </div> */}

      <div className={clsx('app-navbar-item', itemClass)}>
        <div
          className={clsx('cursor-pointer symbol', userAvatarClass)}
          data-kt-menu-trigger="{default: 'click'}"
          data-kt-menu-attach='parent'
          data-kt-menu-placement='bottom-end'
        >
                  <span className='me-4 badge badge-lg badge-secondary p-4'>
          {/* Crew (role 4): show vessel name */}
  {roleId === 4 && <b>{vesselname}</b>}

  {/* Operator (role 6): show "{company / Superadmin}'s operator" */}
  {roleId === 6 && <b>{operatorBanner}</b>}
</span>

          <img src={toAbsoluteUrl('/media/avatars/blank.png')} alt='' />
          <span className='ps-2' style={{ fontWeight: 500 }}>
            {roleEntityName}
          </span>
        </div>
        <HeaderUserMenu />
      </div>

      {config.app?.header?.default?.menu?.display && (
        <div className='app-navbar-item d-lg-none ms-2 me-n3' title='Show header menu'>
          <div
            className='btn btn-icon btn-active-color-primary w-35px h-35px'
            id='kt_app_header_menu_toggle'
          >
            <div>
              {/* <KTSVG path='/media/logos/polar_marine_logo_1.svg' className='svg-icon-4x' /> */}
            </div>
            <KTSVG path='/media/icons/duotune/text/txt001.svg' className={btnIconClass} />
          </div>
        </div>
      )}
    </div>
  )
}

export { Navbar }
