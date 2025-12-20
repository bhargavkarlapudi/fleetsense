import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth'; // ⬅️ same hook you use in RestHour
// APIs (same ones used on RestHour)
import { getCompanyList, getLatestReportsByDay, getVesselOperations   } from '../core/_requests';           // Subcompanies (Company Admins)
import { getCompanyAdminList, getVesselList } from '../core/_requests'; // Company Groups + Vessels
import * as XLSX from 'xlsx';

const toYMD = (d: Date) => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Format ISO-ish "2025-07-20T14:53" → "2025-07-20 14:53"
const toLocalYMDHM = (iso?: string | null) => {
  if (!iso) return '--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso; // fallback to raw if unparsable
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
};

const KTSVG: FC<{ path: string; className?: string }> = ({ path, className }) => (
    <span className={`svg-icon ${className}`}>
        <svg>
            <use href={path}></use>
        </svg>
    </span>
);

const ArrowLeftIcon: FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M11.2687 11.4343L15.45 7.25302C15.8642 6.83881 15.8642 6.16119 15.45 5.74698C15.0358 5.33277 14.3582 5.33277 13.944 5.74698L8.55005 11.1409C8.13584 11.5551 8.13584 12.2328 8.55005 12.647L13.944 18.0409C14.3582 18.4551 15.0358 18.4551 15.45 18.0409C15.8642 17.6267 15.8642 16.9491 15.45 16.5349L11.2687 12.3536C10.9927 12.0776 10.9927 11.6113 11.2687 11.4343Z" fill="currentColor"></path>
    </svg>
);

const ArrowRightIcon: FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12.7313 11.4343L8.55 7.25302C8.13579 6.83881 8.13579 6.16119 8.55 5.74698C8.96421 5.33277 9.64179 5.33277 10.056 5.74698L15.45 11.1409C15.8642 11.5551 15.8642 12.2328 15.45 12.647L10.056 18.0409C9.64179 18.4551 8.96421 18.4551 8.55 18.0409C8.13579 17.6267 8.13579 16.9491 8.55 16.5349L12.7313 12.3536C13.0073 12.0776 13.0073 11.6113 12.7313 11.4343Z" fill="currentColor"></path>
    </svg>
);

const DownloadIcon: FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 17.5L12 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M17 12.5L12 17.5L7 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21.5 17.5V18.5C21.5 19.8807 20.3807 21 19 21H5C3.61929 21 2.5 19.8807 2.5 18.5V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

type CompanyGroupOpt = { id: number; name: string }
type SubcompanyOpt  = { id: number; name: string; companyGroupId?: number }
type VesselOpt      = { id: number; name: string }

interface PositionReport {
    date: string;
    time: string;
    position: string;
    eosp: string;
    reportType: string;
    lat: string;
    lng: string;
    voyageNo: string;
    avgSpeed: string;
    dwt: string;
    genAvg: string;
    ttiDist: string;
}

const PositionReport: FC<{ embedded?: boolean }> = ({ embedded = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    // at the top with other refs
const tableWrapRef = useRef<HTMLDivElement | null>(null)
const paginationRef = useRef<HTMLDivElement | null>(null)
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [sortConfig, setSortConfig] = useState<{ key: keyof PositionReport | null; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc',
    });
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
    const [tempSelectedFilters, setTempSelectedFilters] = useState<string[]>([]);
// week anchor = start = today-6; visible week = (today-6) .. today
const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  x.setHours(0, 0, 0, 0)
  return x
}
const [currentDate, setCurrentDate] = useState<Date>(addDays(startOfToday(), -6))
    // === role & auth (same approach as RestHour) ===
const { currentUser } = useAuth() as any
const roleId = currentUser?.role?.id

// Operator flavors from RestHour
const isOperator = roleId === 6
const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
const operatorActsLikeGroupAdmin = isOperator && !!currentUser?.companyGroupAdminId

// === master lists ===
const [companies, setCompanies] = useState<CompanyGroupOpt[]>([])   // Company Groups (role 5)
const [subcompanies, setSubcompanies] = useState<SubcompanyOpt[]>([]) // Subcompanies (role 2)
const [vesselList, setVesselList] = useState<any[]>([])

// === vessel header ops (captain, phone, next port, eta) ===
type Ops = {
  masterName?: string | null;
  masterContactNumber?: string | null;
  nextPort?: string | null;
  eta?: string | null;
};
const [ops, setOps] = useState<Ops | null>(null);
const [opsLoading, setOpsLoading] = useState(false);
const [opsError, setOpsError] = useState<string | null>(null);

// === selected filter values ===
const [filterCompanyGroupId, setFilterCompanyGroupId] = useState<number | ''>('')
const [filterCompanyAdminId, setFilterCompanyAdminId] = useState<number | ''>('')
const [filterVesselId, setFilterVesselId] = useState<number | ''>('')

// keep both values + the latest report type for that day
type DayValues = {
  date: string;
  current: Record<string, string>;
  average: Record<string, string>;
  reportType?: string | null;
}

const [paramLabels, setParamLabels] = useState<string[]>([])       // dynamic parameter labels (excluding "Report Date Time")
const [filterOptions, setFilterOptions] = useState<{ key: string; label: string }[]>([]) // checkbox list, mirrors labels
const [weekData, setWeekData] = useState<DayValues[]>([])          // 7 entries — one per day
const [loadingWeek, setLoadingWeek] = useState(false)
const [apiError, setApiError] = useState<string | null>(null)
// 🔽 Pagination state (rows = parameters)
const [currentPage, setCurrentPage] = useState(1)
const [rowsPerPage, setRowsPerPage] = useState(10)

// === Chips collapse / "Others" UI ===
const [chipLimit, setChipLimit] = useState(3)        // default desktop
const [isOthersOpen, setIsOthersOpen] = useState(false)
const [isExpanded, setIsExpanded] = useState(false)
const othersBtnRef = useRef<HTMLButtonElement | null>(null)
const othersMenuRef = useRef<HTMLDivElement | null>(null)

// responsive chip limit (desktop/tablet/mobile)
useEffect(() => {
  const apply = () => {
    const w = window.innerWidth
    if (w < 576) setChipLimit(5)      // phones
    else if (w < 992) setChipLimit(2) // tablets
    else setChipLimit(2)             // desktops
  }
  apply()
  window.addEventListener('resize', apply)
  return () => window.removeEventListener('resize', apply)
}, [])

// close Others popover on outside click / ESC
useEffect(() => {
  if (!isOthersOpen) return
  const onDocClick = (e: MouseEvent) => {
    const t = e.target as Node
    if (
      othersBtnRef.current?.contains(t) ||
      othersMenuRef.current?.contains(t)
    ) return
    setIsOthersOpen(false)
  }
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsOthersOpen(false)
  }
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onEsc)
  return () => {
    document.removeEventListener('mousedown', onDocClick)
    document.removeEventListener('keydown', onEsc)
  }
}, [isOthersOpen])

// ✅ helper: safe first id
const firstId = <T extends { id: number }>(arr: T[] | undefined | null): number | undefined =>
  Array.isArray(arr) && arr.length > 0 ? Number(arr[0].id) : undefined


// robust id reader (matches RestHour style)
const toNum = (v: any): number | undefined =>
  v === null || v === undefined || v === '' || isNaN(Number(v)) ? undefined : Number(v)

const companyGroupOptions = useMemo<CompanyGroupOpt[]>(
  () => companies,
  [companies]
)

const subcompanyOptions = useMemo<SubcompanyOpt[]>(
  () => (typeof filterCompanyGroupId === 'number'
    ? subcompanies.filter(sc => sc.companyGroupId === filterCompanyGroupId)
    : subcompanies),
  [subcompanies, filterCompanyGroupId]
)

// Does current company group actually have subcompanies?
const companyHasSubcompanies = useMemo(() => {
  if (typeof filterCompanyGroupId !== 'number') return false
  return subcompanyOptions.some(sc => sc.companyGroupId === filterCompanyGroupId)
}, [filterCompanyGroupId, subcompanyOptions])

// vessels filtered by selected Company → Subcompany (mimics RestHour rules)
const vesselOptions = useMemo<VesselOpt[]>(() => {
  const fCG = typeof filterCompanyGroupId === 'number' ? filterCompanyGroupId : undefined
  const fCA = typeof filterCompanyAdminId === 'number' ? filterCompanyAdminId : undefined

  const apiFiltered = (vesselList || []).filter((v: any) => {
    const cgId = toNum(v.companyGroupAdminId ?? v.companyGroupId ?? v.companyGroupAdmin?.id ?? v.cgaid ?? v.cga?.id)
    const caId = toNum(v.companyAdminId ?? v.companyId ?? v.companyAdmin?.id)
    const byCG = !fCG || cgId === fCG
    const byCA = !fCA || caId === fCA
    return byCG && (!companyHasSubcompanies || byCA)
  })

  return apiFiltered.map((v: any) => ({ id: Number(v.id), name: String(v.fleet_name ?? v.name ?? `Vessel #${v.id}`) }))
}, [vesselList, filterCompanyGroupId, filterCompanyAdminId, companyHasSubcompanies])


// ✅ bootstrap defaults once lists + user are ready
const didBootstrapRef = useRef(false)

useEffect(() => {
  if (didBootstrapRef.current) return
  if (!currentUser) return

  const rId = roleId
  const isOp = rId === 6
  const actsLikeSuperadmin = isOp && !currentUser?.companyGroupAdminId
  const actsLikeGroupAdmin = isOp && !!currentUser?.companyGroupAdminId

  // Guard: need lists loaded to pick defaults
  const listsReady =
    Array.isArray(companies) &&
    Array.isArray(subcompanies) &&
    Array.isArray(vesselList)
  if (!listsReady) return

  // --- CREW (role 4): only vessel ---
  if (rId === 4) {
    const vId = toNum(currentUser?.vessel?.id)
    if (vId) {
      setFilterCompanyGroupId('')
      setFilterCompanyAdminId('')
      setFilterVesselId(vId)
      didBootstrapRef.current = true
    }
    return
  }

  // --- SUPERADMIN (1) or OPERATOR (no cga) ---
  if (rId === 1 || actsLikeSuperadmin) {
    // 1) company group = first
    const cgId = firstId(companies)
    if (cgId !== undefined) setFilterCompanyGroupId(cgId)
    else setFilterCompanyGroupId('')

    // 2) subcompany = first under that group (if any)
    const subList = subcompanies.filter(sc => sc.companyGroupId === cgId)
    const scId = firstId(subList)
    if (scId !== undefined) setFilterCompanyAdminId(scId)
    else setFilterCompanyAdminId('')

    // 3) vessel = first filtered vessel (handled in effect #3 below)
    setFilterVesselId('')
    didBootstrapRef.current = true
    return
  }

  // --- COMPANY GROUP ADMIN (5) or OPERATOR (with cga) ---
  if (rId === 5 || actsLikeGroupAdmin) {
    const cgId = toNum(currentUser?.companyGroupAdminId) ?? firstId(companies)
    if (cgId !== undefined) setFilterCompanyGroupId(cgId)
    else setFilterCompanyGroupId('')

    const subList = subcompanies.filter(sc => sc.companyGroupId === cgId)
    const scId = firstId(subList)
    if (scId !== undefined) setFilterCompanyAdminId(scId)
    else setFilterCompanyAdminId('')

    setFilterVesselId('')
    didBootstrapRef.current = true
    return
  }

  // --- SUBCOMPANY ADMIN (2) ---
  if (rId === 2) {
    const cgId = toNum(currentUser?.companyGroupAdminId)
    const scId = toNum(currentUser?.companyAdminId)

    setFilterCompanyGroupId(cgId ?? '')
    setFilterCompanyAdminId(scId ?? '')
    setFilterVesselId('')

    didBootstrapRef.current = true
    return
  }

  // Default fallback
  setFilterCompanyGroupId('')
  setFilterCompanyAdminId('')
  setFilterVesselId('')
  didBootstrapRef.current = true
}, [currentUser, roleId, companies, subcompanies, vesselList])



// compute available height for the table wrapper — no RO loop warnings
useEffect(() => {
  const el = tableWrapRef.current
  if (!el) return

  let rafId = 0
  let lastApplied = -1

  const calcHeight = () => {
    // READ phase (no DOM writes)
    const rectTop = el.getBoundingClientRect().top
    const viewportH = window.innerHeight
    const safeBottom = 0 // use 0; add env(safe-area-inset-bottom) if you need iOS padding
    const h = Math.max(240, viewportH - rectTop - safeBottom)

    // WRITE phase (in next frame)
    if (rafId) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      if (h !== lastApplied) {
        el.style.height = `${h}px`
        el.style.maxHeight = `${h}px`
        el.style.paddingBottom = '0px'
        lastApplied = h
      }
    })
  }

  // Initial calc
  calcHeight()

  // Recalc on window events
  const onResize = () => calcHeight()
  const onScroll = () => calcHeight() // in case parent layout shifts vertically
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  window.addEventListener('scroll', onScroll, { passive: true })

  // Observe global doc changes, not the element we write to
  const ro = new ResizeObserver(() => {
    // Schedule a safe recalculation
    calcHeight()
  })
  ro.observe(document.documentElement)

  // Watch for content additions inside (read now, write next raf)
  const mo = new MutationObserver(() => calcHeight())
  mo.observe(el, { childList: true, subtree: true })

  // One more pass after first paint
  const t = setTimeout(calcHeight, 0)

  return () => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
    window.removeEventListener('scroll', onScroll)
    if (rafId) cancelAnimationFrame(rafId)
    ro.disconnect()
    mo.disconnect()
    clearTimeout(t)
  }
}, [])


// Load Company Groups (role 5) + Subcompanies (role 2)
useEffect(() => {
  ;(async () => {
    try {
      const [groups, admins] = await Promise.all([
        getCompanyAdminList?.().catch(() => []), // Company Groups
        getCompanyList?.().catch(() => []),      // Subcompanies
      ])

      setCompanies(
        Array.isArray(groups)
          ? groups.map((g: any) => ({ id: Number(g.id), name: g.name ?? g.companyGroupAdminName ?? `Company Group #${g.id}` }))
          : []
      )

      setSubcompanies(
        Array.isArray(admins)
          ? admins.map((a: any) => ({
              id: Number(a.id),
              name: a.name ?? a.companyAdminName ?? `Subcompany #${a.id}`,
              companyGroupId: Number(a.cgaid ?? a.cga?.id ?? a.companyGroupAdminId ?? a.companyGroupId),
            }))
          : []
      )
    } catch (e) {
      setCompanies([])
      setSubcompanies([])
      console.error('Failed to load company lists', e)
    }
  })()
}, [])

// Load vessels (API used in RestHour)
useEffect(() => {
  ;(async () => {
    try {
      const vs = await getVesselList?.()
      setVesselList(Array.isArray(vs) ? vs : [])
    } catch (e) {
      setVesselList([])
      console.error('Failed to load vessel list', e)
    }
  })()
}, [])

useEffect(() => {
  if (typeof filterCompanyGroupId !== 'number') return
  const allowed = new Set(
    (subcompanies || []).filter(sc => sc.companyGroupId === filterCompanyGroupId).map(sc => sc.id)
  )
  if (typeof filterCompanyAdminId === 'number' && !allowed.has(filterCompanyAdminId)) {
    setFilterCompanyAdminId('')
    setFilterVesselId('')
  }
}, [filterCompanyGroupId, filterCompanyAdminId, subcompanies])


    useEffect(() => {
        if (showSearch && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [showSearch]);

    useEffect(() => {
  // Only fetch when a specific vessel is selected
  if (typeof filterVesselId !== 'number') {
    setWeekData([])
    setParamLabels([])
    setFilterOptions([])
    setSelectedFilters([])
    setTempSelectedFilters([])
    return
  }

  const datesAsc = getWeekDates(currentDate)
if (!datesAsc.length) return

const fetchWeek = async () => {
  setLoadingWeek(true)
  setApiError(null)

  try {
    // Fetch in ascending order
    const promises = datesAsc.map(async (d) => {
      const day = toYMD(d)
      const arr = await getLatestReportsByDay(day, day, filterVesselId)
      const first = Array.isArray(arr) ? arr[0] : undefined
      const vals = Array.isArray(first?.values) ? first.values : []

// Map label → { current, average } (skip "Report Date Time")
const currentMap: Record<string, string> = {}
const averageMap: Record<string, string> = {}

vals.forEach((v: any) => {
  const label = v?.field?.label ?? ''
  if (!label) return
  if (label.trim().toLowerCase() === 'report date time') return

  const current = v?.valueText ?? ''
  const avg = v?.averageValue
  currentMap[label] = current
  averageMap[label] = (avg === null || avg === undefined) ? '' : String(avg)
})

const rType = first?.reportType ?? null
return { date: day, current: currentMap, average: averageMap, reportType: rType } as DayValues
    })

    const resultsAsc = await Promise.all(promises)

    // UI shows latest first, so reverse the data to match column order
    // const results = resultsAsc.slice().reverse()
    setWeekData(resultsAsc)

// Derive labels from the first day that has ANY values (current or average)
const firstWithValues = resultsAsc.find(r =>
  Object.keys(r.current || {}).length > 0 || Object.keys(r.average || {}).length > 0
)
const labels = firstWithValues
  ? Array.from(new Set([
      ...Object.keys(firstWithValues.current || {}),
      ...Object.keys(firstWithValues.average || {}),
    ]))
  : []

    setParamLabels(labels)
    setFilterOptions(labels.map(l => ({ key: l, label: l })))

    if (selectedFilters.length === 0) setSelectedFilters(labels)
    if (tempSelectedFilters.length === 0) setTempSelectedFilters(labels)
  } catch (e: any) {
    setApiError(e?.message || 'Failed to fetch weekly reports')
    setWeekData([])
    setParamLabels([])
    setFilterOptions([])
  } finally {
    setLoadingWeek(false)
  }
}

  fetchWeek()
}, [filterVesselId, currentDate]) // re-run when vessel or week anchor changes

// Load vessel operations header when vessel changes
useEffect(() => {
  if (typeof filterVesselId !== 'number') {
    setOps(null);
    setOpsError(null);
    return;
  }

  let mounted = true;
  (async () => {
    setOpsLoading(true);
    setOpsError(null);
    try {
      const data = await getVesselOperations(filterVesselId);
      if (!mounted) return;
      setOps({
        masterName: data.masterName,
        masterContactNumber: data.masterContactNumber,
        nextPort: data.nextPort,
        eta: data.eta,
      });
    } catch (e: any) {
      if (!mounted) return;
      setOps(null);
      setOpsError(e?.message || 'Failed to load vessel operations');
    } finally {
      if (mounted) setOpsLoading(false);
    }
  })();

  return () => { mounted = false; };
}, [filterVesselId]);

// ✅ when company/subcompany filters change, ensure a vessel is preselected
useEffect(() => {
  // only autoselect if no vessel chosen
  if (typeof filterVesselId === 'number') return

  // compute the currently valid vessels using your memoized rule
  const fCG = typeof filterCompanyGroupId === 'number' ? filterCompanyGroupId : undefined
  const fCA = typeof filterCompanyAdminId === 'number' ? filterCompanyAdminId : undefined

  const candidateVessels = (vesselList || []).filter((v: any) => {
    const cgId = toNum(v.companyGroupAdminId ?? v.companyGroupId ?? v.companyGroupAdmin?.id ?? v.cgaid ?? v.cga?.id)
    const caId = toNum(v.companyAdminId ?? v.companyId ?? v.companyAdmin?.id)
    const okCG = !fCG || cgId === fCG
    const okCA = !fCA || caId === fCA
    // if company has subcompanies, require CA match; otherwise CG match is enough
    const hasSubs = typeof fCG === 'number' && subcompanies.some(sc => sc.companyGroupId === fCG)
    return okCG && (!hasSubs || okCA)
  })

  const vId = firstId(candidateVessels)
  if (vId !== undefined) setFilterVesselId(vId)
}, [filterCompanyGroupId, filterCompanyAdminId, vesselList, subcompanies, filterVesselId])



    const handleTempFilterToggle = (filterKey: string) => {
        setTempSelectedFilters((prev) =>
            prev.includes(filterKey) ? prev.filter((f) => f !== filterKey) : [...prev, filterKey]
        );
    };

    const handleTempSelectAll = () => {
        setTempSelectedFilters(
            tempSelectedFilters.length === filterOptions.length ? [] : filterOptions.map((f) => f.key)
        );
    };

    const handleOpenFilterDropdown = () => {
        setTempSelectedFilters(selectedFilters);
        setShowFilterDropdown(true);
    };

    const handleApplyFilters = () => {
        setSelectedFilters(tempSelectedFilters);
        setShowFilterDropdown(false);
    };

    const handleSort = (key: keyof PositionReport) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const handlePreviousWeek = () => {
        setCurrentDate((prevDate) => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() - 7);
            return newDate;
        });
    };

const handleNextWeek = () => {
  setCurrentDate((prevDate) => {
    const candidate = new Date(prevDate)
    candidate.setDate(candidate.getDate() + 7)
    // disallow if the window’s END (start+6) would exceed today
    const today0 = startOfToday()
    const candidateEnd = addDays(candidate, 6)
    if (candidateEnd > today0) return prevDate
    return candidate
  })
}

    const handleExcelDownload = () => {
  // Build an array-of-arrays for the whole week (ALL parameters)
  const headerTop = ['PARAMETER']
  weekDates.forEach(() => headerTop.push('Average Value', 'Current Value'))

  const rows = paramLabels
    .filter(l => selectedFilters.includes(l))
    .map((label) => {
      const row: any[] = [label]
      weekDates.forEach((_, index) => {
        const day = weekData[index]
        const avg = day?.average?.[label] ?? ''
        const current = day?.current?.[label] ?? ''
        row.push(avg, current)
      })
      return row
    })

  const aoa = [headerTop, ...rows]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, ws, 'Position Reports')
  XLSX.writeFile(wb, 'position_reports.xlsx')
}

    const handleDailyReportDownload = (date: Date) => {
  const ymd = toYMD(date)
  const idx = weekDates.findIndex(d => toYMD(d) === ymd)
  if (idx === -1) return

  const header = ['PARAMETER', 'Average Value', 'Current Value']
  const rows = paramLabels
    .filter(l => selectedFilters.includes(l))
    .map((label) => {
      const day = weekData[idx]
      const avg = day?.average?.[label] ?? ''
      const current = day?.current?.[label] ?? ''
      return [label, avg, current]
    })

  const aoa = [header, ...rows]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, ws, `Report ${ymd}`)
  XLSX.writeFile(wb, `position_report_${ymd}.xlsx`)
}


    const getWeekDates = (startDate: Date) => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const newDate = new Date(startDate);
            newDate.setDate(startDate.getDate() + i);
            dates.push(newDate);
        }
        return dates;
    };
    // Build week (ascending) and a reversed copy for display so latest is first
// const weekDatesAsc = getWeekDates(currentDate)
// const weekDates = [...weekDatesAsc].reverse()  // ⬅️ used by table/header (latest → earliest)

// Build week in ASC so columns show earliest → latest
const weekDates = getWeekDates(currentDate)


const monthName = currentDate.toLocaleString('default', { month: 'long' })
const weekOfMonth = Math.ceil(currentDate.getDate() / 7)

const formatWeekDisplay = (dates: Date[]) => {
        if (dates.length < 7) return '';
        const start = dates[0];
        const end = dates[6];
        const startMonth = start.toLocaleString('default', { month: 'short' });
        const endMonth = end.toLocaleString('default', { month: 'short' });
        const startDay = String(start.getDate()).padStart(2, '0');
        const endDay = String(end.getDate()).padStart(2, '0');
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();

        if (startYear === endYear) {
            if (startMonth === endMonth) {
                return `(${startMonth} ${startDay} - ${endDay}, ${startYear})`;
            } else {
                return `(${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear})`;
            }
        } else {
            return `(${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear})`;
        }
    };
        const weekDisplayString = formatWeekDisplay(weekDates);

        // 🔽 Only rows the user has selected via the filter chips
const filteredLabels = useMemo(
  () => paramLabels.filter((l) => selectedFilters.includes(l)),
  [paramLabels, selectedFilters]
)

const totalRows = filteredLabels.length
const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage))
const startIdx = (currentPage - 1) * rowsPerPage
const endIdx = startIdx + rowsPerPage

// 🔽 Labels to render on this page
const pagedLabels = filteredLabels.slice(startIdx, endIdx)

// Reset to page 1 whenever the set of filtered rows changes or page size changes
useEffect(() => {
  setCurrentPage(1)
}, [filteredLabels, rowsPerPage])


    const renderParamRow = (label: string) => {
  if (!selectedFilters.includes(label)) return null
// ✅ UI block: Filter Parameters (moved next to Vessel filter)


  return (
    <tr key={label}>
      <td className='fw-semibold bg-light'>{label}</td>
      {weekDates.map((_, index) => {
        const day = weekData[index]
        const avg = day?.average?.[label] ?? ''
        const current = day?.current?.[label] ?? ''
        return (
          <React.Fragment key={`${label}-${index}`}>
            <td className='text-center border-end'>{avg}</td>
            <td className='text-center'>{current}</td>
          </React.Fragment>
        )
      })}
    </tr>
  )
}

const FilterParametersPanel = () => (
  <div
    className="p-2 border rounded position-relative"
    style={{ backgroundColor: "#FAFAFA" }}
  >
    <div className="d-flex justify-content-between align-items-start gap-2">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fw-semibold mb-1" style={{ fontSize: "12px", color: "#5E6278" }}>
          Filter Parameters
        </div>

        {/* === Responsive chips with "Others" === */}
        <div className="d-flex flex-wrap gap-2 position-relative">
          {selectedFilters.length === 0 && (
            <span className="text-muted" style={{ fontSize: "12px" }}>
              No parameters selected
            </span>
          )}

          {(() => {
            const visible = isExpanded ? selectedFilters : selectedFilters.slice(0, chipLimit)
            const hiddenCount = Math.max(0, selectedFilters.length - visible.length)

            return (
              <>
                {visible.map((key) => {
                  const label = filterOptions.find((o) => o.key === key)?.label ?? key
                  return (
                    <span
                      key={key}
                      className="badge bg-secondary fw-semibold"
                      style={{ fontSize: "12px", padding: "6px 10px" }}
                      title={label}
                    >
                      {label}
                    </span>
                  )
                })}

                {!isExpanded && hiddenCount > 0 && (
                  <button
                    ref={othersBtnRef}
                    type="button"
                    className="badge border fw-semibold"
                    style={{
                      fontSize: "12px",
                      padding: "6px 10px",
                      backgroundColor: "#E8F4FF",
                      borderColor: "#B6E0FE",
                      color: "#0A66C2",
                      cursor: "pointer",
                    }}
                    onClick={() => setIsOthersOpen((v) => !v)}
                    aria-expanded={isOthersOpen}
                    aria-haspopup="true"
                    title="See other parameters"
                  >
                    +{hiddenCount} others
                  </button>
                )}

                {isOthersOpen && !isExpanded && (
                  <div
                    ref={othersMenuRef}
                    className="position-absolute bg-white border rounded shadow"
                    style={{
                      top: "calc(100% + 8px)",
                      left: 0,
                      width: 360,
                      maxWidth: "min(360px, 100%)",
                      maxHeight: 280,
                      overflowY: "auto",
                      zIndex: 10010,
                      padding: "10px",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="fw-semibold small">Other parameters</div>
                      <button className="btn btn-sm btn-light" onClick={() => setIsOthersOpen(false)}>
                        Close
                      </button>
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                      {selectedFilters.slice(chipLimit).map((key) => {
                        const label = filterOptions.find((o) => o.key === key)?.label ?? key
                        return (
                          <span
                            key={key}
                            className="badge bg-light text-muted border"
                            style={{ fontSize: "12px", padding: "6px 10px" }}
                            title={label}
                          >
                            {label}
                          </span>
                        )
                      })}
                    </div>

                    <div className="d-flex justify-content-end mt-3 gap-2">
                      <button
                        className="btn btn-sm btn-light"
                        onClick={() => {
                          setIsOthersOpen(false)
                          setIsExpanded(true)
                        }}
                      >
                        Expand all
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          setIsOthersOpen(false)
                          handleOpenFilterDropdown()
                        }}
                      >
                        Modify…
                      </button>
                    </div>
                  </div>
                )}

                {isExpanded && selectedFilters.length > chipLimit && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ms-1"
                    onClick={() => setIsExpanded(false)}
                    style={{ fontSize: 12 }}
                    title="Collapse extra chips"
                  >
                    Collapse
                  </button>
                )}
              </>
            )
          })()}
        </div>
      </div>

      <button
        className="btn btn-sm btn-primary"
        onClick={(e) => {
          e.stopPropagation()
          handleOpenFilterDropdown()
        }}
        style={{ minWidth: 86, height: 30 }}
      >
        Modify
      </button>
    </div>

    {/* Dropdown */}
    {showFilterDropdown && (
      <div
        className="position-absolute bg-white border rounded shadow-lg p-3"
        style={{
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "8px",
          maxHeight: "400px",
          overflowY: "auto",
          zIndex: 10000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
          <span className="fw-semibold">Filter Parameters</span>
          <button className="btn btn-sm btn-primary" onClick={handleApplyFilters}>
            Apply
          </button>
        </div>

        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="selectAll"
            checked={tempSelectedFilters.length === filterOptions.length}
            onChange={handleTempSelectAll}
            style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#3699FF" }}
          />
          <label className="form-check-label fw-semibold ms-2" htmlFor="selectAll" style={{ cursor: "pointer" }}>
            All Parameters
          </label>
        </div>

        {filterOptions.map((option) => (
          <div key={option.key} className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id={option.key}
              checked={tempSelectedFilters.includes(option.key)}
              onChange={() => handleTempFilterToggle(option.key)}
              style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#3699FF" }}
            />
            <label className="form-check-label ms-2" htmlFor={option.key} style={{ cursor: "pointer" }}>
              {option.label}
            </label>
          </div>
        ))}
      </div>
    )}
  </div>
)
    return (
        <div className='app-main flex-column flex-row-fluid' id='kt_app_main'
          style={{ height: '100dvh', overflow: 'hidden' }}   // ← stop page scroll here
>
            <div className='d-flex flex-column flex-column-fluid'
                style={{ minHeight: 0 }}                          // ← allow child to shrink for inner scroll
>
                <div id='kt_app_content' className='app-content flex-column-fluid' style={{ position: 'relative', overflow: 'hidden', minHeight: 0  }}>
                    <div className='card bg-white'>
                        {!embedded && (
                        <div className='card-header border-0 pt-5'>
                            <h3 className='card-title align-items-start flex-column'>
                                <span className='card-label fw-bold fs-3 mb-1'>Peninsular Maritime Report</span>
                            </h3>
                            <div className='card-toolbar'>
                                {showSearch ? (
                                    <div className='d-flex align-items-center position-relative'>
                                        <input
                                            ref={searchInputRef}
                                            type='text'
                                            className='form-control form-control-sm me-2'
                                            placeholder='Search...'
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onBlur={() => setShowSearch(false)}
                                            style={{width: '200px'}}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        className='btn btn-clean btn-sm btn-icon me-2'
                                        onClick={() => setShowSearch(true)}
                                    >
                                        <KTSVG path='/media/icons/duotune/general/gen021.svg' className='svg-icon-1' />
                                    </button>
                                )}
                                <button type='button' className='btn btn-sm btn-primary me-3' onClick={handleExcelDownload}>
                                    Save
                                </button>
                                <button type='button' className='btn btn-sm btn-primary me-3'>
                                    Share
                                </button>
                                <button className='btn btn-clean btn-sm btn-icon'>
                                    <KTSVG path='/media/icons/duotune/general/gen052.svg' className='svg-icon-1' />
                                </button>
                            </div>
                        </div>
                        )}

                        

                        <div className='px-9 pt-3 pb-4'>

                                                          {/* === TOP FILTERS (Company → Subcompany → Vessel), role-aware — mirrors RestHour === */}
                                                          <div className="mb-3">
                                                          <div className="d-flex align-items-end gap-3 flex-nowrap">
    {/* Left: Company/Subcompany/Vessel */}
    <div className="d-flex flex-wrap align-items-end gap-3" style={{ flex: "0 0 auto" }}>
      {(() => {
        const rId = roleId
        const isCrew = rId === 4
        if (isCrew) return null

      {/* compact table styles */}
<style>{`
  .table.compact th, .table.compact td { padding: 6px 8px !important; }
  .table.compact thead th { line-height: 1.1; }
  .table.compact thead .hdr-stack { gap: 2px; }          /* date+btn row + badge row */
  .table.compact thead .hdr-top { gap: 6px; }            /* date + icon distance */
  .table.compact thead .hdr-date { font-size: 12px; }
  .table.compact thead .hdr-btn { width: 22px; height: 22px; padding: 0; }
  .table.compact thead .hdr-badge { 
    font-size: 9px; padding: 2px 4px; line-height: 1; border-radius: 10px;
  }
  .table.compact thead .subhdr { font-size: 10px; padding: 4px 6px !important; }
`}</style>


      return (
        <div className='d-flex flex-wrap align-items-end gap-3'>
          {/* SUPERADMIN (1) & OPERATOR(superadmin-like): Company → (Subcompany if exists) → Vessel */}
          {(rId === 1 || operatorActsLikeSuperadmin) && (
            <>
              <div style={{ minWidth: 220 }}>
                <label className='form-label text-muted fw-semibold fs-7'>Company</label>
                <select
                  className='form-select form-select-sm'
                  value={filterCompanyGroupId}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : ''
                    setFilterCompanyGroupId(v)
                    setFilterCompanyAdminId('')
                    setFilterVesselId('')
                  }}
                >
                  <option value=''>All</option>
                  {companyGroupOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {typeof filterCompanyGroupId === 'number' &&
                subcompanyOptions.some((sc) => sc.companyGroupId === filterCompanyGroupId) && (
                <div style={{ minWidth: 220 }}>
                  <label className='form-label text-muted fw-semibold fs-7'>Subcompany</label>
                  <select
                    className='form-select form-select-sm'
                    value={filterCompanyAdminId}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : ''
                      setFilterCompanyAdminId(v)
                      setFilterVesselId('')
                    }}
                  >
                    <option value=''>All</option>
                    {subcompanyOptions.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ minWidth: 220 }}>
                <label className='form-label text-muted fw-semibold fs-7'>Vessel</label>
                <select
                  className='form-select form-select-sm'
                  value={filterVesselId}
                  onChange={(e) => setFilterVesselId(e.target.value ? Number(e.target.value) : '')}
                  disabled={vesselOptions.length === 0}
                >
                  <option value=''>All Vessels</option>
                  {vesselOptions.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* COMPANY GROUP ADMIN (5) & OPERATOR(group-admin-like): Subcompany → Vessel */}
          {(rId === 5 || operatorActsLikeGroupAdmin) && (
            <>
              {subcompanyOptions.length > 0 && (
                <div style={{ minWidth: 220 }}>
                  <label className='form-label text-muted fw-semibold fs-7'>Subcompany</label>
                  <select
                    className='form-select form-select-sm'
                    value={filterCompanyAdminId}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : ''
                      setFilterCompanyAdminId(v)
                      setFilterVesselId('')
                    }}
                  >
                    <option value=''>All</option>
                    {subcompanyOptions.map((sc) => (
                      <option key={sc.id} value={sc.id}>{sc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ minWidth: 220 }}>
                <label className='form-label text-muted fw-semibold fs-7'>Vessel</label>
                <select
                  className='form-select form-select-sm'
                  value={filterVesselId}
                  onChange={(e) => setFilterVesselId(e.target.value ? Number(e.target.value) : '')}
                  disabled={vesselOptions.length === 0}
                >
                  <option value=''>All Vessels</option>
                  {vesselOptions.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* SUBCOMPANY ADMIN (2): Vessel only */}
          {rId === 2 && (
            <div style={{ minWidth: 220 }}>
              <label className='form-label text-muted fw-semibold fs-7'>Vessel</label>
              <select
                className='form-select form-select-sm'
                value={filterVesselId}
                onChange={(e) => setFilterVesselId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value=''>All Vessels</option>
                {vesselOptions.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )
    })()}
  </div>

 {/* Right: Filter Parameters */}
 <div
  className="ms-auto"
  style={{
    flex: "1 1 auto",   // ✅ take remaining width
    minWidth: 0,        // ✅ IMPORTANT so it can shrink inside flex row
  }}
>
  <FilterParametersPanel />
</div>

  </div>
</div>
                            <div className='row g-4'>
  <div className='col'>
    <div className='text-muted small '>Captain Name</div>
    <div className='fw-bold' style={{ fontSize: '13px' }}>
      {opsLoading ? 'Loading…' : (ops?.masterName || '--')}
    </div>
  </div>

  <div className='col'>
    <div className='text-muted small '>Phone Number</div>
    <div className='fw-bold' style={{ fontSize: '13px' }}>
      {opsLoading ? 'Loading…' : (ops?.masterContactNumber || '--')}
    </div>
  </div>

  <div className='col'>
    <div className='text-muted small '>Next Port Name</div>
    <div className='fw-bold' style={{ fontSize: '13px' }}>
      {opsLoading ? 'Loading…' : (ops?.nextPort || '--')}
    </div>
  </div>

  <div className='col'>
    <div className='text-muted small '>ETA</div>
    <div className='fw-bold' style={{ fontSize: '13px' }}>
      {opsLoading ? 'Loading…' : toLocalYMDHM(ops?.eta)}
    </div>
  </div>

  {/* Commented out per request */}
  {/*
  <div className='col'>
    <div className='text-muted small mb-1'>Renewals Due</div>
    <div className='fw-bold text-danger' style={{ fontSize: '15px' }}>2 items</div>
  </div>
  */}
</div>

{opsError && (
  <div className='text-danger small mt-2'>
    {opsError}
  </div>
)}

                        </div>

                        <div className='card-body py-3'>

                           
                            
                            {/* Week controls + weekly download in one row */}
<div className='d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3'>
  {/* Left: week navigation */}
  <div className='d-flex align-items-center gap-3'>
    <button className='btn btn-icon btn-sm btn-light' onClick={handlePreviousWeek}>
      <ArrowLeftIcon className='svg-icon-2' />
    </button>

    <span className='fw-semibold '>
      {monthName}, Week {weekOfMonth} {weekDisplayString}
    </span>

    <button
      className='btn btn-icon btn-sm btn-light'
      onClick={handleNextWeek}
      disabled={addDays(currentDate, 6) >= startOfToday()} // end of window is today → can’t go forward
      title={addDays(currentDate, 6) >= startOfToday() ? 'Cannot go beyond current week' : undefined}
    >
      <ArrowRightIcon className='svg-icon-2' />
    </button>
  </div>

  {/* Right: weekly download */}
  <button className='btn btn-sm btn-light-primary ms-auto' onClick={handleExcelDownload}>
    <DownloadIcon className='svg-icon-4 me-2' />
    Download this week's report
  </button>
</div>


                            <div
  ref={tableWrapRef}
  className='report-table table-responsive'
  style={{
    overflow: 'auto',
    height: 0,       // will be overridden by the effect
    maxHeight: 'none',
    paddingBottom: 0
  }}
>

                                <table className='table table-bordered table-hover align-middle compact'>
<thead
  className='table-header text-center bg-light'
  style={{ position: 'sticky', top: 0, zIndex: 2, boxShadow: '0 1px 0 rgba(0,0,0,0.05)' }}
>
                                        <tr>
                                            <th rowSpan={2} onClick={() => handleSort('date')} className='cursor-pointer align-middle fw-bolder'>
                                                PARAMETER
                                            </th>
                                            {weekDates.map((date, index) => {
                                                const isWeekStart = index === 0
                                                return (
                                                    <th key={index} colSpan={2} className='fw-bolder'
  style={{ backgroundColor: '#f8f9fa', borderLeft: '2px solid #dee2e6', paddingTop: 6, paddingBottom: 6 }}
>
  <div className='d-flex flex-column align-items-center justify-content-center hdr-stack'>
    {/* Row 1: Date + download */}
    <div className='d-flex align-items-center justify-content-center hdr-top'>
      <span className='hdr-date'>
        {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
          .toUpperCase()
          .replace(' ', '-')}
      </span>
      <button
        className='btn btn-icon btn-sm btn-active-light-primary ms-1 hdr-btn'
        onClick={() => handleDailyReportDownload(date)}
        title='Download'
        aria-label='Download daily report'
        style={{ lineHeight: 1 }}
      >
        <DownloadIcon className='svg-icon-5' />
      </button>
    </div>

    {/* Row 2: tiny reportType badge */}
    {(() => {
      const rType = weekData?.[index]?.reportType
      if (!rType) return null
      return (
        <span
          className='badge rounded-pill mt-1 hdr-badge'
          style={{
            backgroundColor: '#F3F6F9',
            border: '1px solid #E4E6EF',
            color: '#5E6278',
            whiteSpace: 'nowrap'
          }}
          title={`Latest report type for the day: ${rType}`}
          aria-label={`Latest report type for the day: ${rType}`}
        >
          {rType}
        </span>
      )
    })()}
  </div>
</th>

                                                )
                                            })}
                                        </tr>
                                        <tr>
                                            {weekDates.map((_, index) => {
                                                const isWeekStart = index === 0
                                                return (
                                                    <React.Fragment key={index}>
                                                        {/* <th 
                                                            className='fw-semibold border-end'
                                                            style={{
                                                                backgroundColor: isWeekStart ? '#f8f9fa' : '#f8f9fa',
                                                                borderLeft: isWeekStart ? '2px solid #dee2e6' : '2px solid #dee2e6',
                                                                borderRight: '1px solid #adb5bd',
                                                            }}
                                                        >Average Value</th>
                                                        <th 
                                                            className='fw-semibold'
                                                            style={{
                                                                backgroundColor: isWeekStart ? '#f8f9fa' : '#f8f9fa',
                                                            }}
                                                        >Current Value</th> */}
                                                        <th className='fw-semibold border-end subhdr text-nowrap' 
                                                        style={{
                                                                backgroundColor: isWeekStart ? '#f8f9fa' : '#f8f9fa',
                                                                borderLeft: isWeekStart ? '2px solid #dee2e6' : '2px solid #dee2e6',
                                                                borderRight: '1px solid #adb5bd',
                                                            }}
                                                            >
  Average
</th>
<th className='fw-semibold subhdr text-nowrap' 
 style={{
                                                                backgroundColor: isWeekStart ? '#f8f9fa' : '#f8f9fa',
                                                            }}
                                                            >
  Current
</th>

                                                    </React.Fragment>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                   <tbody className='table-body text-start text-nowrap'>
  {loadingWeek && (
    <tr>
      <td colSpan={1 + weekDates.length * 2} className='text-center py-5'>Loading…</td>
    </tr>
  )}

  {apiError && !loadingWeek && (
    <tr>
      <td colSpan={1 + weekDates.length * 2} className='text-danger text-center py-5'>
        {apiError}
      </td>
    </tr>
  )}

  {!loadingWeek && !apiError && filteredLabels.length === 0 && (
    <tr>
      <td colSpan={1 + weekDates.length * 2} className='text-center py-5 text-muted'>
        No data for selected parameters.
      </td>
    </tr>
  )}

  {!loadingWeek && !apiError && pagedLabels.map(renderParamRow)}
</tbody>

                                </table>

                               {/* 🔽 Row pagination controls — MATCH CrewingList look & feel */}
<div className="pagination-wrapper d-flex justify-content-between align-items-center py-3"
  style={{ position: 'sticky', bottom: 0, background: '#fff' }}   // ⬅️ add this
>
  {/* Left: rows-per-page */}
  <div className="d-flex align-items-center">
    <span className="text-muted me-2">Rows per page</span>
    <select
      className="form-select"
      style={{
        borderRadius: '20px',
        width: '70px',
        border: '1px solid #dee2e6',
        fontSize: '14px',
        padding: '4px 8px',
      }}
      value={rowsPerPage}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10)
        setRowsPerPage(Number.isFinite(v) ? v : 10)
        setCurrentPage(1)
      }}
    >
      <option value={5}>5</option>
      <option value={10}>10</option>
      <option value={20}>20</option>
      <option value={50}>50</option>
    </select>
  </div>

  {/* Right: range + numbered pagination with ellipsis */}
  <div className="d-flex align-items-center">
    <span className="text-muted me-3" style={{ fontSize: '14px' }}>
      Showing <strong>{totalRows === 0 ? 0 : startIdx + 1}-{Math.min(endIdx, totalRows)}</strong> of <strong>{totalRows}</strong>
    </span>

    <nav>
      <ul className="pagination pagination-sm mb-0" style={{ gap: '2px' }}>
        {/* Prev */}
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link text-muted"
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '6px',
            }}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ‹
          </button>
        </li>

        {/* Numbered pages with ellipsis (max 5 visible) */}
        {(() => {
          const pages: JSX.Element[] = []
          const showPages = 5
          let startPage = Math.max(1, currentPage - 2)
          let endPage   = Math.min(totalPages, startPage + showPages - 1)
          if (endPage - startPage < showPages - 1) startPage = Math.max(1, endPage - showPages + 1)

          if (startPage > 1) {
            pages.push(
              <li key={1} className="page-item">
                <button
                  className="page-link text-muted"
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    padding: '8px 12px',
                    fontSize: '14px',
                    minWidth: '40px',
                    borderRadius: '6px',
                  }}
                  onClick={() => setCurrentPage(1)}
                >
                  1
                </button>
              </li>
            )
            if (startPage > 2) {
              pages.push(
                <li key="ellipsis1" className="page-item disabled">
                  <span
                    className="page-link border-0 text-muted"
                    style={{ backgroundColor: 'transparent', padding: '4px 8px' }}
                  >
                    ...
                  </span>
                </li>
              )
            }
          }

          for (let i = startPage; i <= endPage; i++) {
            pages.push(
              <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                <button
                  className="page-link text-muted"
                  style={{
                    backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent',
                    border: '1px solid #dee2e6',
                    padding: '8px 12px',
                    fontSize: '14px',
                    minWidth: '40px',
                    borderRadius: '6px',
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                  onClick={() => setCurrentPage(i)}
                >
                  {i}
                </button>
              </li>
            )
          }

          if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
              pages.push(
                <li key="ellipsis2" className="page-item disabled">
                  <span
                    className="page-link border-0 text-muted"
                    style={{ backgroundColor: 'transparent', padding: '4px 8px' }}
                  >
                    ...
                  </span>
                </li>
              )
            }
            pages.push(
              <li key={totalPages} className="page-item">
                <button
                  className="page-link text-muted"
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    padding: '8px 12px',
                    fontSize: '14px',
                    minWidth: '40px',
                    borderRadius: '6px',
                  }}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </button>
              </li>
            )
          }

          return pages
        })()}

        {/* Next */}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link text-muted"
            style={{
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '6px',
            }}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
        </div>
    );
};

export default PositionReport;