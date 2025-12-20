import {MenuGroup, MenuItem} from './_metronic/layout/components/sidebar/sidebar-menu/types'
import { getMenusTree, type MenuTreeNode } from './app/modules/Management/core/_requests'



// 1) helper: always ensure "Home" exists (top of the list)
const ensureHome = (groups: MenuGroup[]): MenuGroup[] => {
  if (!groups.length) return groups
  const [first, ...rest] = groups

  const hasHome = first.menu.some((m) => m.name === 'Home')

  if (hasHome) return groups

  // Prefer route/icon from the static map; fallback to defaults
  const homeMeta =
    STATIC_MODULES['Home'] ?? ({ route: '/dashboard', icon: 'Home', svg_location: 'menu' } as RouteIcon)

  const homeItem: MenuItem = {
    name: 'Home',
    route: homeMeta.route,
    icon: (homeMeta.icon as string) ?? 'Home',
    svg_location: (homeMeta.svg_location as string) ?? 'menu',
    // no submenu
  }

  return [{ ...first, menu: [homeItem, ...first.menu] }, ...rest]
}


/**
 * -------------------------
 * 1) STATIC (existing) DATA
 * -------------------------
 * Keep your existing hardcoded role access and the full master menu tree.
 * We still use these for all roles except operator (roleId === 6),
 * and as a fallback if the API fails.
 */
// Configuration for 3rd level menu filtering (nested submenus)
const roleNestedAccess: {
  [roleId: string]: {
    [menuName: string]: {
      [submenuName: string]: string[] // 3rd level items allowed for this submenu
    }
  }
} = {
  '4': {
    Technical: {
      Procurement: [
        'Overview',
        'Requisitions',
        'Approvals',
        'RFQ Management',
        'Quotation Management',
        'Purchase Orders',
        'Delivery Tracking',
        'Goods Receipt',
        'Invoice Management'
        // Excluding 'Audit Trail' and 'User Management' for role 4
      ]
    }
  }
}

const roleAccess: {
  [roleId: string]: {
    [menuName: string]: string[] // submenu names allowed for this menu
  }
} = {
  // SuperAdmin
  '1': {
    Home: [],
    Operations: ['Position Reports', 'Library', 'Voyage Reports','Cargo Operations','Defects List',],
    // Procurement: ['Requisitions', 'Purchase Orders', 'Vendors', 'Inventory'],
    Admin: ['Companies', 'Sub-Companies', 'Vessels',
       'User Management', 'Vendor Management'
      ],
    Crewing: [
      'Overview',
      'Crew Assignment',
      // 'Rest Hours',
      'Crew Resthours and Overtime',
      'Crew Overtime',
      'Crew Allotment',
      'Crew Advance',
      'Crew Claims',
      'Appraisal',
      'Crew Training',
      'Crew Complaints',
      'Crew Test & Verification',
    ],
    // Crewingtest: [
    //   'Crew Management',
    //   'Crew Resthours and Overtime',
    //   'Crew Wages and Portage Bills',
    //   'Assessment and Training',
    //   'Crew Management',
    //   'Crew Listing',
    //   'Crew Assignment',
    // ],
    'Work & Hours': ['Rest Hour Management', 'Overtime Entry'],
    Financials: ['Allotment', 'Deductions', 'Portage Bill', 'Reimbursement', 'HRA Allowance'],
    Training: ['Training Tracker', 'Appraisals'],
    Technical: ['Machinery', 'Procurement', 'Inventory', 'Defects List'],
    QHSE: ['Document Library','Vessel Certificates' ,'Manuals and Plans',
     'Defects List',
     'Vessel Audits',
     'Vessel Inspection',
     'Near Miss reports',
      'Risk Assessment Form',
     ],
    Accounts: [],
    // HR: [],
    // Admin: [],
  },
  // Crew Member
  '4': {
    Home: [],
    Operations: ['Position Reports', "Voyage Reports",'Cargo Operations',  'Defects List',],
    Crewing: ['Crew List', 'Crew Onboard', 'Crew Resthours and Overtime',],
    // Crewingtest: [
    //   'Crew Management',
    //   'Crew Resthours and Overtime',
    //   'Crew Wages and Portage Bills',
    //   'Assessment and Training',
    //   'Crew Management',
    //   'Crew Listing',
    //   'Crew Assignment',
    // ],
    Technical: ['Procurement', 'Inventory', 'Defects List',],
   QHSE: ['Document Library','Vessel Certificates' ,'Manuals and Plans' , 'Defects List','Vessel Inspection','Vessel Audits','Near Miss reports',
      'Risk Assessment Form',],
  //  Procurement: [
  //   'Overview',
  //   'Requisitions',
  //   'Approvals',
  //   'RFQ Management',
  //   'Vendor Portal',
  //   'Purchase Orders',
  //   'Delivery Tracking',
  //   'Goods Receipt',
  //   'Invoice Matching',
  //   'Audit Trail',
  //   'Inventory',
  //   'User Management'
  // ],
    // Accounts: [],
    // HR: [],
    // Admin: [],
  },
  // Company
  '5': {
    Home: [],
    Admin: ['Sub-Companies', 'Vessels',
      'User Management', 'Vendor Management'
    ],
    Operations: ['Position Reports', 'Library', 'Voyage Reports','Cargo Operations', 'Defects List',],
    // Procurement: ['Requisitions', 'Purchase Orders', 'Vendors', 'Inventory'],
    Crewing: [
      'Overview',
      'Crew Assignment',
      // 'Rest Hours',
      'Crew Resthours and Overtime',
      'Crew Overtime',
      'Crew Allotment',
      'Crew Advance',
      'Crew Claims',
      'Appraisal',
      'Crew Training',
      'Crew Complaints',
      'Crew Test & Verification',
    ],
    // Crewingtest: [
    //   'Crew Management',
    //   'Crew Resthours and Overtime',
    //   'Crew Wages and Portage Bills',
    //   'Assessment and Training',
    //   'Crew Management',
    //   'Crew Listing',
    //   'Crew Assignment',
    // ],
    Technical: ['Procurement', 'Inventory', 'Defects List',],
   QHSE: ['Document Library','Vessel Certificates' ,'Manuals and Plans','Defects List','Vessel Inspection',
    'Vessel Audits','Near Miss reports',
      'Risk Assessment Form', ],
    Accounts: [],
    // HR: [],
    // Admin: [],
  },
  // Sub Company
  '2': {
    Home: [],
    // Operations: ['Library'],
    Admin: ['Vessels'],
    Operations: ['Position Reports', 'Library', 'Voyage Reports','Cargo Operations',  'Defects List',],
    // Procurement: ['Requisitions', 'Purchase Orders', 'Vendors', 'Inventory'],
    Crewing: [
      'Overview',
      'Crew Assignment',
      // 'Rest Hours',
      'Crew Resthours and Overtime',
      'Crew Overtime',
      'Crew Allotment',
      'Crew Advance',
      'Crew Claims',
      'Appraisal',
      'Crew Training',
      'Crew Complaints',
      'Crew Test & Verification',
    ],
    // Crewingtest: [
    //   'Crew Management',
    //   'Crew Resthours and Overtime',
    //   'Crew Wages and Portage Bills',
    //   'Assessment and Training',
    //   'Crew Management',
    //   'Crew Listing',
    //   'Crew Assignment',
    // ],
    Technical: ['Procurement', 'Inventory','Defects List',],
    QHSE: ['Document Library','Vessel Certificates' ,'Manuals and Plans','Defects List','Vessel Inspection',
      'Vessel Audits', 'Near Miss reports',
      'Risk Assessment Form',],
    Accounts: [],
    // HR: [],
    // Admin: [],
  },

   // Operator (role 6) — kept only as a fallback if API fails
  '6': {
    Home: [],
  //   Admin: ['Sub-Companies', 'Vessels'],
  //   Operations: ['Voyage Reports'],
  //   // Procurement: ['Requisitions', 'Purchase Orders', 'Vendors', 'Inventory'],
  //   Crewing: [
  //     'Overview',
  //     'Crew Assignment',
  //     // 'Rest Hours',
  //     'Crew Resthours and Overtime',
  //     'Crew Overtime',
  //     'Crew Allotment',
  //     'Crew Advance',
  //     'Crew Claims',
  //     'Appraisal',
  //     'Crew Training',
  //     'Crew Complaints',
  //     'Crew Test & Verification',
  //   ],
  //   // Crewingtest: [
  //   //   'Crew Management',
  //   //   'Crew Resthours and Overtime',
  //   //   'Crew Wages and Portage Bills',
  //   //   'Assessment and Training',
  //   //   'Crew Management',
  //   //   'Crew Listing',
  //   //   'Crew Assignment',
  //   // ],
  // //   Technical: [],
  //  QHSE: ['Document Library','Vessel Certificates'],
  // //   Accounts: [],
  //   // HR: [],
  //   // Admin: [],
  },
  
}

const allMenus: MenuGroup[] = [
  {
    name: '',
    menu: [
      {
        name: 'Home',
        svg_location: 'menu',
        icon: 'Home',
        route: '/dashboard',
        // submenu: [
        //   {
        //     name: 'General',
        //     svg_location: '',
        //     icon: '',
        //     route: '/dashboard/general',
        //   },
        //   {
        //     name: 'Procurement',
        //     svg_location: '',
        //     icon: '',
        //     route: '/dashboard/procurement',
        //   }
        // ]
      },

      // {
      //   name: 'Procurement',
      //   svg_location: 'menu',
      //   icon: 'Technical',
      //   route: '/procurement',
      //   submenu: [
      //     {
      //       name: 'Requisitions',
      //       svg_location: '',
      //       icon: '',
      //       route: '/procurement/requisition',
      //     },
      //     {
      //       name: 'Purchase Orders',
      //       svg_location: '',
      //       icon: '',
      //       route: '/procurement/purchase-orders',
      //     },
      //     {
      //       name: 'Vendors',
      //       svg_location: '',
      //       icon: '',
      //       route: '/procurement/vendors',
      //     },
      //     {
      //       name: 'Inventory',
      //       svg_location: '',
      //       icon: '',
      //       route: '/procurement/inventory-management',
      //     },
      //   ],
      // },
      {
        name: 'Admin',
        svg_location: 'menu',
        icon: 'admin',
        route: '/manage',
        submenu: [
          {
            name: 'Companies',
            svg_location: '',
            icon: '',
            route: '/manage/companies',
          },
          {
            name: 'Sub-Companies',
            svg_location: '',
            icon: '',
            route: '/manage/subcompanies',
          },
          {
            name: 'Vessels',
            svg_location: '',
            icon: '',
            route: '/manage/vessels',
          },
          {
            name: 'User Management',
            svg_location: '',
            icon: '',
            route: '/manage/usermanagement',
          },
          {
            name: 'Vendor Management',
            svg_location: '',
            icon: '',
            route: '/manage/vendormanagement',
          },
        ],
      },
      {
        name: 'Operations',
        svg_location: 'menu',
        icon: 'Operations',
        route: '/operations',
        submenu: [
           {
            name: 'Voyage Reports',
            svg_location: '',
            icon: '',
            route: '/operations/voyages',
          },
          {
            name: 'Position Reports',
            svg_location: '',
            icon: '',
            route: '/operations/overview',
          },
          {
            name: 'Cargo Operations',
            svg_location: '',
            icon: '',
            route: '/operations/cargo-operations',
          },
          {
            name: 'Library',
            svg_location: '',
            icon: '',
            route: '/operations/library',
          },
                     {
          name: 'Defects List',
          svg_location: '',
          icon: '',
          route: '/operations/defects-list',
        },
        ],
      },
      {
        name: 'Crewing',
        svg_location: 'menu',
        icon: 'crewing',
        route: '/crewing',
        submenu: [
          // {
          //   name: 'Overview',
          //   svg_location: '',
          //   icon: '',
          //   route: '/crewing/overview',
          // },
          {
          name: 'Overview',
                svg_location: '',
                icon: '',
                route: '/crewingtest/crewinglist',
          },
          {
            name: 'Crew Assignment',
            svg_location: '',
            icon: '',
            route: '/crewing/assignment',
          },
          {
            name: 'Crew List',
            svg_location: '',
            icon: '',
            route: '/crewing/crewdetails',
          },
          {
            name: 'Crew Onboard',
            svg_location: '',
            icon: '',
            route: '/crewing/signing',
          },
          // {
          //   name: 'Rest Hours',
          //   svg_location: '',
          //   icon: '',
          //   route: '/crewing/resthours',
          // },
          {
            name: 'Crew Resthours and Overtime',
            svg_location: 'none',
            icon: 'none',
            route: '/crewing/workhours',
            submenu: [
              {
                name: 'Rest Hour Management',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/resthours',
              },
              // {
              //   name: 'Overtime Entry',
              //   svg_location: 'none',
              //   icon: 'none',
              //   route: '/crewingtest/crewovertime',
              // },
              {
            name: 'Crew Overtime',
            svg_location: '',
            icon: '',
            route: '/crewing/crewovertime',
          },
            ],
          },
          // {
          //   name: 'Crew Overtime',
          //   svg_location: '',
          //   icon: '',
          //   route: '/crewing/crewovertime',
          // },
          {
            name: 'Crew Allotment',
            svg_location: '',
            icon: '',
            route: '/crewing/crewallotment',
          },
          {
            name: 'Crew Advance',
            svg_location: '',
            icon: '',
            route: '/crewing/crewadvance',
          },
          {
            name: 'Crew Claims',
            svg_location: '',
            icon: '',
            route: '/crewing/crewclaims',
          },
          {
            name: 'Appraisal',
            svg_location: '',
            icon: '',
            route: '/crewing/appraisal',
          },
          {
            name: 'Crew Training',
            svg_location: '',
            icon: '',
            route: '/crewing/crewtraining',
          },
          {
            name: 'Crew Complaints',
            svg_location: '',
            icon: '',
            route: '/crewing/crewcomplaints',
          },
          {
            name: 'Crew Test & Verification',
            svg_location: '',
            icon: '',
            route: '/crewing/crewtestverification',
          },
        ],
      },
      {
        name: 'Crewingtest',
        svg_location: 'menu',
        icon: 'crewing',
        route: '/CrewingTest',
        submenu: [
          {
            name: 'Crew Management',
            svg_location: 'none',
            icon: 'none',
            route: '/crewingtest/management',
            submenu: [
              {
                name: 'Crew List Overview',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/crewinglist',
              },
              {
                name: 'Crew Assignment',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/assignment',
              },
            ],
          },
          {
            name: 'Crew Resthours and Overtime',
            svg_location: 'none',
            icon: 'none',
            route: '/crewing/workhours',
            submenu: [
              {
                name: 'Rest Hour Management',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/resthours',
              },
              {
                name: 'Overtime Entry',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/crewovertime',
              },
            ],
          },
          {
            name: 'Crew Wages and Portage Bills',
            svg_location: 'none',
            icon: 'none',
            route: '/crewing/financials',
            submenu: [
              {
                name: 'Portage Bill Workspace',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/portagebill',
              },
              {
                name: 'Wage Snapshot',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/wagesnapshot',
              },
              {
                name: 'Adjustments / Allowances',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/adjustments',
              },
              {
                name: 'Deductions Manager',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/deductions',
              },
              {
                name: 'Reimbursements Manager',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/reimbursement',
              },
              {
                name: 'Allotment & Bank Details',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/allotment',
              },
            ],
          },
          {
            name: 'Assessment and Training',
            svg_location: 'none',
            icon: 'none',
            route: '/crewing/training',
            submenu: [
              {
                name: 'Training Tracker',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/crewtraining',
              },
              {
                name: 'Appraisals',
                svg_location: 'none',
                icon: 'none',
                route: '/crewingtest/appraisal',
              },
            ],
          },
        ],
      },
      {
        name: 'Technical',
        svg_location: 'menu',
        icon: 'Technical',
        route: '/technical',
        submenu: [
          {
            name: 'Machinery',
            svg_location: '',
            icon: '',
            route: '/technical/machinery',
          },
           {
            name: 'Procurement',
            svg_location: '',
            icon: '',
            route: '/technical/procurement',
            submenu: [
              // {
              //   name: 'Overview',
              //   svg_location: '',
              //   icon: '',
              //   route: '/procurement/overview',
              // },
              {
                name: 'Requisitions',
                svg_location: '',
                icon: '',
                route: '/procurement/requisition',
              },
              {
                name: 'Approvals',
                svg_location: '',
                icon: '',
                route: '/procurement/approvals',
              },
              {
                name: 'RFQ Management',
                svg_location: '',
                icon: '',
                route: '/procurement/rfq-management',
              },
              {
                name: 'Quotation Management',
                svg_location: '',
                icon: '',
                route: '/procurement/quotation-management',
              },
              {
                name: 'Purchase Orders',
                svg_location: '',
                icon: '',
                route: '/procurement/purchase-orders',
              },
              {
                name: 'Delivery Tracking',
                svg_location: '',
                icon: '',
                route: '/procurement/delivery-tracking',
              },
              {
                name: 'Goods Receipt',
                svg_location: '',
                icon: '',
                route: '/procurement/goods-receipt',
              },
              {
                name: 'Invoice Management',
                svg_location: '',
                icon: '',
                route: '/procurement/invoice-management',
              },
              {
                name: 'Audit Trail',
                svg_location: '',
                icon: '',
                route: '/procurement/audit-trail',
              },
              {
                name: 'User Management',
                svg_location: '',
                icon: '',
                route: '/procurement/user-management',
              },
            ]
          },
          {
            name: 'Inventory',
            svg_location: '',
            icon: '',
            route: '/procurement/inventory-management',
          },
            {
          name: 'Defects List',
          svg_location: '',
          icon: '',
          route: '/technical/defects-list',
        },
        ]
      },
      {
        name: 'QHSE',
        svg_location: 'menu',
        icon: 'qhse',
        route: '/qhse',
           submenu: [
          {
            name: 'Document Library',
            svg_location: '',
            icon: '',
            route: '/qhse/document-library',
          },
          {
            name: 'Vessel Certificates',
            svg_location: '',
            icon: '',
            route: '/qhse/vessel-certificates',
          },
          {
          name: 'Manuals and Plans',
          svg_location: '',
          icon: '',
          route: '/qhse/manuals-and-plans',
        },
          {
          name: 'Defects List',
          svg_location: '',
          icon: '',
          route: '/qhse/defects-list',
        },
        {
      name: 'Vessel Audits',
      svg_location: '',
      icon: '',
      route: '/qhse/vessel-audits',
      submenu: [
        {
          name: 'Audit Index',
          svg_location: '',
          icon: '',
          route: '/qhse/audit-index',
        },
        {
          name: 'Audit Planning',
          svg_location: '',
          icon: '',
          route: '/qhse/audit-planning',
        },
        {
          name: 'Audit Findings',
          svg_location: '',
          icon: '',
          route: '/qhse/audit-findings',
        },
      ],
    },
     {
          name: 'Vessel Inspection',
          svg_location: '',
          icon: '',
          route: '/qhse/vessel-inspection',
          submenu: [
            {
              name: 'Inspection Index',
              svg_location: '',
              icon: '',
              route: '/qhse/inspindex',
            },
            {
              name: 'Inspection Planning',
              svg_location: '',
              icon: '',
              route: '/qhse/insplanning',
            },
            {
              name: `Inspection Findings`,
              svg_location: '',
              icon: '',
              route: '/qhse/inspection-findings',
            },
          ]
          },
          {
      name: 'Near Miss reports',
      svg_location: '',
      icon: '',
      route: '/qhse/accident-near-miss-reports',
    },
    {
      name: 'Risk Assessment Form',
      svg_location: '',
      icon: '',
      route: '/qhse/risk-assessment-form',
    },

        ],
      },
      {
        name: 'Accounts',
        svg_location: 'menu',
        icon: 'accounts',
        route: '/accounts',
      },
      // {
      //   name: 'HR',
      //   svg_location: 'menu',
      //   icon: 'hr',
      //   route: '/polls'
      // },
    ],
  },
]



/**
 * 2) UTILITIES TO MAP THE STATIC TREE
 *    We build a route/icon index so we can map API names -> routes/icons.
 */

type RouteIcon = { route: string; icon?: string; svg_location?: string }

const kebab = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const buildIndexes = (menus: MenuGroup[]) => {
  const moduleMap: Record<string, RouteIcon> = {}
  // leafMap keys we will store:
  // - "Module>>Leaf" (legacy/fallback)
  // - "Module>>Menu>>Leaf" (preferred for sub-sub menus)
  const leafMap: Record<string, RouteIcon> = {}

  const traverse = (moduleName: string, parentName: string | null, item: MenuItem) => {
    // top-level items act as modules
    if (!moduleName) moduleName = item.name

    if (item.submenu?.length) {
      // record module shell if top-level
      if (!leafMap[`${item.name}>>__SELF__`]) {
        moduleMap[item.name] = {
          route: item.route,
          icon: item.icon,
          svg_location: item.svg_location,
        }
      }
      item.submenu.forEach((sub) => traverse(moduleName, item.name, sub))
    } else {
      // leaf (no submenu)
      // store both short and full keys for resilience
      leafMap[`${moduleName}>>${item.name}`] = {
        route: item.route,
        icon: item.icon,
        svg_location: item.svg_location,
      }
      if (parentName) {
        leafMap[`${moduleName}>>${parentName}>>${item.name}`] = {
          route: item.route,
          icon: item.icon,
          svg_location: item.svg_location,
        }
      }
    }
  }

  menus.forEach((group) => {
    group.menu.forEach((item) => {
      moduleMap[item.name] = {
        route: item.route,
        icon: item.icon,
        svg_location: item.svg_location,
      }
      if (item.submenu) item.submenu.forEach((sub) => traverse(item.name, item.name, sub))
    })
  })

  return { moduleMap, leafMap }
}


const { moduleMap: STATIC_MODULES, leafMap: STATIC_LEAVES } = buildIndexes(allMenus)

/**
 * 3) API TYPES + MAPPER
 */

// type ApiLevel = 'MODULE' | 'MENU'
// interface ApiMenuNode {
//   level: ApiLevel
//   id: number
//   name: string
//   sortOrder: number | null
//   canView: boolean
//   canAdd: boolean
//   canEdit: boolean
//   canDelete: boolean
//   children: ApiMenuNode[]
// }
type ApiMenuNode = MenuTreeNode

const mapApiTreeToMenuGroups = (apiRoot: ApiMenuNode | ApiMenuNode[]): MenuGroup[] => {
  const modules: ApiMenuNode[] = Array.isArray(apiRoot) ? apiRoot : [apiRoot]

  const group: MenuGroup = { name: '', menu: [] }

  modules
    .filter((m) => m.level === 'MODULE')
    .forEach((mod) => {
      // find module skeleton from static map (route + icon)
      const modMeta =
        STATIC_MODULES[mod.name] ??
        ({
          route: `/${kebab(mod.name)}`,
          icon: 'none',
          svg_location: 'menu',
        } as RouteIcon)

      const moduleItem: MenuItem = {
        name: mod.name,
        route: modMeta.route,
        icon: (modMeta.icon as string) ?? 'none',
        svg_location: (modMeta.svg_location as string) ?? 'menu',
        submenu: [],
      }

      // children -> only show items with canView === true
      const visibleChildren = (mod.children || []).filter((c) => c.level === 'MENU' && c.canView)

      visibleChildren.forEach((child) => {
        const leafMeta =
          STATIC_LEAVES[`${mod.name}>>${child.name}`] ??
          ({
            route: `/${kebab(mod.name)}/${kebab(child.name)}`,
            icon: 'none',
            svg_location: '',
          } as RouteIcon)

        const childItem: MenuItem = {
          name: child.name,
          route: leafMeta.route,
          icon: (leafMeta.icon as string) ?? 'none',
          svg_location: (leafMeta.svg_location as string) ?? '',
        }

        // if backend later returns nested children for a leaf, map them too
        if (child.children?.length) {
          const subLeaves = child.children
            .filter((cc) => cc.canView)
            .map<MenuItem>((cc) => {
              const nestedMeta =
  // prefer full path; fall back to short key; then fallback to generated route
  STATIC_LEAVES[`${mod.name}>>${child.name}>>${cc.name}`] ??
  STATIC_LEAVES[`${mod.name}>>${cc.name}`] ??
  ({
    route: `/${kebab(mod.name)}/${kebab(child.name)}/${kebab(cc.name)}`,
    icon: 'none',
    svg_location: '',
  } as RouteIcon)


              return {
                name: cc.name,
                route: nestedMeta.route,
                icon: (nestedMeta.icon as string) ?? 'none',
                svg_location: (nestedMeta.svg_location as string) ?? '',
              }
            })

          if (subLeaves.length) {
            childItem.submenu = subLeaves
          }
        }

        ;(moduleItem.submenu as MenuItem[]).push(childItem)
      })

      // Show the module only if it has at least one visible child
      if ((moduleItem.submenu?.length || 0) > 0) {
        group.menu.push(moduleItem)
      }
    })

  return ensureHome([group])
}


/**
 * 4) PUBLIC APIS
 *
 * - getMenusByRoleSync: original behavior (used for all roles except operator,
 *   and as a fallback in case dynamic fetch fails).
 * - getMenusByRoleAsync: for roleId 6 fetches dynamic menu, otherwise returns static.
 */

export const getMenusByRoleSync = (roleId: number): MenuGroup[] => {
  const allowed = roleAccess[String(roleId)]
  const nestedAllowed = roleNestedAccess[String(roleId)]
  if (!allowed) return []

  return allMenus.map((group) => {
    const filteredMenuItems = group.menu
      // keep only modules/menus explicitly listed for this role
      .filter((item) => Object.prototype.hasOwnProperty.call(allowed, item.name))
      .map((item) => {
        const allowedSubmenus = allowed[item.name] || []

        // keep only allowed 2nd-level submenus
        const filteredSubmenu = item.submenu
          ? item.submenu
              .filter((sub) => allowedSubmenus.includes(sub.name))
            .map((sub) => {
              // Check if we have nested filtering rules for this role and menu combination
              if (nestedAllowed && nestedAllowed[item.name] && nestedAllowed[item.name][sub.name]) {
                const allowedNestedItems = nestedAllowed[item.name][sub.name]
                // Filter 3rd-level items based on the nested access rules
                if (sub.submenu?.length) {
                  const filteredNestedSubmenu = sub.submenu.filter((nestedSub) =>
                    allowedNestedItems.includes(nestedSub.name)
                  )
                  return { ...sub, submenu: filteredNestedSubmenu }
                }
                return sub
              } else {
                // Original behavior: If a 2nd-level submenu is allowed, include ALL its 3rd-level children as-is.

                if (sub.submenu?.length) {
                  return { ...sub, submenu: [...sub.submenu] }
                }
                return sub
              }
      })
          : undefined

        return {
          ...item,
          submenu: filteredSubmenu,
        }
      })

    return {
      ...group,
      menu: filteredMenuItems,
    }
  })
}


// small local cache to avoid flicker after login
let operatorMenuCache: MenuGroup[] | null = null

export const getMenusByRoleAsync = async (
  roleId: number,
  opts?: { token?: string }
): Promise<MenuGroup[]> => {
  if (roleId !== 6) {
    return getMenusByRoleSync(roleId)
  }

  if (operatorMenuCache) return operatorMenuCache

  try {
    // Pass token if you have it (same style as other API helpers)
    const data = await getMenusTree({ token: opts?.token })
    const mapped = ensureHome(mapApiTreeToMenuGroups(data))
    operatorMenuCache = mapped
    return mapped
  } catch {
    // Fallback to static if anything goes wrong
    return getMenusByRoleSync(6)
  }
}



// export const getMenusByRole = (roleId: number): MenuGroup[] => {
//   const allowed = roleAccess[roleId]
//   if (!allowed) return []

//   return allMenus.map((group) => {
//     const filteredMenuItems = group.menu
//       .filter((item) => allowed.hasOwnProperty(item.name))
//       .map((item) => {
//         const allowedSubmenus = allowed[item.name]
//         const filteredSubmenu = item.submenu
//           ? item.submenu.filter((sub) => allowedSubmenus.includes(sub.name))
//           : undefined

//         return {
//           ...item,
//           submenu: filteredSubmenu,
//         }
//       })

//     return {
//       ...group,
//       menu: filteredMenuItems,
//     }
//   })
// }

// Back-compat: older code imports getMenusByRole from this module
export const getMenusByRole = getMenusByRoleSync
