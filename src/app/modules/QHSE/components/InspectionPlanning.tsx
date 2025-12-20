import { FC, useState, useMemo, useEffect } from 'react'
import React from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { useAuth } from '../../auth'
import {
  listInspectionKinds, listInspectionPlans, bulkCreatePlans, getInspection, getInspectionPlan, listPorts, listCrewsLite,
  createInspection,
  linkPlanToInspection, 
} from '../core/_requests'
import { getVesselList, getCompanyList, getCompanyAdminList } from '../../Management/core/_requests'
import type { Vessel } from '../../Management/core/_models'

import type { QhseInspectionKind, InspectionPlanDto, VesselLite  } from '../core/_models'
import AddPlanModal from './AddInspectionPlanModal'
import { InspectionPlanActionsModal } from './InspectionPlanActionsModal'
import AddInspectionModal from './AddInspectionModal'
import { ViewInspectionModal } from './ViewInspectionModal'
import type { InspectionDto } from '../core/_models'
import { getRanksforList } from '../../Crewing/core/_requests'


// Add filter data JSON
const filterData = {
  fleets: [
    { value: '', label: 'All Fleets' },
    { value: 'fleet1', label: 'Fleet 1' },
    { value: 'fleet2', label: 'Fleet 2' },
    { value: 'fleetARS', label: 'Fleet ARS' }
  ],
  vessels: [
    { value: '', label: 'All Vessels' },
    { value: 'Agile', label: 'Agile' },
    { value: 'Dubai Office', label: 'Dubai Office' },
    { value: 'Eagle S', label: 'Eagle S' },
    { value: 'India Office', label: 'India Office' },
    { value: 'Lion S', label: 'Lion S' },
    { value: 'Marabella Sun (DNU)', label: 'Marabella Sun (DNU)' },
    { value: 'Nari Strength', label: 'Nari Strength' },
    { value: 'Sinar G', label: 'Sinar G' },
    { value: 'Tranquil Sea', label: 'Tranquil Sea' },
    { value: 'Troy', label: 'Troy' }
  ],
  years: (() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 2; i++) {
      years.push({ value: i, label: i.toString(), isCurrent: i === currentYear });
    }
    return years;
  })()
};

// --- SVG Icon Helper Component ---
const SVGIcon: FC<{ path: string; className?: string }> = ({ path, className = '' }) => (
  <span className={`svg-icon ${className}`}>
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
    >
      <path d={path} fill='currentColor' />
    </svg>
  </span>
);

// ---- Helpers & constants (define once near top) ----
const ALL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const
const monthLabel = (iso: string) => ALL_MONTHS[new Date(iso).getMonth()]
const yearOf = (iso: string) => new Date(iso).getFullYear()


// --- TYPE DEFINITIONS ---
type InspectionPlan = {
  id: number
  vesselName: string
  inspectionName: string
  month: string
  year: number
  status?: 'overdue' | 'planned_done' | 'next_30_days' | 'upcoming' // optional - for demo/testing
}

type NewPlanData = {
  inspectionName: string        // kindId as string
  vesselNames: string[]         // vesselIds as string[]
  months: (typeof ALL_MONTHS)[number][]  // 'Jan' | 'Feb' | ... | 'Dec'
  year: number
}

// Add filter state type
type FilterState = {
  fleet: string;
  vessel: string;
  year: number;
};

// Helper function to determine plan status
const getPlanStatus = (plan: InspectionPlan): 'overdue' | 'planned_done' | 'next_30_days' | 'upcoming' => {
  const currentDate = new Date()
  const monthIndex = ALL_MONTHS.indexOf(plan.month as typeof ALL_MONTHS[number])
  const planDate = new Date(plan.year, monthIndex, 1)
  const daysDiff = Math.ceil((planDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))

  if (planDate < currentDate) return 'overdue'
  if (daysDiff <= 30 && daysDiff >= 0) return 'next_30_days'
  return 'upcoming'
}


// Helper function to get color classes based on status
const getStatusColorClasses = (status: string) => {
  switch (status) {
    case 'overdue':
      return {
        backgroundColor: '#ffebee',
        borderColor: '#f44336',
        textColor: '#c62828'
      };
    case 'planned_done':
      return {
        backgroundColor: '#e8f5e8',
        borderColor: '#4caf50',
        textColor: '#2e7d32'
      };
    case 'next_30_days':
      return {
        backgroundColor: '#fce4ec',
        borderColor: '#8e24aa',
        textColor: '#6a1b9a'
      };
    default: // upcoming
      return {
        backgroundColor: '#f3f4f6',
        borderColor: '#9ca3af',
        textColor: '#374151'
      };
  }
};


// --- CUSTOM MULTI-SELECT DROPDOWN COMPONENT ---
interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  error?: string;
}

const MultiSelectDropdown: FC<MultiSelectDropdownProps> = ({ label, options, selectedOptions, onChange, error }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => setIsOpen(!isOpen);

    const handleCheckboxChange = (option: string) => {
        const newSelection = selectedOptions.includes(option)
            ? selectedOptions.filter(item => item !== option)
            : [...selectedOptions, option];
        onChange(newSelection);
    };
    
    const handleSelectAll = () => {
        if (selectedOptions.length === options.length) {
            onChange([]);
        } else {
            onChange(options);
        }
    };

    const displayLabel = selectedOptions.length > 0
        ? `${selectedOptions.length} selected`
        : `Select ${label}`;

    return (
        <div className='dropdown'>
            <button
                type='button'
                className={`form-control text-start d-flex justify-content-between align-items-center ${error ? 'is-invalid' : ''}`}
                onClick={handleToggle}
            >
                <span>{displayLabel}</span>
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}></i>
            </button>
            {isOpen && (
                <div className='dropdown-menu show w-100' style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <div className='px-3 py-2'>
                        <div className='form-check'>
                             <input
                                className='form-check-input'
                                type='checkbox'
                                id={`select-all-${label}`}
                                checked={selectedOptions.length === options.length}
                                onChange={handleSelectAll}
                            />
                            <label className='form-check-label' htmlFor={`select-all-${label}`}>
                                Select All
                            </label>
                        </div>
                    </div>
                    <div className='dropdown-divider'></div>
                    {options.map(option => (
                        <div key={option} className='px-3 py-1'>
                            <div className='form-check'>
                                <input
                                    className='form-check-input'
                                    type='checkbox'
                                    id={`${label}-${option}`}
                                    checked={selectedOptions.includes(option)}
                                    onChange={() => handleCheckboxChange(option)}
                                />
                                <label className='form-check-label' htmlFor={`${label}-${option}`}>
                                    {option}
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {error && <div className='invalid-feedback d-block'>{error}</div>}
        </div>
    );
};

// --- ADD PLAN MODAL COMPONENT ---
interface AddPlanModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: NewPlanData, saveAndAddNew: boolean) => void
  kinds: QhseInspectionKind[]          // NEW
  vessels: VesselLite[]                // NEW
}


// --- LEGEND COMPONENT ---
const StatusLegend: FC = () => {
  return (
    <div className='d-flex align-items-center gap-4 mb-3'>
      <div className='d-flex align-items-center gap-2'>
        <div 
          style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#f44336', 
            borderRadius: '4px' 
          }}
        ></div>
        <span className='fs-7 text-muted'>Overdue Plan</span>
      </div>
      <div className='d-flex align-items-center gap-2'>
        <div 
          style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#4caf50', 
            borderRadius: '4px' 
          }}
        ></div>
        <span className='fs-7 text-muted'>Planned & Done</span>
      </div>
      <div className='d-flex align-items-center gap-2'>
        <div 
          style={{ 
            width: '16px', 
            height: '16px', 
            backgroundColor: '#8e24aa', 
            borderRadius: '4px' 
          }}
        ></div>
        <span className='fs-7 text-muted'>Next 30 Days</span>
      </div>
    </div>
  );
};

// --- MAIN INSPECTION PLANNING COMPONENT ---
const InspectionPlanning: FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'vesselName', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [vesselMap, setVesselMap] = useState<Record<number, string>>({})
  // add below existing maps
const [portMap, setPortMap] = useState<Record<number, string>>({})
const [vesselTypeMap, setVesselTypeMap] = useState<Record<number, string>>({})

// crews for internal-inspector fallback (same shape as Index)
const [crews, setCrews] = useState<Array<{id:number; fullName:string; rankId?:number; rankName?:string; vesselId?:number}>>([])

const [kindMap, setKindMap]     = useState<Record<number, string>>({})

  const [rankMap, setRankMap] = useState<Record<number, string>>({})

  // Add filter state
  const [filters, setFilters] = useState<FilterState>({
    fleet: '',
    vessel: '',
    year: new Date().getFullYear()
  });

const [companies, setCompanies] = useState<Array<{id:number; name:string}>>([]);
const [subcompanies, setSubcompanies] = useState<Array<{id:number; name:string; companyId:number}>>([]);
const [planFilters, setPlanFilters] = useState({ companyId: '', subcompanyId: '' });


  const { currentUser, auth } = useAuth()
const roleId: number =
  Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
const myCgaId: number | null =
  currentUser?.companyGroupAdminId ??
  currentUser?.companyGroupAdmin?.id ??
  (currentUser?.role?.id === 5 ? (currentUser as any)?.roleEntityId : null) ??
  null
const isSuperadmin = roleId === 1
const isOperator = roleId === 6
const isTopLevel = isSuperadmin || (isOperator && !myCgaId)
const effectiveCompanyId = isTopLevel ? undefined : (myCgaId ?? undefined)

const [kinds, setKinds] = useState<QhseInspectionKind[]>([])
const [vessels, setVessels] = useState<VesselLite[]>([])
const [plans, setPlans] = useState<InspectionPlanDto[]>([])

const [planActionsOpen, setPlanActionsOpen] = useState(false)
const [viewOpen, setViewOpen] = useState(false)
const [viewing, setViewing] = useState<InspectionDto | null>(null)

const [selectedPlan, setSelectedPlan] = useState<InspectionPlanDto | null>(null)

// to open AddInspection from a plan, prefilled:
const [addFromPlan, setAddFromPlan] = useState<{
  vesselId: number
  inspectionKindId: number
  planId: number
  planMonthDate: string
} | null>(null)

const [portsList, setPortsList] = useState<Array<{id:number; name:string}>>([])

const filteredPlans = useMemo(() => {
  return plans.filter(plan => yearOf(plan.planDate) === filters.year)
}, [plans, filters.year])

const toViewPlan = useMemo(() => {
  return (p: InspectionPlanDto): InspectionPlan => ({
    id: p.id,
    // prefer live maps; only then fallback to dto; finally to an id label
    vesselName:
      vesselMap[p.vesselId] ||
      (p.vesselName && p.vesselName.trim()) ||
      `-`,
    inspectionName:
      kindMap[p.inspectionKindId] ||
      (p.inspectionKindName && p.inspectionKindName.trim()) ||
      `-`,
    month: monthLabel(p.planDate),
    year: yearOf(p.planDate),
    status: (p as any).status,
  })
}, [vesselMap, kindMap])

useEffect(() => {
  const load = async () => {
    try {
      const k = await listInspectionKinds()
      setKinds(k)

      const vesselList: Vessel[] = await getVesselList()
      const isOperator = roleId === 6
      const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
      const operatorActsLikeGroupAdmin = isOperator && !!currentUser?.companyGroupAdminId

      let vesselsForUser: Vessel[] = []
      if (roleId === 4) {
        const vId = currentUser?.vessel?.id
        vesselsForUser = vId ? vesselList.filter(v => v.id === vId) : []
      } else {
        vesselsForUser = vesselList.filter((v) => {
          const isActive = (v as any).active
          if (roleId === 1 || operatorActsLikeSuperadmin) return isActive
          if (roleId === 5 || operatorActsLikeGroupAdmin) return isActive && (v as any).companyGroupAdmin?.id === (currentUser?.companyGroupAdminId ?? currentUser?.companyGroupAdmin?.id)
          if (roleId === 2) return isActive && (v as any).companyAdmin?.id === currentUser?.companyAdminId
          return false
        })
      }

      setVessels(
        vesselsForUser.map(v => ({
          id: Number(v.id),
          name: (v as any).fleet_name || v.name || `Vessel ${v.id}`,
          vesselType: (v as any).vesselType || (v as any).type || undefined
        }))
      )

      // --- Build id -> name maps once
    const vMap: Record<number, string> = {}
    for (const v of vesselsForUser as any[]) {
      const id = Number(v.id)
      vMap[id] = (v as any).fleet_name || v.name || `-`
    }
    setVesselMap(vMap)

      // kinds list -> map
      const kindsList: QhseInspectionKind[] = Array.isArray(k) ? k : []
      const kMapLocal: Record<number, string> = {}
      for (const kind of kindsList) {
        kMapLocal[Number(kind.id)] = String(kind.name || '')
      }
      setKindMap(kMapLocal)

      // 🔎 ADD: build id -> rankName map once (same as Index)
try {
  const ranks = await getRanksforList().catch(() => [])
  const rMap: Record<number, string> = {}
  ;(Array.isArray(ranks) ? ranks : []).forEach((r: any) => {
    if (r?.id != null) rMap[Number(r.id)] = String(r.rank ?? r.name ?? '')
  })
  setRankMap(rMap)
} catch {
  setRankMap({})
}

    // ⬇️ Ports (normalize main_port -> name)
    try {
      const ports = await listPorts()
      const pMap: Record<number, string> = {}
      for (const p of ports as any[]) {
        const id = Number(p.id)
        pMap[id] = String(p.name || '')
      }
      setPortMap(pMap)
      setPortsList((ports as any[]).map(p => ({ id: Number(p.id), name: String(p.name || '') })))
    } catch {
      setPortMap({})
      setPortsList([])
    }

// ⬇️ Vessel type map (id -> type) for consistent view patching
const vtMap: Record<number, string> = {}
for (const v of vesselsForUser as any[]) {
  const id = Number(v.id)
  const rawType = v.vesselType ?? v.type ?? v.vessel_type ?? ''
  vtMap[id] = rawType ? String(rawType) : ''
}
setVesselTypeMap(vtMap)

// ⬇️ Crews list for internal inspector fallback (same helper used in Index)
try {
  const rawCrews = await listCrewsLite()
const normalized = (Array.isArray(rawCrews) ? rawCrews : []).map((c:any)=>({
  id: Number(c.id),
  fullName: String(c.fullName ?? c.name ?? ''),
  rankId: (c.rankId != null ? Number(c.rankId) : undefined),
  rankName: c.rankName ?? undefined,
  vesselId: (c.vesselId != null ? Number(c.vesselId) : undefined),

  // NEW: make active explicit; default to true if absent
  active: (typeof c.active === 'boolean')
    ? Boolean(c.active)
    : (typeof c.isActive === 'boolean')
      ? Boolean(c.isActive)
      : true,

  // (optional, helps future filters)
  companyGroupAdminId: (c.companyGroupAdminId != null
    ? Number(c.companyGroupAdminId)
    : (c.cgaid?.id != null ? Number(c.cgaid.id) : undefined)),
  companyAdminId: (c.companyAdminId != null
    ? Number(c.companyAdminId)
    : (c.caId ?? c.companyId != null ? Number(c.caId ?? c.companyId) : undefined)),
})).filter(x => Number.isFinite(x.id))
setCrews(normalized)
} catch (e) {
  console.warn('Failed to load crews for internal inspector fallback', e)
  setCrews([])
}

      const companiesLite = Array.from(
  new Map(
    vesselList
      .map(v => {
        const id = Number((v as any).companyGroupAdmin?.id ?? (v as any).companyGroupId)
        const name = (v as any).companyGroupAdmin?.companyGroupName
          ?? (v as any).companyGroupAdmin?.name
          ?? `Company ${id}`
        return id ? [id, {id, name}] as const : null
      })
      .filter(Boolean) as Array<[number, {id:number; name:string}]>
  ).values()
)

const subcompaniesLite = Array.from(
  new Map(
    vesselList
      .map(v => {
        const id  = Number((v as any).companyAdmin?.id ?? (v as any).companyId)
        const cid = Number((v as any).companyGroupAdmin?.id ?? (v as any).companyGroupId)
        const name = (v as any).companyAdmin?.companyName
          ?? (v as any).companyAdmin?.name
          ?? `Subcompany ${id}`
        return id && cid ? [id, {id, name, companyId: cid}] as const : null
      })
      .filter(Boolean) as Array<[number, {id:number; name:string; companyId:number}]>
  ).values()
)

setCompanies(companiesLite)
setSubcompanies(subcompaniesLite)

    } catch (e) {
      console.error(e)
      setVessels([]); setKinds([])
    }
  }
  load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [roleId, currentUser])

useEffect(() => {
  (async () => {
    const [k] = await Promise.all([listInspectionKinds()]);
    setKinds(Array.isArray(k) ? k : []);

    const vesselList: Vessel[] = await getVesselList();

    const [groups, admins] = await Promise.all([
      getCompanyAdminList?.().catch(()=>[]),
      getCompanyList?.().catch(()=>[]),
    ]);

    setCompanies(
      Array.isArray(groups) ? groups.map((g:any)=>({
        id:Number(g.id),
        name: g.name ?? g.companyGroupAdminName ?? `-`
      })) : []
    );

    const derivedFromVessels = (vesselList||[]).map((v:any)=>({
      id: Number(v?.companyAdmin?.id ?? v?.companyId),
      name: v?.companyAdmin?.name ?? v?.companyAdminName ?? v?.companyName ?? (v?.companyAdmin?.id ? `-` : null),
      companyId: Number(v?.companyGroupAdmin?.id ?? v?.companyGroupId ?? v?.cgaid?.id),
    })).filter(sc => Number.isFinite(sc.id) && !!sc.name && Number.isFinite(sc.companyId));

    const fromAdmins = Array.isArray(admins) ? admins.map((a:any)=>({
      id: Number(a.id),
      name: a.name ?? a.companyAdminName ?? `-`,
      companyId: Number(a.cgaid?.id ?? a.cga?.id ?? a.companyGroupAdminId ?? a.companyGroupId),
    })) : [];

    const subMerged = new Map<number,{id:number; name:string; companyId:number}>();
    [...fromAdmins, ...derivedFromVessels].forEach(sc=>{
      if (!Number.isFinite(sc.id) || !Number.isFinite(sc.companyId)) return;
      if (!subMerged.has(sc.id)) subMerged.set(sc.id, sc);
    });
    setSubcompanies(Array.from(subMerged.values()));

    setVessels((vesselList||[]).filter((v:any)=>v?.active).map((v:any)=>({
      id: Number(v.id),
      name: v.fleet_name || v.name || `Vessel ${v.id}`,
      companyGroupAdminId: Number(v?.companyGroupAdmin?.id ?? v?.companyGroupId),
      companyAdminId: Number(v?.companyAdmin?.id ?? v?.companyId),
    })));

  })().catch(console.error);
}, []);

const vesselsForFilters = useMemo<VesselLite[]>(() => {
  let list = vessels;
  if (planFilters.companyId) {
    const cid = Number(planFilters.companyId);
    list = list.filter(v => Number((v as any).companyGroupAdminId ?? (v as any).companyGroupId) === cid);
  }
  if (planFilters.subcompanyId) {
    const scid = Number(planFilters.subcompanyId);
    list = list.filter(v => Number((v as any).companyAdminId ?? (v as any).companyId) === scid);
  }
  return list;
}, [vessels, planFilters.companyId, planFilters.subcompanyId]);

const loadPlans = async () => {
  try {
    const list = await listInspectionPlans({ year: filters.year, companyGroupId: effectiveCompanyId })
    // const enriched = (Array.isArray(list) ? list : []).map((p) => ({
    //   ...p,
    //   vesselName: p.vesselName || vesselMap[p.vesselId] || (Number.isFinite(p.vesselId) ? `-` : 'Unknown Vessel'),
    //   inspectionKindName: p.inspectionKindName || kindMap[p.inspectionKindId] || (Number.isFinite(p.inspectionKindId) ? `-` : 'Unknown Kind'),
    // }))
    setPlans(Array.isArray(list) ? list : [])
  } catch (e) {
    console.error(e)
    setPlans([])
  }
}

const openViewInspectionFromPlan = async (inspectionId: number) => {
  try {
    const dto = await getInspection(inspectionId)

    const patched: InspectionDto = {
      ...dto,
      vesselName:
        dto.vesselName ||
        vesselMap[dto.vesselId] ||
        `-`,
      vesselType:
        dto.vesselType ||
        vesselTypeMap[dto.vesselId] ||
        undefined,
      inspectionKindName:
        dto.inspectionKindName ||
        (dto.inspectionKindId != null
          ? (kindMap[dto.inspectionKindId] || `-`)
          : ''),
      fromPortName:
        dto.fromPortName ||
        (dto.fromPortId != null ? (portMap[dto.fromPortId] || '') : ''),
      toPortName:
        dto.toPortName ||
        (dto.toPortId != null ? (portMap[dto.toPortId] || '') : ''),
      internalInspectorName: dto.internalInspectorName || undefined,
    }

    setViewing(patched)
    setViewOpen(true)
  } catch (e) {
    console.error('Failed to load inspection for viewing', e)
  }
}


useEffect(() => { loadPlans() }, [filters.year, effectiveCompanyId])


  // Add filter change handler
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) : value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply filters to vessels
const vesselNames: string[] = useMemo(() => vessels.map(v => v.name), [vessels])

// Use a distinct name to avoid any shadowing/collision with functions/props
const filteredVesselNames = useMemo<string[]>(() => {
  let list = [...vesselNames]
  if (filters.vessel) list = list.filter(v => v === filters.vessel)
  return list
}, [vesselNames, filters.vessel])

  const sortedVessels = useMemo<string[]>(() => {
  const sortableVessels = [...filteredVesselNames]
  sortableVessels.sort((a, b) => {
    if (a < b) return sortConfig.direction === 'asc' ? -1 : 1
    if (a > b) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })
  return sortableVessels
}, [filteredVesselNames, sortConfig])

  const totalPages = Math.ceil(sortedVessels.length / rowsPerPage);

  const currentVesselRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedVessels.slice(startIndex, endIndex);
  }, [sortedVessels, currentPage, rowsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setCurrentPage(1);
  };

  const handleAddPlan = async (data: NewPlanData, _saveAndAddNew: boolean) => {
  // convert months ['Jan','Feb'] -> [1,2]
const monthIndex = (m: typeof ALL_MONTHS[number]) => ALL_MONTHS.indexOf(m) + 1
const months = data.months.map(monthIndex).filter(n => n > 0)

  await bulkCreatePlans({
    year: data.year,
    inspectionKindId: Number(data.inspectionName),
    vesselIds: data.vesselNames.map(v => Number(v)),
    months
  })
  await loadPlans()
}



const plansByVesselAndMonth = useMemo(() => {
  const grouped: Record<string, Record<string, InspectionPlan[]>> = {}

  // init all visible vessels x months
  for (const v of filteredVesselNames) {
    // build month buckets once
    grouped[v] = Object.fromEntries(
      ALL_MONTHS.map((m) => [m, [] as InspectionPlan[]])
    )
  }

  // push plans using safe names (via toViewPlan)
  (filteredPlans ?? []).map(toViewPlan).forEach((p: InspectionPlan) => {
    const vName = p.vesselName
    if (!vName) return
    if (!grouped[vName]) {
      // if a plan’s vessel isn’t currently visible, skip safely
      grouped[vName] = Object.fromEntries(
        ALL_MONTHS.map((m) => [m, [] as InspectionPlan[]])
      )
    }
    if (!grouped[vName][p.month]) grouped[vName][p.month] = []
    grouped[vName][p.month].push(p)
  })

  return grouped
}, [filteredVesselNames, filteredPlans, toViewPlan])


const handleBulkSubmit = async (data: { year:number; inspectionKindId:number; vesselIds:number[]; months:number[] }, saveAndAddNew:boolean) => {
  await bulkCreatePlans({
    year: data.year,
    inspectionKindId: data.inspectionKindId,
    vesselIds: data.vesselIds,
    months: data.months,
  });
  await loadPlans();
if (!saveAndAddNew) setIsModalVisible(false);
};


  return (
    <div className='app-main flex-column flex-row-fluid'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            {/* Header */}
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Inspection Planning</h3>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setIsModalVisible(true)}
                >
                  <SVGIcon path='M11 11V5C11 4.4 11.4 4 12 4C12.6 4 13 4.4 13 5V11H19C19.6 11 20 11.4 20 12C20 12.6 19.6 13 19 13H13V19C13 19.6 12.6 20 12 20C11.4 20 11 19.6 11 19V13H5C4.4 13 4 12.6 4 12C4 11.4 4.4 11 5 11H11Z' className='svg-icon-2' />
                  Add Plan
                </button>
              </div>
            </div>

            {/* Filters Section */}
            <div className='card-body py-4 bg-white border-top'>
              <div className='row gx-3 gy-3 mb-4'>
{/* Company */}
<div className='col-md-3'>
  <label className='form-label fw-semibold fs-7' style={{color:'#A1A5B7'}}>Company</label>
  <select className='form-select'
    value={planFilters.companyId}
    onChange={e => setPlanFilters({ companyId: e.target.value, subcompanyId: '' })}
  >
    <option value=''>All Companies</option>
    {companies.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
  </select>
</div>

{/* Subcompany (only if company has subcompanies) */}
{Boolean(planFilters.companyId) && subcompanies.some(sc => sc.companyId === Number(planFilters.companyId)) && (
  <div className='col-md-3'>
    <label className='form-label fw-semibold fs-7' style={{color:'#A1A5B7'}}>Subcompany</label>
    <select className='form-select'
      value={planFilters.subcompanyId}
      onChange={e => setPlanFilters(prev => ({ ...prev, subcompanyId: e.target.value }))}
    >
      <option value=''>All Subcompanies</option>
      {subcompanies.filter(sc => sc.companyId === Number(planFilters.companyId)).map(sc =>
        <option key={sc.id} value={String(sc.id)}>{sc.name}</option>
      )}
    </select>
  </div>
)}

{/* Vessel (optional page filter) */}
<div className='col-md-3'>
  <label className='form-label fw-semibold fs-7' style={{color:'#A1A5B7'}}>Vessel</label>
  <select className='form-select'
    value={filters.vessel}
    onChange={e => setFilters(prev => ({ ...prev, vessel: e.target.value }))}
  >
    <option value=''>All Vessels</option>
    {vesselsForFilters.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
  </select>
</div>


                {/* Year Filter */}
                <div className='col-md-auto'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Year
                  </label>
                  <select
                    className='form-select'
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      fontSize: '14px',
                      padding: '8px 12px',
                      paddingRight: '35px',
                      color: '#5E6278',
                      backgroundColor: filters.year === new Date().getFullYear() ? '#f8f9fa' : '#fff',
                    }}
                    name='year'
                    value={filters.year}
                    onChange={handleFilterChange}
                  >
                    {filterData.years.map(year => (
                      <option 
                        key={year.value} 
                        value={year.value}
                        style={{
                          backgroundColor: year.isCurrent ? '#e3f2fd' : '#fff',
                          fontWeight: year.isCurrent ? 'bold' : 'normal'
                        }}
                      >
                        {year.label} {year.isCurrent ? '(Current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Legend */}
              <StatusLegend />

              {/* Table */}
              <div className='report-table table-responsive'>
                <div style={{ overflowX: 'auto' }}>
                  <table className='table table-bordered align-middle'>
                    <thead className='table-header text-center'>
                      <tr>
                        <th className='text-center' style={{
                          minWidth: '80px',
                          position: 'sticky',
                          left: 0,
                          zIndex: 3,
                          backgroundColor: '#f8f9fa',
                        }}>SR/NO</th>
                        <th
                          onClick={() => handleSort('vesselName')}
                          className="cursor-pointer"
                          style={{
                            minWidth: '150px',
                            textAlign: 'left',
                            position: 'sticky',
                            left: 80,
                            backgroundColor: '#f8f9fa',
                            zIndex: 2,
                          }}
                        >
                          <div className="d-flex align-items-center">
                            Vessel
                            <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'vesselName'
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

                        {ALL_MONTHS.map(month => (
                          <th key={month} style={{ minWidth: '150px' }}>{month.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className='table-body text-start'>
                    {currentVesselRecords.map((vessel, index) => (
                    <tr key={vessel || index}>
                      <td
                        className="text-center"
                        style={{
                          minWidth: '80px',
                          position: 'sticky',
                          left: 0,
                          backgroundColor: '#fff',
                          zIndex: 2,
                        }}
                      >
                        {((currentPage - 1) * rowsPerPage) + index + 1}
                      </td>
                        <td
                          className="text-dark fw-bold fs-6"
                          style={{
                            position: 'sticky',
                            left: 80,
                            backgroundColor: '#fff',
                            zIndex: 1,
                          }}
                        >
                          {vessel}
                        </td>

                        {ALL_MONTHS.map(month => (
                          <td key={`${vessel}-${month}`} className='p-2' style={{verticalAlign: 'top'}}>
                              {(plansByVesselAndMonth[vessel]?.[month] ?? []).map(plan => {
                                const status = getPlanStatus(plan);
                                const colorClasses = getStatusColorClasses(status);

                                // find the real plan dto by id
                                const dto = plans.find(p => p.id === plan.id)

                                return (
                                  <button
                                    type="button"
                                    key={plan.id}
                                    className='p-2 mb-2 fs-8 fw-semibold d-flex justify-content-between align-items-center w-100 text-start'
                                    style={{
                                      backgroundColor: colorClasses.backgroundColor,
                                      border: `1px solid ${colorClasses.borderColor}`,
                                      color: colorClasses.textColor,
                                      borderRadius: '6px',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => { setSelectedPlan(dto || null); setPlanActionsOpen(true) }}
                                    title="Plan actions"
                                  >
                                    <span>{plan.inspectionName}</span>
                                    {dto?.inspectionId ? <span className='badge bg-success'>Linked</span> : <span className='badge bg-secondary'>Unlinked</span>}
                                  </button>
                                );
                              })}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>

                <div className='pagination-wrapper d-flex justify-content-between align-items-center py-3'>
                  <div className='d-flex align-items-center'>
                    <span className='text-muted me-2'>Rows per page</span>
                    <select
                      className='form-select'
                      style={{ borderRadius: '20px', width: '70px', border: '1px solid #dee2e6', fontSize: '14px', padding: '4px 8px' }}
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
                        {sortedVessels.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
                        {Math.min(currentPage * rowsPerPage, sortedVessels.length)}
                      </strong>{' '}
                      of <strong>{sortedVessels.length}</strong>
                    </span>
                    <nav>
                      <ul className='pagination pagination-sm mb-0' style={{gap: '2px'}}>
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className='page-link text-muted'
                            style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '8px 12px', fontSize: '14px', borderRadius: '6px' }}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            ‹
                          </button>
                        </li>
                        {Array.from(Array(totalPages).keys()).map(num => (
                             <li key={num+1} className={`page-item ${currentPage === num + 1 ? 'active' : ''}`}>
                                <button
                                 className='page-link text-muted'
                                 style={{
                                    backgroundColor: currentPage === num + 1 ? '#F4F9FF' : 'transparent',
                                    border: '1px solid #dee2e6', padding: '8px 12px', fontSize: '14px', minWidth: '40px', borderRadius: '6px'
                                 }}
                                 onClick={() => handlePageChange(num + 1)}
                                >
                                    {num+1}
                                </button>
                             </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                          <button
                            className='page-link text-muted'
                            style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '8px 12px', fontSize: '14px', borderRadius: '6px' }}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
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

     <AddPlanModal
  visible={isModalVisible}
  onClose={() => setIsModalVisible(false)}
  onSubmit={handleBulkSubmit}
  kinds={kinds}
  vessels={vesselsForFilters}
/>

{/* Plan Actions */}
<InspectionPlanActionsModal
  visible={planActionsOpen}
  onClose={() => { setPlanActionsOpen(false); setSelectedPlan(null) }}
  plan={selectedPlan}
  refreshPlans={loadPlans}
  onViewInspection={(inspectionId) => {
  setPlanActionsOpen(false)
  openViewInspectionFromPlan(Number(inspectionId))
}}
  onCreateAndLink={(prefill) => {
  setPlanActionsOpen(false)
  setAddFromPlan(prefill)       // this alone shows AddInspectionModal (visible={Boolean(addFromPlan)})
}}
/>

<ViewInspectionModal
  visible={viewOpen}
  onClose={() => { setViewOpen(false); setViewing(null) }}
  record={viewing}
/>


{/* If you also render AddInspectionModal on this page (optional).
    If not, you can navigate to Inspection Index with query params. */}
{addFromPlan && (
  <AddInspectionModal
    visible={Boolean(addFromPlan)}
    onClose={() => setAddFromPlan(null)}
    onSubmit={async (data) => {
      // create + link here so user doesn't have to jump away
      const payload = {
  vesselId: Number(data.vessel),
  inspectionKindId: Number(data.inspection),
  inspectionType: (data.inspectionType as any) || 'DETAILS_TYPE',
  inspectionFromDate: data.inspectionDate,
  inspectionToDate: data.inspectionDate,
  internalInspectorName: data.internalInspectorName || undefined,
  externalInspectorName: data.externalInspector || undefined,
  fromPortId: data.fromPort ? Number(data.fromPort) : undefined,
  toPortId: data.toPort ? Number(data.toPort) : undefined,
  hoursOnboard: data.hoursOnboard ? Number(data.hoursOnboard) : undefined,
  remarks: data.inspectionRemarks || undefined,
} as any

      try {
        const created = await createInspection(payload)
        if (!created?.id) throw new Error('Create inspection failed')

        // 2) ALWAYS link explicitly, right here
        await linkPlanToInspection(Number(addFromPlan.planId), Number(created.id))

        // 3) refresh view
        await loadPlans()
      } catch (err) {
        console.error('Create+Link failed', err)
      } finally {
        setAddFromPlan(null)
      }
    }}
    vessels={vessels}
    kinds={kinds}
    ports={portsList}
    planOptions={[]}
    companies={companies}
    subcompanies={subcompanies}
    crews={crews}
    rankMap={rankMap}
    prefill={{
      vesselId: addFromPlan.vesselId,
      inspectionKindId: addFromPlan.inspectionKindId,
      planId: addFromPlan.planId,
      planMonthDate: addFromPlan.planMonthDate,
    }}
    lockPlanContext   // NEW: locks Company/Subcompany/Vessel/Kind/Plan
  />
)}


    </div>
    
  );
};

export default InspectionPlanning;