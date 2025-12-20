import React, { useState, useMemo, useRef, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { getMenusByRole } from '../../../../myMenus'
import type { MenuGroup, MenuItem } from '../../../../_metronic/layout/components/sidebar/sidebar-menu/types'
import { getUserMenusTree, putBulkAcl, type MenuTreeNode } from '../core/_requests'

import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { getOperators, createOperator, updateOperator, getCompanyAdminList } from '../core/_requests'
import type { Operator, CompanyAdmin } from '../core/_models'
// ✅ Use the same auth source as the rest of the app
import { useAuth } from '../../auth'

// Robust role & CGA resolvers that work with your various shapes
const computeRoleId = (u: any): number => {
  if (!u) return 0
  // common shapes you use
  const fromUid =
    typeof u?.uid?.role === 'number' ? u.uid.role : u?.uid?.role?.id
  const fromTop =
    typeof u?.role === 'number' ? u.role : u?.role?.id
  const fallback = u?.roleId

  const id = fromUid ?? fromTop ?? fallback ?? 0
  const n = Number(id)
  return Number.isFinite(n) ? n : 0
}

const computeCgaId = (u: any): number | null => {
  if (!u) return null
  // Prefer explicit CGA fields, then your roleEntityId (often CGA for role 5)
  const id =
    u?.companyGroupAdminId ??
    u?.companyGroupAdmin?.id ??
    u?.cga?.id ??
    u?.cgaid?.id ??
    (u?.role?.id === 5 ? u?.roleEntityId : null)

  if (id == null) return null
  const n = Number(id)
  return Number.isFinite(n) ? n : null
}

// Try hard to find a company *username/slug* by id or from the current auth object.
// Works even if /company-group-admins API isn't available to this role.
const resolveCompanySlug = (
  companyGroupAdminId: number | null | undefined,
  companyAdmins: any[],
  currentUser: any
): string | null => {
  if (companyGroupAdminId == null) return null
  const cgaId = Number(companyGroupAdminId)

  // 1) From the loaded companyAdmins (Superadmin context)
  const hit = companyAdmins?.find?.((c: any) => Number(c?.id) === cgaId)
  const fromList =
    hit?.uid?.username ??
    hit?.username ??
    null
  if (fromList && typeof fromList === 'string') return fromList

  // 2) From currentUser shapes (Company contexts)
  //   common shapes you've used across the app
  const fromAuth =
    currentUser?.companyGroupAdmin?.uid?.username ??
    currentUser?.companyGroupAdmin?.username ??
    currentUser?.uid?.username ?? // sometimes CGA is the signed-in
    null
  if (fromAuth && typeof fromAuth === 'string') return fromAuth

  // 3) Absolute last fallback – sanitize roleEntityName/name into a slug
  const raw =
    currentUser?.roleEntityName ??
    currentUser?.companyGroupAdmin?.name ??
    currentUser?.name ??
    ''
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '') // keep safe chars
  }

  return null
}

// put near top of UserManagement.tsx (REPLACE THIS WHOLE BLOCK)
type RoleLike = { id?: number; roleName?: string } | number | null | undefined
type CurrentUserLike = {
  // shapes we saw across app/auth
  uid?: { role?: { id?: number } | number | null } | null
  role?: { id?: number; roleName?: string } | null
  roleId?: number | null
  roleEntityId?: number | null

  // CGA variants
  companyGroupAdminId?: number | null
  cga?: { id?: number | null } | null
  cgaid?: { id?: number | null } | null
  companyGroupAdmin?: { id?: number | null } | null
  companyAdminId?: number | null
}

// replace with your real selector/useAuth later
const getCurrentUser = (): CurrentUserLike | null => {
  try {
    const raw = localStorage.getItem('auth') || localStorage.getItem('currentUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// Robust role resolver: tries multiple shapes
const getRoleId = (u: CurrentUserLike | null): number => {
  if (!u) return 0
  // common shapes
  const fromUid = typeof (u.uid as any)?.role === 'number'
    ? (u.uid as any).role
    : (u.uid as any)?.role?.id

  const fromTop = typeof (u.role as any) === 'number'
    ? (u.role as any)
    : u.role?.id

  return Number(fromUid ?? fromTop ?? u.roleId ?? 0) || 0
}

// Robust CGA resolver: companyGroupAdminId when company; null for superadmin
const getCgaId = (u: CurrentUserLike | null): number | null => {
  if (!u) return null
  return (
    u.companyGroupAdminId ??
    u.companyGroupAdmin?.id ??
    (u as any)?.cgaid?.id ??
    (u as any)?.cga?.id ??
    null
  )
}

  // Username rules:
// - 3–32 chars
// - starts with a letter
// - letters, numbers, dot, underscore, hyphen
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9._-]{2,31}$/

const usernameExists = (uname: string, all: Operator[]) =>
  all.some(o => (o?.username || '').toLowerCase() === uname.toLowerCase())

const suggestUsername = (fullName: string, taken: Set<string>) => {
  const base = fullName.trim().toLowerCase()
    .replace(/[^a-z0-9\s.-]/g, '')
    .replace(/\s+/g, '.')
    .replace(/^\.+|\.+$/g, '')
  let u = base.replace(/^[^a-z]+/,'') || 'user'
  if (!/^[a-z]/.test(u)) u = 'u-' + u
  u = u.slice(0, 16)
  let n = 0, candidate = u
  while (taken.has(candidate)) {
    n += 1
    candidate = `${u}${n}`
    if (candidate.length > 32) candidate = candidate.slice(0, 32)
  }
  return candidate
}

// Password validator:
// - ≥ 7 chars
// - includes: upper, lower, digit, special
// - no spaces
// - must not contain user's name or email local part
const validatePassword = (pwd: string, ctx: {name?: string; email?: string}) => {
  const errors: string[] = []
  if (pwd.length < 7) errors.push('At least 7 characters')
  if (!/[a-z]/.test(pwd)) errors.push('One lowercase letter')
  if (!/[A-Z]/.test(pwd)) errors.push('One uppercase letter')
  if (!/[0-9]/.test(pwd)) errors.push('One number')
  if (!/[^\w\s]/.test(pwd)) errors.push('One special character')
  if (/\s/.test(pwd)) errors.push('No spaces')
  const local = (ctx.email || '').split('@')[0]?.toLowerCase() || ''
  const nameChunks = (ctx.name || '').toLowerCase().split(/\s+/).filter(Boolean)
  const hay = pwd.toLowerCase()
  if (local && local.length >= 3 && hay.includes(local)) errors.push('Must not include your email')
  if (nameChunks.some(n => n.length >= 3 && hay.includes(n))) errors.push('Must not include your name')
  return { ok: errors.length === 0, errors }
}


interface User {
  id: number
  userId?: number | null
  name: string
  dateOfBirth: string
  email: string
  mobile: string
  username: string
  password: string
  /** Superadmin-only column (derived): */
  companyName?: string
}


interface NewUser {
  name: string
  dateOfBirth: string
  email: string
  mobile: string
  username: string
  password: string
  confirmPassword: string
}

interface MenuStructure {
  [key: string]: {
    menus: string[]
    submenus: {
      [key: string]: string[]
    }
  }
}

interface PermissionSet {
  view: boolean
  add: boolean
  edit: boolean
  delete: boolean
  approve: boolean
}

interface Permissions {
  [key: string]: PermissionSet
}

interface SearchResult {
  type: 'module' | 'menu' | 'submenu'
  moduleName: string
  menuName: string | null
  submenuName: string | null
  key: string
}

type ApiLevel = 'MODULE' | 'MENU' | 'SUBMENU'
interface ApiMenuNode {
  level: ApiLevel
  id: number
  name: string
  sortOrder: number | null
  canView: boolean
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
  children: ApiMenuNode[]
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([])
const [loading, setLoading] = useState<boolean>(false)
const { currentUser } = useAuth()
const roleId = React.useMemo(() => computeRoleId(currentUser), [currentUser])
const myCompanyGroupAdminId = React.useMemo(() => computeCgaId(currentUser), [currentUser])

// 👉 Extra helpers for operator flavors
const isOperator = roleId === 6
const isSuperadminOperator = isOperator && (myCompanyGroupAdminId == null)
const isCompanyOperator = isOperator && (myCompanyGroupAdminId != null)

// We need to disable "User Permissions" button for self
// roleEntityId in your payload matches the "user.id" (what we later map into row.userId)
// We need to disable "User Permissions" button for self
// roleEntityId == operatorId (for operators)
// also try to resolve your "app user id" for safety
const myOperatorId = React.useMemo(() => {
  const v = (currentUser as any)?.roleEntityId
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}, [currentUser])

const myAppUserId = React.useMemo(() => {
  // try common shapes seen across your auth
  const v =
    (currentUser as any)?.user?.id ??
    (currentUser as any)?.uid?.id ??
    (currentUser as any)?.id ??
    null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}, [currentUser])

// Only OPERATORS are blocked from opening their own permissions.
// Superadmin (and others) can open any operator.
const isSelfRow = React.useCallback((row: User) => {
  if (roleId !== 6) return false // self-guard only for operators

  const rowOperatorId = Number(row.id)
  const rowUserId = row.userId != null ? Number(row.userId) : null

  const opMatch =
    myOperatorId != null &&
    Number.isFinite(rowOperatorId) &&
    rowOperatorId === myOperatorId

  const userMatch =
    myAppUserId != null &&
    rowUserId != null &&
    rowUserId === myAppUserId

  return !!(opMatch || userMatch)
}, [roleId, myOperatorId, myAppUserId])




  const [showAddUserForm, setShowAddUserForm] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  type NewCreds = { username: string; password: string; loginUrl: string }
  const [newCredentials, setNewCredentials] = useState<NewCreds | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedPasswords, setCopiedPasswords] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })
  
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    dateOfBirth: '',
    email: '',
    mobile: '',
    username: '',
  password: '',
  confirmPassword: '',
  })

  // Permissions Modal State
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedMenu, setSelectedMenu] = useState('');
  const [selectedSubmenu, setSelectedSubmenu] = useState('');
  const [permissions, setPermissions] = useState<Permissions>({});
  const [selectedMenus, setSelectedMenus] = useState<Set<string>>(new Set());
  const [selectedSubmenus, setSelectedSubmenus] = useState<Set<string>>(new Set());
  const [permissionSearchTerm, setPermissionSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

// Dynamic menuStructure from API (with static fallback)
const [menuStructure, setMenuStructure] = useState<MenuStructure>({})
const [menuLoading, setMenuLoading] = useState<boolean>(false)
const [menuError, setMenuError] = useState<string>('')


const [allOperators, setAllOperators] = useState<Operator[]>([]) // for global username check
const [creating, setCreating] = useState(false)

const [showPwd, setShowPwd] = useState(false)
const [showConfirmPwd, setShowConfirmPwd] = useState(false)

// SUPERADMIN helpers
const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([])
type AssignTarget = 'superadmin' | 'company'
const [assignTarget, setAssignTarget] = useState<AssignTarget>('superadmin') // only used by roleId===1
const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)

// Maps "Module-Menu" / "Module-Menu-Submenu" -> ids needed by API
const [keyIdMap, setKeyIdMap] = useState<Record<string, {
  moduleId: number
  menuId: number | null
  submenuId: number | null
  subsubmenuId: number | null
}>>({})


// For diffing: the permission flags when we fetched the tree
const [baselinePermissions, setBaselinePermissions] = useState<Permissions>({})

const takenUsernames = useMemo(
  () => new Set(allOperators.map(o => (o.username || '').toLowerCase())),
  [allOperators]
)

console.log('currentUser:', currentUser)
console.log('roleId:', roleId, 'cgaId:', myCompanyGroupAdminId)

// REUSABLE: load & map operators based on current role
const loadOperators = async () => {
  setLoading(true)
  try {
    const ops = await getOperators()
    setAllOperators(ops)

// role-based filtering
let filtered: Operator[] = ops

if (roleId === 1 || isSuperadminOperator) {
  // SUPERADMIN or an OPERATOR created under Superadmin: see ALL operators
  filtered = ops
} else if ((roleId === 5 && myCompanyGroupAdminId != null) || isCompanyOperator) {
  // COMPANY_GROUP_ADMIN or OPERATOR under a company: see ONLY their company users
  const cga = Number(myCompanyGroupAdminId)
  filtered = ops.filter(o => Number(o.companyGroupAdminId) === cga)
} else {
  // other roles: nothing
  filtered = []
}


    // Map Operator -> UI row
const companyById = new Map<number, string>(
  companyAdmins.map(c => [
    Number(c.id),
    String(c.name || c.uid?.username || `#${c.id}`),
  ])
)

const showCompanyCol = (roleId === 1 || isSuperadminOperator)

const mapped: User[] = filtered.map((o) => {
  const dob = o.date_of_birth ? o.date_of_birth.split('T')[0] : '' // "YYYY-MM-DD"
  const companyName =
    showCompanyCol
      ? (o.companyGroupAdminId != null
          ? (companyById.get(Number(o.companyGroupAdminId)) || `#${o.companyGroupAdminId}`)
          : '— Superadmin —')
      : undefined

  return {
    id: o.id,
userId: (() => {
  const raw = (o as any).userId ?? (o as any)?.user?.id ?? null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})(),
    name: o.name || o.username,
    dateOfBirth: dob,
    email: o.email || '',
    mobile: o.contact_no || '',
    username: o.username,
    password: o.password || '',
    companyName,
  }
})


    setUsers(mapped)
  } catch (e: any) {
    toast.error(e?.message || 'Failed to load users', { position: 'top-center' })
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  if ((roleId === 1 || isSuperadminOperator) && companyAdmins.length) {
    // re-map to include proper company names once we have them
    loadOperators()
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [companyAdmins])


useEffect(() => {
  loadOperators()
  // If Superadmin OR Superadmin's Operator, also load companies (for dropdown + name mapping)
  if (roleId === 1 || isSuperadminOperator) {
    getCompanyAdminList()
      .then(setCompanyAdmins)
      .catch((e: any) => {
        toast.error(e?.message || 'Failed to fetch companies', { position: 'top-center' })
        setCompanyAdmins([])
      })
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [roleId, myCompanyGroupAdminId, isSuperadminOperator])



useEffect(() => {
  if (!newUser.name) return
  if (!newUser.username) {
    const s = suggestUsername(newUser.name, takenUsernames)
    setNewUser(u => ({...u, username: s}))
  }
}, [newUser.name]) // eslint-disable-line


// useEffect(() => {
//   // Transform API nodes -> MenuStructure
//   const buildFromApi = (nodes: MenuTreeNode[] | MenuTreeNode): MenuStructure => {
//     const root: MenuTreeNode[] = Array.isArray(nodes) ? nodes : [nodes]
//     const out: MenuStructure = {}

//     root
//       .filter((m) => m.level === 'MODULE')
//       .forEach((mod) => {
//         const moduleName = mod.name
//         const menus: string[] = []
//         const submenus: Record<string, string[]> = {}

//         ;(mod.children || [])
//           .filter((c) => c.level === 'MENU' && c.canView)
//           .forEach((menuNode) => {
//             menus.push(menuNode.name)

//             const visibleSubs = (menuNode.children || []).filter((s) => s.canView)
//             if (visibleSubs.length > 0) {
//               submenus[menuNode.name] = visibleSubs.map((s) => s.name)
//             }
//           })

//         if (menus.length > 0) {
//           out[moduleName] = { menus, submenus }
//         }
//       })

//     return out
//   }

//   // Fallback: use your static menu map (role 1) exactly like before
//   const buildFromStatic = (): MenuStructure => {
//     try {
//       const allMenus: MenuGroup[] = getMenusByRole(1)
//       const struct: MenuStructure = {}

//       if (allMenus.length > 0) {
//         allMenus[0].menu.forEach((menuItem: MenuItem) => {
//           const moduleName = menuItem.name
//           const menus: string[] = []
//           const submenus: Record<string, string[]> = {}

//           if (menuItem.submenu && menuItem.submenu.length > 0) {
//             menuItem.submenu.forEach((submenuItem: MenuItem) => {
//               menus.push(submenuItem.name)
//               if (submenuItem.submenu && submenuItem.submenu.length > 0) {
//                 submenus[submenuItem.name] = submenuItem.submenu.map((nestedSub: MenuItem) => nestedSub.name)
//               }
//             })
//           }

//           struct[moduleName] = { menus, submenus }
//         })
//       }

//       return struct
//     } catch {
//       return {}
//     }
//   }

//   const load = async () => {
//     setMenuLoading(true)
//     setMenuError('')

//     try {
//       // If you have an auth token available, pass it: getMenusTree({ token })
//       const data = await getMenusTree()
//       const struct = buildFromApi(data)
//       setMenuStructure(Object.keys(struct).length ? struct : buildFromStatic())
//     } catch (err: any) {
//       setMenuError(err?.message || 'Failed to load menus')
//       setMenuStructure(buildFromStatic())
//     } finally {
//       setMenuLoading(false)
//     }
//   }

//   load()
// }, [])

const handleCreateUser = async () => {
  const { name, email, mobile, dateOfBirth, username, password, confirmPassword } = newUser

  // light checks
if (!/^\S+@\S+\.\S+$/.test(email)) {
  toast.error('Please enter a valid email address', { position: 'top-center' })
  return
}
if (!/^\d{7,15}$/.test(mobile)) {
  toast.error('Phone must be 7–15 digits', { position: 'top-center' })
  return
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
  toast.error('Please pick a valid date of birth', { position: 'top-center' })
  return
}

  // required fields
  if (!name || !email || !mobile || !dateOfBirth) {
    toast.error('Please fill all required fields', { position: 'top-center' })
    return
  }

  // username rules
  if (!USERNAME_REGEX.test(username)) {
    toast.error('Username must start with a letter and use 3–32 letters/numbers/._-', { position: 'top-center' })
    return
  }

  // live availability
  if (usernameExists(username, allOperators)) {
    toast.error('Username already exists. Please choose another.', { position: 'top-center' })
    return
  }

  // password rules
  const pw = validatePassword(password, { name, email })
  if (!pw.ok) {
    toast.error(`Weak password:\n• ${pw.errors.join('\n• ')}`, { position: 'top-center' })
    return
  }

  if (password !== confirmPassword) {
    toast.error('Passwords do not match', { position: 'top-center' })
    return
  }

// role-based IDs (as per your rules)
let companyAdminId: number | null = null // always null for operator creation
let companyGroupAdminId: number | null = null

if (roleId === 1 || isSuperadminOperator) {
  // SUPERADMIN: choose under Superadmin OR under a company
  if (assignTarget === 'superadmin') {
    companyGroupAdminId = null
  } else {
    if (!selectedCompanyId) {
      toast.error('Please select a company for this user.', { position: 'top-center' })
      return
    }
    companyGroupAdminId = Number(selectedCompanyId)
  }
} else if (roleId === 5 || isCompanyOperator) {
  // COMPANY_GROUP_ADMIN: send their CGA id
  companyGroupAdminId = myCompanyGroupAdminId != null ? Number(myCompanyGroupAdminId) : null
  if (companyGroupAdminId == null) {
    toast.error('Missing company group admin id for this user.', { position: 'top-center' })
    return
  }
} else {
  toast.error('This role cannot create operators.', { position: 'top-center' })
  return
}


  try {
    setCreating(true)
    // 🔥 actually hit API
    const created = await createOperator({
      username,
      password,
      name,
      email,
      contact_no: mobile,
      date_of_birth: `${dateOfBirth}T00:00:00`,
      companyAdminId,
      companyGroupAdminId,
    })

    // 🔄 FULL REFRESH from server (no local append) so table is dynamic & source of truth
    await loadOperators()

    // decide the login URL now (superadmin -> /auth, company -> /auth/<slug>)
const BASE = 'https://uat.elecmeksolutions.com/auth'
let loginUrl = BASE

if (companyGroupAdminId != null) {
  const slug = resolveCompanySlug(companyGroupAdminId, companyAdmins, currentUser)
  if (slug) loginUrl = `${BASE}/${slug}`
}

    // keep credentials available in the success modal
setNewCredentials({ username, password, loginUrl })
setShowAddUserForm(false)
setShowCredentialsModal(true)

    // reset form
    setNewUser({
      name: '',
      dateOfBirth: '',
      email: '',
      mobile: '',
      username: '',
      password: '',
      confirmPassword: '',
    })

    toast.success('User created!', { position: 'top-center' })
  } catch (e: any) {
    toast.error(e?.message || 'Failed to create user', { position: 'top-center' })
  } finally {
    setCreating(false)
  }
}

const saveUserEdits = async (row: User, newName: string) => {
  try {
    // we don’t know password here; send existing (or a blank if backend allows)
    await updateOperator(row.id, {
      username: row.username,
      password: 'Secret@123', // or keep an input to reset; API requires a password in sample
      name: newName,
      companyAdminId: roleId === 1 ? null : null,
      companyGroupAdminId: roleId === 5 ? (myCompanyGroupAdminId != null ? Number(myCompanyGroupAdminId) : null) : null,
    })
    setUsers(prev => prev.map(u => (u.id === row.id ? { ...u, name: newName } : u)))
    toast.success('User updated', { position: 'top-center' })
  } catch (e: any) {
    toast.error(e?.message || 'Failed to update user', { position: 'top-center' })
  }
}
  
  const searchInPermissions = (searchValue: string) => {
    if (!searchValue.trim()) {
      setFilteredResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const searchLower = searchValue.toLowerCase();

    Object.keys(menuStructure).forEach(moduleName => {
      const moduleData = menuStructure[moduleName];
      
      
      if (moduleName.toLowerCase().includes(searchLower)) {
        results.push({
          type: 'module',
          moduleName,
          menuName: null,
          submenuName: null,
          key: moduleName
        });
      }

      moduleData.menus.forEach((menuName: string) => {
       
        if (menuName.toLowerCase().includes(searchLower)) {
          results.push({
            type: 'menu',
            moduleName,
            menuName,
            submenuName: null,
            key: `${moduleName}-${menuName}`
          });
        }

        
        const submenus = moduleData.submenus[menuName] || [];
        submenus.forEach((submenuName: string) => {
          if (submenuName.toLowerCase().includes(searchLower)) {
            results.push({
              type: 'submenu',
              moduleName,
              menuName,
              submenuName,
              key: `${moduleName}-${menuName}-${submenuName}`
            });
          }
        });
      });
    });

    setFilteredResults(results);
  };

  const scrollToResult = (key: string) => {
    const element = document.getElementById(`row-${key}`);
    if (element && tableRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      element.style.backgroundColor = '#fff3cd';
      setTimeout(() => {
        element.style.backgroundColor = '';
      }, 2000);
    }
  };

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} style={{ backgroundColor: '#ffeb3b', fontWeight: 'bold' }}>
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const shouldShowRow = (moduleName: string, menuName: string, submenuName?: string) => {
    if (!permissionSearchTerm.trim()) return true;
    
    const searchLower = permissionSearchTerm.toLowerCase();
    return (
      moduleName.toLowerCase().includes(searchLower) ||
      menuName.toLowerCase().includes(searchLower) ||
      (submenuName && submenuName.toLowerCase().includes(searchLower))
    );
  };

  
  useEffect(() => {
    searchInPermissions(permissionSearchTerm);
  }, [permissionSearchTerm, menuStructure]);

  // Build the UI lists (module->menus->submenus) from API nodes (show ALL, ignore canView filter)
const buildMenuStructureFromOperatorTree = (nodes: MenuTreeNode[]): MenuStructure => {
  const out: MenuStructure = {}
  nodes
    .filter(n => n.level === 'MODULE')
    .forEach(mod => {
      const moduleName = mod.name
      const menus: string[] = []
      const submenus: Record<string, string[]> = {}

      ;(mod.children || [])
        .filter(c => c.level === 'MENU')
        .forEach(menuNode => {
          menus.push(menuNode.name)

          const subs = (menuNode.children || []).filter(s => s.level === 'SUBMENU')
          if (subs.length > 0) {
            submenus[menuNode.name] = subs.map(s => s.name)
          }
        })

      out[moduleName] = { menus, submenus }
    })
  return out
}

// returns true if any permission is true
const anyPermTrue = (n: Pick<MenuTreeNode,'canView'|'canAdd'|'canEdit'|'canDelete'>) =>
  !!(n.canView || n.canAdd || n.canEdit || n.canDelete)

// Preselect menus/submenus and permission checkboxes from operator tree
// Also build a key->ids map for the API (now includes MODULE->moduleId as well)
const buildSelectionsFromOperatorTree = (nodes: MenuTreeNode[]) => {
  const permissions: Permissions = {}
  const selectedMenus = new Set<string>()
  const selectedSubmenus = new Set<string>()
  const ids: Record<string, { moduleId: number; menuId: number | null; submenuId: number | null; subsubmenuId: number | null }> = {}

  nodes.filter(n => n.level === 'MODULE').forEach(mod => {
    const moduleKey = `${mod.name}`

    // Map MODULE key -> ids
    ids[moduleKey] = {
      moduleId: mod.id,
      menuId: null,
      submenuId: null,
      subsubmenuId: null,
    }

    ;(mod.children || []).filter(m => m.level === 'MENU').forEach(menuNode => {
      const menuKey = `${mod.name}-${menuNode.name}`
      const menuSelfAny = anyPermTrue(menuNode)

      // Map MENU key -> ids
      ids[menuKey] = {
        moduleId: mod.id,
        menuId: menuNode.id,
        submenuId: null,
        subsubmenuId: null,
      }

      // Submenus
      const subs = (menuNode.children || []).filter(s => s.level === 'SUBMENU')
      let anyChild = false

      subs.forEach(sub => {
        const subKey = `${mod.name}-${menuNode.name}-${sub.name}`
        const subAny = anyPermTrue(sub)
        if (subAny) selectedSubmenus.add(subKey)

        // Map SUBMENU key -> ids
        ids[subKey] = {
          moduleId: mod.id,
          menuId: menuNode.id,
          submenuId: sub.id,
          subsubmenuId: null, // not provided by tree yet
        }

        permissions[subKey] = {
          view: !!sub.canView,
          add: !!sub.canAdd,
          edit: !!sub.canEdit,
          delete: !!sub.canDelete,
          approve: false,
        }
        anyChild = anyChild || subAny
      })

      if (subs.length === 0) {
        if (menuSelfAny) selectedMenus.add(menuKey)
        permissions[menuKey] = {
          view: !!menuNode.canView,
          add: !!menuNode.canAdd,
          edit: !!menuNode.canEdit,
          delete: !!menuNode.canDelete,
          approve: false,
        }
      } else {
        if (anyChild || menuSelfAny) selectedMenus.add(menuKey)
      }
    })
  })

  return { permissions, selectedMenus, selectedSubmenus, ids }
}




  // Permissions Modal Functions
const openPermissionsModal = async (user: User) => {
  if (isSelfRow(user)) {
    toast.info('You cannot modify your own permissions.', { position: 'top-center' })
    return
  }

  setSelectedUser(user)
  setSelectedModule('')
  setSelectedMenu('')
  setSelectedSubmenu('')
  setPermissions({})
  setSelectedMenus(new Set())
  setSelectedSubmenus(new Set())
  setPermissionSearchTerm('')
  setFilteredResults([])
  setShowPermissionsModal(true)

  // Must have a userId to call /menus/tree/{userId}
  if (!user.userId) {
    toast.error('This record has no linked userId. Cannot load permissions.', { position: 'top-center' })
    setMenuStructure({})
    return
  }

  try {
    setMenuLoading(true)
    setMenuError('')

    // 1) Load user-specific tree
    const tree = await getUserMenusTree(user.userId)

    // 2) Build the UI structure (show ALL nodes)
    const struct = buildMenuStructureFromOperatorTree(tree)
    setMenuStructure(struct)

    // 3) Preselect + capture ids + baseline
const { permissions, selectedMenus, selectedSubmenus, ids } = buildSelectionsFromOperatorTree(tree)
setPermissions(permissions)
setBaselinePermissions(permissions)   // keep a copy for diff after save
setSelectedMenus(selectedMenus)
setSelectedSubmenus(selectedSubmenus)
setKeyIdMap(ids)

  } catch (err: any) {
    setMenuError(err?.message || 'Failed to load permissions')
    toast.error(err?.message || 'Failed to load permissions', { position: 'top-center' })
    setMenuStructure({})
  } finally {
    setMenuLoading(false)
  }
}


  const closePermissionsModal = () => {
    setShowPermissionsModal(false);
    setSelectedUser(null);
    setSelectedModule('');
    setSelectedMenu('');
    setSelectedSubmenu('');
    setPermissions({});
    setSelectedMenus(new Set());
    setSelectedSubmenus(new Set());
    setPermissionSearchTerm('');
    setFilteredResults([]);
  }

  const handleModuleChange = (module: string) => {
    setSelectedModule(module);
    setSelectedMenu('');
    setSelectedSubmenu('');
  }

  const handleMenuChange = (menu: string) => {
    setSelectedMenu(menu);
    setSelectedSubmenu('');
  }

  const handleSubmenuChange = (submenu: string) => {
    setSelectedSubmenu(submenu);
  }

  const handlePermissionChange = (itemKey: string, permissionType: keyof PermissionSet, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [itemKey]: {
        view: prev[itemKey]?.view || false,
        add: prev[itemKey]?.add || false,
        edit: prev[itemKey]?.edit || false,
        delete: prev[itemKey]?.delete || false,
        approve: prev[itemKey]?.approve || false,
        [permissionType]: checked
      }
    }));
  }

  const handleMenuSelection = (moduleName: string, menuName: string, checked: boolean) => {

    if (!moduleName && menuName) {
     
      const moduleKey = menuName;
      const newSelectedMenus = new Set(selectedMenus);
      
      if (checked) {
        newSelectedMenus.add(moduleKey);
      } else {
        newSelectedMenus.delete(moduleKey);
      }
      
      setSelectedMenus(newSelectedMenus);
      return;
    }
    
    
    const menuKey = `${moduleName}-${menuName}`;
    const newSelectedMenus = new Set(selectedMenus);
    
    if (checked) {
      newSelectedMenus.add(menuKey);
    } else {
      newSelectedMenus.delete(menuKey);
      
      const moduleData = menuStructure[moduleName];
      if (moduleData && moduleData.submenus[menuName]) {
        const submenus = moduleData.submenus[menuName];
        const newSelectedSubmenus = new Set(selectedSubmenus);
        submenus.forEach((submenu: string) => {
          const submenuKey = `${moduleName}-${menuName}-${submenu}`;
          newSelectedSubmenus.delete(submenuKey);
        });
        setSelectedSubmenus(newSelectedSubmenus);
      }
    }
    
    setSelectedMenus(newSelectedMenus);
  }

  const handleSubmenuSelection = (moduleName: string, menuName: string, submenuName: string, checked: boolean) => {
    const submenuKey = `${moduleName}-${menuName}-${submenuName}`;
    const menuKey = `${moduleName}-${menuName}`;
    const newSelectedSubmenus = new Set(selectedSubmenus);
    const newSelectedMenus = new Set(selectedMenus);
    
    if (checked) {
      newSelectedSubmenus.add(submenuKey);
      
      newSelectedMenus.add(menuKey);
    } else {
      newSelectedSubmenus.delete(submenuKey);
    }
    
    setSelectedSubmenus(newSelectedSubmenus);
    setSelectedMenus(newSelectedMenus);
  }

  const validatePermissions = () => {
    if (selectedMenus.size === 0) {
      toast.error('Please select at least one menu', {
        position: 'top-center'
      });
      return false;
    }
    for (const menuKey of Array.from(selectedMenus)) {
      const [moduleName, menuName] = menuKey.split('-');
      const moduleData = menuStructure[moduleName];
      const hasSubmenus = moduleData && moduleData.submenus[menuName] && moduleData.submenus[menuName].length > 0;
      
      if (hasSubmenus) {
       
        const hasSelectedSubmenu = moduleData.submenus[menuName].some(submenuName => {
          const submenuKey = `${moduleName}-${menuName}-${submenuName}`;
          return selectedSubmenus.has(submenuKey);
        });
        
        if (!hasSelectedSubmenu) {
          toast.error(`Please select at least one submenu for ${menuName}`, {
            position: 'top-center'
          });
          return false;
        }
      } else {
        
        const menuPermissions = permissions[menuKey];
        if (!menuPermissions || (!menuPermissions.view && !menuPermissions.add && !menuPermissions.edit && !menuPermissions.delete && !menuPermissions.approve)) {
          toast.error(`Please select at least one permission for ${menuName}`, {
            position: 'top-center'
          });
          return false;
        }
      }
    }

    
    for (const submenuKey of Array.from(selectedSubmenus)) {
      const submenuPermissions = permissions[submenuKey];
      if (!submenuPermissions || (!submenuPermissions.view && !submenuPermissions.add && !submenuPermissions.edit && !submenuPermissions.delete && !submenuPermissions.approve)) {
        const [moduleName, menuName, submenuName] = submenuKey.split('-');
        toast.error(`Please select at least one permission for ${submenuName}`, {
          position: 'top-center'
        });
        return false;
      }
    }

    return true;
  }

  const savePermissions = async () => {
  if (!validatePermissions()) return
  if (!selectedUser?.userId) {
    toast.error('Missing userId for ACL update', { position: 'top-center' })
    return
  }

  // 1) Build the final permission map (menus + submenus) and promote ancestors
const finalPermissions: Permissions = {}

// collect explicit selections
selectedMenus.forEach(menuKey => {
  finalPermissions[menuKey] = permissions[menuKey] || {
    view: false, add: false, edit: false, delete: false, approve: false
  }
})
selectedSubmenus.forEach(subKey => {
  finalPermissions[subKey] = permissions[subKey] || {
    view: false, add: false, edit: false, delete: false, approve: false
  }
})

// helper to ensure a key exists and has view=true
const ensureViewTrue = (obj: Permissions, key: string) => {
  const base = obj[key] || { view: false, add: false, edit: false, delete: false, approve: false }
  obj[key] = { ...base, view: true }
}

// Promote ancestors:
// - for "Module-Menu-Submenu" promote "Module-Menu" and "Module" with view:true
// - for "Module-Menu" promote "Module" with view:true
const keys = Object.keys(finalPermissions)
keys.forEach(key => {
  const parts = key.split('-')
  if (parts.length === 3) {
    const [moduleName, menuName] = parts
    const menuKey = `${moduleName}-${menuName}`
    const moduleKey = `${moduleName}`

    ensureViewTrue(finalPermissions, menuKey)
    ensureViewTrue(finalPermissions, moduleKey)
  } else if (parts.length === 2) {
    const [moduleName] = parts
    const moduleKey = `${moduleName}`
    ensureViewTrue(finalPermissions, moduleKey)
  }
})

// Also: if the user checked a submenu directly in the UI (common),
// make sure its own view is true (even if they only ticked add/edit/delete)
Object.entries(finalPermissions).forEach(([k, p]) => {
  if (k.split('-').length >= 2) {
    // if any granular perm is true, make view true for consistency
    if (p.add || p.edit || p.delete || p.approve) {
      finalPermissions[k] = { ...p, view: true }
    }
  }
})


  // 2) Translate to API ACLs using our keyIdMap
  const acls = Object.entries(finalPermissions)
  .map(([key, p]) => {
    const ids = keyIdMap[key]
    if (!ids) return null
    return {
      moduleId: ids.moduleId,
      menuId: ids.menuId,
      submenuId: ids.submenuId,
      subsubmenuId: ids.subsubmenuId,
      viewOverride: !!p.view,
      addOverride: !!p.add,
      editOverride: !!p.edit,
      deleteOverride: !!p.delete,
    }
  })
  .filter(Boolean) as {
    moduleId: number
    menuId: number | null
    submenuId: number | null
    subsubmenuId: number | null
    viewOverride: boolean
    addOverride: boolean
    editOverride: boolean
    deleteOverride: boolean
  }[]


  if (acls.length === 0) {
    toast.warn('No permissions to save', { position: 'top-center' })
    return
  }

  try {
    setMenuLoading(true)

    // 3) PUT bulk ACL (replaceAll=true so this becomes the source of truth)
    await putBulkAcl([{
      userId: selectedUser.userId,
      replaceAll: true,
      acls
    }])

    // 4) Refresh tree and rebuild UI state
    const tree = await getUserMenusTree(selectedUser.userId)
    const struct = buildMenuStructureFromOperatorTree(tree)
    setMenuStructure(struct)

    const { permissions: newPerms, selectedMenus: newSelMenus, selectedSubmenus: newSelSubs, ids: newIds } =
      buildSelectionsFromOperatorTree(tree)

    setPermissions(newPerms)
    setSelectedMenus(newSelMenus)
    setSelectedSubmenus(newSelSubs)
    setKeyIdMap(newIds)

    // 5) Diff (baseline vs new) to show what changed
    const changes: string[] = []
    const allKeys = new Set<string>([
      ...Object.keys(baselinePermissions),
      ...Object.keys(newPerms)
    ])

    const labelOf = (key: string) => key // you can prettify if desired

    allKeys.forEach(k => {
      const before = baselinePermissions[k] || { view:false, add:false, edit:false, delete:false, approve:false }
      const after  = newPerms[k]          || { view:false, add:false, edit:false, delete:false, approve:false }
      ;(['view','add','edit','delete'] as const).forEach(flag => {
        if (!!before[flag] !== !!after[flag]) {
          changes.push(`${labelOf(k)}: ${flag} ${before[flag] ? 'ON→OFF' : 'OFF→ON'}`)
        }
      })
    })

    setBaselinePermissions(newPerms) // new baseline post-save

    if (changes.length) {
      // keep toast concise
      const head = changes.slice(0, 6)
      toast.success(
        `Permissions updated. Changes:\n• ${head.join('\n• ')}${changes.length > 6 ? `\n• +${changes.length - 6} more…` : ''}`,
        { position: 'top-center' }
      )
    } else {
      toast.success('Permissions updated (no net changes).', { position: 'top-center' })
    }
  } catch (e: any) {
    toast.error(e?.message || 'Failed to update permissions', { position: 'top-center' })
  } finally {
    setMenuLoading(false)
  }
}


  const togglePasswordVisibility = (userId: number) => {
    const newVisible = new Set(visiblePasswords)
    if (newVisible.has(userId)) {
      newVisible.delete(userId)
    } else {
      newVisible.add(userId)
    }
    setVisiblePasswords(newVisible)
  }

  const copyToClipboard = () => {
    if (!newCredentials) return

  const loginDetails = `
URL: ${newCredentials.loginUrl}
Username: ${newCredentials.username}
Password: ${newCredentials.password}
`.trim()

  navigator.clipboard.writeText(loginDetails).then(() => {
    setCopied(true)
    toast.success('Login details copied to clipboard!', {
      position: 'top-center',
      autoClose: 2000
    })
    setTimeout(() => setCopied(false), 2000)
  }).catch(() => {
    toast.error('Failed to copy to clipboard', { position: 'top-center' })
  })
}

  const copyPasswordToClipboard = (userId: number, password: string) => {
    navigator.clipboard.writeText(password).then(() => {
      setCopiedPasswords(prev => new Set([...Array.from(prev), userId]))
      toast.success('Password copied to clipboard!', {
        position: 'top-center',
        autoClose: 2000
      });
      setTimeout(() => {
        setCopiedPasswords(prev => {
          const newSet = new Set(prev)
          newSet.delete(userId)
          return newSet
        })
      }, 2000)
    }).catch(() => {
      toast.error('Failed to copy password', {
        position: 'top-center'
      });
    })
  }

  const closeCredentialsModal = () => {
    setShowCredentialsModal(false)
    setNewCredentials(null)
    setCopied(false)
  }

  const handleSort = (key: keyof User) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  
  const q = searchTerm.toLowerCase()
const filteredUsers = users.filter(user =>
  (user.name || '').toLowerCase().includes(q) ||
  (user.email || '').toLowerCase().includes(q) ||
  (user.username || '').toLowerCase().includes(q) ||
  ((roleId === 1 || isSuperadminOperator) && (user.companyName || '').toLowerCase().includes(q))
)


  
  const sortedUsers = React.useMemo(() => {
  let sortedRecords = [...filteredUsers]

  if (sortConfig.key !== null) {
    sortedRecords.sort((a, b) => {
      const aValRaw = (a as any)[sortConfig.key!]
      const bValRaw = (b as any)[sortConfig.key!]

      // numeric compare if both numbers
      if (typeof aValRaw === 'number' && typeof bValRaw === 'number') {
        return sortConfig.direction === 'asc' ? aValRaw - bValRaw : bValRaw - aValRaw
      }

      const aVal = String(aValRaw ?? '').toLowerCase()
      const bVal = String(bValRaw ?? '').toLowerCase()

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  } else {
    // Default: latest on top (assuming higher id = newer)
    sortedRecords.sort((a, b) => b.id - a.id)
  }

  return sortedRecords
}, [filteredUsers, sortConfig])


  // Pagination
  const indexOfLastUser = currentPage * rowsPerPage
  const indexOfFirstUser = indexOfLastUser - rowsPerPage
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser)
  const totalPages = Math.ceil(sortedUsers.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1)
  }

  const exportUsers = () => {
  // Use filtered + sorted list (ALL rows)
  const rows = sortedUsers

  const fmtDate = (s: string) => {
    if (!s) return '-'
    try {
      return new Date(s).toLocaleDateString()
    } catch {
      return s
    }
  }

  const now = new Date()
  const generatedOn = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`

  // Header cells
  const showCompanyCol = (roleId === 1 || isSuperadminOperator)
const companyTh = showCompanyCol ? `<th>Company</th>` : ``

const companyTd = (u: User) =>
  showCompanyCol
    ? `<td>${u.companyName ? u.companyName : '-'}</td>`
    : ``

  // Body rows
  const rowsHtml = rows
    .map((u, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${u.name ?? ''}</td>
          <td>${u.dateOfBirth ? fmtDate(u.dateOfBirth) : '-'}</td>
          <td>${u.email ?? '-'}</td>
          <td>${u.mobile ?? '-'}</td>
          <td>${u.username ?? ''}</td>
          ${companyTd(u)}
        </tr>
      `
    )
    .join('')

  const totalCols = showCompanyCol ? 7 : 6

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Users</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 24px; }
    h1 { margin: 0 0 4px; font-size: 18px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
    th { background: #f5f5f5; text-align: left; }
    tfoot td { border: none; padding-top: 12px; font-size: 11px; color: #666; }
    @page { margin: 20mm; }
    @media print {
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }
      .no-print { display: none !important; }
      body { margin: 0; }
    }
    .page-footer:after {
      counter-increment: page;
      content: "Page " counter(page);
      float: right;
    }
  </style>
</head>
<body>
  <h1>User Management — Export</h1>
  <div class="meta">Generated on: ${generatedOn}</div>

  <table>
    <thead>
      <tr>
        <th style="width:70px;">SR/NO</th>
        <th>Name</th>
        <th>Date of Birth</th>
        <th>Email</th>
        <th>Mobile</th>
        <th>Username</th>
        ${companyTh}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="${totalCols}" class="page-footer">Total records: ${rows.length}</td>
      </tr>
    </tfoot>
  </table>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function(){ window.close(); }, 200);
    };
  </script>
</body>
</html>
  `.trim()

  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
}



  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ top: "5rem" }}
      />
      
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>User Management</h3>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setShowAddUserForm(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add User
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className='card-body py-4 bg-white border-top'>
              <div className='row g-3 align-items-end mb-4'>
                <div className='col-md-6'>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Search</label>
                  <div className='position-relative'>
                    <div 
                      className='position-absolute ms-3'
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <KTSVG
                        path='/media/icons/duotune/general/gen021.svg'
                        className='svg-icon-2'
                      />
                    </div>
                    <input
                      type='text'
                      className='form-control form-control-sm ps-10'
                      placeholder='Search users...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className='col-md-6'>
                  <div className='d-flex justify-content-end'>
                    <button
                      type='button'
                      className='btn btn-outline-secondary btn-sm me-2'
                      onClick={() => setSearchTerm('')}
                    >
                      Clear
                    </button>
                    <button
  type='button'
  className='btn btn-light-primary btn-sm'
  onClick={exportUsers}
>
  <KTSVG path='/media/icons/duotune/general/gen005.svg' className='svg-icon-2' />
  Export
</button>

                  </div>
                </div>
              </div>

              {/* Table */}
              <div className='report-table table-responsive'>
                <table className='table table-bordered align-middle'>
                  <thead className='table-header text-start'>
  <tr>
    <th style={{ width: '90px' }}>SR/NO</th>
    <th onClick={() => handleSort('name')} className='cursor-pointer' style={{ minWidth: '150px' }}>
      <div className='d-flex align-items-center'>
        NAME
        <div style={{ transform: 'translateY(-2px)' }}>
          <KTSVG
            path={`/media/map/sort-col-${
              sortConfig.key === 'name'
                ? sortConfig.direction === 'asc'
                  ? 'up-black'
                  : 'down-black'
                : 'grey'
            }.svg`}
            className='svg-icon ms-2 custom-sort-icon'
          />
        </div>
      </div>
    </th>
    {/* SUPERADMIN-ONLY COMPANY COLUMN */}
    {(roleId === 1 || isSuperadminOperator) && (
      <th onClick={() => handleSort('companyName' as keyof User)} className='cursor-pointer' style={{ minWidth: '180px' }}>
        <div className='d-flex align-items-center'>
          COMPANY
          <div style={{ transform: 'translateY(-2px)' }}>
            <KTSVG
              path={`/media/map/sort-col-${
                sortConfig.key === 'companyName'
                  ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black'
                  : 'grey'
              }.svg`}
              className='svg-icon ms-2 custom-sort-icon'
            />
          </div>
        </div>
      </th>
    )}
    <th onClick={() => handleSort('dateOfBirth')} className='cursor-pointer' style={{ minWidth: '120px' }}>
      <div className='d-flex align-items-center'>
        DATE OF BIRTH
        <div style={{ transform: 'translateY(-2px)' }}>
          <KTSVG
            path={`/media/map/sort-col-${
              sortConfig.key === 'dateOfBirth'
                ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black'
                : 'grey'
            }.svg`}
            className='svg-icon ms-2 custom-sort-icon'
          />
        </div>
      </div>
    </th>
    <th onClick={() => handleSort('email')} className='cursor-pointer' style={{ minWidth: '200px' }}>
      <div className='d-flex align-items-center'>
        EMAIL
        <div style={{ transform: 'translateY(-2px)' }}>
          <KTSVG
            path={`/media/map/sort-col-${
              sortConfig.key === 'email'
                ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black'
                : 'grey'
            }.svg`}
            className='svg-icon ms-2 custom-sort-icon'
          />
        </div>
      </div>
    </th>
    <th onClick={() => handleSort('mobile')} className='cursor-pointer' style={{ minWidth: '120px' }}>
      <div className='d-flex align-items-center'>
        MOBILE
        <div style={{ transform: 'translateY(-2px)' }}>
          <KTSVG
            path={`/media/map/sort-col-${
              sortConfig.key === 'mobile'
                ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black'
                : 'grey'
            }.svg`}
            className='svg-icon ms-2 custom-sort-icon'
          />
        </div>
      </div>
    </th>
    <th onClick={() => handleSort('username')} className='cursor-pointer' style={{ minWidth: '120px' }}>
      <div className='d-flex align-items-center'>
        USERNAME
        <div style={{ transform: 'translateY(-2px)' }}>
          <KTSVG
            path={`/media/map/sort-col-${
              sortConfig.key === 'username'
                ? sortConfig.direction === 'asc'
                  ? 'up-black'
                  : 'down-black'
                : 'grey'
            }.svg`}
            className='svg-icon ms-2 custom-sort-icon'
          />
        </div>
      </div>
    </th>
    <th style={{ minWidth: '200px' }}>ACTIONS</th>
  </tr>
</thead>

                  <tbody className='table-body text-start'>
                    {currentUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className='text-center text-muted py-5'>
                          No users found for the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      currentUsers.map((user, idx) => (
                        <tr key={user.id}>
                          <td className='text-dark fs-6' style={{ width: '90px' }}>
    {indexOfFirstUser + idx + 1}
  </td>
                          <td className='text-dark fw-bold fs-6'>{user.name}</td>
                           {/* SUPERADMIN-ONLY COMPANY CELL */}
  {(roleId === 1 || isSuperadminOperator) && (
  <td className='text-dark fs-6'>
    {user.companyName === '— Superadmin —' ? (
      <span
        className='badge rounded-pill bg-light text-muted border'
        style={{ opacity: 0.85, cursor: 'not-allowed' }}
        aria-disabled='true'
        title='This user is under Superadmin'
      >
        — Superadmin —
      </span>
    ) : (
      user.companyName || '-'
    )}
  </td>
)}

                          <td className='text-dark fs-6'>
  {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : '-'}
</td>

<td className='text-dark fs-6'>{user.email || '-'}</td>

<td className='text-dark fs-6'>{user.mobile || '-'}</td>
                          <td className='text-dark fw-semibold fs-6' style={{ fontFamily: 'monospace' }}>
                            {user.username}
                          </td>
                          <td className='text-dark fs-6'>
                            <div className='d-flex align-items-center'>
                              <span style={{ fontFamily: 'monospace', minWidth: '80px' }}>
                                 {user.password ? (visiblePasswords.has(user.id) ? user.password : '••••••••') : '••••••••'}
                              </span>
                              {user.password && (
  <>
    <button
      onClick={() => togglePasswordVisibility(user.id)}
      className='btn btn-icon btn-sm ms-2'
      title={visiblePasswords.has(user.id) ? 'Hide password' : 'Show password'}
    >
      <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3' />
    </button>
    <button
      onClick={() => copyPasswordToClipboard(user.id, user.password)}
      className={`btn btn-icon btn-sm ms-1 ${copiedPasswords.has(user.id) ? 'btn-success' : ''}`}
      title={copiedPasswords.has(user.id) ? 'Copied!' : 'Copy password'}
    >
      <KTSVG path={`/media/icons/duotune/general/${copiedPasswords.has(user.id) ? 'gen043' : 'gen054'}.svg`} className='svg-icon-3' />
    </button>
  </>
)}
                              {(() => {
  const isSelf = isSelfRow(user)
  return (
    <button
      onClick={() => { if (!isSelf) openPermissionsModal(user) }}
      className='btn btn-icon btn-sm ms-1'
      title={isSelf ? 'You cannot modify your own permissions' : 'User Permissions'}
      disabled={isSelf}
      style={isSelf ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
      <KTSVG path='/media/icons/duotune/general/gen019.svg' className='svg-icon-3' />
    </button>
  )
})()}


                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className='pagination-wrapper d-flex justify-content-between align-items-center py-3'>
                  <div className='d-flex align-items-center'>
                    <span className='text-muted me-2'>Rows per page</span>
                    <select
                      className='form-select'
                      style={{
                        borderRadius: '20px',
                        width: '70px',
                        border: '1px solid #dee2e6',
                        fontSize: '14px',
                        padding: '4px 8px'
                      }}
                      value={rowsPerPage}
                      onChange={handleRowsPerPageChange}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className='d-flex align-items-center'>
                    <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                      Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedUsers.length)}</strong> of <strong>{sortedUsers.length}</strong>
                    </span>

                    <nav>
                      <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className='page-link text-muted'
                            style={{
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              padding: '8px 12px',
                              fontSize: '14px',
                              borderRadius: '6px'
                            }}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            ‹
                          </button>
                        </li>

                        {(() => {
                          const pages = []
                          const showPages = 5
                          let startPage = Math.max(1, currentPage - 2)
                          let endPage = Math.min(totalPages, startPage + showPages - 1)

                          if (endPage - startPage < showPages - 1) {
                            startPage = Math.max(1, endPage - showPages + 1)
                          }

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                <button
                                  className='page-link text-muted'
                                  style={{
                                    backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent',
                                    border: '1px solid #dee2e6',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    minWidth: '40px',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => handlePageChange(i)}
                                >
                                  {i}
                                </button>
                              </li>
                            )
                          }

                          return pages
                        })()}

                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className='page-link text-muted'
                            style={{
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              padding: '8px 12px',
                              fontSize: '14px',
                              borderRadius: '6px'
                            }}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            ›
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Form Modal */}
      {showAddUserForm && (
        <div
          className="modal fade show d-flex align-items-center justify-content-center"
          tabIndex={-1}
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1050,
          }}
        >
          <div className='modal-dialog modal-lg modal-dialog-centered' role='document'>
            <div className='modal-content bg-white' style={{ color: '#181C32' }}>
              <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }}>
                <div className='modal-header'>
                  <h5 className='modal-title'>Add New User</h5>
                  <button 
                    type='button' 
                    className='btn-close' 
                    onClick={() => setShowAddUserForm(false)}
                  />
                </div>

                <div className='modal-body'>
                  <div className='row g-3'>
                    <div className='col-md-6'>
                      <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Name</label>
                      <input
                        type='text'
                        className='form-control'
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder='Enter full name'
                        style={{ color: '#000' }}
                      />
                    </div>


                    <div className='col-md-6'>
  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
    Date of Birth
  </label>
  <input
    type='date'
    className='form-control'
    value={newUser.dateOfBirth}
    onChange={(e) => setNewUser({ ...newUser, dateOfBirth: e.target.value })}
    style={{ color: '#000' }}
  />
</div>

<div className='col-12'>
  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
    Email
  </label>
  <input
    type='email'
    className='form-control'
    value={newUser.email}
    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
    placeholder='Enter email address'
    style={{ color: '#000' }}
  />
</div>

<div className='col-md-6'>
  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
    Mobile
  </label>
  <input
    type='tel'
    className='form-control'
    value={newUser.mobile}
    onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value })}
    placeholder='Enter mobile number'
    style={{ color: '#000' }}
  />
</div>
{/* SUPERADMIN or SUPERADMIN'S OPERATOR: choose where to assign */}
{(roleId === 1 || isSuperadminOperator) && (
  <>
    <div className='col-12'>
      <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
        Assign User Under
      </label>
      <div className='d-flex align-items-center gap-4'>
        <div className='form-check'>
          <input
            className='form-check-input'
            type='radio'
            name='assignTarget'
            id='assignSuperadmin'
            checked={assignTarget === 'superadmin'}
            onChange={() => setAssignTarget('superadmin')}
          />
          <label className='form-check-label' htmlFor='assignSuperadmin'>Superadmin</label>
        </div>
        <div className='form-check'>
          <input
            className='form-check-input'
            type='radio'
            name='assignTarget'
            id='assignCompany'
            checked={assignTarget === 'company'}
            onChange={() => setAssignTarget('company')}
          />
          <label className='form-check-label' htmlFor='assignCompany'>A Company</label>
        </div>
      </div>
    </div>

    {assignTarget === 'company' && (
      <div className='col-md-8'>
        <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
          Select Company
        </label>
        <select
          className='form-select'
          value={selectedCompanyId ?? ''}
          onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value='' disabled>Select company group admin…</option>
          {companyAdmins.map(c => (
  <option key={c.id} value={c.id}>
    {c.name || c.uid?.username}
  </option>
))}

        </select>
        {!companyAdmins.length && (
          <small className='text-muted'>No companies found.</small>
        )}
      </div>
    )}
  </>
)}
{/* COMPANY OPERATOR: lock to their company (no dropdown / no superadmin options) */}
{isCompanyOperator && (
  <div className='col-md-8'>
    <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
      Assign User Under
    </label>
    <div className='d-flex align-items-center'>
      <span
        className='badge rounded-pill bg-light text-muted border'
        title='This operator belongs to a company; new users will be created under the same company.'
        style={{ opacity: 0.9 }}
      >
        Company (fixed)
      </span>
    </div>
  </div>
)}

                    <div className='col-md-6'>
  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
    Username
  </label>
  <div className='input-group'>
    <input
      type='text'
      className='form-control'
      value={newUser.username}
      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
      placeholder='e.g. john.doe'
      style={{ color: '#000' }}
    />
    <button
      type='button'
      className='btn btn-light'
      onClick={() => {
        const s = suggestUsername(newUser.name || 'user', takenUsernames)
        setNewUser(u => ({...u, username: s}))
      }}
      title='Suggest username'
    >
      Suggest
    </button>
  </div>
  <small className='text-muted'>
    Must start with a letter; 3–32 chars; letters, numbers, . _ -
    {newUser.username && usernameExists(newUser.username, allOperators) && (
      <span className='ms-2 text-danger fw-semibold'>• already taken</span>
    )}
    {newUser.username && USERNAME_REGEX.test(newUser.username) && !usernameExists(newUser.username, allOperators) && (
      <span className='ms-2 text-success fw-semibold'>• available</span>
    )}
  </small>
</div>

{/* Password */}
<div className='col-md-6'>
  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
    Password
  </label>
  <div className='input-group'>
    <input
      type={showPwd ? 'text' : 'password'}
      className='form-control'
      value={newUser.password}
      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
      placeholder='Create a strong password'
      style={{ color: '#000' }}
    />
    <button
      type='button'
      className='btn btn-light'
      onClick={() => setShowPwd(v => !v)}
      title={showPwd ? 'Hide password' : 'Show password'}
    >
      {showPwd ? 'Hide' : 'Show'}
    </button>
  </div>

  {(() => {
    if (!newUser.password) return null
    const res = validatePassword(newUser.password, { name: newUser.name, email: newUser.email })
    return (
      <small className={res.ok ? 'text-success' : 'text-danger'}>
        {res.ok ? 'Strong password' : `Weak: ${res.errors.join(', ')}`}
      </small>
    )
  })()}
</div>

{/* Confirm Password */}
<div className='col-md-6'>
  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
    Confirm Password
  </label>
  <div className='input-group'>
    <input
      type={showConfirmPwd ? 'text' : 'password'}
      className='form-control'
      value={newUser.confirmPassword}
      onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
      placeholder='Re-enter password'
      style={{ color: '#000' }}
    />
    <button
      type='button'
      className='btn btn-light'
      onClick={() => setShowConfirmPwd(v => !v)}
      title={showConfirmPwd ? 'Hide password' : 'Show password'}
    >
      {showConfirmPwd ? 'Hide' : 'Show'}
    </button>
  </div>
  {newUser.confirmPassword && newUser.password !== newUser.confirmPassword && (
    <small className='text-danger'>Passwords do not match</small>
  )}
</div>


<div className='col-12'>
  <button
    type='button'
    className='btn btn-sm btn-outline-secondary mt-2'
    onClick={() => {
      // quick generator for convenience (meets rules)
      const rand = () => Math.random().toString(36).slice(-4)
      const generated = `Aa${rand()}${rand()}!${Math.floor(100+Math.random()*900)}`
      setNewUser(u => ({...u, password: generated, confirmPassword: generated}))
    }}
  >
    Generate Strong Password
  </button>
</div>


                    {/* <div className='col-md-6'>
                      <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Department</label>
                      <select
                        className='form-control'
                        value={newUser.department}
                        onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                        style={{ color: '#000' }}
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div> */}
                  </div>
                </div>

                <div className='modal-footer'>
                  <button 
  type='button' 
  className='btn btn-light btn-sm' 
  onClick={() => setShowAddUserForm(false)}
  disabled={creating}
>
  Cancel
</button>
<button type='submit' className='btn btn_primary' disabled={creating}>
  {creating ? 'Creating…' : 'Create User'}
</button>

                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && newCredentials && (
        <div
          className="modal fade show d-flex align-items-center justify-content-center"
          tabIndex={-1}
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1050,
          }}
        >
          <div className='modal-dialog modal-dialog-centered' role='document'>
            <div className='modal-content bg-white' style={{ color: '#181C32' }}>
              <div className='modal-header text-center'>
                <div className='w-100'>
                  <div className='d-flex justify-content-center mb-3'>
                    <div 
                      className='d-flex align-items-center justify-content-center'
                      style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#d4edda',
                        borderRadius: '50%'
                      }}
                    >
                      <KTSVG path='/media/icons/duotune/general/gen043.svg' className='svg-icon-2x text-success' />
                    </div>
                  </div>
                  <h5 className='modal-title'>User Created Successfully!</h5>
                </div>
                <button 
                  type='button' 
                  className='btn-close' 
                  onClick={closeCredentialsModal}
                />
              </div>

              <div className='modal-body'>
                <div className='bg-light rounded p-4 mb-4'>
                  <h6 className='text-muted mb-3'>System Generated Credentials:</h6>
                  <div className='row'>
                        <div className='col-4'><span className='text-muted'>Login URL:</span></div>
    <div className='col-8'>
      <code style={{ wordBreak: 'break-all' }}>{newCredentials.loginUrl}</code>
    </div>
  </div>
                  <div className='row mt-2'>
                    <div className='col-4'>
                      <span className='text-muted'>Username:</span>
                    </div>
                    <div className='col-8'>
                      <span className='fw-bold' style={{ fontFamily: 'monospace' }}>{newCredentials.username}</span>
                    </div>
                  </div>
                  <div className='row mt-2'>
                    <div className='col-4'>
                      <span className='text-muted'>Password:</span>
                    </div>
                    <div className='col-8'>
                      <span className='fw-bold' style={{ fontFamily: 'monospace' }}>{newCredentials.password}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={copyToClipboard}
                  className={`btn w-100 mb-3 ${
                    copied 
                      ? 'btn-success' 
                      : 'btn-light'
                  }`}
                >
                  <KTSVG 
                    path={copied ? '/media/icons/duotune/general/gen043.svg' : '/media/icons/duotune/general/gen054.svg'} 
                    className='svg-icon-2 me-2' 
                  />
                  {copied ? 'Copied!' : 'Copy Login Details to Clipboard'}
                </button>

                <button
                  onClick={closeCredentialsModal}
                  className='btn btn_primary w-100'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

{/* Permissions Modal */}
{showPermissionsModal && selectedUser && (
  <div className='modal-overlay'>
    <div
      className='modal-content'
      onClick={(e) => e.stopPropagation()}
      style={{maxWidth: '115rem'}}
    >
      
      {/* Modal Header */}
      <div className='modal-header border-bottom' style={{ color: 'white', padding: '15px 20px' }}>
        <h5 className='modal-title fw-bold mb-0'>Assign Permissions For {selectedUser.name}</h5>
        <div className='d-flex align-items-center position-relative'>
          <input
            type='text'
            className='form-control form-control-sm me-3'
            placeholder='Search modules, menus, submenus...'
            value={permissionSearchTerm}
            onChange={(e) => setPermissionSearchTerm(e.target.value)}
            style={{ width: '300px', borderRadius: '20px' }}
          />
          
          {/* Search Results Dropdown */}
          {filteredResults.length > 0 && permissionSearchTerm && (
            <div 
              className="position-absolute bg-white border rounded shadow-lg"
              style={{ 
                top: '100%', 
                left: '0', 
                right: '100px', 
                zIndex: 1060, 
                maxHeight: '300px', 
                overflowY: 'auto' 
              }}
            >
              {filteredResults.map((result, index) => (
                <div
                  key={index}
                  className="px-3 py-2 border-bottom"
                  style={{ 
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: '#333'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  onClick={() => {
                    scrollToResult(result.key);
                    setPermissionSearchTerm('');
                  }}
                >
                  <div>
                    <span className="badge bg-secondary me-2" style={{ fontSize: '10px' }}>
                      {result.type.toUpperCase()}
                    </span>
                    <span>
                      {result.type === 'module' && result.moduleName}
                      {result.type === 'menu' && `${result.moduleName} > ${result.menuName}`}
                      {result.type === 'submenu' && `${result.moduleName} > ${result.menuName} > ${result.submenuName}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <button className='close-btn' onClick={closePermissionsModal}>
            <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
          </button>
        </div>
      </div>

      {/* Modal Body */}
      <div className='modal-body p-4'>
        <div className='table-responsive' style={{ maxHeight: '65vh', overflowY: 'auto' }} ref={tableRef}>
          <table className='table table-bordered mb-0' style={{ fontSize: '14px' }}>
            
            <thead style={{ 
              backgroundColor: '#1C325B', 
              color: 'white', 
              position: 'sticky', 
              top: 0, 
              zIndex: 10,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <tr>
                <th style={{ width: '60px', textAlign: 'center', padding: '12px 8px', fontWeight: 'bold' }}>SR/NO</th>
                <th style={{ width: '200px', padding: '12px', fontWeight: 'bold' }}>Module Name</th>
                <th style={{ width: '220px', padding: '12px', fontWeight: 'bold' }}>Menu Name</th>
                <th style={{ width: '220px', padding: '12px', fontWeight: 'bold' }}>Sub Menu Name</th>
                <th style={{ minWidth: '400px', padding: '12px', fontWeight: 'bold', textAlign: 'center' }}>Permission</th>
              </tr>
            </thead>  

            <tbody>
  {menuLoading && (
    <tr>
      <td colSpan={5} className='text-center py-4'>
        Loading permissions…
      </td>
    </tr>
  )}
  {!menuLoading && Object.keys(menuStructure)
                .filter(moduleName => {
                  const moduleData = menuStructure[moduleName];
                  return moduleData.menus.some((menuName: string) => {
                    const submenus = moduleData.submenus[menuName] || [];
                    return shouldShowRow(moduleName, menuName) ||
                           submenus.some((submenuName: string) => shouldShowRow(moduleName, menuName, submenuName));
                  });
                })
                .map((moduleName, moduleIndex) => {
                  const moduleData = menuStructure[moduleName];
                  let moduleRows: JSX.Element[] = [];
                  
                  const visibleMenus = moduleData.menus.filter((menuName: string) => {
                    const submenus = moduleData.submenus[menuName] || [];
                    return shouldShowRow(moduleName, menuName) ||
                           submenus.some((submenuName: string) => shouldShowRow(moduleName, menuName, submenuName));
                  });

                  const totalVisibleRows = visibleMenus.reduce((acc, menuName) => {
                    const submenus = moduleData.submenus[menuName] || [];
                    const visibleSubmenus = submenus.filter((submenuName: string) => shouldShowRow(moduleName, menuName, submenuName));
                    
                    // If the parent menu matches the search but no submenus do, we still show the menu row.
                    if (shouldShowRow(moduleName, menuName) && visibleSubmenus.length === 0 && submenus.length > 0) {
                        return acc + 1;
                    }
                    return acc + Math.max(1, visibleSubmenus.length);
                  }, 0);

                  visibleMenus.forEach((menuName, menuIndex) => {
                    const hasSubmenus = moduleData.submenus[menuName]?.length > 0;
                    const menuKey = `${moduleName}-${menuName}`;
                    
                    if (hasSubmenus) {
                      const visibleSubmenus = moduleData.submenus[menuName].filter((submenuName: string) => 
                        shouldShowRow(moduleName, menuName, submenuName)
                      );
                      
                      if (visibleSubmenus.length === 0 && !shouldShowRow(moduleName, menuName)) {
                        return; // Don't render anything for this menu if no submenus match and menu itself doesn't match
                      }

                      visibleSubmenus.forEach((submenuName, submenuIndex) => {
                        const submenuKey = `${moduleName}-${menuName}-${submenuName}`;
                        const isFirstSubmenu = submenuIndex === 0;
                        const isFirstMenuOfModule = menuIndex === 0 && submenuIndex === 0;
                        const submenuCount = visibleSubmenus.length;
                        
                        moduleRows.push(
                          <tr 
                            key={submenuKey}
                            id={`row-${submenuKey}`}
                            style={{
                              borderTop: (menuIndex > 0 && isFirstSubmenu) ? '3px solid #dee2e6' : '1px solid #dee2e6',
                              backgroundColor: submenuIndex % 2 === 0 ? '#fafafa' : '#ffffff'
                            }}
                          >
                             {isFirstMenuOfModule && (
                                <td 
                                  rowSpan={totalVisibleRows}
                                  style={{ 
                                    textAlign: 'center',
                                    verticalAlign: 'middle',
                                    fontWeight: 'bold',
                                    backgroundColor: '#f1f3f4',
                                    borderRight: '2px solid #dee2e6'
                                  }}
                                >
                                  {moduleIndex + 1}
                                </td>
                              )}
                            {isFirstMenuOfModule && (
                              <td 
                                rowSpan={totalVisibleRows}
                                style={{ 
                                  verticalAlign: 'middle',
                                  backgroundColor: '#E6EEF7',
                                  fontWeight: 'bold',
                                  borderRight: '2px solid #dee2e6',
                                  padding: '12px'
                                }}
                              >
                                <div className='d-flex align-items-center'>
                                  <KTSVG path='/media/icons/duotune/general/gen019.svg' className='svg-icon-2 me-2 text-success' />
                                  <span style={{ color: '#2d5a2d' }}>{highlightText(moduleName, permissionSearchTerm)}</span>
                                </div>
                              </td>
                            )}
                            
                            {isFirstSubmenu && (
                              <td 
                                rowSpan={submenuCount}
                                style={{ 
                                  verticalAlign: 'middle',
                                  backgroundColor: submenuIndex % 2 === 0 ? '#fafafa' : '#ffffff',
                                  borderRight: '2px solid #dee2e6',
                                  padding: '12px'
                                }}
                              >
                                <div className='d-flex align-items-center'>
                                  <input
                                    type='checkbox'
                                    className='form-check-input me-2'
                                    style={{ transform: 'scale(1.2)' }}
                                    checked={selectedMenus.has(menuKey)}
                                    onChange={(e) => handleMenuSelection(moduleName, menuName, e.target.checked)}
                                  />
                                  <span style={{ color: '#1e3a8a' }}>{highlightText(menuName, permissionSearchTerm)}</span>
                                </div>
                              </td>
                            )}
                            
                            <td style={{ paddingLeft: '20px', borderRight: '2px solid #dee2e6', padding: '12px' }}>
                              <div className='d-flex align-items-center'>
                                <input
                                  type='checkbox'
                                  className='form-check-input me-2'
                                  style={{ transform: 'scale(1.1)' }}
                                  checked={selectedSubmenus.has(submenuKey)}
                                  onChange={(e) => handleSubmenuSelection(moduleName, menuName, submenuName, e.target.checked)}
                                />
                                <span style={{ color: '#4b5563' }}>{highlightText(submenuName, permissionSearchTerm)}</span>
                              </div>
                            </td>
                            
                            <td style={{ padding: '12px' }}>
                                <div className='d-flex align-items-center justify-content-center gap-4'>
                                  {/*
  Original (commented to hide add/edit/delete for now):
*/}
                                  {/* //all permission I am commenting for now so that we can give can view only */}
                                  {/* {(['view', 'add', 'edit', 'delete'] as const).map((permission) => (
                                    <div key={permission} className='form-check form-check-inline'>
                                      <input
                                        type='checkbox'
                                        className='form-check-input'
                                        id={`${submenuKey}-${permission}`}
                                        disabled={!selectedSubmenus.has(submenuKey)}
                                        checked={permissions[submenuKey]?.[permission] || false}
                                        onChange={(e) => handlePermissionChange(submenuKey, permission, e.target.checked)}
                                        style={{ 
                                          transform: 'scale(1.1)',
                                          accentColor: '#4ECDC4'
                                        }}
                                      />
                                      <label 
                                        className='form-check-label text-capitalize fw-semibold' 
                                        htmlFor={`${submenuKey}-${permission}`}
                                        style={{ 
                                          color: selectedSubmenus.has(submenuKey) ? '#059669' : '#9ca3af',
                                          fontSize: '12px'
                                        }}
                                      >
                                        Can {permission}
                                      </label>
                                    </div>
                                  ))} */}
                                  {/* Only show "Can View" for now */}
<div className='form-check form-check-inline'>
  <input
    type='checkbox'
    className='form-check-input'
    id={`${submenuKey}-view`}
    disabled={!selectedSubmenus.has(submenuKey)}
    checked={permissions[submenuKey]?.view || false}
    onChange={(e) => handlePermissionChange(submenuKey, 'view', e.target.checked)}
    style={{ 
      transform: 'scale(1.1)',
      accentColor: '#4ECDC4'
    }}
  />
  <label 
    className='form-check-label text-capitalize fw-semibold' 
    htmlFor={`${submenuKey}-view`}
    style={{ 
      color: selectedSubmenus.has(submenuKey) ? '#059669' : '#9ca3af',
      fontSize: '12px'
    }}
  >
    Can Access
  </label>
</div>



                                </div>
                              </td>
                          </tr>
                        );
                      });
                    } else if (shouldShowRow(moduleName, menuName)) {
                      
                      const isFirstMenuOfModule = menuIndex === 0;
                      
                      moduleRows.push(
                        <tr 
                          key={menuKey}
                          id={`row-${menuKey}`}
                          style={{
                            borderTop: menuIndex > 0 ? '3px solid #dee2e6' : '1px solid #dee2e6',
                            backgroundColor: menuIndex % 2 === 0 ? '#fafafa' : '#ffffff'
                          }}
                        >
                          {isFirstMenuOfModule && (
                             <td 
                                rowSpan={totalVisibleRows}
                                style={{ 
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  fontWeight: 'bold',
                                  backgroundColor: '#f1f3f4',
                                  borderRight: '2px solid #dee2e6'
                                }}
                              >
                                {moduleIndex + 1}
                              </td>
                          )}
                          {isFirstMenuOfModule && (
                            <td 
                              rowSpan={totalVisibleRows}
                              style={{ 
                                verticalAlign: 'middle',
                                backgroundColor: '#E6EEF7',
                                fontWeight: 'bold',
                                borderRight: '2px solid #dee2e6',
                                padding: '12px'
                              }}
                            >
                              <div className='d-flex align-items-center'>
                                <KTSVG path='/media/icons/duotune/general/gen019.svg' className='svg-icon-2 me-2 text-success' />
                                <span style={{ color: '#2d5a2d' }}>{highlightText(moduleName, permissionSearchTerm)}</span>
                              </div>
                            </td>
                          )}
                          
                          <td style={{ borderRight: '2px solid #dee2e6', padding: '12px', backgroundColor: menuIndex % 2 === 0 ? '#fafafa' : '#ffffff',}}>
                            <div className='d-flex align-items-center'>
                              <input
                                type='checkbox'
                                className='form-check-input me-2'
                                style={{ transform: 'scale(1.2)' }}
                                checked={selectedMenus.has(menuKey)}
                                onChange={(e) => handleMenuSelection(moduleName, menuName, e.target.checked)}
                              />
                              <span style={{ color: '#1e3a8a' }}>{highlightText(menuName, permissionSearchTerm)}</span>
                            </div>
                          </td>
                          
                          <td style={{ 
                            backgroundColor: '#f9f9f9', 
                            borderRight: '2px solid #dee2e6',
                            padding: '12px',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            color: '#9ca3af'
                          }}>
                            
                          </td>
                          
                          <td style={{ padding: '12px' }}>
                              <div className='d-flex align-items-center justify-content-center gap-4'>
                                {/*
  Original (commented to hide add/edit/delete for now):
*/}
                                {/* {(['view', 'add', 'edit', 'delete'] as const).map((permission) => (
                                  <div key={permission} className='form-check form-check-inline'>
                                    <input
                                      type='checkbox'
                                      className='form-check-input'
                                      id={`${menuKey}-${permission}`}
                                      disabled={!selectedMenus.has(menuKey)}
                                      checked={permissions[menuKey]?.[permission] || false}
                                      onChange={(e) => handlePermissionChange(menuKey, permission, e.target.checked)}
                                      style={{ 
                                        transform: 'scale(1.1)',
                                        accentColor: '#4ECDC4'
                                      }}
                                    />
                                    <label 
                                      className='form-check-label text-capitalize fw-semibold' 
                                      htmlFor={`${menuKey}-${permission}`}
                                      style={{ 
                                        color: selectedMenus.has(menuKey) ? '#059669' : '#9ca3af',
                                        fontSize: '12px'
                                      }}
                                    >
                                      Can {permission}
                                    </label>
                                  </div>
                                ))} */}
                                {/* Only show "Can View" for now */}
<div className='form-check form-check-inline'>
  <input
    type='checkbox'
    className='form-check-input'
    id={`${menuKey}-view`}
    disabled={!selectedMenus.has(menuKey)}
    checked={permissions[menuKey]?.view || false}
    onChange={(e) => handlePermissionChange(menuKey, 'view', e.target.checked)}
    style={{ 
      transform: 'scale(1.1)',
      accentColor: '#4ECDC4'
    }}
  />
  <label 
    className='form-check-label text-capitalize fw-semibold' 
    htmlFor={`${menuKey}-view`}
    style={{ 
      color: selectedMenus.has(menuKey) ? '#059669' : '#9ca3af',
      fontSize: '12px'
    }}
  >
    Can Access
  </label>
</div>



                              </div>
                            </td>
                        </tr>
                      );
                    }
                  });
                  
                  return moduleRows;
                }).flat()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Footer */}
      <div className='modal-footer border-top' style={{ padding: '15px 20px' }}>
        <button
          type='button'
          className='btn btn-secondary'
          onClick={closePermissionsModal}
        >
          Cancel
        </button>
        <button
          type='button'
          className='btn btn-primary ms-2'
          onClick={savePermissions}
        >
          Save Permissions
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  )
}

export default UserManagement