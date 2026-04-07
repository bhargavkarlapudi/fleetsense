import {FC, useState, useMemo, useEffect} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import AddRestHourModal from './AddRestHourModal'
import React from 'react'
import {
  getCrewList,
  getRestHourEntriesInRange,
  getRollingMatrixSummaries,
  getVesselList,
  saveRestHourEntries,
  deleteWorkingSlots,
  approveRestDay,
  getCompanyList,
  getCompanyAdminList,
  getRanksforList,
  patchSummaryRemarks,
  Regulation,
} from '../core/_requests'
import {useAuth} from '../../auth'
import {Crew, Vessel} from '../core/_models'
import {toast} from 'react-toastify'
import {ToastContainer} from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {saveAs} from 'file-saver'

// build YYYY-MM-DD array (UTC)
const buildDateKeys = (startISO: string, endISO: string) => {
  const out: string[] = []
  const cur = new Date(startISO + 'T00:00:00Z')
  const end = new Date(endISO + 'T00:00:00Z')
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}

const crewDisplayName = (c: any) => c?.crewName || c?.name || `#${c?.crewId || c?.id || ''}`

// flatten violations for Excel sheet
const flattenViolations = (crewList: any[], dateKeys: string[], hoursMap: Record<string, any>) => {
  const rows: Array<{Crew: string; Date: string; Violation: string}> = []
  for (const c of crewList) {
    for (const d of dateKeys) {
      const cell = hoursMap[`${c.crewId}-${d}`]
      if (!cell || !Array.isArray(cell.violations) || !cell.violations.length) continue
      cell.violations.forEach((desc: string) => {
        rows.push({Crew: crewDisplayName(c), Date: d, Violation: desc})
      })
    }
  }
  return rows
}

// Legacy rolling tooltip helpers (kept for reference).
// const rollingWindowLabels: Record<string, string> = {
//   ROLLING_24H: 'Rolling 24h',
//   ROLLING_72H: 'Rolling 72h',
//   ROLLING_7D: 'Rolling 7d',
// }
//
// const formatRollingDateTime = (value?: string | null) => {
//   if (!value) return ''
//   const date = new Date(value)
//   if (Number.isNaN(date.getTime())) return String(value)
//   return date.toLocaleString('en-GB', {
//     day: '2-digit',
//     month: 'short',
//     year: 'numeric',
//     hour: '2-digit',
//     minute: '2-digit',
//   })
// }
//
// const buildRollingTooltip = (data: RollingExceptionResponse, asOf?: string | null) => {
//   const header = asOf ? `Rolling as of ${formatRollingDateTime(asOf)}` : 'Rolling exceptions'
//   const lines = (data.windows ?? []).map((rollingWindow) => {
//     const label = rollingWindowLabels[rollingWindow.code] ?? rollingWindow.code
//     const range = `${formatRollingDateTime(rollingWindow.windowStart)} -> ${formatRollingDateTime(
//       rollingWindow.windowEnd
//     )}`
//     const status = rollingWindow.violated ? 'VIOLATION' : 'OK'
//     const base = `${label}: ${status} (${range})`
//     if (rollingWindow.exceptions && rollingWindow.exceptions.length) {
//       return `${base}\n${rollingWindow.exceptions.join('; ')}`
//     }
//     return base
//   })
//   return [header, ...lines].join('\n')
// }

  // --- Rank sorting helpers (share same spec as SignPage) ---
const RANK_ORDER = [
  'MASTER','CHIEF OFFICER','SECOND OFFICER','THIRD OFFICER','DECK CADET',
  'CHIEF ENGINEER','SECOND ENGINEER','THIRD ENGINEER','FOURTH ENGINEER',
  'TRAINEE MARINE ENGINEER','ELECTRICAL OFFICER','BOSUN','PUMPMAN',
  'ABLE SEAMAN','ORDINARY SEAMAN','TR. SEAMAN','OILER','WIPER','TR WIPER',
  'FITTER','CHIEF COOK','GENERAL STEWARD',
] as const;

const RANK_REGEX: Record<string, RegExp[]> = {
  MASTER: [/(^|\s)master\b/i],
  'CHIEF OFFICER': [/chief\s*officer/i, /\bc\s*\/\s*o\b/i],
  'SECOND OFFICER': [/second\s*officer/i, /\b2\s*\/\s*o\b/i],
  'THIRD OFFICER': [/third\s*officer/i, /\b3\s*\/\s*o\b/i],
  'DECK CADET': [/deck\s*cadet/i],
  'CHIEF ENGINEER': [/chief\s*engineer/i, /\bc\s*\/\s*e\b/i],
  'SECOND ENGINEER': [/second\s*engineer/i, /\b2\s*\/\s*e\b/i],
  'THIRD ENGINEER': [/third\s*engineer/i, /\b3\s*\/\s*e\b/i],
  'FOURTH ENGINEER': [/fourth\s*engineer/i, /\b4\s*\/\s*e\b/i, /fouth\s*engineer/i],
  'TRAINEE MARINE ENGINEER': [/engine\s*cadet/i, /trainee\s*marine\s*engineer/i, /\btme\b/i],
  'ELECTRICAL OFFICER': [/electrician/i, /electrical/i, /\beto\b/i],
  BOSUN: [/\bbosun\b/i, /boatswain/i],
  PUMPMAN: [/pumpman/i],
  'ABLE SEAMAN': [/able\s*seaman/i, /\bab\b(?![a-z])/i],
  'ORDINARY SEAMAN': [/ordinary\s*seaman/i, /\bos\b(?![a-z])/i],
  'TR. SEAMAN': [/trainee.*seaman/i, /\btr\.?\s*seaman\b/i],
  OILER: [/oiler/i, /motorman/i],
  WIPER: [/wiper\b/i],
  'TR WIPER': [/trainee.*wiper/i, /\btr\.?\s*wiper\b/i],
  FITTER: [/fitter\b/i],
  'CHIEF COOK': [/chief\s*cook/i],
  'GENERAL STEWARD': [/steward/i, /messman/i],
};

const getCanonicalRank = (label?: string): string => {
  const s = (label ?? '').trim();
  for (const [canon, patterns] of Object.entries(RANK_REGEX)) {
    if (patterns.some(rx => rx.test(s))) return canon;
  }
  return 'OTHER';
};

const getRankSuffix = (label?: string): number => {
  const s = (label ?? '').trim();
  const m = s.match(/-\s*(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
};

const rankTuple = (label?: string): [number, number, number, string] => {
  const canon = getCanonicalRank(label);
  const groupIdx = canon === 'OTHER' ? 999 : RANK_ORDER.indexOf(canon as any) + 1;
  const suffix = getRankSuffix(label);
  const baseFirstFlag = suffix === 0 ? 0 : 1;
  return [groupIdx, baseFirstFlag, suffix, (label ?? '')];
};

const compareRank = (a?: string, b?: string, dir: 'asc' | 'desc' = 'asc'): number => {
  const A = rankTuple(a);
  const B = rankTuple(b);
  const cmp = (A[0] - B[0]) || (A[1] - B[1]) || (A[2] - B[2]) || A[3].localeCompare(B[3]);
  return dir === 'asc' ? cmp : -cmp;
};

// === CONFIG ===
const ROLLING_WINDOW_DAYS = 7;
const UPDATE_EDITABLE_LOOKBACK_DAYS = ROLLING_WINDOW_DAYS + 1; // +1 day to cover rolling window across midnight

// returns {fromISO, toISO} for last N days ending today (UTC)
const getLastNDaysRange = (n: number) => {
  const to = new Date()
  to.setUTCHours(0, 0, 0, 0)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - (n - 1))
  return {
    fromISO: from.toISOString().slice(0, 10),
    toISO: to.toISOString().slice(0, 10),
  }
}

const notify = {
  success: (msg: string) => toast.success(msg, {autoClose: 4000}),
  error: (msg: string) => toast.error(msg, {autoClose: 6000}),
  warn: (msg: string) => toast.warn(msg, {autoClose: 4000}),
  info: (msg: string) => toast.info(msg, {autoClose: 4000}),
}

const asApiError = (err: any, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback

const getDatesInRange = (startDate: string, endDate: string): Date[] => {
  const dates: Date[] = []
  // Use UTC to avoid timezone issues when incrementing dates
  const currentDate = new Date(startDate + 'T00:00:00Z')
  const lastDate = new Date(endDate + 'T00:00:00Z')

  while (currentDate <= lastDate) {
    dates.push(new Date(currentDate))
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  }
  return dates
}

type ViolationSet = {
  minRest24h: {value: number; isViolation: boolean}
  minRest7d: {value: number; isViolation: boolean}
  maxInterval: {value: number; isViolation: boolean}
  maxPeriods: {value: number; isViolation: boolean}
  minSingleRest: {value: number; isViolation: boolean}
}

type MLCViolationSet = {
  maxWork24h: {value: number; isViolation: boolean}
  maxWork7d: {value: number; isViolation: boolean}
  minRest7d?: {value: number; isViolation: boolean}
}

/**
 * workSlots: 48 booleans (true = WORK, false = REST) for the day, 30-min granularity
 */
const checkRestViolations = (workSlots: boolean[]): ViolationSet => {
  const SLOT_HRS = 0.5

  // --- totals ---
  const totalWorkSlots = workSlots.filter(Boolean).length
  const totalRestHrs = 24 - totalWorkSlots * SLOT_HRS

  // --- max continuous WORK (to enforce "interval between two rest periods <= 14h") ---
  let maxContinuousWork = 0
  let curWork = 0
  for (const w of workSlots) {
    if (w) {
      curWork++
    } else {
      if (curWork > maxContinuousWork) maxContinuousWork = curWork
      curWork = 0
    }
  }
  if (curWork > maxContinuousWork) maxContinuousWork = curWork
  const maxIntervalBetweenRests = maxContinuousWork * SLOT_HRS

  // --- build contiguous REST blocks (in hours) ---
  const restBlocksHrs: number[] = []
  let curRest = 0
  for (const w of workSlots) {
    if (!w) {
      curRest++
    } else if (curRest > 0) {
      restBlocksHrs.push(curRest * SLOT_HRS)
      curRest = 0
    }
  }
  if (curRest > 0) restBlocksHrs.push(curRest * SLOT_HRS)

  const longestSingleRestHrs = restBlocksHrs.length ? Math.max(...restBlocksHrs) : 0

  // --- Max Divisions rule (relaxed as requested) ---
  // If the day already satisfies: (total rest >= 10h) AND (one block >= 6h),
  // then DO NOT hit the "More than 2 rest periods/day" violation regardless of splits.
  const suppressMaxDivisions = totalRestHrs >= 10 && longestSingleRestHrs >= 6

  // Can the required 10h be covered by <= 2 rest periods?
  const sorted = [...restBlocksHrs].sort((a, b) => b - a)
  const top1 = sorted[0] ?? 0
  const top2 = sorted[1] ?? 0
  const covers10WithTwo = top1 >= 10 || top1 + top2 >= 10

  const maxDivisionsViolation = suppressMaxDivisions ? false : totalRestHrs >= 10 && !covers10WithTwo

  return {
    minRest24h: {value: 10, isViolation: totalRestHrs < 10},
    minRest7d: {value: 77, isViolation: false},
    maxInterval: {value: 14, isViolation: maxIntervalBetweenRests > 14},
    maxPeriods: {value: 2, isViolation: maxDivisionsViolation},
    minSingleRest: {value: 6, isViolation: longestSingleRestHrs < 6},
  }
}

// Compute MLC daily/weekly breaches (72h in 7d; 14h/day)
// When exceptions ON, also compute minRest7d >= 70h
const checkMLCViolations = (
  workSlots: boolean[],
  sevenDayWorkTotal: number,
  sevenDayRestTotal: number,
  allowExceptions: boolean
): MLCViolationSet => {
  const SLOT_HRS = 0.5
  const dailyWork = workSlots.filter(Boolean).length * SLOT_HRS
  const v: MLCViolationSet = {
    maxWork24h: {value: 14, isViolation: dailyWork > 14},
    maxWork7d: {value: 72, isViolation: sevenDayWorkTotal > 72},
  }
  if (allowExceptions) {
    v.minRest7d = {value: 70, isViolation: sevenDayRestTotal < 70}
  }
  return v
}

type CompanyGroupOpt = {id: number; name: string}
type SubcompanyOpt = {id: number; name: string; companyGroupId?: number}
type VesselOpt = {id: number; name: string}

interface UpdateTabProps {
  activeTab: string
  fromDate: string
  toDate: string
  selectedRank: string
  selectedCrew: {id: number; name: string} | null
  crewMembers: any[]
  timeSlots: any[]
  // isWorkingHour: (memberId: number, date: Date, timeIndex: number) => boolean;
  toggleWorkingHour: (memberId: number, date: Date, timeIndex: number) => void
  setWorkingHours: (hours: Set<string>) => void
  showTable: boolean // Add this prop
  // onSaveWorkingHours?: (crewMemberId: number, dateRange: Date[]) => void;
  remarks: Map<string, string>
  onRemarksChange: (date: Date, value: string) => void

  // NEW: patch Matrix Overview immediately after save
  onLocalSummaryChange?: (
    crewId: number,
    summaryByDate: Record<
      string,
      {
        work: number
        rest: number
        compliant: boolean
        violationCount: number
        violations: string[]
        violationCodes?: string[]
      }
    >
  ) => void

  // NEW: refresh summaries from server after save
  onAfterSave?: () => Promise<void> | void
  approvedDates?: Set<string>
  getSummaryId?: (crewId: number, dateISO: string) => number | null
  dirtyRemarkDates?: Set<string>
  onResetRemarkEdits? : () => void
  regulation: Regulation
  allowExceptions: boolean
}

const UpdateTab: FC<UpdateTabProps> = ({
  activeTab,
  fromDate,
  toDate,
  selectedRank,
  selectedCrew,
  crewMembers,
  timeSlots,
  // isWorkingHour,
  toggleWorkingHour,
  setWorkingHours,
  showTable, // Receive the prop from parent
  // onSaveWorkingHours,
  remarks,
  onRemarksChange,
  onLocalSummaryChange,
  onAfterSave,
  approvedDates,
  getSummaryId,
  dirtyRemarkDates,
  onResetRemarkEdits,
  regulation,
  allowExceptions,
}) => {
  const [selectedEntries, setSelectedEntries] = React.useState<{date: string; slotIndex: number}[]>(
    []
  )
  // Track explicit "turn OFF" actions (W -> R)
  const [pendingDeletes, setPendingDeletes] = React.useState<{date: string; slotIndex: number}[]>(
    []
  )

  // Cache of effective working slots per day (API + local edits)
  const [effectiveWorkingByDate, setEffectiveWorkingByDate] = React.useState<
    Record<string, Set<number>>
  >({})

  const [apiEntries, setApiEntries] = useState<any[]>([])
  const [error, setError] = useState('')
  const {currentUser} = useAuth()
  const isMasterByName = (currentUser?.rank?.rank ?? '').toLowerCase().includes('master')

  const vesselId = currentUser?.vessel?.id
  const crewId = currentUser?.roleEntityId
  const roleId = currentUser?.role?.id
  const rankId = currentUser?.rank?.id
  // Operator flavors:
// - No companyGroupAdminId => acts like Superadmin
// - Has companyGroupAdminId => acts like Company Group Admin
const isOperator = roleId === 6
const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
const operatorActsLikeGroupAdmin = isOperator && !!currentUser?.companyGroupAdminId


  // --- Double-click & drag (paint) state ---
const SINGLE_CLICK_DELAY = 220; // ms: delay to see if a double click is coming

const singleClickTimerRef = React.useRef<number | null>(null);
// We don't need to store the pending click target; we cancel the timer on the 2nd down.

type BrushState = {
  active: boolean
  date: string
  targetWorking: boolean  // what we are painting to: true = W, false = R
  lastIndex: number       // last slot index we painted to (for gap fill)
}
const brushRef = React.useRef<BrushState>({
  active: false,
  date: '',
  targetWorking: false,
  lastIndex: -1,
})

useEffect(() => {
  const endBrush = () => {
    if (brushRef.current.active) {
      brushRef.current.active = false
      brushRef.current.date = ''
      brushRef.current.lastIndex = -1
    }
  }
  window.addEventListener('mouseup', endBrush)
  window.addEventListener('mouseleave', endBrush)
  return () => {
    window.removeEventListener('mouseup', endBrush)
    window.removeEventListener('mouseleave', endBrush)
  }
}, [])


  // if Master (rankId === 1) and a crew is selected, use that crew’s id; otherwise use self
  // const effectiveCrewId = (rankId === 1 && selectedCrew?.id) ? selectedCrew.id : crewId;
  const effectiveCrewId = isMasterByName && selectedCrew?.id ? selectedCrew.id : crewId

  // stick with current user’s vessel (adjust here if you allow switching vessel)
  const effectiveVesselId = vesselId

  // helper to read working flag regardless of API field name
  const getWorkingFlag = (e: any) => Boolean(e?.isWorking ?? e?.working)

  // ADD — helper to check if a day is approved/locked
  const isDateLocked = (dateISO: string) => approvedDates?.has(dateISO) === true

  // Small utility to warn once per interaction
  const warnLocked = (dateISO: string) => {
    notify?.warn?.(`This date (${dateISO}) is approved and cannot be edited.`)
  }

  const toDateKey = (value: Date) => {
    const yyyy = value.getFullYear()
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const dd = String(value.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const floorToHalfHourLocal = (value: Date) => {
    const next = new Date(value.getTime())
    const minutes = next.getMinutes()
    next.setMinutes(minutes < 30 ? 0 : 30, 0, 0)
    return next
  }

  const formatRollingTime = (value: Date) =>
    value.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

  const formatRollingDateTime = (value: Date) =>
    value.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

  const [rollingAnchorLocal, setRollingAnchorLocal] = React.useState<Date>(() =>
    floorToHalfHourLocal(new Date())
  )

  const parseLocalDate = (dateKey: string) => {
    const [yyyy, mm, dd] = dateKey.split('-').map(Number)
    return new Date(yyyy, (mm ?? 1) - 1, dd ?? 1)
  }

  useEffect(() => {
    if (activeTab !== 'update') return

    const tick = () => setRollingAnchorLocal(floorToHalfHourLocal(new Date()))
    tick()

    const now = new Date()
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()
    const millis = now.getMilliseconds()
    const nextHalf = minutes < 30 ? 30 : 60
    const msToNext =
      ((nextHalf - minutes) * 60 - seconds) * 1000 - millis

    let intervalId: number | null = null
    const timeoutId = window.setTimeout(() => {
      tick()
      intervalId = window.setInterval(tick, 30 * 60 * 1000)
    }, Math.max(msToNext, 0))

    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId !== null) window.clearInterval(intervalId)
    }
  }, [activeTab])

  const rollingWindow = useMemo(() => {
    const end = rollingAnchorLocal
    const start = new Date(end.getTime() - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const slots: Array<{start: Date; dateKey: string; slotIndex: number}> = []
    const totalSlots = ROLLING_WINDOW_DAYS * 48
    for (let i = 0; i < totalSlots; i++) {
      const slotStart = new Date(start.getTime() + i * 30 * 60 * 1000)
      const dateKey = toDateKey(slotStart)
      const slotIndex =
        slotStart.getHours() * 2 + (slotStart.getMinutes() >= 30 ? 1 : 0)
      slots.push({start: slotStart, dateKey, slotIndex})
    }
    return {start, end, slots}
  }, [rollingAnchorLocal, toDateKey])

  const rollingDayWindows = useMemo(() => {
    const windows: Array<{
      start: Date
      end: Date
      endKey: string
      slots: Array<{start: Date; dateKey: string; slotIndex: number}>
    }> = []
    const base = rollingWindow.start
    for (let d = 0; d < ROLLING_WINDOW_DAYS; d++) {
      const dayStart = new Date(base.getTime() + d * 24 * 60 * 60 * 1000)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
      const slots: Array<{start: Date; dateKey: string; slotIndex: number}> = []
      for (let i = 0; i < 48; i++) {
        const slotStart = new Date(dayStart.getTime() + i * 30 * 60 * 1000)
        const dateKey = toDateKey(slotStart)
        const slotIndex =
          slotStart.getHours() * 2 + (slotStart.getMinutes() >= 30 ? 1 : 0)
        slots.push({start: slotStart, dateKey, slotIndex})
      }
      windows.push({start: dayStart, end: dayEnd, endKey: toDateKey(dayEnd), slots})
    }
    return windows
  }, [rollingWindow, toDateKey])

  const rollingHeaderSlots = useMemo(() => {
    if (rollingDayWindows.length) return rollingDayWindows[0].slots
    return rollingWindow.slots.slice(0, 48)
  }, [rollingDayWindows, rollingWindow])

  const useRollingWindow = true

  // Fetch when dates change
  useEffect(() => {
    if (fromDate && toDate && effectiveCrewId && effectiveVesselId) {
      // clear local overrides when selection/range changes so API state shows cleanly
      setSelectedEntries([])
      setPendingDeletes([])
      fetchRestHourEntries(fromDate, toDate, effectiveCrewId, effectiveVesselId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, effectiveCrewId, effectiveVesselId])

  // Build the effective map whenever API/local edits change
  useEffect(() => {
    const map: Record<string, Set<number>> = {}
    for (const e of apiEntries) {
      if (!map[e.entryDate]) map[e.entryDate] = new Set<number>()
      if (getWorkingFlag(e)) map[e.entryDate].add(e.slotIndex)
    }
    for (const e of selectedEntries) {
      if (!map[e.date]) map[e.date] = new Set<number>()
      map[e.date].add(e.slotIndex)
    }
    for (const d of pendingDeletes) {
      map[d.date]?.delete(d.slotIndex)
    }
    setEffectiveWorkingByDate(map)
  }, [apiEntries, selectedEntries, pendingDeletes])

  // Anchored 7-day windows (ends aligned to the selected toDate)
  const [anchored7d, setAnchored7d] = React.useState<
    Record<string, {windowStart: string; totalRest: number; violated: boolean}>
  >({})
  useEffect(() => {
    if (!fromDate || !toDate) return

    const dateKey = (d: Date) => d.toISOString().slice(0, 10)
    const allDates = getDatesInRange(fromDate, toDate)

    // daily rest from effective working
    const dailyRest: Record<string, number> = {}
    for (const d of allDates) {
      const k = dateKey(d)
      const workCount = effectiveWorkingByDate[k]?.size ?? 0
      dailyRest[k] = 24 - workCount * 0.5
    }

    const blocks: Record<string, {windowStart: string; totalRest: number; violated: boolean}> = {}
    const fm = new Date(fromDate + 'T00:00:00Z')
    let blockEnd = new Date(toDate + 'T00:00:00Z')

    while (true) {
      const blockStart = new Date(blockEnd)
      blockStart.setUTCDate(blockStart.getUTCDate() - 6)
      if (blockStart < fm) break

      let sum = 0
      const cur = new Date(blockStart)
      while (cur <= blockEnd) {
        sum += dailyRest[dateKey(cur)] ?? 24
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
      blocks[dateKey(blockEnd)] = {
        windowStart: dateKey(blockStart),
        totalRest: sum,
        violated: sum < 77,
      }
      blockEnd.setUTCDate(blockEnd.getUTCDate() - 7)
    }

    setAnchored7d(blocks)
  }, [fromDate, toDate, effectiveWorkingByDate])

  // MLC: anchored 7d WORK totals aligned the same way as anchored7d
const anchored7dWork = useMemo(() => {
  if (!fromDate || !toDate) return {} as Record<string, { totalWork: number }>
  const key = (d: Date) => d.toISOString().slice(0, 10)
  const allDates = getDatesInRange(fromDate, toDate)

  const dailyWork: Record<string, number> = {}
  for (const d of allDates) {
    const k = key(d)
    const workSlots = effectiveWorkingByDate[k]?.size ?? 0
    dailyWork[k] = workSlots * 0.5
  }

  const blocks: Record<string, { totalWork: number }> = {}
  const fm = new Date(fromDate + 'T00:00:00Z')
  let blockEnd = new Date(toDate + 'T00:00:00Z')

  while (true) {
    const blockStart = new Date(blockEnd)
    blockStart.setUTCDate(blockStart.getUTCDate() - 6)
    if (blockStart < fm) break
    let sum = 0
    const cur = new Date(blockStart)
    while (cur <= blockEnd) {
      sum += dailyWork[key(cur)] ?? 0
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    blocks[key(blockEnd)] = { totalWork: sum }
    blockEnd.setUTCDate(blockEnd.getUTCDate() - 7)
  }
  return blocks
}, [fromDate, toDate, effectiveWorkingByDate])


  // Build a fast map of daily rest in the visible Update window
const dailyRestByDate = useMemo(() => {
  if (!fromDate || !toDate) return {}
  const out: Record<string, number> = {}
  const dates = getDatesInRange(fromDate, toDate)
  for (const d of dates) {
    const k = d.toISOString().slice(0, 10)
    const workCount = effectiveWorkingByDate[k]?.size ?? 0
    out[k] = 24 - workCount * 0.5
  }
  return out
}, [fromDate, toDate, effectiveWorkingByDate])

// For STCW+Exceptions: choose up to 2 days (in the 7d window) where 6h ≤ rest < 10h to waive the daily 10h rule
const stcwExceptionDays = useMemo(() => {
  const s = new Set<string>()
  if (regulation !== 'stcw' || !allowExceptions || !fromDate || !toDate) return s
  // collect candidate days with 6h ≤ rest < 10h
  const candidates = Object
    .entries(dailyRestByDate)
    .filter(([_, rest]) => rest >= 6 && rest < 10)
    // .sort((a, b) => a[1] - b[1]) // pick "worst" rest first
    .sort((a, b) => a[0].localeCompare(b[0])) // pick oldest first (by date ascending)
  for (let i = 0; i < Math.min(2, candidates.length); i++) {
    s.add(candidates[i][0])
  }
  return s
}, [regulation, allowExceptions, dailyRestByDate, fromDate, toDate])


  const fetchRestHourEntries = async (
    fromDate: string,
    toDate: string,
    cId: number | undefined = effectiveCrewId,
    vId: number | undefined = effectiveVesselId
  ) => {
    try {
      if (cId && vId) {
        const data = await getRestHourEntriesInRange(cId, vId, fromDate, toDate)
        setApiEntries(Array.isArray(data) ? data : [])
      } else {
        setApiEntries([])
      }
    } catch (error) {
      console.error('Fetching rest hour entries failed:', error)
      setApiEntries([])
    }
  }

  // REPLACE isWorkingHour with this version (uses selectedEntries + pendingDeletes + apiEntries)
  const isWorkingHour = (_crewId: number, date: Date, slotIndex: number): boolean => {
    const dateStr = date.toISOString().split('T')[0]

    // 1) Pending deletions win → force REST
    if (pendingDeletes.some((e) => e.date === dateStr && e.slotIndex === slotIndex)) return false

    // 2) Local adds (selectedEntries) → force WORK
    if (selectedEntries.some((e) => e.date === dateStr && e.slotIndex === slotIndex)) return true

    // 3) Fallback: API state (if present)
    const apiMatch = apiEntries.find((e) => e.entryDate === dateStr && e.slotIndex === slotIndex)
    if (apiMatch) return getWorkingFlag(apiMatch)

    // 4) Default REST
    return false
  }

  const handleSaveChanges = async () => {
  if (!selectedCrew) {
    notify?.warn('Please select a crew member name first.')
    return
  }

  const rankId = currentUser?.rank?.id
  const crewID = rankId === 1 ? selectedCrew.id : crewId
  if (!vesselId || !crewID) return

  const addsByDate: Record<string, {slotIndex: number}[]> = {}
  const deletesByDate: Record<string, number[]> = {}
  const lockedTouched = new Set<string>()

  const remarksByDate: Record<string, string> = {}
// remarks.forEach((val, key) => {
//   const t = String(val || '').trim()
//   if (t) remarksByDate[key] = t
// })
dirtyRemarkDates?.forEach((d) => {
  remarksByDate[d] = String(remarks.get(d) ?? '')
})


  for (const e of selectedEntries) {
    if (isDateLocked(e.date)) {
      lockedTouched.add(e.date)
    } else {
      if (!addsByDate[e.date]) addsByDate[e.date] = []
      addsByDate[e.date].push({slotIndex: e.slotIndex})
    }
  }
  for (const d of pendingDeletes) {
    if (isDateLocked(d.date)) {
      lockedTouched.add(d.date)
    } else {
      if (!deletesByDate[d.date]) deletesByDate[d.date] = []
      deletesByDate[d.date].push(d.slotIndex)
    }
  }

  if (lockedTouched.size) {
    notify?.warn(
      `Cannot edit approved day(s): ${Array.from(lockedTouched).sort().join(', ')}`
    )
  }

  // if (Object.keys(addsByDate).length === 0 && Object.keys(deletesByDate).length === 0) {
  //   notify?.info('No editable changes to save.')
  //   return
  // }
  const hasHourAdds = Object.keys(addsByDate).length > 0
const hasHourDeletes = Object.keys(deletesByDate).length > 0
const hasRemarkOnly = Object.keys(remarksByDate).length > 0

if (!hasHourAdds && !hasHourDeletes && !hasRemarkOnly) {
  notify?.info('No editable changes to save.')
  return
}


  try {
    // 1) Persist deletes then adds
    for (const [dateStr, slotIndices] of Object.entries(deletesByDate)) {
      await deleteWorkingSlots(crewID, vesselId, dateStr, slotIndices, true)
    }
    if (Object.keys(addsByDate).length > 0) {
      await saveRestHourEntries(crewID, vesselId, addsByDate)
    }

    // 2) PATCH remarks to SUMMARY (all dates with non-empty remarks)
    const failed: string[] = []
    for (const [d, text] of Object.entries(remarksByDate)) {
      const summaryId = getSummaryId?.(crewID, d)
      if (summaryId) {
        try {
          await patchSummaryRemarks(summaryId, text)
        } catch (e) {
          console.error('Summary-remarks patch failed for', d, e)
          failed.push(d)
        }
      } else {
        // no summary for that date -> can’t patch
        failed.push(d)
      }
    }

    // 2) Refresh Update grid
    await fetchRestHourEntries(fromDate, toDate, crewID, vesselId)

    // 3) Patch Matrix Overview optimistically
    const datesTouched = new Set<string>([
      ...Object.keys(addsByDate),
      ...Object.keys(deletesByDate),
      ...Object.keys(remarksByDate),
    ])

    if (datesTouched.size && onLocalSummaryChange) {
      const patch: Record<string, {
        work: number
        rest: number
        compliant: boolean
        violationCount: number
        violations: string[]
        violationCodes?: string[]
        remarks?: string
      }> = {}
      datesTouched.forEach((d) => {
        patch[d] = { ...buildDaySummary(d), remarks: remarksByDate[d] ?? (remarks.get(d) || '') }
      })
      onLocalSummaryChange(crewID, patch)
    }

    // 4) Reload server summaries (incl. approval flags)
    await onAfterSave?.()

    // 5) Clear local diffs
    setSelectedEntries([])
    setPendingDeletes([])
    if (failed.length) {
      notify?.warn(`Saved hours. Remarks not saved for: ${failed.join(', ')}`)
    } else {
      notify?.success('Working hours & remarks updated successfully.')
    }
  } catch (error) {
    console.error('Save failed:', error)
    notify?.error(asApiError(error, 'Failed to update working hours.'))
  }
}


  const dateRange = React.useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const start = fromDate || today
    const end = toDate || today
    return getDatesInRange(start, end)
  }, [fromDate, toDate])

  const filteredCrewMembers = React.useMemo(() => {
    console.log(crewMembers)
    return crewMembers.filter((member) => {
      console.log(member.rankInfo.id)
      console.log(member.crewName)

      const matchesRank = !selectedRank || member.rankInfo.id === Number(selectedRank)
      const matchesName = !selectedCrew || member.crewId === selectedCrew.id
      return matchesRank && matchesName
    })
  }, [crewMembers, selectedRank, selectedCrew])

  useEffect(() => {
    console.log(filteredCrewMembers)
  }, [filteredCrewMembers])



  // Build Matrix-Overview-compatible summary for a given date string (YYYY-MM-DD)
  // const buildDaySummary = (dateStr: string) => {
  //   const date = new Date(dateStr + 'T00:00:00Z')
  //   const slots = timeSlots.map((_, idx) => isWorkingHour(crewId || 0, date, idx))
  //   const work = slots.filter(Boolean).length * 0.5
  //   const rest = 24 - work

  //   const v = checkRestViolations(slots)
  //   const sevenDayViolation = anchored7d[dateStr]?.violated === true

  //   const violations: string[] = []
  //   if (v.minRest24h.isViolation) violations.push('Min Rest/24h < 10h')
  //   if (sevenDayViolation) violations.push('Min Rest/7d < 77h')
  //   if (v.maxInterval.isViolation) violations.push('Max interval between rests > 14h')
  //   if (v.maxPeriods.isViolation) violations.push('More than 2 rest periods/day')
  //   // we can have this below line instead of above if they asked
  //   // if (v.maxPeriods.isViolation) violations.push('10h rest split into > 2 periods')
  //   if (v.minSingleRest.isViolation) violations.push('Min single rest < 6h')

  //   return {
  //     work,
  //     rest,
  //     compliant: violations.length === 0,
  //     violationCount: violations.length,
  //     violations,
  //   }
  // }
  const buildDaySummary = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00Z')
  const slots = timeSlots.map((_, idx) => isWorkingHour(crewId || 0, date, idx))
  const work = slots.filter(Boolean).length * 0.5
  const rest = 24 - work

  const violations: string[] = []

  if (regulation === 'stcw') {
    const v = checkRestViolations(slots)
    const sevenDayViolation = anchored7d[dateStr]?.violated === true

    // daily 10h rest (exception can waive it if 6–10h on ≤2 days)
    const dailyBreach = rest < 10
    const dailyWaived = allowExceptions && dailyBreach && rest >= 6 && stcwExceptionDays.has(dateStr)

    if (dailyBreach && !dailyWaived) violations.push('Min Rest/24h < 10h')
    if (sevenDayViolation) violations.push('Min Rest/7d < 77h')
    if (v.maxInterval.isViolation) violations.push('Max interval between rests > 14h')
    if (v.maxPeriods.isViolation) violations.push('More than 2 rest periods/day')
    if (v.minSingleRest.isViolation) violations.push('Min single rest < 6h')
  } else {
    // MLC
    const end = anchored7d[dateStr]
    const endW = anchored7dWork[dateStr]
    const wkWork = endW?.totalWork ?? 0
    const wkRest = end?.totalRest ?? 168 - wkWork

    const v = checkMLCViolations(slots, wkWork, wkRest, allowExceptions)

    if (work > 14) violations.push('Max Work/24h > 14h')
    if (end && endW && wkWork > 72) violations.push('Max Work/7d > 72h')
    if (allowExceptions && end && endW && wkRest < 70) violations.push('Min Rest/7d < 70h (exception floor)')
  }

  return {
    work,
    rest,
    compliant: violations.length === 0,
    violationCount: violations.length,
    violations,
  }
}
const isWorkingSlot = (dateStr: string, timeIndex: number): boolean => {
  if (pendingDeletes.some((e) => e.date === dateStr && e.slotIndex === timeIndex)) return false
  if (selectedEntries.some((e) => e.date === dateStr && e.slotIndex === timeIndex)) return true
  const apiItem = apiEntries.find((e) => e.entryDate === dateStr && e.slotIndex === timeIndex)
  return apiItem ? getWorkingFlag(apiItem) : false
}

const rollingTotals7d = useMemo(() => {
  const workSlots = rollingWindow.slots.reduce((acc, slot) => {
    return acc + (isWorkingSlot(slot.dateKey, slot.slotIndex) ? 1 : 0)
  }, 0)
  const totalWork = workSlots * 0.5
  return {
    totalWork,
    totalRest: ROLLING_WINDOW_DAYS * 24 - totalWork,
  }
}, [rollingWindow, apiEntries, selectedEntries, pendingDeletes])

const rollingExceptionEndKeys = useMemo(() => {
  const s = new Set<string>()
  if (regulation !== 'stcw' || !allowExceptions) return s

  const candidates = rollingDayWindows
    .map((day) => {
      const workSlots = day.slots.map((slot) => isWorkingSlot(slot.dateKey, slot.slotIndex))
      const rest = 24 - workSlots.filter(Boolean).length * 0.5
      return {endKey: day.endKey, rest, startMs: day.start.getTime()}
    })
    .filter((c) => c.rest >= 6 && c.rest < 10)
    .sort((a, b) => a.startMs - b.startMs)

  for (let i = 0; i < Math.min(2, candidates.length); i++) {
    s.add(candidates[i].endKey)
  }
  return s
}, [rollingDayWindows, regulation, allowExceptions, apiEntries, selectedEntries, pendingDeletes])

const applyCell = (dateStr: string, timeIndex: number, toWork: boolean) => {
  if (isDateLocked(dateStr)) return

  const wasWorking = isWorkingSlot(dateStr, timeIndex)
  if (toWork === wasWorking) return // nothing to do

  if (toWork) {
    // make it WORK
    setSelectedEntries((prev) => {
      if (prev.some((e) => e.date === dateStr && e.slotIndex === timeIndex)) return prev
      return [...prev, {date: dateStr, slotIndex: timeIndex}]
    })
    setPendingDeletes((prev) =>
      prev.filter((e) => !(e.date === dateStr && e.slotIndex === timeIndex))
    )
  } else {
    // make it REST
    setSelectedEntries((prev) =>
      prev.filter((e) => !(e.date === dateStr && e.slotIndex === timeIndex))
    )
    // Only add to deletes if it *was* working (API or previously set)
    if (wasWorking) {
      setPendingDeletes((prev) => {
        if (prev.some((e) => e.date === dateStr && e.slotIndex === timeIndex)) return prev
        return [...prev, {date: dateStr, slotIndex: timeIndex}]
      })
    } else {
      // ensure it's not in deletes
      setPendingDeletes((prev) =>
        prev.filter((e) => !(e.date === dateStr && e.slotIndex === timeIndex))
      )
    }
  }
}

const cancelPendingSingle = () => {
  if (singleClickTimerRef.current) {
    window.clearTimeout(singleClickTimerRef.current)
    singleClickTimerRef.current = null
  }
}

const scheduleSingleToggle = (dateStr: string, timeIndex: number) => {
  if (isDateLocked(dateStr)) {
    warnLocked(dateStr)
    return
  }
  cancelPendingSingle()
  singleClickTimerRef.current = window.setTimeout(() => {
    singleClickTimerRef.current = null
    const target = !isWorkingSlot(dateStr, timeIndex)
    applyCell(dateStr, timeIndex, target)
  }, SINGLE_CLICK_DELAY)
}

const startBrush = (dateStr: string, timeIndex: number) => {
  if (isDateLocked(dateStr)) {
    warnLocked(dateStr)
    return
  }
  const target = !isWorkingSlot(dateStr, timeIndex)
  brushRef.current.active = true
  brushRef.current.date = dateStr
  brushRef.current.targetWorking = target
  brushRef.current.lastIndex = timeIndex

  applyCell(dateStr, timeIndex, target)
}

const continueBrush = (dateStr: string, timeIndex: number) => {
  if (isDateLocked(dateStr)) return
  const b = brushRef.current
  if (!b.active || b.date !== dateStr) return
  const from = Math.min(b.lastIndex, timeIndex)
  const to = Math.max(b.lastIndex, timeIndex)
  for (let i = from; i <= to; i++) applyCell(dateStr, i, b.targetWorking)
  b.lastIndex = timeIndex
}


// ---- UNSAVED CHANGES: clear only local diffs (not backend) ----
const hasRemarkChanges = (dirtyRemarkDates?.size ?? 0) > 0
const hasUnsavedChanges = selectedEntries.length > 0 || pendingDeletes.length > 0 || hasRemarkChanges

const clearUnsavedChanges = () => {
  // Cancel any pending single-click toggle
  cancelPendingSingle?.()

  // Stop any ongoing paint/drag
  if (brushRef.current.active) {
    brushRef.current.active = false
    brushRef.current.date = ''
    brushRef.current.lastIndex = -1
  }

  // Drop ONLY local, unsaved diffs
  setSelectedEntries([])
  setPendingDeletes([])

  //also reset remarks
  if (hasRemarkChanges) onResetRemarkEdits?.()

  // Optional feedback toast
  notify?.info?.('Unsaved changes cleared.')
}

  return (
    <div className={`tab-pane fade ${activeTab === 'update' ? 'show active' : ''}`} id='update'>
      <div className='card'>
        <div className='card-body p-0'>
          {/* Conditional rendering based on showTable prop and crew members */}
          {filteredCrewMembers.length === 0 ? (
            <div className='text-center py-5'>
              <p className='text-muted'>No crew members found.</p>
            </div>
          ) : (
            <>
              <div
                className='report-table table-responsive'
                style={{overflowX: 'auto', maxHeight: '600px'}}
              >
                <table
                  className='table table-bordered align-middle mb-0'
                  style={{minWidth: '3200px'}}
                >
                  <thead className='table-header'>
                    {useRollingWindow ? (
                      <>
                        <tr>
                          <th
                            rowSpan={2}
                            className='text-center align-middle'
                            style={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 11,
                              backgroundColor: '#f8f9fa',
                              minWidth: '160px',
                            }}
                          >
                            Rolling Window
                          </th>

                          <th
                            colSpan={48}
                            className='text-center'
                            style={{
                              minWidth: '60px',
                              backgroundColor: '#f8f9fa',
                              borderLeft: '1px solid #dee2e6',
                            }}
                          >
                            Time (aligned to rolling anchor)
                          </th>

                          <th
                            rowSpan={2}
                            className='text-center align-middle'
                            style={{minWidth: '100px'}}
                          >
                            Total Working Hrs (24h)
                          </th>
                          <th
                            rowSpan={2}
                            className='text-center align-middle'
                            style={{minWidth: '100px'}}
                          >
                            Total Rest Hrs (24h)
                          </th>
                          <th
                            rowSpan={2}
                            className='text-center align-middle'
                            style={{minWidth: '150px'}}
                          >
                            Remarks
                          </th>
                          <th colSpan={5} className='text-center align-middle'>
                            Rest Regulations
                          </th>
                        </tr>

                        <tr>
                          {rollingHeaderSlots.map((slot) => (
                            <th
                              key={`${slot.dateKey}-${slot.slotIndex}`}
                              className='text-center align-middle fw-normal'
                              style={{
                                minWidth: '30px',
                                backgroundColor: '#f8f9fa',
                                fontSize: '12px',
                                padding: '4px',
                                borderRight:
                                  slot.start.getMinutes() === 30 ? '1px solid #dee2e6' : 'none',
                              }}
                            >
                              {formatRollingTime(slot.start)}
                            </th>
                          ))}

                          {regulation === 'stcw' ? (
                            <>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Min Rest/24h
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Min Rest/7d
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Max Interval
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Max Divisions
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Min Single Rest
                              </th>
                            </>
                          ) : (
                            <>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 140, fontSize: 12}}
                              >
                                Max Work/24h
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 140, fontSize: 12}}
                              >
                                Max Work/7d
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 140, fontSize: 12}}
                              >
                                {allowExceptions ? 'Min Rest/7d (>=70h)' : '--'}
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                --
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                --
                              </th>
                            </>
                          )}
                        </tr>
                      </>
                    ) : (
                      <>
                        {/* --- FIRST HEADER ROW --- */}
                        <tr>
                          <th
                            rowSpan={2}
                            className='text-center align-middle'
                            style={{
                              position: 'sticky',
                              left: 0,
                              zIndex: 11,
                              backgroundColor: '#f8f9fa',
                              minWidth: '120px',
                            }}
                          >
                            Date
                          </th>

                          {/* MODIFICATION 1: Removed the 'borderLeft' style from this row.
                              The main hour separator is now defined in the second header row below.
                          */}
                          {Array.from({length: 24}, (_, i) => (
                            <th
                              key={i}
                              colSpan={2}
                              className='text-center'
                              style={{
                                minWidth: '60px',
                                backgroundColor: '#f8f9fa',
                                borderLeft: i > 0 ? '1px solid #dee2e6' : 'inherit',
                              }}
                            >
                              {i.toString().padStart(2, '0')}:00
                            </th>
                          ))}

                          <th
                            rowSpan={2}
                            className='text-center align-middle'
                            style={{minWidth: '100px'}}
                          >
                            Total Working Hrs
                          </th>
                          <th
                            rowSpan={2}
                            className='text-center align-middle'
                            style={{minWidth: '100px'}}
                          >
                            Total Rest Hrs
                          </th>
                          <th
                            rowSpan={2}
                            className='text-center align-middle'
                            style={{minWidth: '150px'}}
                          >
                            Remarks
                          </th>
                          <th colSpan={5} className='text-center align-middle'>
                            Rest Regulations
                          </th>
                        </tr>

                        {/* --- SECOND HEADER ROW --- */}
                        <tr>
                          {Array.from({length: 24}, (_, i) => (
                            <React.Fragment key={i}>
                              {/* The border has been removed from this '00' column */}
                              <th
                                className='text-center align-middle fw-normal'
                                style={{
                                  minWidth: '30px',
                                  backgroundColor: '#f8f9fa',
                                  fontSize: '12px',
                                  padding: '4px',
                                }}
                              >
                                00
                              </th>

                              {/* MODIFICATION 2: Moved the border to the right of the '30' column.
                                  The condition `i < 23` ensures the border doesn't appear at the very end of the table.
                              */}
                              <th
                                className='text-center align-middle fw-normal'
                                style={{
                                  minWidth: '30px',
                                  backgroundColor: '#f8f9fa',
                                  fontSize: '12px',
                                  padding: '4px',
                                  borderRight: i < 23 ? '1px solid #dee2e6' : 'none',
                                }}
                              >
                                30
                              </th>
                            </React.Fragment>
                          ))}

                          {/* --- SECOND HEADER ROW (replace the 5 fixed headers) --- */}
                          {regulation === 'stcw' ? (
                            <>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Min Rest/24h
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Min Rest/7d
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Max Interval
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Max Divisions
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                Min Single Rest
                              </th>
                            </>
                          ) : (
                            <>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 140, fontSize: 12}}
                              >
                                Max Work/24h
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 140, fontSize: 12}}
                              >
                                Max Work/7d
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 140, fontSize: 12}}
                              >
                                {allowExceptions ? 'Min Rest/7d (>=70h)' : '--'}
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                --
                              </th>
                              <th
                                className='text-center align-middle fw-normal'
                                style={{minWidth: 120, fontSize: 12}}
                              >
                                --
                              </th>
                            </>
                          )}
                        </tr>
                      </>
                    )}
                  </thead>
                  <tbody className='table-body'>
                    {useRollingWindow ? (
                      rollingDayWindows.map((day) => {
                        const dateStr = day.endKey
                        const dayWorkSlotsBools = day.slots.map((slot) =>
                          isWorkingSlot(slot.dateKey, slot.slotIndex)
                        )

                        const totalWorkingHrs = dayWorkSlotsBools.filter(Boolean).length * 0.5
                        const totalRestHrs = 24 - totalWorkingHrs

                        const violationCellStyle = {backgroundColor: '#ff0000', color: '#ffffff'}

                        let stcwV: ViolationSet | null = null
                        let stcwDailyWaived = false

                        let mlcV: MLCViolationSet | null = null

                        if (regulation === 'stcw') {
                          stcwV = checkRestViolations(dayWorkSlotsBools)
                          if (stcwV) stcwV.minRest7d.isViolation = rollingTotals7d.totalRest < 77

                          if (
                            allowExceptions &&
                            stcwV.minRest24h.isViolation &&
                            totalRestHrs >= 6 &&
                            rollingExceptionEndKeys.has(dateStr)
                          ) {
                            stcwV.minRest24h.isViolation = false
                            stcwDailyWaived = true
                          }
                        } else {
                          mlcV = checkMLCViolations(
                            dayWorkSlotsBools,
                            rollingTotals7d.totalWork,
                            rollingTotals7d.totalRest,
                            allowExceptions
                          )
                        }

                        const isAnyViolation =
                          regulation === 'stcw'
                            ? !!(
                                stcwV &&
                                (stcwV.minRest24h.isViolation ||
                                  stcwV.minRest7d.isViolation ||
                                  stcwV.maxInterval.isViolation ||
                                  stcwV.maxPeriods.isViolation ||
                                  stcwV.minSingleRest.isViolation)
                              )
                            : !!(
                                mlcV &&
                                (mlcV.maxWork24h.isViolation ||
                                  mlcV.maxWork7d.isViolation ||
                                  (allowExceptions && mlcV.minRest7d?.isViolation))
                              )

                        const remarksDate = parseLocalDate(dateStr)

                        return (
                          <tr key={dateStr}>
                            <td
                              className='fw-bold text-nowrap text-center align-middle'
                              style={{
                                position: 'sticky',
                                left: 0,
                                zIndex: 10,
                                backgroundColor: '#fff',
                                borderRight: '1px solid #dee2e6',
                                ...(isAnyViolation && violationCellStyle),
                              }}
                            >
                              <div>Rolling 24h</div>
                              <div className='text-muted fs-7'>
                                {formatRollingDateTime(day.start)}{" -> "}{formatRollingDateTime(day.end)}
                              </div>
                              {isDateLocked(dateStr) && (
                                <span className='badge badge-sm bg-success ms-2'>Approved</span>
                              )}
                            </td>

                            {day.slots.map((slot, slotIndex) => {
                              const isWorking = dayWorkSlotsBools[slotIndex]
                              const slotDateStr = slot.dateKey

                              return (
                                <td
                                  key={`${slot.dateKey}-${slot.slotIndex}`}
                                  className='text-center align-middle position-relative'
                                  style={{
                                    minWidth: '30px',
                                    padding: '2px',
                                    cursor: 'pointer',
                                    backgroundColor: isWorking ? '#fff3cd' : '#f8f9fa',
                                    borderLeft:
                                      slot.start.getMinutes() === 0
                                        ? '2px solid #dee2e6'
                                        : '1px solid #dee2e6',
                                    userSelect: 'none',
                                  }}
                                  onClick={() => {
                                    scheduleSingleToggle(slotDateStr, slot.slotIndex)
                                  }}
                                  onMouseDown={(e) => {
                                    if (e.detail === 2) {
                                      e.preventDefault()
                                      cancelPendingSingle()
                                      startBrush(slotDateStr, slot.slotIndex)
                                    }
                                  }}
                                  onMouseEnter={() => {
                                    continueBrush(slotDateStr, slot.slotIndex)
                                  }}
                                  onDoubleClick={(e) => e.preventDefault()}
                                >
                                  <div
                                    className='d-flex align-items-center justify-content-center fw-bold'
                                    style={{
                                      height: '20px',
                                      backgroundColor: isWorking ? '#ffc107' : '#e9ecef',
                                      borderRadius: '2px',
                                      border: isWorking ? '1px solid #ffb300' : '1px solid #ced4da',
                                      color: isWorking ? '#212529' : '#6c757d',
                                      fontSize: '11px',
                                    }}
                                  >
                                    {isWorking ? 'W' : 'R'}
                                  </div>
                                </td>
                              )
                            })}

                            <td className='text-center fw-bold align-middle'>
                              {totalWorkingHrs.toFixed(1)}
                            </td>
                            <td className='text-center fw-bold align-middle'>
                              {totalRestHrs.toFixed(1)}
                            </td>
                            <td className='text-center align-middle' style={{minWidth: '150px'}}>
                              <input
                                type='text'
                                className='form-control form-control-sm text-center'
                                placeholder='Add remarks (optional)'
                                value={remarks.get(dateStr) || ''}
                                onChange={(e) => onRemarksChange(remarksDate, e.target.value)}
                                title={isDateLocked(dateStr) ? 'Approved day - remarks locked' : undefined}
                                style={{
                                  border: '1px solid #dee2e6',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  backgroundColor: isDateLocked(dateStr) ? '#f3f3f3' : '#fff',
                                }}
                              />
                            </td>

                            {regulation === 'stcw' ? (
                              <>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.minRest24h.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.minRest24h.value} Hrs
                                  {allowExceptions && stcwDailyWaived && (
                                    <span className='badge bg-info text-white ms-2'>Exception</span>
                                  )}
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.minRest7d.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.minRest7d.value} Hrs
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.maxInterval.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.maxInterval.value} Hrs
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.maxPeriods.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.maxPeriods.value}
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.minSingleRest.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.minSingleRest.value} Hrs
                                </td>
                              </>
                            ) : (
                              <>
                                <td
                                  className='text-center align-middle'
                                  style={mlcV!.maxWork24h.isViolation ? violationCellStyle : {}}
                                >
                                  {mlcV!.maxWork24h.value} Hrs
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={mlcV!.maxWork7d.isViolation ? violationCellStyle : {}}
                                >
                                  {mlcV!.maxWork7d.value} Hrs
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={
                                    allowExceptions && mlcV!.minRest7d?.isViolation
                                      ? violationCellStyle
                                      : {}
                                  }
                                >
                                  {allowExceptions ? `${mlcV!.minRest7d!.value} Hrs` : '--'}
                                </td>
                                <td className='text-center align-middle'>--</td>
                                <td className='text-center align-middle'>--</td>
                              </>
                            )}
                          </tr>
                        )
                      })

                    ) : (
                      dateRange.map((date) => {
                        // // ... (your existing logic for calculations remains the same)
                        // const selectedMember = filteredCrewMembers[0]
                        // const dailyWorkSlotsBools = timeSlots.map((_, timeIndex) =>
                        //   isWorkingHour(crewId || 0, date, timeIndex)
                        // )
                        // const totalWorkingHrs = dailyWorkSlotsBools.filter(Boolean).length * 0.5
                        // const totalRestHrs = 24 - totalWorkingHrs
                        // const violations = checkRestViolations(dailyWorkSlotsBools)
                        // const dateStr = date.toISOString().split('T')[0]
                        // const is7dWindowEnd = !!anchored7d[dateStr]
                        // const violated7d = anchored7d[dateStr]?.violated ?? false
                        // violations.minRest7d.isViolation = is7dWindowEnd && violated7d
                        // const violationCellStyle = {backgroundColor: '#ff0000', color: '#ffffff'}
                        // const isAnyViolation = Object.values(violations).some((v) => v.isViolation)
                        const dateStr = date.toISOString().split('T')[0]
                        const dailyWorkSlotsBools = timeSlots.map((_, i) =>
                          isWorkingHour(crewId || 0, date, i)
                        )

                        const totalWorkingHrs = dailyWorkSlotsBools.filter(Boolean).length * 0.5
                        const totalRestHrs = 24 - totalWorkingHrs

                        // style & helpers
                        const violationCellStyle = {backgroundColor: '#ff0000', color: '#ffffff'}

                        // STCW branch (pattern-oriented, with optional daily 6h reductions up to 2 days/7d)
                        let stcwV: ViolationSet | null = null
                        let is7dWindowEnd = false
                        let violated7d = false
                        let stcwDailyWaived = false

                        // MLC branch
                        let mlcV: MLCViolationSet | null = null

                        if (regulation === 'stcw') {
                          stcwV = checkRestViolations(dailyWorkSlotsBools)

                          // weekly min rest 77h only at the end of the anchored 7d in Update window (your existing behavior)
                          is7dWindowEnd = !!anchored7d[dateStr]
                          violated7d = anchored7d[dateStr]?.violated ?? false
                          if (stcwV) stcwV.minRest7d.isViolation = is7dWindowEnd && violated7d

                          // Exceptions: waive the daily 10h breach for up to 2 days (if 6h ≤ rest < 10h)
                          if (
                            allowExceptions &&
                            stcwV.minRest24h.isViolation &&
                            totalRestHrs >= 6 &&
                            stcwExceptionDays.has(dateStr)
                          ) {
                            stcwV.minRest24h.isViolation = false
                            stcwDailyWaived = true
                          }
                        } else {
                          // MLC: need anchored weekly (rest & work) at anchored end only
                          const weeklyEnd = anchored7d[dateStr] // carry totalRest
                          const weeklyWorkEnd = anchored7dWork[dateStr]
                          const sevenRest = weeklyEnd?.totalRest ?? null
                          const sevenWork = weeklyWorkEnd?.totalWork ?? null

                          // Only compute 7d rules at the window end (same UX as your STCW weekly flag)
                          const wkWork = sevenWork ?? 0
                          const wkRest = sevenRest ?? 168 - wkWork // fallback, should not hit when both maps in sync

                          mlcV = checkMLCViolations(dailyWorkSlotsBools, wkWork, wkRest, allowExceptions)

                          is7dWindowEnd = !!weeklyEnd && !!weeklyWorkEnd
                        }

                        // combine per-day + (when applicable) weekly checks for the date cell highlight
                        const isAnyViolation =
                          regulation === 'stcw'
                            ? !!(
                                stcwV &&
                                (stcwV.minRest24h.isViolation ||
                                  stcwV.minRest7d.isViolation ||
                                  stcwV.maxInterval.isViolation ||
                                  stcwV.maxPeriods.isViolation ||
                                  stcwV.minSingleRest.isViolation)
                              )
                            : !!(
                                mlcV &&
                                (mlcV.maxWork24h.isViolation ||
                                  // weekly rules only evaluated/shown at 7-day window end, matching your UX
                                  (is7dWindowEnd && mlcV.maxWork7d.isViolation) ||
                                  (allowExceptions &&
                                    is7dWindowEnd &&
                                    mlcV.minRest7d?.isViolation))
                              )

                        return (
                          <tr key={date.toISOString()}>
                            {/* Date cell */}
                            <td
                              className='fw-bold text-nowrap text-center align-middle'
                              style={{
                                position: 'sticky',
                                left: 0,
                                zIndex: 10,
                                backgroundColor: '#fff',
                                borderRight: '1px solid #dee2e6',
                                ...(isAnyViolation && violationCellStyle),
                              }}
                            >
                              {date.toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {isDateLocked(dateStr) && (
                                <span className='badge badge-sm bg-success ms-2'>Approved</span>
                              )}
                            </td>

                            {/* Time slot cells */}
                            {timeSlots.map((timeSlot, timeIndex) => {
                              const isWorking = dailyWorkSlotsBools[timeIndex]
                              const dateStr = date.toISOString().split('T')[0]

                              return (
                                <td
                                  key={timeIndex}
                                  className='text-center align-middle position-relative'
                                  style={{
                                    minWidth: '30px',
                                    padding: '2px',
                                    cursor: 'pointer',
                                    backgroundColor: isWorking ? '#fff3cd' : '#f8f9fa',
                                    borderLeft:
                                      timeIndex % 2 === 0 ? '2px solid #dee2e6' : '1px solid #dee2e6',
                                    userSelect: 'none',
                                  }}
                                  /* 1) single click -> delayed toggle (so double click can cancel) */
                                  onClick={() => {
                                    scheduleSingleToggle(dateStr, timeIndex)
                                  }}
                                  /* 2) second mouse down (detail===2) starts paint immediately */
                                  onMouseDown={(e) => {
                                    if (e.detail === 2) {
                                      e.preventDefault()
                                      cancelPendingSingle()
                                      startBrush(dateStr, timeIndex)
                                    }
                                  }}
                                  /* 3) drag horizontally within the same day row to paint */
                                  onMouseEnter={() => {
                                    continueBrush(dateStr, timeIndex)
                                  }}
                                  /* optional: avoid native dblclick selection flash */
                                  onDoubleClick={(e) => e.preventDefault()}
                                >
                                  <div
                                    className='d-flex align-items-center justify-content-center fw-bold'
                                    style={{
                                      height: '20px',
                                      backgroundColor: isWorking ? '#ffc107' : '#e9ecef',
                                      borderRadius: '2px',
                                      border: isWorking ? '1px solid #ffb300' : '1px solid #ced4da',
                                      color: isWorking ? '#212529' : '#6c757d',
                                      fontSize: '11px',
                                    }}
                                  >
                                    {isWorking ? 'W' : 'R'}
                                  </div>
                                </td>
                              )
                            })}

                            {/* MODIFIED: Enforced text-center and align-middle on all data cells */}
                            <td className='text-center fw-bold align-middle'>
                              {totalWorkingHrs.toFixed(1)}
                            </td>
                            <td className='text-center fw-bold align-middle'>
                              {totalRestHrs.toFixed(1)}
                            </td>
                            <td className='text-center align-middle' style={{minWidth: '150px'}}>
                              <input
                                type='text'
                                className='form-control form-control-sm text-center'
                                placeholder='Add remarks (optional)'
                                value={remarks.get(dateStr) || ''}
                                onChange={(e) => onRemarksChange(date, e.target.value)}
                                // I am commenting this line below to let approved dates also remarks update unlike hours
                                // disabled={isDateLocked(dateStr)}                 // optional: lock like slots
                                title={isDateLocked(dateStr) ? 'Approved day — remarks locked' : undefined}
                                style={{
                                  border: '1px solid #dee2e6',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  fontSize: '12px',
                                  backgroundColor: isDateLocked(dateStr) ? '#f3f3f3' : '#fff',
                                }}
                              />
                            </td>
                            {/* Regulations cells */}
                            {regulation === 'stcw' ? (
                              <>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.minRest24h.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.minRest24h.value} Hrs
                                  {allowExceptions && stcwDailyWaived && (
                                    <span className='badge bg-info text-white ms-2'>Exception</span>
                                  )}
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.minRest7d.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.minRest7d.value} Hrs
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.maxInterval.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.maxInterval.value} Hrs
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.maxPeriods.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.maxPeriods.value}
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={stcwV!.minSingleRest.isViolation ? violationCellStyle : {}}
                                >
                                  {stcwV!.minSingleRest.value} Hrs
                                </td>
                              </>
                            ) : (
                              <>
                                <td
                                  className='text-center align-middle'
                                  style={mlcV!.maxWork24h.isViolation ? violationCellStyle : {}}
                                >
                                  {mlcV!.maxWork24h.value} Hrs
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={
                                    is7dWindowEnd && mlcV!.maxWork7d.isViolation
                                      ? violationCellStyle
                                      : {}
                                  }
                                >
                                  {mlcV!.maxWork7d.value} Hrs
                                </td>
                                <td
                                  className='text-center align-middle'
                                  style={
                                    allowExceptions && is7dWindowEnd && mlcV!.minRest7d?.isViolation
                                      ? violationCellStyle
                                      : {}
                                  }
                                >
                                  {allowExceptions ? `${mlcV!.minRest7d!.value} Hrs` : '--'}
                                </td>
                                <td className='text-center align-middle'>--</td>
                                <td className='text-center align-middle'>--</td>
                              </>
                            )}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer - only show when table is visible */}
              <div className='card-footer'>
                <div className='d-flex justify-content-between align-items-center'>
                  <div className='d-flex align-items-center gap-4'>
                    <div className='d-flex align-items-center'>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          backgroundColor: '#ffc107',
                          border: '1px solid #ffb300',
                          borderRadius: '2px',
                          marginRight: '8px',
                        }}
                      ></div>
                      <span className='text-muted'>Working Hours</span>
                    </div>
                    <div className='d-flex align-items-center'>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          border: '1px solid #dee2e6',
                          borderRadius: '2px',
                          marginRight: '8px',
                        }}
                      ></div>
                      <span className='text-muted'>Rest Hours</span>
                    </div>
                  </div>
                  <div className='d-flex gap-2'>
                    <button
  className='btn btn-outline-secondary btn-sm border'
  onClick={clearUnsavedChanges}
  disabled={!hasUnsavedChanges}
  title={!hasUnsavedChanges ? 'No unsaved changes' : 'Discard local changes'}
>
  Clear Unsaved
</button>

                    <button
  className='btn btn_primary btn-sm'
  onClick={handleSaveChanges}
  disabled={!hasUnsavedChanges}
  title={!hasUnsavedChanges ? 'No unsaved changes' : 'Save local changes'}
>
  Save Changes
</button>

                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const RestHour: FC = () => {
  const [crew, setCrew] = useState<Crew[]>([])
  const [remarks, setRemarks] = useState<Map<string, string>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVessel, setSelectedVessel] = useState('')
  const [selectedRank, setSelectedRank] = useState('')
  const [selectedCrew, setSelectedCrew] = useState<{id: number; name: string} | null>(null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState<{
    key:
      | 'crewName'
      | 'rank'
      | 'vessel'
      | 'date'
      | 'workHours'
      | 'restHours'
      | 'overtime'
      | 'status'
      | null
    direction: 'asc' | 'desc'
  }>({key: 'rank', direction: 'asc'})
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('matrix-overview')
  const [regulation, setRegulation] = useState<Regulation>('stcw')
  const [allowExceptions, setAllowExceptions] = useState(true)
const [fromDate, setFromDate] = useState<string>(() => {
  const d = new Date()
  d.setDate(d.getDate() - 30)           // last 30 days
  return d.toISOString().split('T')[0]
})
const [toDate, setToDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [showTable, setShowTable] = React.useState(true)
  const [apiEntries, setApiEntries] = useState<any[]>([])
  const [vesselList, setVesselList] = useState<Vessel[]>([]) // ← new
  // const rollingRefreshRequestedRef = React.useRef(false)
  // const [rollingExceptionsData, setRollingExceptionsData] =
  //   useState<RollingExceptionResponse | null>(null)
  // const [rollingAsOf, setRollingAsOf] = useState<string | null>(null)

  // ===== Ranks (for dropdown + safe rendering) =====
  const [rankOptions, setRankOptions] = useState<{id: number; label: string}[]>([])
  const [rankMap, setRankMap] = useState<Record<number, string>>({})

  // ADD — master lists (kept separate from crew-derived fallbacks)
  const [companies, setCompanies] = useState<CompanyGroupOpt[]>([])
  const [subcompanies, setSubcompanies] = useState<SubcompanyOpt[]>([])

  const {currentUser} = useAuth()
  const rankId = currentUser?.rank?.id
  const roleId = currentUser?.role?.id
  // Operator flavors:
// - No companyGroupAdminId => acts like Superadmin
// - Has companyGroupAdminId => acts like Company Group Admin
const isOperator = roleId === 6
const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
const operatorActsLikeGroupAdmin = isOperator && !!currentUser?.companyGroupAdminId
  const isMasterByName = (currentUser?.rank?.rank ?? '').toLowerCase().includes('master')
  const isCrewNonMaster = roleId === 4 && !isMasterByName

  const floorToHalfHourLocal = (value: Date) => {
    const next = new Date(value.getTime())
    const minutes = next.getMinutes()
    next.setMinutes(minutes < 30 ? 0 : 30, 0, 0)
    return next
  }

  const formatMatrixRollingDateTime = (value: Date) =>
    value.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

  const [matrixRollingAnchor, setMatrixRollingAnchor] = useState<Date>(() =>
    floorToHalfHourLocal(new Date())
  )

  useEffect(() => {
    if (activeTab !== 'matrix-overview') return

    const tick = () => setMatrixRollingAnchor(floorToHalfHourLocal(new Date()))
    tick()

    const now = new Date()
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()
    const millis = now.getMilliseconds()
    const nextHalf = minutes < 30 ? 30 : 60
    const msToNext = ((nextHalf - minutes) * 60 - seconds) * 1000 - millis

    let intervalId: number | null = null
    const timeoutId = window.setTimeout(() => {
      tick()
      intervalId = window.setInterval(tick, 30 * 60 * 1000)
    }, Math.max(msToNext, 0))

    return () => {
      window.clearTimeout(timeoutId)
      if (intervalId !== null) window.clearInterval(intervalId)
    }
  }, [activeTab])
  // --- ADD: role-driven filter state ---
  const [filterCompanyGroupId, setFilterCompanyGroupId] = useState<number | ''>('')
  const [filterCompanyAdminId, setFilterCompanyAdminId] = useState<number | ''>('')
  const [filterVesselId, setFilterVesselId] = useState<number | ''>('')

  // ===== Sticky left columns (Matrix Overview) =====
  const SR_STICKY_W   = 70    // SR/NO
  const NAME_STICKY_W = 170 // px — keep small
  const RANK_STICKY_W = 170 // px — keep small
  const VESSEL_STICKY_W = 170 //px — keep small

  const NAME_STICKY_LEFT = SR_STICKY_W
const RANK_STICKY_LEFT = SR_STICKY_W + NAME_STICKY_W
const VESSEL_STICKY_LEFT = SR_STICKY_W + NAME_STICKY_W + RANK_STICKY_W

// NEW: total frozen width (used by the clip mask)
const LEFT_FREEZE_W = SR_STICKY_W + NAME_STICKY_W + RANK_STICKY_W + VESSEL_STICKY_W

  // ADD: robust id readers (handles numbers or strings, root or nested)
  const toNum = (v: any): number | undefined =>
    v === null || v === undefined || v === '' || isNaN(Number(v)) ? undefined : Number(v)

  const pickCompanyGroupId = (m: any): number | undefined =>
    toNum(
      m.companyGroupAdminId ??
        m.companyGroupId ??
        m.companyGroupAdmin?.id ??
        m.cgaid ??
        m.cga?.id ??
        m.vessel?.companyGroupAdminId ??
        m.vessel?.companyGroupAdmin?.id
    )

  const pickCompanyAdminId = (m: any): number | undefined =>
    toNum(
      m.companyAdminId ??
        m.companyId ??
        m.companyAdmin?.id ??
        m.vessel?.companyAdminId ??
        m.vessel?.companyAdmin?.id
    )

  const pickVesselId = (m: any): number | undefined => toNum(m.vessel?.id ?? m.vesselId)

  const [showWorkHours, setShowWorkHours] = useState(false)
  const [hoursMap, setHoursMap] = useState<
    Record<
      string,
      {
        work: number
        rest: number
        compliant: boolean
        violationCount: number
        violations: string[] // array of violation descriptions
        violationCodes?: string[]
        approved: boolean
        summaryId: number | null
        remarks: string
      }
    >
  >({})
  // const [restHoursMap, setRestHoursMap] = useState<Record<string, number>>({});
  const vesselId = currentUser?.vessel?.id
  const crewId = currentUser?.roleEntityId

  const [isExportOpen, setIsExportOpen] = useState(false)
const [exportType, setExportType] = useState<'pdf'|'excel'>('pdf')

// default the PDF week picker to the latest 7 days inside the Matrix Overview range
const defaultPdfStart = (() => {
  const end = new Date(toDate + 'T00:00:00Z')
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6)
  return start.toISOString().slice(0, 10)
})()
const [pdfWeekStart, setPdfWeekStart] = useState<string>(defaultPdfStart)


// ===== THEME (tweak if your brand uses a different primary) =====
const THEME = {
  primary: [13, 110, 253] as [number, number, number],      // #0D6EFD
  primarySoft: [240, 247, 255] as [number, number, number],  // very light
  accent: [25, 135, 84] as [number, number, number],         // #198754 (success)
  danger: [220, 53, 69] as [number, number, number],         // #DC3545
  dangerSoft: [255, 240, 244] as [number, number, number],   // light red
  grayHead: [231, 238, 255] as [number, number, number],     // pale head bg
};

// Who must pick a vessel before exporting (superadmin, subcompany, group, operator)
const requiresVessel = (roleId ?? 0) === 1 || (roleId ?? 0) === 2 || (roleId ?? 0) === 5 || (roleId ?? 0) === 6;
const ensureVesselSelected = () => {
  if (requiresVessel && typeof filterVesselId !== 'number') {
    notify.warn('Please select a Vessel first in Vessel Filter to export.');
    return false;
  }
  return true;
};

// Rank label that always resolves
const getRankLabel = (c: any) =>
  rankMap[Number(c?.rankInfo?.id ?? c?.rankId)] ??
  c?.rankInfo?.rank ??
  c?.rank ??
  '—';

// Excel range state (defaults to last 30 days, capped today)
const todayISO = new Date().toISOString().slice(0, 10);
const defaultExcelFrom = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 29);
  return d.toISOString().slice(0, 10);
})();
const [excelFrom, setExcelFrom] = useState<string>(defaultExcelFrom);
const [excelTo, setExcelTo] = useState<string>(todayISO);

// Validate Excel range: ≤ 31 days, no future, from <= to
const validateExcelRange = (fromISO: string, toISO: string) => {
  if (!fromISO || !toISO) {
    notify.warn('Please choose both From and To dates for Excel export.');
    return false;
  }
  if (toISO > todayISO) {
    notify.warn('No future dates allowed for Excel export.');
    return false;
  }
  const from = new Date(fromISO + 'T00:00:00Z');
  const to = new Date(toISO + 'T00:00:00Z');
  if (from > to) {
    notify.warn('From date must be before To date.');
    return false;
  }
  const diffDays = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  if (diffDays > 31) {
    notify.warn('Please select at most 1 month (≤ 31 days).');
    return false;
  }
  return true;
};
// Removed: Exceptions are now always on
// useEffect(() => {
//   if (activeTab !== 'update' && allowExceptions) {
//     setAllowExceptions(false);
//   }
// }, [activeTab, allowExceptions]);


// recompute default when matrix date range changes
useEffect(() => {
  const end = new Date(toDate + 'T00:00:00Z')
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6)
  setPdfWeekStart(start.toISOString().slice(0, 10))
}, [fromDate, toDate])


  useEffect(() => {
    if (!currentUser) return

  if (roleId === 5 || operatorActsLikeGroupAdmin) {
    // CGA or Operator under a Company Group → scope by their group
    setFilterCompanyGroupId(currentUser.companyGroupAdminId ?? '')
    setFilterCompanyAdminId('')
    setFilterVesselId('')
  } else if (roleId === 2) {
    // Subcompany Admin → scope to their group + subcompany
    setFilterCompanyGroupId(currentUser.companyGroupAdminId ?? '')
    setFilterCompanyAdminId(currentUser.companyAdminId ?? '')
    setFilterVesselId('')
  } else if (roleId === 4) {
    // Crew (master or not) → stick to own vessel
    setFilterCompanyGroupId('')
    setFilterCompanyAdminId('')
    setFilterVesselId(currentUser.vessel?.id ?? '')
  } else {
    // Superadmin OR Operator acting like Superadmin → no defaults
    setFilterCompanyGroupId('')
    setFilterCompanyAdminId('')
    setFilterVesselId('')
  }
}, [currentUser, roleId, operatorActsLikeGroupAdmin, operatorActsLikeSuperadmin])

  useEffect(() => {
    ;(async () => {
      try {
        const rs = await getRanksforList?.()
        const opts = Array.isArray(rs)
          ? rs.map((r: any) => ({
              id: Number(r.id),
              label: String(r.rank ?? r.name ?? r.title ?? `Rank #${r.id}`),
            }))
          : []

        if (opts.length) {
          opts.sort((x, y) => compareRank(x.label, y.label, 'asc'));
          setRankOptions(opts)
          const m: Record<number, string> = {}
          opts.forEach((o) => {
            m[o.id] = o.label
          })
          setRankMap(m)
          return
        }
        // fallback (if API empty)
        throw new Error('Empty rank list')
      } catch {
        const fallback: Record<number, string> = {}
        crew.forEach((c) => {
          const id = Number(c.rankInfo?.id ?? c.rankId)
          const label = String(c.rankInfo?.rank ?? c.rank ?? '')
          if (id && label) fallback[id] = label
        })
        setRankOptions(Object.entries(fallback).map(([id, label]) => ({id: Number(id), label}))
      .sort((x, y) => compareRank(x.label, y.label, 'asc'))
    )
        setRankMap(fallback)
      }
    })()
    // re-run if the crew data changes (for fallback)
  }, [crew])

// REMOVE the other fetchCrewHours() useEffects
useEffect(() => {
  if (!currentUser || !fromDate || !toDate) return
  if (activeTab !== 'matrix-overview') return
  fetchCrewHours()
}, [
  currentUser,              // refetch once auth lands
  fromDate, toDate,         // date changes
  filterCompanyGroupId,
  filterCompanyAdminId,
  filterVesselId,
  selectedCrew,              // name filter changes
  regulation,
  activeTab
])

  useEffect(() => {
    if (typeof filterCompanyGroupId !== 'number') return

    // Build allowed subcompany ids from raw state (available earlier than memos)
    const allowedIds = new Set(
      (subcompanies || [])
        .filter((sc) => sc.companyGroupId === filterCompanyGroupId)
        .map((sc) => sc.id)
    )

    if (typeof filterCompanyAdminId === 'number' && !allowedIds.has(filterCompanyAdminId)) {
      setFilterCompanyAdminId('') // previously selected subcompany doesn't belong to the new company
    }
  }, [filterCompanyGroupId, filterCompanyAdminId, subcompanies])

  type SummaryCell = {
    work: number
    rest: number
    compliant: boolean
    violationCount: number
    violations: string[]
    violationCodes?: string[]
    approved?: boolean
    summaryId?: number | null
    remarks?: string                
  }

  const patchMatrixSummary = (
    crewIdForPatch: number,
    summaryByDate: Record<string, Omit<SummaryCell, 'approved' | 'summaryId'>>
  ) => {
    setHoursMap((prev) => {
      const next = {...prev}
      for (const [dateKey, s] of Object.entries(summaryByDate)) {
        const key = `${crewIdForPatch}-${dateKey}`
        const prevCell = prev[key] || {
          work: 0,
          rest: 24,
          compliant: true,
          violationCount: 0,
          violations: [],
          approved: false,
          summaryId: null,
        }
        // Edited days become unapproved until server says otherwise
        next[key] = {
          ...prevCell,
          ...s,
          approved: false,
          summaryId: prevCell.summaryId ?? null,
        }
      }
      return next
    })
  }

  const matrixRollingCrewId = useMemo(() => {
    if (isMasterByName && selectedCrew?.id) return selectedCrew.id
    if (isCrewNonMaster) return crewId
    return crewId ?? null
  }, [isMasterByName, selectedCrew, isCrewNonMaster, crewId])

  const matrixRollingVesselId = useMemo(() => {
    if (!matrixRollingCrewId) return vesselId
    const match = crew.find((c) => c.crewId === matrixRollingCrewId)
    return match?.vessel?.id ?? vesselId
  }, [crew, vesselId, matrixRollingCrewId])

  const matrixRollingFromDate = useMemo(() => {
    if (!fromDate) return ''
    const d = new Date(fromDate + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - (ROLLING_WINDOW_DAYS - 1))
    return d.toISOString().slice(0, 10)
  }, [fromDate])

  const fetchRestHourEntries = async (fromDate: string, toDate: string) => {
    try {
      // Call your bulk save function (it loops through each date)
      if (matrixRollingVesselId && matrixRollingCrewId) {
        const data = await getRestHourEntriesInRange(
          matrixRollingCrewId,
          matrixRollingVesselId,
          fromDate,
          toDate
        )
        setApiEntries(data)
      } else {
        setApiEntries([])
      }
    } catch (error) {
      console.error('Save failed:', error)
      setApiEntries([])
    }
  }

  useEffect(() => {
    if (fromDate && toDate) {
      const start = matrixRollingFromDate || fromDate
      fetchRestHourEntries(start, toDate)
    }
  }, [fromDate, toDate, matrixRollingFromDate, matrixRollingCrewId, matrixRollingVesselId])

  const handleRemarksChange = (date: Date, value: string) => {
    const dateString = date.toISOString().split('T')[0]
    setRemarks((prev) => {
      const newRemarks = new Map(prev)
      newRemarks.set(dateString, value)
      return newRemarks
    })
  }

  useEffect(() => {
    fetchCrew()
    // fetchCrewHours()
    fetchVessels()
  }, [])

  // Company = Company GROUP Admins (role 5)
  // Subcompany = Company Admins (role 2)
  useEffect(() => {
    ;(async () => {
      try {
        const [groups, admins] = await Promise.all([
          getCompanyAdminList?.().catch(() => []), // ← /company-group-admins
          getCompanyList?.().catch(() => []), // ← /users/company-admins
        ])

        setCompanies(
          Array.isArray(groups)
            ? groups.map((g: any) => ({
                id: Number(g.id),
                name: g.name ?? g.companyGroupAdminName ?? `Company Group #${g.id}`,
              }))
            : []
        )

        setSubcompanies(
          Array.isArray(admins)
            ? admins.map((a: any) => ({
                id: Number(a.id),
                name: a.name ?? a.companyAdminName ?? `Subcompany #${a.id}`,
                companyGroupId: Number(
                  a.cgaid ?? a.cga?.id ?? a.companyGroupAdminId ?? a.companyGroupId
                ),
              }))
            : []
        )
      } catch (e) {
        console.error('Failed to load company lists', e)
        setCompanies([])
        setSubcompanies([])
      }
    })()
  }, [])

  // useEffect(() => {
  //   fetchCrewHours()
  // }, [fromDate, toDate])

  useEffect(() => {
    setSelectedCrew(null) // reset crew if rank changes
  }, [selectedRank])

  // Replace ENTIRE fetchCrew with this:
  const fetchCrew = async () => {
    try {
      const raw = await getCrewList()

      // normalize → ONE shape your filters expect
      const normalized: Crew[] = (Array.isArray(raw) ? raw : []).map((r: any) => {
        const toNum = (v: any) =>
          v === null || v === undefined || isNaN(Number(v)) ? undefined : Number(v)

        const rankIdVal = toNum(r?.rankInfo?.id ?? r?.rankId ?? r?.rank?.id) ?? 0
        const rankName = r?.rankInfo?.rank ?? r?.rank ?? ''

        // prefer vessel obj; fallback to root vessel fields if any exist
        const vesselObj = r?.vessel
          ? {
              id: Number(r.vessel.id),
              fleet_name: r.vessel.fleet_name ?? r.vessel.name ?? r.vessel.fleetName ?? '',
            }
          : undefined

        // robust company ids (root or nested via vessel)
        const companyGroupAdminId = toNum(
          r.companyGroupAdminId ??
            r.companyGroupId ??
            r.companyGroupAdmin?.id ??
            r.vessel?.companyGroupAdminId ??
            r.vessel?.companyGroupAdmin?.id
        )

        const companyAdminId = toNum(
          r.companyAdminId ??
            r.companyId ??
            r.companyAdmin?.id ??
            r.vessel?.companyAdminId ??
            r.vessel?.companyAdmin?.id
        )

        return {
          ...r,
          // unify identity:
          id: toNum(r.id) ?? toNum(r.userId) ?? 0,
          userId: toNum(r.userId) ?? toNum(r.id) ?? 0,
          crewId: toNum(r.crewId ?? r.id ?? r.userId) ?? 0,
          crewName: r.crewName ?? r.name ?? r.username ?? '',
          name: r.name ?? r.crewName ?? r.username ?? '',

          // ranks
          rankId: rankIdVal,
          rank: rankName,
          rankInfo: r.rankInfo ?? {id: rankIdVal, rank: rankName},

          // company scope at root for filters
          companyGroupAdminId: companyGroupAdminId ?? 0,
          companyAdminId: companyAdminId,

          // vessel (only id + name needed for filters/dropdowns)
          vessel: vesselObj,

          // ensure these flags exist
          active: Boolean(r.active),

          // approval field (kept if present)
          approvalStatus: r.approvalStatus,
        } as Crew
      })

      // HARD FILTER for Rest Hours (business rule):
      // show only APPROVED + active + HAS a vessel
      const filtered = normalized.filter(
        (c) =>
          c.active === true &&
          (c.approvalStatus === 'APPROVED' ||
            (typeof c.approvalStatus === 'string' &&
              c.approvalStatus.toUpperCase() === 'APPROVED')) &&
          !!c.vessel?.id
      )

      setCrew(filtered)
    } catch (error) {
      console.error('Failed to fetch crew list:', error)
      setCrew([])
    }
  }

  const fetchVessels = async () => {
    try {
      const vesselList = await getVesselList()
      setVesselList(vesselList)
    } catch (error) {
      console.error('Failed to fetch crew list:', error)
      setVesselList([])
    }
  }

  // Generate time slots in 30-minute intervals (24 hours)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = []
    for (let hour = 0; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()
  const [workingHours, setWorkingHours] = useState<Set<string>>(() => {
    const defaultWorkingHours = new Set<string>()
    return defaultWorkingHours
  })
  const [selectedEntries, setSelectedEntries] = useState<{date: string; slotIndex: number}[]>([])
  const toggleWorkingHour = (memberId: number, date: Date, timeIndex: number): void => {
    const dateString = date.toISOString().split('T')[0]
    const key = `${memberId}-${dateString}-${timeIndex}`
    const newWorkingHours = new Set(workingHours)

    if (newWorkingHours.has(key)) {
      newWorkingHours.delete(key)
    } else {
      newWorkingHours.add(key)
    }

    setWorkingHours(newWorkingHours)
  }

  // Get unique values for filter dropdowns
  const vessels = Array.from(new Set(crew.map((record) => record.vessel)))
  const ranks = Array.from(new Set(crew.map((record) => record.rankInfo)))
  const crewNames = Array.from(new Set(crew.map((member) => member.crewName)))
  // const dates = Array.from(new Set(crew.map(record => record.date)));

  // 1. State for the validation error message
  const [error, setError] = useState('')

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedVessel('')
    setSelectedRank('')
    setSelectedCrew(null)
    setSelectedStatus('')
    setSelectedDate('')
    setFilterCompanyGroupId('')
    setFilterCompanyAdminId('')
    setFilterVesselId('')
  }

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1) // reset to first page
  }

  const filteredCrewMembers = React.useMemo(() => {
    const isCrew = roleId === 4
    const isMaster = (currentUser?.rank?.rank ?? '').toLowerCase().includes('master')

    // snapshot filter values
    const fCG = typeof filterCompanyGroupId === 'number' ? filterCompanyGroupId : undefined
    const fCA = typeof filterCompanyAdminId === 'number' ? filterCompanyAdminId : undefined
    const fVES = typeof filterVesselId === 'number' ? filterVesselId : undefined
    const fRank = selectedRank ? Number(selectedRank) : undefined
    const fCrew = selectedCrew?.id ? Number(selectedCrew.id) : undefined

    return crew.filter((m) => {
      // self-only for non-master crew
      if (isCrew && !isMaster) return m.crewId === crewId

      // read ids robustly from normalized OR nested fields
      const cgId = toNum(m.companyGroupAdminId) ?? pickCompanyGroupId(m)
      const caId = toNum(m.companyAdminId) ?? pickCompanyAdminId(m)
      const vId = toNum(m.vessel?.id) ?? pickVesselId(m)
      const rId = toNum(m.rankInfo?.id ?? m.rankId)

      const byCG = !fCG || cgId === fCG
      const byCA = !fCA || caId === fCA
      const byVES = !fVES || vId === fVES
      const byRank = !fRank || rId === fRank
      const byName = !fCrew || m.crewId === fCrew

      return byCG && byCA && byVES && byRank && byName
    })
  }, [
    crew,
    roleId,
    currentUser,
    selectedRank,
    selectedCrew,
    filterCompanyGroupId,
    filterCompanyAdminId,
    filterVesselId,
    crewId,
  ])

  // const selectedCrewRecord = useMemo(
  //   () => crew.find((member) => member.crewId === selectedCrew?.id) ?? null,
  //   [crew, selectedCrew]
  // )

  // const rollingCrewId = useMemo(() => {
  //   if (roleId === 4 && !isMasterByName) return crewId ?? undefined
  //   return selectedCrew?.id ?? undefined
  // }, [roleId, isMasterByName, crewId, selectedCrew])
  //
  // const rollingVesselId = useMemo(() => {
  //   if (typeof filterVesselId === 'number') return filterVesselId
  //   if (selectedCrewRecord?.vessel?.id) return selectedCrewRecord.vessel.id
  //   return currentUser?.vessel?.id ?? undefined
  // }, [filterVesselId, selectedCrewRecord, currentUser])
  //
  // const rollingHasViolation = useMemo(() => {
  //   const windows = rollingExceptionsData?.windows ?? []
  //   return windows.some(
  //     (window) => window.violated || (window.exceptions && window.exceptions.length > 0)
  //   )
  // }, [rollingExceptionsData])
  //
  // const rollingAsOfDateKey = useMemo(() => {
  //   if (!rollingAsOf) return null
  //   const date = new Date(rollingAsOf)
  //   if (Number.isNaN(date.getTime())) return null
  //   return date.toLocaleDateString('en-CA')
  // }, [rollingAsOf])
  //
  // const rollingTooltip = useMemo(() => {
  //   if (!rollingExceptionsData || !rollingHasViolation) return ''
  //   return buildRollingTooltip(rollingExceptionsData, rollingAsOf)
  // }, [rollingExceptionsData, rollingHasViolation, rollingAsOf])



  // SORT the role-scoped set that you actually render
  const sortedCrew = useMemo(() => {
    const list = [...filteredCrewMembers]
    if (!sortConfig.key) return list

    return list.sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''

      switch (sortConfig.key) {
  case 'crewName':
    valA = a.crewName || ''
    valB = b.crewName || ''
    break
  case 'rank': {
  const ra =
    rankMap[Number(a?.rankInfo?.id ?? a?.rankId)] ??
    a?.rankInfo?.rank ?? a?.rank ?? '';
  const rb =
    rankMap[Number(b?.rankInfo?.id ?? b?.rankId)] ??
    b?.rankInfo?.rank ?? b?.rank ?? '';
  return compareRank(ra, rb, sortConfig.direction);
}
  case 'vessel':
    valA = a?.vessel?.fleet_name || ''
    valB = b?.vessel?.fleet_name || ''
    break
  default:
    valA = (a as any)[sortConfig.key!] ?? ''
    valB = (b as any)[sortConfig.key!] ?? ''
    break
}


      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredCrewMembers, sortConfig])

  useEffect(() => {
  if (activeTab !== 'update') return;

  // already selected -> nothing to do
  if (selectedCrew?.id) return;

  const isCrew = roleId === 4;
  const isMaster = (currentUser?.rank?.rank ?? '').toLowerCase().includes('master');

  // crew (not master): default to self
  if (isCrew && !isMaster && crewId) {
    const fallbackName =
      (currentUser as any)?.fullName ||
      (currentUser as any)?.name ||
      (currentUser as any)?.username ||
      'Me';
    setSelectedCrew({id: crewId, name: String(fallbackName)});
    return;
  }

  // otherwise: first visible in the filtered list
  if (filteredCrewMembers.length > 0) {
    const m = filteredCrewMembers[0];
    setSelectedCrew({id: m.crewId, name: m.crewName});
  }
}, [activeTab, selectedCrew, roleId, currentUser, crewId, filteredCrewMembers]);


  // Clamp/compute pagination from the sorted list
  const totalPages = Math.max(1, Math.ceil(sortedCrew.length / rowsPerPage))
  useEffect(() => {
    // reset or clamp when the dataset shrinks, filters change, or page size changes
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1)
  }, [
    rowsPerPage,
    filterCompanyGroupId,
    filterCompanyAdminId,
    filterVesselId,
    selectedRank,
    selectedCrew,
    fromDate,
    toDate,
  ])

  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const pagedCrew = useMemo(
    () => sortedCrew.slice(indexOfFirstRecord, indexOfLastRecord),
    [sortedCrew, indexOfFirstRecord, indexOfLastRecord]
  )

  const handleModalOpen = () => {
    setIsModalVisible(true)
  }

  const handleModalClose = () => {
    setIsModalVisible(false)
  }

  const handleModalSubmit = (data: any) => {
    console.log('Rest hour data submitted:', data)
    // Here you would typically add the data to your state or send to API
    // For now, we'll just log it
    notify?.success(`Rest hour entry added for ${data.crewName}.`)
  }

  const getDaySuffix = (day: number) => {
    if (day > 3 && day < 21) return 'th'
    switch (day % 10) {
      case 1:
        return 'st'
      case 2:
        return 'nd'
      case 3:
        return 'rd'
      default:
        return 'th'
    }
  }

  const generateDateLabels = (from: string, to: string) => {
    if (!from || !to) return []

    const start = new Date(from)
    const end = new Date(to)
    const labels: string[] = []

    let current = new Date(start)
    while (current <= end) {
      const day = current.getDate()
      const monthName = current.toLocaleString('default', {month: 'short'})
      labels.push(`${day}${getDaySuffix(day)} ${monthName}`)
      current.setDate(current.getDate() + 1)
    }

    return labels
  }

  const dateLabels = generateDateLabels(fromDate, toDate)

  // === 7D CHIP POSITION CONFIG ===
  type ChipSide = 'left' | 'right'
  const WEEK_CHIP_SIDE: ChipSide = 'right' // <-- do NOT write `as const`
  const IS_WEEK_CHIP_RIGHT = WEEK_CHIP_SIDE === 'right'

  const WEEK_CHIP_RESERVED = 56 // px reserved for chip
  const APPROVE_BTN_RESERVED = 28 // px reserved for ✓ button

  // === 7D WINDOW HELPERS FOR MATRIX OVERVIEW ===

  // Build the continuous list of YYYY-MM-DD keys for the selected range
  const dateKeys = useMemo(() => {
    if (!fromDate || !toDate) return []
    const out: string[] = []
    const start = new Date(fromDate + 'T00:00:00Z')
    const end = new Date(toDate + 'T00:00:00Z')
    const cur = new Date(start)
    while (cur <= end) {
      out.push(cur.toLocaleDateString('en-CA')) // YYYY-MM-DD
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    return out
  }, [fromDate, toDate])

  // Anchored 7d windows end at toDate, then toDate-7, etc. (only full windows)
  const weekEndIdxSet = useMemo(() => {
    const s = new Set<number>()
    if (!dateKeys.length) return s
    for (let ei = dateKeys.length - 1; ei >= 6; ei -= 7) s.add(ei)
    return s
  }, [dateKeys])

  const weekStartIdxSet = useMemo(() => {
    const s = new Set<number>()
    weekEndIdxSet.forEach((ei) => s.add(ei - 6))
    return s
  }, [weekEndIdxSet])

  // Compute per-crew anchored 7d summary for Matrix Overview overlay
  // Keyed by `${crewId}-${endDate}`
  const matrixAnchored7d = useMemo(() => {
    const out: Record<string, {windowStart: string; totalRest: number; violated: boolean}> = {}
    if (!dateKeys.length || filteredCrewMembers.length === 0) return out

    filteredCrewMembers.forEach((member) => {
      weekEndIdxSet.forEach((ei) => {
        const startIdx = ei - 6
        let sum = 0
        for (let di = startIdx; di <= ei; di++) {
          const dk = dateKeys[di]
          const key = `${member.crewId}-${dk}`
          const entry = hoursMap[key]
          // Same assumption as in Update tab if missing: treat as 24h rest
          sum += Number(entry?.rest ?? 24)
        }
        const endKey = dateKeys[ei]
        const startKey = dateKeys[startIdx]
        out[`${member.crewId}-${endKey}`] = {
          windowStart: startKey,
          totalRest: sum,
          violated: sum < 77,
        }
      })
    })

    return out
  }, [filteredCrewMembers, dateKeys, weekEndIdxSet, hoursMap])
 
  // after matrixAnchored7d (rest totals), also compute 7d WORK totals
const matrixAnchored7dWork = useMemo(() => {
  const out: Record<string, {windowStart: string; totalWork: number}> = {}
  if (!dateKeys.length || filteredCrewMembers.length === 0) return out

  filteredCrewMembers.forEach((member) => {
    weekEndIdxSet.forEach((ei) => {
      const startIdx = ei - 6
      let sum = 0
      for (let di = startIdx; di <= ei; di++) {
        const dk = dateKeys[di]
        const entry = hoursMap[`${member.crewId}-${dk}`]
        sum += Number(entry?.work ?? 0)
      }
      out[`${member.crewId}-${dateKeys[ei]}`] = {
        windowStart: dateKeys[startIdx],
        totalWork: sum,
      }
    })
  })
  return out
}, [filteredCrewMembers, dateKeys, weekEndIdxSet, hoursMap])


  const matrixRollingViolations = useMemo(() => {
    const out: Record<string, {violations: string[]; violationCodes: string[]}> = {}
    if (!matrixRollingCrewId || !dateKeys.length || !apiEntries.length) return out

    const workingSet = new Set<string>()
    apiEntries.forEach((e: any) => {
      const isWorking = Boolean(e?.isWorking ?? e?.working)
      if (isWorking) workingSet.add(`${e.entryDate}-${e.slotIndex}`)
    })

    const toLocalDateKey = (value: Date) => {
      const yyyy = value.getFullYear()
      const mm = String(value.getMonth() + 1).padStart(2, '0')
      const dd = String(value.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    const anchorHours = matrixRollingAnchor.getHours()
    const anchorMinutes = matrixRollingAnchor.getMinutes()
    const dateIndex = new Map<string, number>()
    const daily = new Map<string, {slots: boolean[]; work: number; rest: number}>()

    dateKeys.forEach((dk, idx) => dateIndex.set(dk, idx))

    dateKeys.forEach((dk) => {
      const parts = dk.split('-').map(Number)
      const yyyy = parts[0]
      const mm = parts[1]
      const dd = parts[2]
      if (!yyyy || !mm || !dd) return
      const end = new Date(yyyy, mm - 1, dd, anchorHours, anchorMinutes, 0, 0)
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)

      const slots: boolean[] = []
      for (let i = 0; i < 48; i++) {
        const slotStart = new Date(start.getTime() + i * 30 * 60 * 1000)
        const slotDateKey = toLocalDateKey(slotStart)
        const slotIndex =
          slotStart.getHours() * 2 + (slotStart.getMinutes() >= 30 ? 1 : 0)
        slots.push(workingSet.has(`${slotDateKey}-${slotIndex}`))
      }

      const workSlots = slots.filter(Boolean).length
      const work = workSlots * 0.5
      daily.set(dk, {slots, work, rest: 24 - work})
    })

    dateKeys.forEach((dk) => {
      const day = daily.get(dk)
      if (!day) return
      const idx = dateIndex.get(dk)
      if (idx === undefined) return

      const startIdx = idx - (ROLLING_WINDOW_DAYS - 1)
      let weekWork: number | null = null
      let weekRest: number | null = null
      let exceptionDays = new Set<string>()

      if (startIdx >= 0) {
        let sumWork = 0
        let sumRest = 0
        let allPresent = true
        const exceptionCandidates: string[] = []

        for (let i = startIdx; i <= idx; i++) {
          const k = dateKeys[i]
          const d = daily.get(k)
          if (!d) {
            allPresent = false
            break
          }
          sumWork += d.work
          sumRest += d.rest
          if (regulation === 'stcw' && allowExceptions && d.rest >= 6 && d.rest < 10) {
            exceptionCandidates.push(k)
          }
        }

        if (allPresent) {
          weekWork = sumWork
          weekRest = sumRest
          if (regulation === 'stcw' && allowExceptions) {
            exceptionDays = new Set(exceptionCandidates.slice(0, 2))
          }
        }
      }

      const violations: string[] = []
      const violationCodes: string[] = []

      if (regulation === 'stcw') {
        const v = checkRestViolations(day.slots)
        if (weekRest !== null) v.minRest7d.isViolation = weekRest < 77

        if (
          allowExceptions &&
          v.minRest24h.isViolation &&
          day.rest >= 6 &&
          exceptionDays.has(dk)
        ) {
          v.minRest24h.isViolation = false
        }

        if (v.minRest24h.isViolation) {
          violations.push('Min Rest/24h < 10h')
          violationCodes.push('STCW_MIN_REST_24H')
        }
        if (v.minRest7d.isViolation) {
          violations.push('Min Rest/7d < 77h')
          violationCodes.push('STCW_MIN_REST_7D')
        }
        if (v.maxInterval.isViolation) {
          violations.push('Max interval between rests > 14h')
          violationCodes.push('STCW_MAX_INTERVAL_BETWEEN_RESTS')
        }
        if (v.maxPeriods.isViolation) {
          violations.push('More than 2 rest periods/day')
          violationCodes.push('STCW_MAX_REST_PERIODS')
        }
        if (v.minSingleRest.isViolation) {
          violations.push('Min single rest < 6h')
          violationCodes.push('STCW_MIN_SINGLE_REST_BLOCK')
        }
      } else {
        const weekWorkVal = weekWork ?? 0
        const weekRestVal = weekRest ?? 0
        const v = checkMLCViolations(day.slots, weekWorkVal, weekRestVal, allowExceptions)

        if (weekWork === null) {
          v.maxWork7d.isViolation = false
        }
        if (v.minRest7d && weekRest === null) {
          v.minRest7d.isViolation = false
        }

        if (v.maxWork24h.isViolation) {
          violations.push('Max Work/24h > 14h')
          violationCodes.push('MLC_MAX_WORK_24H')
        }
        if (weekWork !== null && v.maxWork7d.isViolation) {
          violations.push('Max Work/7d > 72h')
          violationCodes.push('MLC_MAX_WORK_7D')
        }
        if (allowExceptions && weekRest !== null && v.minRest7d?.isViolation) {
          violations.push('Min Rest/7d < 70h (exception floor)')
          violationCodes.push('MLC_MIN_REST_7D_FLOOR70')
        }
      }

      if (violations.length) {
        out[`${matrixRollingCrewId}-${dk}`] = {violations, violationCodes}
      }
    })

    return out
  }, [matrixRollingCrewId, dateKeys, apiEntries, matrixRollingAnchor, regulation, allowExceptions, ROLLING_WINDOW_DAYS])


  const fetchCrewHours = async () => {
    try {
      if (!fromDate || !toDate) return
      const isCrew = roleId === 4
      const isMaster = (currentUser?.rank?.rank ?? '').toLowerCase().includes('master')

      const vId =
        typeof filterVesselId === 'number'
          ? filterVesselId
          : isCrew
          ? currentUser?.vessel?.id
          : undefined

      const selectedCrewId = selectedCrew && selectedCrew.id > 0 ? selectedCrew.id : undefined
const cId = selectedCrewId ?? (isCrew && !isMaster ? crewId : undefined)


      // const summaries = await getRestHoursSummary(fromDate, toDate, cId, vId, regulation)
      const summaries = await getRollingMatrixSummaries(fromDate, toDate, cId, vId, regulation)

      const map: Record<
        string,
        {
          work: number
          rest: number
          compliant: boolean
          violationCount: number
          violations: string[]
          violationCodes?: string[]
          approved: boolean
          summaryId: number | null
          remarks: string
        }
      > = {}

      summaries.forEach((entry: any) => {
        const violationList = Array.isArray(entry.violations) ? entry.violations : []
        const violationDescriptions = violationList
          .map((v: any) => (typeof v === 'string' ? v : v?.description))
          .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
        const violationCodes = violationList
          .map((v: any) => (typeof v === 'string' ? '' : v?.ruleCode))
          .filter((v: any) => typeof v === 'string' && v.trim().length > 0)
        const rawCount = Number(entry.violationCount)
        const violationCount =
          Number.isFinite(rawCount) && rawCount > 0 ? rawCount : violationDescriptions.length

        map[`${entry.crewId}-${entry.summaryDate}`] = {
          work: Number(entry.totalWorkHours || 0),
          rest: Number(entry.totalRestHours || 0),
          compliant: !!entry.compliant,
          violationCount,
          violations: violationDescriptions,
          violationCodes,
          approved: !!entry.approved,
          summaryId: entry.id ?? null,
          remarks: entry.remarks ?? ''
        }
      })

      setHoursMap(map)
    } catch (err) {
      console.error('Failed to fetch crew hours:', err)
    }
  }

  // const refreshRollingExceptions = React.useCallback(async () => {
  //   if (!rollingCrewId || !rollingVesselId) return
  //   try {
  //     const data = await getRollingExceptionsCompany(rollingCrewId, rollingVesselId)
  //     setRollingExceptionsData(data)
  //     setRollingAsOf(data?.asOf ?? null)
  //   } catch (err) {
  //     console.error('Rolling exceptions fetch failed:', err)
  //   }
  // }, [rollingCrewId, rollingVesselId])

  const handleAfterSave = React.useCallback(async () => {
    if (activeTab !== 'matrix-overview') return
    await fetchCrewHours()
  }, [activeTab, fetchCrewHours])

  useEffect(() => {
    console.log(hoursMap)
  }, [hoursMap])

  // useEffect(() => {
  //   if (activeTab !== 'matrix-overview') return
  //   if (!rollingCrewId || !rollingVesselId) return
  //   if (rollingRefreshRequestedRef.current) rollingRefreshRequestedRef.current = false
  //   refreshRollingExceptions()
  //   const intervalId = window.setInterval(refreshRollingExceptions, 60000)
  //   return () => window.clearInterval(intervalId)
  // }, [activeTab, rollingCrewId, rollingVesselId, refreshRollingExceptions])

  // REPLACE — build options from API lists; fallback to crew-derived if needed
  const companyGroupOptions = useMemo<CompanyGroupOpt[]>(() => {
    if (companies.length) return companies
    const map = new Map<number, CompanyGroupOpt>()
    crew.forEach((c) => {
      const cgId = pickCompanyGroupId(c)
      if (cgId) map.set(cgId, {id: cgId, name: `Company #${cgId}`})
    })
    return Array.from(map.values())
  }, [companies, crew])

  // Subcompanies strictly under the selected Company Group (fallback from crew if API empty)
  const subcompanyOptions = useMemo<SubcompanyOpt[]>(() => {
    if (subcompanies.length) {
      // already includes sc.companyGroupId from the API
      return typeof filterCompanyGroupId === 'number'
        ? subcompanies.filter((sc) => sc.companyGroupId === filterCompanyGroupId)
        : subcompanies
    }

    const map = new Map<number, SubcompanyOpt>()
    crew.forEach((c) => {
      const caId = pickCompanyAdminId(c)
      const cgId = pickCompanyGroupId(c)
      if (!caId) return
      map.set(caId, {
        id: caId,
        name: (c as any)?.companyAdminName ?? (c as any)?.companyName ?? `Subcompany #${caId}`,
        companyGroupId: cgId,
      })
    })
    const list = Array.from(map.values())
    return typeof filterCompanyGroupId === 'number'
      ? list.filter((sc) => sc.companyGroupId === filterCompanyGroupId)
      : list
  }, [subcompanies, crew, filterCompanyGroupId])

  // FIRST: whether the selected company group has any subcompanies
  const companyHasSubcompanies = useMemo(() => {
    if (typeof filterCompanyGroupId !== 'number') return false
    return subcompanyOptions.some((sc) => sc.companyGroupId === filterCompanyGroupId)
  }, [filterCompanyGroupId, subcompanyOptions])

  // THEN: vessel options that use the above flag
  const vesselOptions = useMemo<VesselOpt[]>(() => {
    const fCG = typeof filterCompanyGroupId === 'number' ? filterCompanyGroupId : undefined
    const fCA = typeof filterCompanyAdminId === 'number' ? filterCompanyAdminId : undefined

    // Try API vessels first (tolerate both field layouts)
    const apiFiltered = vesselList.filter((v: any) => {
      const cgId = toNum(
        v.companyGroupAdminId ?? v.companyGroupId ?? v.companyGroupAdmin?.id ?? v.cgaid ?? v.cga?.id
      )
      const caId = toNum(v.companyAdminId ?? v.companyId ?? v.companyAdmin?.id)

      const byCG = !fCG || cgId === fCG
      const byCA = !fCA || caId === fCA
      return byCG && (!companyHasSubcompanies || byCA)
    })

    if (apiFiltered.length) return apiFiltered.map((v) => ({id: v.id, name: v.fleet_name}))

    // Fallback from crew list
    const set = new Map<number, VesselOpt>()
    crew.forEach((c) => {
      const cgId = pickCompanyGroupId(c)
      const caId = pickCompanyAdminId(c)
      const vId = pickVesselId(c)
      const byCG = !fCG || cgId === fCG
      const byCA = !companyHasSubcompanies || !fCA || caId === fCA
      if (vId && byCG && byCA && c.vessel?.fleet_name) {
        set.set(vId, {id: vId, name: c.vessel.fleet_name})
      }
    })
    return Array.from(set.values())
  }, [vesselList, crew, filterCompanyGroupId, filterCompanyAdminId, companyHasSubcompanies])

  // ADD near other handlers in RestHour
  const handleApprove = async (summaryId: number, approve: boolean) => {
    try {
      await approveRestDay(summaryId, approve)
      // refresh after approval
      await fetchCrewHours()
      notify?.success(approve ? 'Day approved.' : 'Approval removed.')
    } catch (e) {
      console.error('Approval failed', e)
      notify?.error(asApiError(e, 'Approval failed'))
    }
  }

  const {fromISO: updateFromISO, toISO: updateToISO} = getLastNDaysRange(UPDATE_EDITABLE_LOOKBACK_DAYS)

  // ADD — which crew id Update tab is operating on
const updateCrewId = isMasterByName && selectedCrew?.id ? selectedCrew.id : crewId

// ADD — approved date set for the Update tab window
const approvedDatesForUpdateTab = useMemo(() => {
  const s = new Set<string>()
  if (!updateCrewId) return s
  const keys = buildDateKeys(updateFromISO, updateToISO)
  keys.forEach((d) => {
    const cell = hoursMap[`${updateCrewId}-${d}`]
    if (cell?.approved) s.add(d)
  })
  return s
}, [hoursMap, updateCrewId, updateFromISO, updateToISO])


useEffect(() => {
  // Prefill Update tab remarks from summaries for the visible Update window
  if (!updateCrewId) return
  const m = new Map<string, string>()
  const keys = buildDateKeys(updateFromISO, updateToISO)
  keys.forEach((d) => {
    const cell = hoursMap[`${updateCrewId}-${d}`]
    if (cell?.remarks) m.set(d, String(cell.remarks))
  })
  setRemarks(m)
}, [hoursMap, updateCrewId, updateFromISO, updateToISO])


  const exportMatrixToExcel = () => {
  if (!ensureVesselSelected()) return;

  // validate 1 month max, no future
  if (!validateExcelRange(excelFrom, excelTo)) return;

  const dateKeysAll = buildDateKeys(excelFrom, excelTo);
  const allCrew = [...sortedCrew]; // export all filtered rows (not only paged rows)

  const summaryHeader = [
   'Crew', 'Rank', 'Vessel', 'From Date', 'To Date',
  'Total Work (h)', 'Total Rest (h)', 'Compliant Days', 'Violation Days'
]

  // Sheet 1: Summary per crew
  const summaryRows = allCrew.map((c) => {
    let totalWork = 0;
    let totalRest = 0;
    let compliantDays = 0;
    let violationDays = 0;
    dateKeysAll.forEach((d) => {
      const cell = hoursMap[`${c.crewId}-${d}`];
      if (cell) {
        totalWork += Number(cell.work || 0);
        totalRest += Number(cell.rest || 0);
        if (cell.violationCount > 0) violationDays += 1; else compliantDays += 1;
      }
    });
    return {
      Crew: crewDisplayName(c),
      Rank: getRankLabel(c),
      Vessel: c?.vessel?.fleet_name || '',
      'From Date': excelFrom,
      'To Date': excelTo,
      'Total Work (h)': Number(totalWork.toFixed(1)),
      'Total Rest (h)': Number(totalRest.toFixed(1)),
      'Compliant Days': compliantDays,
      'Violation Days': violationDays,
    };
  });

  // Sheet 2: Daily Work (matrix)
  const workHeader = ['Crew', ...dateKeysAll];
  const workRows = allCrew.map((c) => {
    const row: any = {Crew: crewDisplayName(c)};
    dateKeysAll.forEach((d) => {
      const cell = hoursMap[`${c.crewId}-${d}`];
      row[d] = cell ? Number(cell.work || 0) : '';
    });
    return row;
  });

  // Sheet 3: Daily Rest (matrix)
  const restHeader = ['Crew', ...dateKeysAll];
  const restRows = allCrew.map((c) => {
    const row: any = {Crew: crewDisplayName(c)};
    dateKeysAll.forEach((d) => {
      const cell = hoursMap[`${c.crewId}-${d}`];
      row[d] = cell ? Number(cell.rest || 0) : '';
    });
    return row;
  });

  // Sheet 4: Violations (one row per violation)
  const violationRows = flattenViolations(allCrew, dateKeysAll, hoursMap);

  const detailHeader = [
  'Crew','Rank','Vessel','From Date','To Date','Date',
  'Work (h)','Rest (h)','Approved','Violation Count','Violations','Compliant', 'Remarks'
]

  // Sheet 5 (NEW): Daily Detail — every crew × day with flags & violations
  const detailRows: any[] = [];
  for (const c of allCrew) {
    for (const d of dateKeysAll) {
      const cell = hoursMap[`${c.crewId}-${d}`];
      detailRows.push({
        Crew: crewDisplayName(c),
        Rank: getRankLabel(c),
        Vessel: c?.vessel?.fleet_name || '',
        From: excelFrom,
      To: excelTo,
        Date: d,
        'Work (h)': cell ? Number(cell.work || 0) : '',
        'Rest (h)': cell ? Number(cell.rest || 0) : '',
        Approved: cell ? (cell.approved ? 'Yes' : 'No') : '',
        'Violation Count': cell ? Number(cell.violationCount || 0) : 0,
        Violations: cell?.violations?.length ? cell.violations.join('; ') : '',
        Compliant: cell ? (cell.compliant ? 'Yes' : 'No') : '',
        Remarks: cell?.remarks ? String(cell.remarks) : '',   
      });
    }
  }

  // Build workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows, {header: summaryHeader}), 'Summary');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workRows, {header: workHeader}), 'Daily Work (h)');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(restRows, {header: restHeader}), 'Daily Rest (h)');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(violationRows), 'Violations');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detailRows, {header: detailHeader}),  'Daily Detail (≤1m)');

  const wbout = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});
  saveAs(new Blob([wbout], {type: 'application/octet-stream'}), `RestHours_${excelFrom}_${excelTo}.xlsx`);
  notify?.success('Excel exported.');
};



const exportWeekToPDF = (weekStartISO: string) => {
  if (!ensureVesselSelected()) return;

  // exact 7 days within current Matrix range
  const start = new Date(weekStartISO + 'T00:00:00Z');
  const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
  const endISO = end.toISOString().slice(0, 10);

  if (weekStartISO < fromDate || endISO > toDate) {
    notify?.warn('Pick a 7-day range within the current Matrix Overview dates.');
    return;
  }

  const dateKeys7 = buildDateKeys(weekStartISO, endISO);
  const allCrew = [...sortedCrew];

  const doc = new jsPDF({orientation: 'landscape'});
  // dd-MMM-yyyy (UTC-safe)
const fmtDDMonYYYY = (iso: string) => {
  const d = new Date(iso + 'T00:00:00Z')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mon = months[d.getUTCMonth()]
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mon}-${yyyy}`
}

// was: const title = `Rest Hours — ${weekStartISO} to ${endISO}`;
const title = `Rest Hours (${regulation.toUpperCase()}) - ${fmtDDMonYYYY(weekStartISO)} to ${fmtDDMonYYYY(endISO)}`
const generateDate = `Generated On - ${fmtDDMonYYYY(new Date().toISOString().split('T')[0])}`


  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 14);
 

  allCrew.forEach((c, idx) => {
    const header = [
      `Crew: ${crewDisplayName(c)}`,
      `Rank: ${getRankLabel(c)}`,     // <-- fixed rank
      `Vessel: ${c?.vessel?.fleet_name || ''}`,
    ].join('   |   ');

    // Crew header strip
    (doc as any).autoTable({
      head: [[header]],
      theme: 'plain',
      startY: idx === 0 ? 22 : (doc as any).lastAutoTable.finalY + 8,
      styles: {fontSize: 11, textColor: [0,0,0]},
      // didDrawCell: (data: any) => {
      //   const {table} = data;
      //   doc.setFillColor(...THEME.primarySoft);
      //   doc.rect(table.head[0].cells[0].x, table.head[0].cells[0].y, table.width, table.head[0].cells[0].height, 'F');
      // },
    });

    // Build body rows
    const body = dateKeys7.map((d) => {
      const cell = hoursMap[`${c.crewId}-${d}`];
      const work = cell ? Number(cell.work || 0).toFixed(1) : '-';
      const rest = cell ? Number(cell.rest || 0).toFixed(1) : '-';
      const vList = cell?.violations?.length ? cell.violations : [];
      // bullet list & linebreaks to wrap properly
      const vText = vList.map((desc: string) => '- ' + desc.replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/"/g, '"')).join('\n');
      let remarks = cell ? (cell.remarks || '-') : '-';
      remarks = remarks.replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/"/g, '"');
      return [d, work, rest, vText, remarks];
    });

    (doc as any).autoTable({
      head: [['Date', 'Work (h)', 'Rest (h)', 'Violations', 'Remarks']],
      body,
      startY: (doc as any).lastAutoTable.finalY + 2,
      styles: {
        fontSize: 9,
        cellPadding: 2,
        overflow: 'linebreak',   // <-- wrap long text
      },
      headStyles: {
        fillColor: THEME.grayHead,
        textColor: [0,0,0],
        fontStyle: 'bold',
      },
      bodyStyles: {
        valign: 'top',
      },
      columnStyles: {
        0: {cellWidth: 28},  // Date
        1: {cellWidth: 22},  // Work
        2: {cellWidth: 22},  // Rest
        3: {cellWidth: 120}, // Violations (wide & wrapping)
        4: {cellwidth: 70}, // remarks
      },
      alternateRowStyles: {fillColor: [250, 250, 250]},
      didParseCell: (data: any) => {
        // softly highlight rows with any violations
        if (data.section === 'body' && data.column.index === 3 && data.cell.raw) {
          data.cell.styles.fillColor = THEME.dangerSoft;
          data.cell.styles.textColor = [90, 0, 0];
        }
      },
      // add a thin primary border
      tableLineWidth: 0.2,
      tableLineColor: THEME.primary as any,
      pageBreak: 'auto',
    });
  });

  // doc.save(`RestHours_${regulation.toUpperCase()}_${weekStartISO}_${endISO}.pdf`);
  doc.save(`RestHours_${weekStartISO}_${endISO}.pdf`);
  notify?.success('PDF exported.');
};

// ⬇️ add near other helpers in RestHour
const updateDateKeys = useMemo(
  () => buildDateKeys(updateFromISO, updateToISO),
  [updateFromISO, updateToISO]
)

const dirtyRemarkDates = useMemo(() => {
  const s = new Set<string>()
  if (!updateCrewId) return s
  updateDateKeys.forEach((d) => {
    const baseline = (hoursMap[`${updateCrewId}-${d}`]?.remarks ?? '').trim()
    const cur = (remarks.get(d) ?? '').trim()
    if (baseline !== cur) s.add(d)
  })
  return s
}, [hoursMap, updateCrewId, updateDateKeys, remarks])

const resetRemarkEdits = () => {
  const next = new Map<string, string>()
  updateDateKeys.forEach((d) => {
    const val = hoursMap[`${updateCrewId}-${d}`]?.remarks ?? ''
    next.set(d, String(val))
  })
  setRemarks(next)
  notify?.info?.('Unsaved remark edits cleared.')
}


  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            {/* Header */}
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <h3 className='card-label text-dark fw-bold'>Rest Hour Records</h3>
              <div className='card-toolbar d-flex align-items-center gap-3'>
    {/* Regulation Switch */}
    <div className='d-flex align-items-center gap-2'>
      <span className='text-muted fw-semibold' style={{fontSize: 12}}>Regulation</span>
      <div className='btn-group btn-group-sm' role='group' aria-label='Regulation switch'>
        <button
          type='button'
          className={`btn btn-sm ${regulation === 'stcw' ? 'btn_primary' : 'btn-light border border-secondary'}`}
          onClick={() => setRegulation('stcw')}
          title='Standards of Training, Certification and Watchkeeping'
        >
          STCW
        </button>
        <button
          type='button'
          className={`btn btn-sm ${regulation === 'mlc' ? 'btn_primary' : 'btn-light border border-secondary'}`}
          onClick={() => setRegulation('mlc')}
          title='Maritime Labour Convention'
        >
          MLC
        </button>
      </div>
    </div>
    {/* // Removed: Exceptions toggle (always on) */}
{/* Exceptions switch — ONLY show on Update tab (no backend support in Matrix) */}
{/* {activeTab === 'update' && (
  <div className='d-flex align-items-center gap-2'>
    <span className='text-muted fw-semibold' style={{fontSize: 12}}>Exceptions</span>
    <div className='btn-group btn-group-sm' role='group' aria-label='Exceptions switch'>
      <button
        type='button'
        className={`btn btn-sm ${!allowExceptions ? 'btn_primary' : 'btn-light'}`}
        onClick={() => setAllowExceptions(false)}
        title='Apply standard limits'
      >
        Off
      </button>
      <button
        type='button'
        className={`btn btn-sm ${allowExceptions ? 'btn_primary' : 'btn-light'}`}
        onClick={() => setAllowExceptions(true)}
        title='Apply allowed flexibility/collective agreement rules'
      >
        On
      </button>
    </div>
  </div>
)} */}



    {/* Export button (unchanged) */}
  <button
    type='button'
    className='btn btn-light-primary'
    onClick={() => setIsExportOpen(true)}
  >
    <KTSVG path='/media/icons/duotune/general/gen005.svg' className='svg-icon-2' />
    Export
  </button>
</div>
            </div>

            {/* Filters */}
            <div className='card-body py-4 bg-white border-top'>
              <div className="overflow-auto">
              <div className='d-flex flex-nowrap align-items-end gap-3'>
                {/* <div className='row g-3 align-items-end mb-3'> */}
                  {/* ROW 1: Superior filters at the TOP */}
                  {(() => {
                    const rId = roleId
                    const isCrew = rId === 4
                    const masterByName = (currentUser?.rank?.rank ?? '')
                      .toLowerCase()
                      .includes('master')

                    // Crew (master or not): NO filters at all
                    if (isCrew) return null

                    return (
                      <>
                        {/* <div className='row g-3 align-items-end mb-4'> */}
                        {/* SUPERADMIN (1): Company(Group) → Subcompany → Vessel */}
                        {(rId === 1 || operatorActsLikeSuperadmin) && (
                          <>
                            <div style={{ minWidth: 220 }}>
                              <label className='form-label text-muted fw-semibold fs-7'>
                                Company (Group)
                              </label>
                              <select
                                className='form-select form-select-sm'
                                value={filterCompanyGroupId}
                                onChange={(e) => {
                                  const v = e.target.value ? Number(e.target.value) : ''
                                  setFilterCompanyGroupId(v)
                                  setFilterCompanyAdminId('') // ← clear subcompany when company changes (as requested)
                                  setFilterVesselId('')
                                }}
                              >
                                <option value=''>All</option>
                                {companyGroupOptions.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {typeof filterCompanyGroupId === 'number' &&
                              subcompanyOptions.some(
                                (sc) => sc.companyGroupId === filterCompanyGroupId
                              ) && (
                                <div style={{ minWidth: 220 }}>
                                  <label className='form-label text-muted fw-semibold fs-7'>
                                    Subcompany
                                  </label>
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
                                      <option key={sc.id} value={sc.id}>
                                        {sc.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                            <div style={{ minWidth: 220 }}>
                              <label className='form-label text-muted fw-semibold fs-7'>
                                Vessel
                              </label>
                              <select
                                className='form-select form-select-sm'
                                value={filterVesselId}
                                onChange={(e) =>
                                  setFilterVesselId(e.target.value ? Number(e.target.value) : '')
                                }
                                disabled={vesselOptions.length === 0}
                              >
                                <option value=''>All Vessels</option>
                                {vesselOptions.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {/* COMPANY GROUP ADMIN (5) & OPERATOR (6): Subcompany → Vessel (Company hidden) */}
                        {(rId === 5 || operatorActsLikeGroupAdmin) && (
                          <>
                            {subcompanyOptions.length > 0 && (
                              <div style={{ minWidth: 220 }}>
                                <label className='form-label text-muted fw-semibold fs-7'>
                                  Subcompany
                                </label>
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
                                    <option key={sc.id} value={sc.id}>
                                      {sc.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div style={{ minWidth: 220 }}>
                              <label className='form-label text-muted fw-semibold fs-7'>
                                Vessel
                              </label>
                              <select
                                className='form-select form-select-sm'
                                value={filterVesselId}
                                onChange={(e) =>
                                  setFilterVesselId(e.target.value ? Number(e.target.value) : '')
                                }
                                disabled={vesselOptions.length === 0}
                              >
                                <option value=''>All Vessels</option>
                                {vesselOptions.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name}
                                  </option>
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
                              onChange={(e) =>
                                setFilterVesselId(e.target.value ? Number(e.target.value) : '')
                              }
                            >
                              <option value=''>All Vessels</option>
                              {vesselOptions.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {/* </div> */}
                      </>
                    )
                  })()}
                  {/* Rank — hidden for non-master crew */}
                  {!isCrewNonMaster && (
                  <div style={{ minWidth: 220 }}>
                    <label className='form-label text-muted fw-semibold fs-7 mb-2'>Rank</label>
                    <select
                      className='form-select form-select-sm'
                      value={selectedRank}
                      onChange={(e) => setSelectedRank(e.target.value)}
                    >
                      <option value=''>All Ranks</option>
                      {rankOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                    )}
{/* Name — hidden for non-master crew */}
{!isCrewNonMaster && (
                  <div style={{ minWidth: 220 }}>
                    <label className='form-label text-muted fw-semibold fs-7 mb-2'>Name</label>
                    <select
                      className='form-select form-select-sm'
                      value={selectedCrew?.id ?? ''} // use id for controlled value
                      onChange={(e) => {
                        const crewMember = crew.find((c) => c.crewId === Number(e.target.value))
                        if (crewMember) {
                          setSelectedCrew({id: crewMember.crewId, name: crewMember.crewName})
                        } else {
                          setSelectedCrew(null)
                        }
                      }}
                    >
                      {/* Only show "All" when NOT in Update tab */}
  {activeTab !== 'update' && <option value=''>All Crew Members</option>}

                      {filteredCrewMembers.map((member) => (
                        <option key={member.crewId} value={member.crewId}>
                          {member.crewName}
                        </option>
                      ))}
                    </select>
                  </div>
                    )}

                  {/* From Date Filter */}
                  {activeTab !== 'update' && (
                  <div style={{ minWidth: 220 }}>
                    <label className='form-label text-muted fw-semibold fs-7 mb-2'>From Date</label>
                    <input
                      type='date'
                      className='form-control form-control-sm'
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>
                  )}

                  {/* To Date Filter */}
                  {activeTab !== 'update' && (
                  <div style={{ minWidth: 220 }}>
                    <label className='form-label text-muted fw-semibold fs-7 mb-2'>To Date</label>
                    <input
                      type='date'
                      className='form-control form-control-sm'
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                  )}


                  {/* Show Button - Updated with the new onClick handler */}
                  {/* <div className='col-md-auto'>
                    <button
                      type='button'
                      className='btn btn-dark btn-sm'
                      // 3. Use the new handler function
                      onClick={handleShowClick}
                    >
                      Show
                    </button>
                  </div> */}
                </div>
</div>
                {/* 4. Display the error message if it exists */}
                {error && (

                  <div className='alert alert-danger p-2' role='alert'>
                    {error}
                  </div>
                )}
             

              {/* Tabs */}
              <div className='d-flex justify-content-between align-items-center mb-4 mt-4'>
                <div className='btn-group' style={{marginBottom: '10px'}}>
                  <button
                    className={`btn btn-sm ${
                      activeTab === 'matrix-overview' ? 'btn_primary' : 'btn-light'
                    }`}
                    onClick={() => setActiveTab('matrix-overview')}
                  >
                    Matrix Overview
                  </button>
                  {/* Update tab needed for master and other crews also */}
                  {roleId === 4 && (
                    <button
                      className={`btn btn-sm ${
                        activeTab === 'update' ? 'btn_primary' : 'btn-light'
                      }`}
                      onClick={() => setActiveTab('update')}
                    >
                      Update
                    </button>
                  )}
                </div>
                 {activeTab !== 'update' && (
                <div className='d-flex justify-content-end mb-3'>
                  <button
                    className={`btn btn-sm ${
                      showWorkHours ? 'btn_primary' : ' border btn-outline-primary'
                    } me-2`}
                    onClick={() => setShowWorkHours(true)}
                  >
                    Work Hours
                  </button>
                  <button
                    className={`btn btn-sm ${
                      !showWorkHours ? 'btn_primary' : ' border btn-outline-primary'
                    }`}
                    onClick={() => setShowWorkHours(false)}
            
                  >
                    Rest Hours
                  </button>
                </div>
              )}
              </div>
             

              {/* Tab Content */}
              <div className='tab-content'>
                <div
                  className={`tab-pane fade ${
                    activeTab === 'matrix-overview' ? 'show active' : ''
                  }`}
                  id='matrix-overview'
                >
                  {/* Table */}
<div className='report-table'>
  <div className='table-responsive table-scroll' style={{overflowX: 'auto',  position: 'relative'}}> 
    {/* LEFT CLIP MASK — prevents date cells from sliding under SR/NO, NAME, RANK, VESSEL */}
    <div
      style={{
        position: 'sticky',
        left: 0,
        top: 0,
        bottom: 0,
        width: `${LEFT_FREEZE_W}px`,
        // draw the vertical separator after the VESSEL column
        borderRight: '1px solid #dee2e6',
        // do NOT force a color; inherit the container theme so it always matches
        background: 'inherit',
        // must be above normal cells but below the sticky cells
        zIndex: 8,
        // don’t block clicks on sticky cells
        pointerEvents: 'none',
      }}
    />                   
                    <table
                      className='table table-bordered align-middle'
                      style={{minWidth: '1500px'}}
                    >
                      <thead className='table-header text-start'>
                        <tr>
                           {/* SR/NO (sticky) */}
    <th
      className='text-center text-nowrap'
      style={{
        position: 'sticky',
        left: 0,
        backgroundColor: '#f8f9fa',
        zIndex: 13,
        width: `${SR_STICKY_W}px`,
        minWidth: `${SR_STICKY_W}px`,
        maxWidth: `${SR_STICKY_W}px`,
        // padding: '6px 8px'
      }}
    >
      <div className='d-flex align-items-center'>
      SR/NO
      </div>
    </th>
     {/* NAME (sticky) */}
                          <th
                            onClick={() => handleSort('crewName')}
                            className='cursor-pointer text-start'
                            style={{
    position: 'sticky',
    left: `${NAME_STICKY_LEFT}px`,
    backgroundColor: '#f8f9fa',
    zIndex: 12,
    width: `${NAME_STICKY_W}px`,
    minWidth: `${NAME_STICKY_W}px`,
    maxWidth: `${NAME_STICKY_W}px`,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: 1.15,
    // padding: '6px 8px',
    // borderLeft: '1px solid #dee2e6',
  }}
                          >
                            <div className='d-flex align-items-center'>
                              NAME
                              <div style={{transform: 'translateY(-2px)'}}>
                                <KTSVG
                                  path={`/media/map/sort-col-${
                                    sortConfig.key === 'crewName'
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
{/* RANK (sticky) */}
                          <th
                            onClick={() => handleSort('rank')}
                            className='cursor-pointer text-start'
                            style={{
                              position: 'sticky',
                              left: `${RANK_STICKY_LEFT}px`,
                              backgroundColor: '#f8f9fa',
                              zIndex: 11,
                              width: `${RANK_STICKY_W}px`,
                              minWidth: `${RANK_STICKY_W}px`,
                              maxWidth: `${RANK_STICKY_W}px`,
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              lineHeight: 1.15,
                              // padding: '6px 8px',
                              // borderLeft: '1px solid #dee2e6',
                            }}
                          >
                            <div className='d-flex align-items-center'>
                              RANK
                              <div style={{transform: 'translateY(-2px)'}}>
                                <KTSVG
                                  path={`/media/map/sort-col-${
                                    sortConfig.key === 'rank'
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

{/* VESSEL (sticky, after RANK) */}
    <th
      onClick={() => handleSort('vessel')}
      className='cursor-pointer text-start rh-freeze-end'
      style={{
        position: 'sticky',
        left: `${VESSEL_STICKY_LEFT}px`,
        backgroundColor: '#f8f9fa',
        zIndex: 10,
        width: `${VESSEL_STICKY_W}px`,
        minWidth: `${VESSEL_STICKY_W}px`,
        maxWidth: `${VESSEL_STICKY_W}px`,
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        lineHeight: 1.15,
        // padding: '6px 8px',
        // borderLeft: '1px solid #dee2e6'
      }}
    >
      <div className='d-flex align-items-center'>
        VESSEL
        <div style={{ transform: 'translateY(-2px)' }}>
          <KTSVG
            path={`/media/map/sort-col-${sortConfig.key === 'vessel'
              ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black')
              : 'grey'
              }.svg`}
            className='svg-icon ms-2 custom-sort-icon'
          />
        </div>
      </div>
    </th>
{/* Date columns */}
                          {dateLabels.map((label, i) => {
                            const isWeekStart = weekStartIdxSet.has(i)
                            const isWeekEnd = weekEndIdxSet.has(i)
                            return (
                              <th
                                key={i}
                                className='text-center text-nowrap'
                                style={{
                                  minWidth: '70px',
                                  // alternate a very light tint for visibility (only from the first full block onward)
                                  backgroundColor: isWeekStart ? '#f6fbff' : '#f8f9fa',
                                  // thick vertical line at 7d start
                                  borderLeft: isWeekStart ? '3px solid #9ec5fe' : '1px solid #d3d3d3',
                                  // thick bottom line at 7d end (visual horizontal cue)
                                  borderBottom: isWeekEnd ? '2px solid #9ec5fe' : '1px solid #d3d3d3',
                                }}
                                title={isWeekEnd ? 'End of a 7-day window' : undefined}
                              >
                                {label}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody className='table-body text-start'>
                        {sortedCrew.length === 0 ? (
                          <tr>
                            <td colSpan={33} className='text-center text-muted py-3'>
                              No rest hour records found for the selected criteria.
                            </td>
                          </tr>
                        ) : (
                          pagedCrew.map((record, idx) => {
                            const srNo = indexOfFirstRecord + idx + 1
  return (
    <tr key={idx}>
      {/* SR/NO (sticky) */}
      <td
        className='text-center'
        style={{
          position: 'sticky',
          left: 0,
          zIndex: 23,
          backgroundColor: '#f8f9fa',
          width: `${SR_STICKY_W}px`,
          minWidth: `${SR_STICKY_W}px`,
          maxWidth: `${SR_STICKY_W}px`,
          padding: '6px 8px',
          verticalAlign: 'middle',
          // borderBottom: '1px solid #dee2e6',
        }}
      >
        {srNo}
      </td>

                              <td
                              className='text-dark fw-bold fs-6 text-start'
                                style={{
                                  position: 'sticky',
                                  left: `${NAME_STICKY_LEFT}px`,
                                  backgroundColor: '#f8f9fa',
                                  zIndex: 22,
                                  width: `${NAME_STICKY_W}px`,
                                  minWidth: `${NAME_STICKY_W}px`,
                                  maxWidth: `${NAME_STICKY_W}px`,
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.15,
                                  padding: '6px 8px',
                                  verticalAlign: 'middle',
                                  // borderLeft: '1px solid #dee2e6',
                                  // borderBottom: '1px solid #dee2e6',

                                }}
                                
                              >
                                <div className='d-flex align-items-center'>
                                  <div className='d-flex justify-content-start flex-column'>
                                    <span className='text-dark fw-bold text-hover-primary mb-1 fs-6'>
                                      {record.crewName}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td
                                className='text-dark fw-bold fs-6 text-start'
                                style={{
                                  position: 'sticky',
                                  left: `${RANK_STICKY_LEFT}px`,
                                  backgroundColor: '#f8f9fa',
                                  zIndex: 21,
                                  width: `${RANK_STICKY_W}px`,
                                  minWidth: `${RANK_STICKY_W}px`,
                                  maxWidth: `${RANK_STICKY_W}px`,
                                  whiteSpace: 'normal',
                                  wordBreak: 'break-word',
                                  lineHeight: 1.15,
                                  padding: '6px 8px',
                                  verticalAlign: 'middle',
                                  // borderLeft: '1px solid #dee2e6',
                                  // borderBottom: '1px solid #dee2e6',
                                }}
                              >
                                {/* use rankMap fallback so it never shows blank */}
                                {rankMap[Number(record?.rankInfo?.id ?? record?.rankId)] ??
                                  record?.rankInfo?.rank ??
                                  record?.rank ??
                                  '—'}
                              </td>

                              <td
  className='text-dark fw-bold fs-6 text-start rh-freeze-end'
  style={{
    position: 'sticky',
    left: `${VESSEL_STICKY_LEFT}px`,
    zIndex: 20,
    backgroundColor: '#f8f9fa',
    width: `${VESSEL_STICKY_W}px`,
    minWidth: `${VESSEL_STICKY_W}px`,
    maxWidth: `${VESSEL_STICKY_W}px`,
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    lineHeight: 1.15,
    padding: '6px 8px',
    verticalAlign: 'middle',
    // borderLeft: '1px solid #dee2e6',
    // borderBottom: '1px solid #dee2e6',
  }}
  title={record?.vessel?.fleet_name ?? 'On Leave'}
>
  {record?.vessel?.fleet_name ?? 'On Leave'}
</td>


                              {/* Date cells 1-31 */}
                              {(() => {
                                if (!fromDate || !toDate) return null

                                const start = new Date(fromDate)
                                const end = new Date(toDate)
                                const cells: JSX.Element[] = []

                                let current = new Date(start)
                                let colIndex = 0
                                while (current <= end) {
                                  const dateKey = current.toLocaleDateString('en-CA') // YYYY-MM-DD
                                  const key = `${record.crewId}-${dateKey}`
                                  const entry = hoursMap[key]
                                  const value = entry
                                    ? showWorkHours
                                      ? entry.work
                                      : entry.rest
                                    : null

                                  // visibility by role:
                                  const rId = roleId
                                  const isShoreLimited = rId === 2 || rId === 5 || (rId === 6 && operatorActsLikeGroupAdmin) // Operator acting like Superadmin is NOT shore-limited
                                  const visible = entry ? !isShoreLimited || entry.approved : false

                                  const canApprove = rId === 1 || (rId === 4 && rankId === 1) // superadmin or master
                                  const showApprove =
                                    canApprove && entry?.summaryId && !entry?.approved

                                  // Tooltip text for violations
                                  const hasRemarks = !!entry?.remarks && String(entry.remarks).trim().length > 0
                                  const rollingKey = `${record.crewId}-${dateKey}`
                                  const rollingInfo = matrixRollingViolations[rollingKey]
                                  const rollingViolations = rollingInfo?.violations ?? []
                                  const combinedViolations = Array.from(
                                    new Set([...(entry?.violations ?? []), ...rollingViolations])
                                  )
                                  const hasViolation =
                                    (entry?.violationCount ?? 0) > 0 ||
                                    combinedViolations.length > 0 ||
                                    entry?.compliant === false
                                  const violationTooltip =
                                    combinedViolations.length > 0
                                      ? combinedViolations.join('\n')
                                      : (entry?.violationCount ?? 0) > 0
                                      ? `${entry?.violationCount} violation(s)`
                                      : ''
                                  const rollingWindowTooltip = (() => {
                                    if (!matrixRollingAnchor) return ''
                                    const [yyyy, mm, dd] = dateKey.split('-').map(Number)
                                    if (!yyyy || !mm || !dd) return ''
                                    const end = new Date(
                                      yyyy,
                                      mm - 1,
                                      dd,
                                      matrixRollingAnchor.getHours(),
                                      matrixRollingAnchor.getMinutes(),
                                      0,
                                      0
                                    )
                                    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
                                    return `\nRolling 24h: ${formatMatrixRollingDateTime(
                                      start
                                    )} -> ${formatMatrixRollingDateTime(end)}`
                                  })()


                                  cells.push(
                                    <td
                                      key={dateKey}
                                      className='text-center text-nowrap'
                                      // Show day-level tooltips from server + 7d overlay in title
                                      title={[
                                        violationTooltip,
                                        matrixAnchored7d[`${record.crewId}-${dateKey}`]
                                          ? `\n7d window ${
                                              matrixAnchored7d[`${record.crewId}-${dateKey}`]
                                                .windowStart
                                            } → ${dateKey}: ` +
                                            `${Math.round(
                                              matrixAnchored7d[`${record.crewId}-${dateKey}`]
                                                .totalRest
                                            )}h`
                                          : '',
                                          hasRemarks ? `\nRemarks: ${String(entry.remarks)}` : '',
                                          rollingWindowTooltip
                                      ].join('')}
                                      style={{
                                        minWidth: weekEndIdxSet.has(colIndex)
                                        ? '150px'
                                        : '70px',
                                        // reserve side padding so the chip never overlaps the badge in the middle
                                        padding: `8px ${
                                          (IS_WEEK_CHIP_RIGHT ? WEEK_CHIP_RESERVED : 8) +
                                          (showApprove ? APPROVE_BTN_RESERVED : 0)
                                        }px 8px ${IS_WEEK_CHIP_RIGHT ? 8 : WEEK_CHIP_RESERVED}px`,
                                        position: 'relative',
                                        // day-level background (server)
                                        backgroundColor: hasViolation ? '#ffcccc' : 'transparent',
                                        // thick vertical line at 7d start for this column
                                        borderLeft: weekStartIdxSet.has(colIndex)
                                          ? '3px solid #9ec5fe'
                                          : '1px solid #d3d3d3',
                                        // thick bottom line at 7d end for this column
                                        borderBottom: weekEndIdxSet.has(colIndex)
                                          ? '1px solid #9ec5fe'
                                          : "1px solid #d3d3d3",
                                          
                                        overflow: 'hidden', // ensure chip never pushes layout
                                      }}
                                    >
                                      {hasRemarks && (
                                        <i
                                        className="bi bi-chat-square-text-fill"
                                          title={String(entry!.remarks)}
                                          style={{
                                            // position: 'absolute',
                                            left: 6,
                                            top: 4,
                                            fontSize: 14,
                                            color: '#800080',        // Bootstrap purple
                                            cursor: 'pointer',
                                            zIndex: 3
                                          }}
                                        >
                                          {/* ★ */}
                                        </i>
                                      )}

                                      {/* primary value (work/rest) or pending */}
                                      {visible && value !== null ? (
                                        <span
                                          className='badge bg-primary text-white p-2 ms-4'
                                          style={{fontSize: '11px'}}
                                        >
                                          {Number(value).toFixed(1)}h
                                        </span>
                                      ) : (
                                        <span className='text-muted'>
                                          {entry ? (entry.approved ? '-' : 'Pending') : '-'}
                                        </span>
                                      )}

                                      {/* approval button (top-right) */}
                                      {showApprove && (
                                        <button
                                          type='button'
                                          className='btn btn-sm btn-outline-success border border-success'
                                          style={{
                                            position: 'absolute',
                                            right: 4,
                                            top: 4,
                                            padding: '4px 6px',
                                            lineHeight: 1,
                                            zIndex: 2,
                                          }}
                                          onClick={() => handleApprove(entry!.summaryId!, true)}
                                          title='Approve day'
                                        >
                                          ✓
                                        </button>
                                      )}
                                      


                                      {/* 7d chip on END of each anchored 7d window — side, vertically centered */}
                                      {/* {(() => {
                                        const info = matrixAnchored7d[`${record.crewId}-${dateKey}`]
                                        if (!info) return null // only on week-end days
                                        const breached = info.violated
                                        const sideStyle = IS_WEEK_CHIP_RIGHT
                                          ? ({right: 4} as const)
                                          : ({left: 4} as const)

                                        return (
                                          <div
                                            style={{
                                              position: 'absolute',
                                              top: '50%',
                                              transform: 'translateY(-50%)',
                                              ...sideStyle,
                                              fontSize: 10,
                                              padding: '2px 6px',
                                              borderRadius: 6,
                                              border: '1px solid',
                                              borderColor: breached ? '#ff6b6b' : '#7ed491',
                                              backgroundColor: breached ? '#ffebeb' : '#ebfff0',
                                              color: breached ? '#a40000' : '#0b5137',
                                              whiteSpace: 'nowrap',
                                              pointerEvents: 'none', // don't block clicks
                                              zIndex: 1, // under approve button
                                              maxWidth: WEEK_CHIP_RESERVED + 4, // defensive
                                              textOverflow: 'ellipsis',
                                              overflow: 'hidden',
                                              marginRight: '28px',
                                              paddingRight: '4px'
                                            }}
                                            title={`7-day total rest (${info.windowStart} → ${dateKey})`}
                                          >
                                            {breached ? '⚠︎ ' : ''}7d {Math.round(info.totalRest)}h
                                          </div>
                                        )
                                      })()} */}
                                      {/* 7d chip on END of each anchored 7d window — side, vertically centered (regulation-aware) */}
{(() => {
  const wkRestInfo = matrixAnchored7d[`${record.crewId}-${dateKey}`];         // { windowStart, totalRest }
  const wkWorkInfo = matrixAnchored7dWork?.[`${record.crewId}-${dateKey}`];   // { windowStart, totalWork }
  const violationCodes = entry?.violationCodes ?? []

  // only render chips on anchored week-end days we have data for
  const hasWeekEndData =
    (regulation === 'stcw' && !!wkRestInfo) ||
    (regulation === 'mlc'  && !!wkWorkInfo);
  if (!hasWeekEndData) return null;

  // breach logic by regulation
  const breached =
    regulation === 'stcw'
      ? violationCodes.includes('STCW_MIN_REST_7D')
      : violationCodes.some((code) =>
          code === 'MLC_MAX_WORK_7D' ||
          code === 'MLC_MIN_REST_7D' ||
          code === 'MLC_MIN_REST_7D_FLOOR70'
        );

  // chip text & tooltip title by regulation
  const chipText =
    regulation === 'stcw'
      ? `7d ${Math.round(wkRestInfo!.totalRest)}h`
      : `7d ${Math.round(wkWorkInfo!.totalWork)}h`;

  const chipTitle =
    regulation === 'stcw'
      ? `7-day total rest (${wkRestInfo!.windowStart} → ${dateKey})`
      : `7-day total work (${wkWorkInfo!.windowStart} → ${dateKey})`;

  const sideStyle = IS_WEEK_CHIP_RIGHT ? ({ right: 4 } as const) : ({ left: 4 } as const);

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        ...sideStyle,
        fontSize: 10,
        padding: '2px 6px',
        borderRadius: 6,
        border: '1px solid',
        borderColor: breached ? '#ff6b6b' : '#7ed491',
        backgroundColor: breached ? '#ffebeb' : '#ebfff0',
        color: breached ? '#a40000' : '#0b5137',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',   // don't block clicks
        zIndex: 1,               // under approve button
        maxWidth: WEEK_CHIP_RESERVED + 4,
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        marginRight: '28px',
        paddingRight: '4px',
      }}
      title={chipTitle}
    >
      {breached ? '⚠︎ ' : ''}{chipText}
    </div>
  )
})()}

                                    </td>
                                  )

                                  current.setDate(current.getDate() + 1)
                                  colIndex++
                                }

                                return cells
                              })()}
                        
                            </tr>
                          )}
                        ))}
                      </tbody>
                    </table>
                    </div>

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
                            padding: '4px 8px',
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
                        <span className='text-muted me-3' style={{fontSize: '14px'}}>
                          Showing{' '}
                          <strong>
                            {sortedCrew.length === 0 ? 0 : indexOfFirstRecord + 1}-
                            {Math.min(indexOfLastRecord, sortedCrew.length)}
                          </strong>{' '}
                          of <strong>{sortedCrew.length}</strong>
                        </span>

                        <nav>
                          <ul className='pagination pagination-sm mb-0' style={{gap: '2px'}}>
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button
                                className='page-link text-muted'
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '6px',
                                }}
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                              >
                                ‹
                              </button>
                            </li>

                            {(() => {
                              const pages = []
                              const showPages = 5 // Show 5 page numbers at most
                              let startPage = Math.max(1, currentPage - 2)
                              let endPage = Math.min(totalPages, startPage + showPages - 1)

                              // Adjust start if we're near the end
                              if (endPage - startPage < showPages - 1) {
                                startPage = Math.max(1, endPage - showPages + 1)
                              }

                              if (startPage > 1) {
                                pages.push(
                                  <li key={1} className='page-item'>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                      }}
                                      onClick={() => handlePageChange(1)}
                                    >
                                      1
                                    </button>
                                  </li>
                                )

                                if (startPage > 2) {
                                  pages.push(
                                    <li key='ellipsis1' className='page-item disabled'>
                                      <span
                                        className='page-link border-0 text-muted'
                                        style={{backgroundColor: 'transparent', padding: '4px 8px'}}
                                      >
                                        ...
                                      </span>
                                    </li>
                                  )
                                }
                              }

                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <li
                                    key={i}
                                    className={`page-item ${currentPage === i ? 'active' : ''}`}
                                  >
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor:
                                          currentPage === i ? '#F4F9FF' : 'transparent',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                        outline: 'none',
                                        boxShadow: 'none',
                                      }}
                                      onClick={() => handlePageChange(i)}
                                    >
                                      {i}
                                    </button>
                                  </li>
                                )
                              }

                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                  pages.push(
                                    <li key='ellipsis2' className='page-item disabled'>
                                      <span
                                        className='page-link border-0 text-muted'
                                        style={{backgroundColor: 'transparent', padding: '4px 8px'}}
                                      >
                                        ...
                                      </span>
                                    </li>
                                  )
                                }

                                pages.push(
                                  <li key={totalPages} className='page-item'>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                      }}
                                      onClick={() => handlePageChange(totalPages)}
                                    >
                                      {totalPages}
                                    </button>
                                  </li>
                                )
                              }

                              return pages
                            })()}

                            <li
                              className={`page-item ${
                                currentPage === totalPages ? 'disabled' : ''
                              }`}
                            >
                              <button
                                className='page-link text-muted'
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '6px',
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

                {/* Update Tab - Rest Hour Schedule */}
                <UpdateTab
                  activeTab={activeTab}
                  fromDate={updateFromISO}
                  toDate={updateToISO}
                  selectedRank={selectedRank}
                  selectedCrew={selectedCrew}
                  crewMembers={crew}
                  timeSlots={timeSlots}
                  // isWorkingHour={isWorkingHour}
                  toggleWorkingHour={toggleWorkingHour}
                  setWorkingHours={setWorkingHours}
                  showTable={showTable}
                  // onSaveWorkingHours={handleSaveWorkingHours} // ADD THIS LINE
                  remarks={remarks}
                  onRemarksChange={handleRemarksChange}
                  onLocalSummaryChange={patchMatrixSummary}
                  onAfterSave={handleAfterSave}
                  approvedDates={approvedDatesForUpdateTab}
                  getSummaryId={(cid, dateISO) => hoursMap[`${cid}-${dateISO}`]?.summaryId ?? null}
                  dirtyRemarkDates={dirtyRemarkDates}
                  onResetRemarkEdits={resetRemarkEdits}
                  regulation={regulation}
                  allowExceptions={allowExceptions}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Toasts */}
      <ToastContainer position='top-center' newestOnTop closeOnClick draggable pauseOnHover />

      {/* Add Rest Hour Modal */}
      <AddRestHourModal
        visible={isModalVisible}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
      />

      {/* Export Modal */}
{isExportOpen && (
  <>
    <div className='modal fade show' style={{display: 'block'}} role='dialog' aria-modal='true' tabIndex={-1}>
      <div className='modal-dialog modal-lg modal-dialog-centered'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>Export</h5>
            <button type='button' className='btn-close' onClick={() => setIsExportOpen(false)} />
          </div>

          <div className='modal-body'>
            <div className='mb-4'>
              <label className='form-label fw-semibold'>Format</label>
              <div className='d-flex gap-3'>
                <label className='form-check form-check-custom form-check-solid'>
                  <input
                    className='form-check-input'
                    type='radio'
                    name='exportType'
                    value='pdf'
                    checked={exportType === 'pdf'}
                    onChange={() => setExportType('pdf')}
                  />
                  <span className='form-check-label'>PDF (7 days only)</span>
                </label>

                <label className='form-check form-check-custom form-check-solid'>
                  <input
                    className='form-check-input'
                    type='radio'
                    name='exportType'
                    value='excel'
                    checked={exportType === 'excel'}
                    onChange={() => setExportType('excel')}
                  />
                  <span className='form-check-label'>Excel (≤ 1 month)</span>
                </label>
              </div>
            </div>

            {exportType === 'pdf' ? (
              <>
                <div className='alert alert-info py-2'>
                  PDF is limited to exactly <strong>7 days</strong> for readability. Default is the latest 7 days in your Matrix range.
                </div>
                {/* <div className='alert alert-info py-2'>
                  
                  {regulation !== 'stcw' 
    ? 'Exporting with MLC Regulations for 7 Day Window' 
    : 'Exporting with STCW Regulations for 7 Day Window'}

                </div> */}
                <div className='row g-3 align-items-end'>
                  <div className='col-md-6'>
                    <label className='form-label'>Week start (7 days)</label>
                    <input
                      type='date'
                      className='form-control'
                      value={pdfWeekStart}
                      onChange={(e) => setPdfWeekStart(e.target.value)}
                      min={fromDate}
                      max={(() => {
                        const end = new Date(toDate + 'T00:00:00Z');
                        end.setUTCDate(end.getUTCDate() - 6);
                        return end.toISOString().slice(0, 10);
                      })()}
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label d-block'>Week end</label>
                    <input
                      className='form-control'
                      value={(() => {
                        const s = new Date(pdfWeekStart + 'T00:00:00Z');
                        s.setUTCDate(s.getUTCDate() + 6);
                        return s.toISOString().slice(0, 10);
                      })()}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className='alert alert-info py-2'>
                  Excel will export a range of at most <strong>1 month</strong>. Future dates are not allowed.
                </div>
                <div className='row g-3'>
                  <div className='col-md-6'>
                    <label className='form-label'>From</label>
                    <input
                      type='date'
                      className='form-control'
                      value={excelFrom}
                      onChange={(e) => setExcelFrom(e.target.value)}
                      max={excelTo || todayISO}
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label'>To</label>
                    <input
                      type='date'
                      className='form-control'
                      value={excelTo}
                      onChange={(e) => setExcelTo(e.target.value)}
                      max={todayISO}
                      min={excelFrom}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className='modal-footer'>
            <button className='btn btn-light' onClick={() => setIsExportOpen(false)}>Cancel</button>

            {exportType === 'pdf' ? (
              <button
                className='btn btn_primary'
                onClick={() => exportWeekToPDF(pdfWeekStart)}
                // disabled={requiresVessel && typeof filterVesselId !== 'number'}
                title={requiresVessel && typeof filterVesselId !== 'number' ? 'Select a Vessel first' : ''}
              >
                Export PDF (7 days)
              </button>
            ) : (
              <button
                className='btn btn_primary'
                onClick={exportMatrixToExcel}
                // disabled={requiresVessel && typeof filterVesselId !== 'number'}
                title={requiresVessel && typeof filterVesselId !== 'number' ? 'Select a Vessel first' : ''}
              >
                Export Excel (≤ 1 month)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    <div className="modal-backdrop fade show" onClick={() => setIsExportOpen(false)} />
  </>
)}


    </div>
  )
}

export default RestHour
