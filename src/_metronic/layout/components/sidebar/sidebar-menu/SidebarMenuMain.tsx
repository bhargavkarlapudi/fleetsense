import React, { useEffect } from 'react';
import { SidebarMenuItemWithSub } from './SidebarMenuItemWithSub';
import { SidebarMenuItem } from './SidebarMenuItem';
import { MenuItem, MenuGroup } from './types'; // Import the defined interfaces
import { MenuComponent } from '../../../../assets/ts/components/MenuComponent';

interface SidebarMenuMainProps {
  menus: MenuGroup[]; // Receive the menus as a prop
}
const SidebarMenuMain: React.FC<SidebarMenuMainProps> = ({ menus }) => {
  const getAllSubmenuRoutes = (menuItem: MenuItem): string[] => {
    const routes: string[] = []

    const traverse = (item: MenuItem) => {
      if (item.route) {
        routes.push(item.route)
      }
      if (item.submenu && item.submenu.length > 0) {
        item.submenu.forEach(traverse)
      }
    }

    if (menuItem.submenu) {
      menuItem.submenu.forEach(traverse)
    }

    return routes
  }

  useEffect(() => {
    // Initialize the tooltips using jQuery after the component has rendered
    const tooltipElements = document.querySelectorAll('[data-toggle="tooltip"]');
    tooltipElements.forEach((element) => {
      // @ts-ignore
      $(element).tooltip(); // Initialize the tooltip
    });

    // Initialize MenuComponent for accordion behavior
    const timer = setTimeout(() => {
      MenuComponent.reinitialization();
    }, 100);

    return () => clearTimeout(timer);
  }, [menus]);

  return (
    <>
      {menus.map((menuGroup: MenuGroup, menuGroupIndex: number) => (
        <div className="menu-item" key={menuGroupIndex} data-kt-menu="true">
          {/* <div className="pt-8 pb-2">
            <span className="section-name menu-section text-muted text-uppercase fs-8 ls-1">
              {menuGroup.name}
            </span>

          </div> */}
          {menuGroup.menu.map((menuItem: MenuItem, menuItemIndex: number) => (
            <React.Fragment key={menuItemIndex}>
              {menuItem.submenu && menuItem.submenu.length > 0 ? (
                <SidebarMenuItemWithSub
                  to={menuItem.route}
                  data-toggle="tooltip"
                  title={menuItem.name}
                  tooltip={menuItem.name}
                  icon={`/media/icons/duotune/${menuItem.svg_location}/${menuItem.icon}.svg`}
                  fontIcon="bi-app-indicator"
                  submenuRoutes={getAllSubmenuRoutes(menuItem)}
                >
                  {menuItem.submenu.map((submenuItem: MenuItem, subIndex: number) => (
                    <React.Fragment key={subIndex}>
                      {submenuItem.submenu && submenuItem.submenu.length > 0 ? (
                        <SidebarMenuItemWithSub
                          to={submenuItem.route}
                          title={submenuItem.name}
                          tooltip={submenuItem.name}
                          icon={`/media/icons/duotune/${menuItem.svg_location}/${menuItem.icon}.svg`}
                          fontIcon="bi-app-indicator"
                          hasBullet={true}
                          submenuRoutes={getAllSubmenuRoutes(submenuItem)}
                        >
                          {submenuItem.submenu.map((subSubMenuItem: MenuItem, subSubIndex: number) => (
                            <SidebarMenuItem
                              to={subSubMenuItem.route}
                              title={subSubMenuItem.name}
                              hasBullet={true}
                              tooltip={subSubMenuItem.name}
                              key={subSubIndex}
                            />
                          ))}
                        </SidebarMenuItemWithSub>
                      ) : (
                        <SidebarMenuItem
                          to={submenuItem.route}
                          title={submenuItem.name}
                          hasBullet={true}
                          tooltip={submenuItem.name}
                          key={subIndex}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </SidebarMenuItemWithSub>
              ) : (
                <SidebarMenuItem
                  to={menuItem.route}
                  title={menuItem.name}
                  icon={`/media/icons/duotune/${menuItem.svg_location}/${menuItem.icon}.svg`}
                  fontIcon="bi-app-indicator"
                  tooltip={menuItem.name}
                  hasBullet={false}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        // </div>
      ))}
    </>
  );
};

export default SidebarMenuMain;
