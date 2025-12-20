import { FC, useState, useMemo, useEffect } from 'react'
import React from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { useAuth } from '../../auth'
import {
  listInspectionKinds, listPorts,  // <- use listPorts()
  searchInspections, createInspection, mapInspectionToRow,
  listCrewsLite,linkPlanToInspection ,
  getInspection, updateInspection
} from '../core/_requests'
import { getVesselList, getCompanyList, getCompanyAdminList } from '../../Management/core/_requests'
import type { Vessel } from '../../Management/core/_models'
import type {
  QhseInspectionKind,
  CreateInspectionPayload, InspectionRecord, VesselLite, 
  InspectionDto
} from '../core/_models'
import AddInspectionModal from './AddInspectionModal'
import { ViewInspectionModal } from './ViewInspectionModal'
import { EditInspectionModal } from './EditInspectionModal'

// import the submit type from the modal so types stay in sync
import type { SubmitShape } from './AddInspectionModal'

// Option A: if your Crewing module exposes a list endpoint, prefer that:
// import { listCrewsLite } from '../../Crewing/core/_requests' 
// (If you don’t have this exact fn, see 3.d “Adapter” below)
import type { CrewLite } from '../core/_models' // or from Crewing/_models
import { getRanksforList } from '../../Crewing/core/_requests'

const prettyEnum = (s?: string) =>
  s ? s.toLowerCase().replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'

interface AddInspectionModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: Omit<InspectionRecord, 'id' | 'vesselManager' | 'vesselType' | 'internalInspector' | 'isFinalized' | 'isVerified' | 'countNCRsObservations' | 'countNCRsObservationsCompleted' | 'score'>, saveAndAddNew: boolean) => void
}

const tableOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(255,255,255,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 5,
};

const spinner = (
  <div className="spinner-border" role="status" aria-label="Loading">
    <span className="visually-hidden">Loading...</span>
  </div>
);

const planOptions = [] as {id:number; label:string}[]

const InspectionIndex: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof InspectionRecord | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })
  const [isModalVisible, setIsModalVisible] = useState(false)
  // Filters (ids as strings for selects)
const [filters, setFilters] = useState({
  companyId: '',       // Company Group (CGA)
  subcompanyId: '',    // Company (Subcompany)
  vesselId: '',        // Vessel
  vesselType: '',
  inspection: '',
  inspectionType: '',
  internalInspector: '',
  externalInspector: '',
  inspectionFromDate: '',
  inspectionToDate: '',
  fromPort: '',
  toPort: '',
  activeStatus: 'All', // All / Show Active / Show Inactive
  isFinalized: 'All',  // All / Yes / No
  isVerified: 'All',   // All / Yes / No
})

// filters stay as-is
const [companies, setCompanies] = useState<Array<{id:number; name:string}>>([])
const [subcompanies, setSubcompanies] = useState<Array<{id:number; name:string; companyId:number}>>([])
const [vessels, setVessels] = useState<VesselLite[]>([])
const [ports, setPorts] = useState<Array<{id:number; name:string}>>([])
const [kinds, setKinds] = useState<QhseInspectionKind[]>([])

// NEW: id->name maps to avoid O(n^2) scanning
const [vesselMap, setVesselMap] = useState<Record<number, string>>({})
const [kindMap, setKindMap]     = useState<Record<number, string>>({})
const [portMap, setPortMap]     = useState<Record<number, string>>({})

// NEW: id->vesselType map
const [vesselTypeMap, setVesselTypeMap] = useState<Record<number, string>>({})

  const [showModal, setShowModal] = useState(false);

  const { currentUser, auth } = useAuth()

  const [rankMap, setRankMap] = useState<Record<number, string>>({})

  const [lookupsReady, setLookupsReady] = useState(false);

// role scoping (same pattern as Manuals)
const roleId: number =
  Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
const isCrew = roleId === 4

const myCgaId: number | null =
  currentUser?.companyGroupAdminId ??
  currentUser?.companyGroupAdmin?.id ??
  (currentUser?.role?.id === 5 ? (currentUser as any)?.roleEntityId : null) ??
  null
const isSuperadmin = roleId === 1
const isOperator = roleId === 6
const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
const operatorActsLikeGroupAdmin  = isOperator && !!currentUser?.companyGroupAdminId
const isTopLevel = isSuperadmin || operatorActsLikeSuperadmin
const effectiveCompanyId = isTopLevel ? undefined : (myCgaId ?? undefined)


const [inspectionData, setInspectionData] = useState<InspectionRecord[]>([])
const [loading, setLoading] = useState(false)

const [crews, setCrews] = useState<CrewLite[]>([]) // NEW

// View / Edit modal state
const [viewOpen, setViewOpen] = useState(false)
const [editOpen, setEditOpen] = useState(false)
const [viewing, setViewing] = useState<InspectionDto | null>(null)
const [editing, setEditing] = useState<InspectionDto | null>(null)

const [bootLoading, setBootLoading] = useState(true);        // until 1st load finishes
const [noDataDelayPassed, setNoDataDelayPassed] = useState(false); // short delay before showing empty
  const [didAutoSelectVessel, setDidAutoSelectVessel] = useState(false)

// Auto-fetch when company/subcompany/vessel or date/kind filters change (like Rest Hours behavior)
useEffect(() => {
  if (!lookupsReady) return;           // <-- gate
  loadInspections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  lookupsReady,                         // <-- include the flag
  filters.companyId,
  filters.subcompanyId,
  filters.vesselId,
  filters.inspectionFromDate,
  filters.inspectionToDate,
  filters.inspection,
  filters.inspectionType,
  filters.fromPort,
  filters.toPort,
  filters.isFinalized,
  filters.isVerified,
  filters.activeStatus
]);

const niceEnum = (s?: string) =>
  s ? s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'


useEffect(() => {
  const loadLookups = async () => {
    try {
      // simple lookups
      const [k, p] = await Promise.all([listInspectionKinds(), listPorts()])
      setKinds(k); setPorts(p)

      // 🔧 ADD inside loadLookups() before/after other Promise.all:
const ranks = await getRanksforList().catch(() => [])
const rMap: Record<number,string> = {}
;(Array.isArray(ranks) ? ranks : []).forEach((r: any) => {
  if (r?.id != null) rMap[Number(r.id)] = String(r.rank ?? r.name ?? '')
})
setRankMap(rMap)


      // vessel list (same pattern as Vessel Certificates / RestHours)
      const vesselList: Vessel[] = await getVesselList()

     // ---- Companies & Subcompanies (robust like RestHours) ----
const [groups, admins] = await Promise.all([
  getCompanyAdminList?.().catch(() => []), // CGA
  getCompanyList?.().catch(() => []),      // Company Admins
])

setCompanies(
  Array.isArray(groups)
    ? groups.map((g: any) => ({
        id: Number(g.id),
        name: g.name ?? g.companyGroupAdminName ?? `-`,
      }))
    : []
)

/**
 * Some backends omit /users/company-admins details or return empty.
 * We derive subcompanies from the vessel list as a fallback and merge.
 */
const derivedFromVessels = (vesselList || [])
  .map((v: any) => ({
    id: Number(v?.companyAdmin?.id ?? v?.companyId),
    name:
      v?.companyAdmin?.name ??
      v?.companyAdminName ??
      v?.companyName ??
      (v?.companyAdmin?.id ? `-` : null),
    companyId: Number(
      v?.companyGroupAdmin?.id ??
      v?.companyGroupId ??
      v?.cgaid?.id
    ),
  }))
  .filter(sc => Number.isFinite(sc.id) && !!sc.name && Number.isFinite(sc.companyId))

// from API
const fromAdmins = Array.isArray(admins)
  ? admins.map((a: any) => ({
      id: Number(a.id),
      name: a.name ?? a.companyAdminName ?? `-`,
      // IMPORTANT: companyId here means CGA id (for cascading)
      companyId: Number(
        a.cgaid?.id ??
        a.cga?.id ??
        a.companyGroupAdminId ??
        a.companyGroupId
      ),
    }))
  : []

// merge & de-dupe by id
const subMergedMap = new Map<number, {id:number; name:string; companyId:number}>()
;[...fromAdmins, ...derivedFromVessels].forEach(sc => {
  if (!Number.isFinite(sc.id) || !Number.isFinite(sc.companyId)) return
  const prev = subMergedMap.get(sc.id)
  subMergedMap.set(sc.id, prev ? prev : sc)
})
setSubcompanies(Array.from(subMergedMap.values()))


      // role scoping → same rules you already use
      let vesselsForUser: Vessel[] = []

      if (roleId === 4) {
        const vId = currentUser?.vessel?.id
        vesselsForUser = vId ? vesselList.filter(v => v.id === vId) : []
      } else {
        const isOperator = roleId === 6
        const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
        const operatorActsLikeGroupAdmin = isOperator && !!currentUser?.companyGroupAdminId

        vesselsForUser = vesselList.filter((v:any) => {
          const isActive = v?.active
          if (roleId === 1 || operatorActsLikeSuperadmin) return isActive
          if (roleId === 5 || operatorActsLikeGroupAdmin)
            return isActive && (v?.companyGroupAdmin?.id === (currentUser?.companyGroupAdminId ?? currentUser?.companyGroupAdmin?.id))
          if (roleId === 2)
            return isActive && (v?.companyAdmin?.id === currentUser?.companyAdminId)
          return false
        })
      }

      setVessels(
        vesselsForUser.map((v:any) => ({
          id: Number(v.id),
          name: v.fleet_name || v.name || `Vessel ${v.id}`,
          vesselType: v.vesselType || v.type || undefined,
          companyGroupAdminId: Number(v?.companyGroupAdmin?.id ?? v?.companyGroupId),
          companyAdminId:      Number(v?.companyAdmin?.id      ?? v?.companyId),
        }))
      )

      // Build a fast lookup: vesselId -> { cgaId, caId }
const vById: Record<number, {cgaId?: number; caId?: number}> = {}
for (const v of vesselsForUser) {
  const id = Number(v.id)
  vById[id] = {
    cgaId: Number((v as any)?.companyGroupAdmin?.id ?? (v as any)?.companyGroupId) || undefined,
    caId:  Number((v as any)?.companyAdmin?.id      ?? (v as any)?.companyId)      || undefined,
  }
}
;(window as any).__INS_VMAP__ = vById   // optional: debug helper

      // build maps once
      const vMap: Record<number,string> = {}
      const vtMap: Record<number,string> = {}
      for (const v of vesselsForUser as any[]) {
  const id = Number(v.id)
  vMap[id] = v.fleet_name || v.name || `Vessel ${id}`

  // Some payloads use vesselType, some use type, occasionally vessel_type
  const rawType = v.vesselType ?? v.type ?? v.vessel_type ?? ''
  vtMap[id] = rawType ? String(rawType) : ''
}
      const kMap: Record<number,string> = {}
      for (const kind of k) kMap[Number(kind.id)] = String(kind.name || '')
      const pMap: Record<number,string> = {}
      for (const port of p) pMap[Number(port.id)] = String(port.name || '')

        
      setVesselMap(vMap)
      setVesselTypeMap(vtMap)
      setKindMap(kMap)
      setPortMap(pMap)
      
      try {
  // listCrewsLite already returns normalized objects with id, fullName,
  // rankName, rankId, vesselId, companyGroupAdminId, companyAdminId
  const rawCrews = await listCrewsLite();
  setCrews(Array.isArray(rawCrews) ? rawCrews as CrewLite[] : []);
} catch (e) {
  console.warn('Failed to load crews for internal inspector dropdown', e);
  setCrews([]);
}

setLookupsReady(true);
    } catch (e) {
      console.error('Failed to load lookups', e)
      setVessels([]); setPorts([]); setKinds([])
      setVesselMap({}); setKindMap({}); setPortMap({})
      setLookupsReady(true); 
    }
  }
  loadLookups()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [roleId, currentUser])

// local helper inside the component
function mapWithLookups(d: InspectionDto): InspectionRecord {
  // build a light vessel meta index from current state
  const localVById: Record<number, { cgaId?: number; caId?: number }> = {}
  for (const v of vessels) {
    const id = Number(v.id)
    localVById[id] = {
      cgaId: Number((v as any).companyGroupAdminId ?? (v as any).companyGroupId) || undefined,
      caId:  Number((v as any).companyAdminId      ?? (v as any).companyId)      || undefined,
    }
  }

  const vesselIdsMeta = localVById[d.vesselId] || {}

  // Prefer server-provided names first; fallback to local maps; never show raw ids
  const vesselName =
    d.vesselName ||
    vesselMap[d.vesselId] ||
    `-`

  const kindName =
    d.inspectionKindName ||
    (d.inspectionKindId != null ? (kindMap[d.inspectionKindId] || `-`) : '-')

  const fromPortName =
    d.fromPortName ||
    (d.fromPortId != null ? (portMap[d.fromPortId] || '-') : undefined)

  const toPortName =
    d.toPortName ||
    (d.toPortId != null ? (portMap[d.toPortId] || '-') : undefined)

  const rawType = d.vesselType || vesselTypeMap[d.vesselId] || ''
  const vesselType = niceEnum(rawType) || '-'

    // Internal inspector is now a plain free-text string from backend
  const internalInspectorLabel = d.internalInspectorName || ''

  return {
    id: d.id,
    vesselManager: '-',
    vessel: vesselName,
    vesselType,
    inspection: kindName,
    inspectionType: prettyEnum(d.inspectionType),
    inspectionDate: d.inspectionFromDate,
    internalInspector: internalInspectorLabel || undefined,
    externalInspector: d.externalInspectorName || undefined,
    fromPort: fromPortName || undefined,
    toPort:   toPortName   || undefined,
    hoursOnboard: d.hoursOnboard ?? undefined,
    isFinalized: d.isFinalized ? 'Yes' : 'No',
    isVerified:  d.isVerified  ? 'Yes' : 'No',
    countNCRsObservations: d.ncrCount ?? 0,
    countNCRsObservationsCompleted: d.ncrCompleted ?? 0,
    score: d.score ?? undefined,
    linkToPlan: d.id ? `/qhse/insplanning?inspectionId=${d.id}` : undefined,
    inspectionRemarks: d.remarks || undefined,

    // hidden ids for client filters
    vesselId: d.vesselId,
    inspectionKindId: d.inspectionKindId,
    fromPortId: d.fromPortId ?? undefined,
    toPortId: d.toPortId ?? undefined,
    companyGroupAdminId: vesselIdsMeta.cgaId ?? null,
    companyAdminId: vesselIdsMeta.caId ?? null,
  } as InspectionRecord
}

// ⚙️ Derived vessel list for the filters (cascaded by Company -> Subcompany)
const vesselsForFilters = useMemo<VesselLite[]>(() => {
  let list = vessels
  if (filters.companyId) {
    const cid = Number(filters.companyId)
    list = list.filter(v => Number((v as any).companyGroupAdminId ?? (v as any).companyGroupId) === cid)
  }
  if (filters.subcompanyId) {
    const scid = Number(filters.subcompanyId)
    list = list.filter(v => Number((v as any).companyAdminId ?? (v as any).companyId) === scid)
  }
  return list
}, [vessels, filters.companyId, filters.subcompanyId])

// -- Subcompany helpers (only show when the chosen Company has > 0 subcompanies)
const subcompaniesForChosenCompany = useMemo(() => {
  if (!filters.companyId) return [];
  const cid = Number(filters.companyId);
  return subcompanies.filter(sc => sc.companyId === cid);
}, [subcompanies, filters.companyId]);

const hasSubcompaniesForChosenCompany = subcompaniesForChosenCompany.length > 0;

  useEffect(() => {
    if (!lookupsReady) return
    if (didAutoSelectVessel) return

    const firstVessel = vesselsForFilters[0]
    if (!firstVessel) return

    setFilters(prev => {
      if (prev.vesselId) return prev

      const v: any = firstVessel

      const companyGroupId =
        v.companyGroupAdminId ??
        v.companyGroupId ??
        v.cgaid?.id ??
        null

      const companyAdminId =
        v.companyAdminId ??
        v.companyId ??
        null

      return {
        ...prev,
        companyId: companyGroupId ? String(companyGroupId) : prev.companyId,
        subcompanyId: companyAdminId ? String(companyAdminId) : prev.subcompanyId,
        vesselId: String(firstVessel.id),
      }
    })

    setDidAutoSelectVessel(true)
  }, [lookupsReady, vesselsForFilters, didAutoSelectVessel])

// Crew options for the filter (narrow by company/subcompany/vessel)
const crewsForFilters = useMemo(() => {
  let list = crews;

  if (filters.companyId) list = list.filter(c => c.companyGroupAdminId === Number(filters.companyId));
  if (filters.subcompanyId) list = list.filter(c => c.companyAdminId === Number(filters.subcompanyId));
  if (filters.vesselId) {
    const vid = Number(filters.vesselId);
    list = list.filter(c => !c.vesselId || c.vesselId === vid);
  }

  const seen = new Set<string>();
  const labels: string[] = [];

  for (const c of list) {
    const rank =
      c.rankName ||
      (c.rankId != null ? rankMap[c.rankId] : '') ||
      '';

    const label = rank ? `${c.fullName} — ${rank}` : c.fullName;

    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.sort((a, b) => a.localeCompare(b));
}, [crews, rankMap, filters.companyId, filters.subcompanyId, filters.vesselId]);

const loadInspections = async () => {
  setLoading(true)
  try {
const res = await searchInspections({
  companyGroupId: filters.companyId ? Number(filters.companyId) : effectiveCompanyId,
  companyId:      filters.subcompanyId ? Number(filters.subcompanyId) : undefined,
  vesselId:       filters.vesselId ? Number(filters.vesselId) : undefined,
  fromDate: filters.inspectionFromDate || undefined,
  toDate:   filters.inspectionToDate   || undefined,
  inspectionKindId: filters.inspection ? Number(filters.inspection) : undefined,
  inspectionType:   filters.inspectionType || undefined,
  fromPortId: filters.fromPort ? Number(filters.fromPort) : undefined,
  toPortId:   filters.toPort   ? Number(filters.toPort)   : undefined,
  isFinalized: filters.isFinalized === 'All' ? undefined : (filters.isFinalized === 'Yes'),
  isVerified:  filters.isVerified  === 'All' ? undefined : (filters.isVerified  === 'Yes'),
  activeOnly:  filters.activeStatus === 'All' ? undefined : (filters.activeStatus === 'Show Active'),
})
    const list: any[] = Array.isArray(res?.content) ? res.content : (Array.isArray(res) ? res : [])
    // setInspectionData(list.map(mapInspectionToRow))
    setInspectionData(list.map(mapWithLookups))
  } catch (e) {
    console.error(e)
    setInspectionData([])
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  if (!lookupsReady) return;
  (async () => {
    setBootLoading(true);
    try {
      await loadInspections();
    } finally {
      setBootLoading(false);
    }
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [lookupsReady, effectiveCompanyId]);

useEffect(() => {
  if (bootLoading || loading) {
    setNoDataDelayPassed(false);
    return;
  }
  const t = setTimeout(() => setNoDataDelayPassed(true), 500); // ~0.5s feels nice
  return () => clearTimeout(t);
}, [bootLoading, loading]);


  const handleSearch = () => {
    setShowModal(false);
    // Add your search logic here
    console.log('Searching with filters:', filters);
  };

  const handleCancel = () => {
    setShowModal(false);
  };

const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target
  setFilters(prev => {
    const next = { ...prev, [name]: value }
    if (name === 'companyId') {
      next.subcompanyId = ''
      next.vesselId = ''
    }
    if (name === 'subcompanyId') {
      next.vesselId = ''
    }
    return next
  })
}

  // Filter data based on search
const filteredData = useMemo(() => {
  return inspectionData.filter(record => {
    const matchesSearch =
      (record.vessel?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (record.inspection?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    const byCompany =
      !filters.companyId ||
      Number((record as any).companyGroupAdminId) === Number(filters.companyId)

    const bySubcompany =
      !filters.subcompanyId ||
      Number((record as any).companyAdminId) === Number(filters.subcompanyId)

    const byVessel =
      !filters.vesselId ||
      Number((record as any).vesselId) === Number(filters.vesselId)

    const matchesFilters =
      byCompany &&
      bySubcompany &&
      byVessel &&
      (!filters.vesselType || record.vesselType === filters.vesselType) &&
      (!filters.inspection || String((record as any).inspectionKindId) === String(filters.inspection)) &&
      (!filters.inspectionType || record.inspectionType === filters.inspectionType) &&
      (!filters.internalInspector || (record.internalInspector || '').toLowerCase().includes(filters.internalInspector.toLowerCase())) &&
      (!filters.externalInspector || (record.externalInspector || '').toLowerCase().includes(filters.externalInspector.toLowerCase())) &&
      (!filters.fromPort || String((record as any).fromPortId) === String(filters.fromPort)) &&
      (!filters.toPort || String((record as any).toPortId) === String(filters.toPort)) &&
      (!filters.inspectionFromDate || new Date(record.inspectionDate) >= new Date(filters.inspectionFromDate)) &&
      (!filters.inspectionToDate || new Date(record.inspectionDate) <= new Date(filters.inspectionToDate)) &&
      (filters.isFinalized === 'All' || record.isFinalized === filters.isFinalized) &&
      (filters.isVerified === 'All' || record.isVerified === filters.isVerified) &&
      (filters.activeStatus === 'All' ||
        (filters.activeStatus === 'Show Active' && record.isFinalized === 'Yes') ||
        (filters.activeStatus === 'Show Inactive' && record.isFinalized === 'No'))

    return matchesSearch && matchesFilters
  })
}, [searchTerm, filters, inspectionData])

// Utility to extract unique string values for dropdowns
const getUniqueValues = (key: keyof InspectionRecord): string[] => {
  const values = inspectionData
    .map(record => record[key])
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')

  return Array.from(new Set(values))
}

// Dropdown options
const vesselManagerOptions = getUniqueValues("vesselManager")
const vesselOptionsDropdown = getUniqueValues("vessel")
const vesselTypeOptions = getUniqueValues("vesselType")
const inspectionOptions = getUniqueValues("inspection")
const inspectionTypeOptionsDropdown = getUniqueValues("inspectionType")
const fromPortOptions = getUniqueValues("fromPort")
const toPortOptions = getUniqueValues("toPort")
const internalInspectorOptions = getUniqueValues("internalInspector")
const externalInspectorOptions = getUniqueValues("externalInspector")

const openView = async (id: number) => {
  try {
    const dto = await getInspection(id)

    const patched: InspectionDto = {
      ...dto,
      vesselName: dto.vesselName || vesselMap[dto.vesselId] || `-`,
      vesselType: dto.vesselType || vesselTypeMap[dto.vesselId] || undefined,
      inspectionKindName:
        dto.inspectionKindName ||
        (dto.inspectionKindId != null ? (kindMap[dto.inspectionKindId] || `-`) : ''),
      fromPortName:
        dto.fromPortName || (dto.fromPortId != null ? (portMap[dto.fromPortId] || '') : ''),
      toPortName:
        dto.toPortName || (dto.toPortId != null ? (portMap[dto.toPortId] || '') : ''),
      // free-text only, no crew lookup
      internalInspectorName: dto.internalInspectorName || undefined,
    }

    setViewing(patched)
    setViewOpen(true)
  } catch (e) {
    console.error('Failed to load inspection', e)
  }
}

const openEdit = async (id: number) => {
  try {
    const dto = await getInspection(id)
    setEditing(dto)
    setEditOpen(true)
  } catch (e) {
    console.error('Failed to load inspection', e)
  }
}

// Submit from the full edit modal (PUT)
const handleUpdateInspection = async (form: SubmitShape) => {
  if (!editing) return
  const partial: Partial<InspectionDto> = {
    vesselId: Number(form.vessel),
    inspectionKindId: Number(form.inspection),
    inspectionType: (form.inspectionType as any) || 'DETAILS_TYPE',
    inspectionFromDate: form.inspectionDate,
    inspectionToDate: form.inspectionDate,
    internalInspectorName: form.internalInspectorName || undefined,
    externalInspectorName: form.externalInspector || undefined,
    fromPortId: form.fromPort ? Number(form.fromPort) : undefined,
    toPortId: form.toPort ? Number(form.toPort) : undefined,
    hoursOnboard: form.hoursOnboard ? Number(form.hoursOnboard) : undefined,
    remarks: form.inspectionRemarks || undefined,
  }

  try {
    const updated = await updateInspection(editing.id, partial)
    if (form.linkToPlan) {
      try { await linkPlanToInspection(Number(form.linkToPlan), Number(editing.id)) } catch {}
    }
    setEditOpen(false)
    setEditing(null)
    await loadInspections()
  } catch (e) {
    console.error('Update failed', e)
  }
}


  // Apply sorting
  const sortedData = useMemo(() => {
    let sortedRecords = [...filteredData]

    if (sortConfig.key !== null) {
      sortedRecords.sort((a, b) => {
        const aVal = a[sortConfig.key!]
        const bVal = b[sortConfig.key!]

        // Handle different data types
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const aStr = aVal.toLowerCase()
          const bStr = bVal.toLowerCase()
          if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
          if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
          return 0
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
        }

        if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          return sortConfig.direction === 'asc' 
            ? (aVal === bVal ? 0 : aVal ? 1 : -1)
            : (aVal === bVal ? 0 : aVal ? -1 : 1)
        }

        // Handle null/undefined values
        if (!aVal && !bVal) return 0
        if (!aVal) return sortConfig.direction === 'asc' ? 1 : -1
        if (!bVal) return sortConfig.direction === 'asc' ? -1 : 1

        return 0
      })
    }

    return sortedRecords
  }, [filteredData, sortConfig])

  const handleSort = (key: keyof InspectionRecord) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1)
  }

    const handleAddInspection = async (form: SubmitShape, _saveAndAddNew: boolean) => {
    const payload: CreateInspectionPayload = {
      vesselId: Number(form.vessel),
      inspectionKindId: Number(form.inspection),
      inspectionType: (form.inspectionType as any) || 'DETAILS_TYPE',
      inspectionFromDate: form.inspectionDate,
      inspectionToDate: form.inspectionDate,
      internalInspectorName: form.internalInspectorName || undefined,
      externalInspectorName: form.externalInspector || undefined,
      fromPortId: form.fromPort ? Number(form.fromPort) : undefined,
      toPortId: form.toPort ? Number(form.toPort) : undefined,
      hoursOnboard: form.hoursOnboard || undefined,
      remarks: form.inspectionRemarks || undefined,
      linkToPlanId: form.linkToPlan ? Number(form.linkToPlan) : undefined, // server may auto-link
    }

    const created = await createInspection(payload).catch(() => null)

    if (created?.id && form.linkToPlan) {
      try { await linkPlanToInspection(Number(form.linkToPlan), Number(created.id)) } catch {}
    }

    await loadInspections()
  }


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (isFinalized: boolean, isVerified: boolean) => {
    if (isVerified) {
      return <span className='badge badge-light-success'>Verified</span>
    } else if (isFinalized) {
      return <span className='badge badge-light-primary'>Finalized</span>
    } else {
      return <span className='badge badge-light-warning'>In Progress</span>
    }
  }

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-muted'
    if (score >= 90) return 'text-success'
    if (score >= 75) return 'text-warning'
    return 'text-danger'
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

    const handleClearFilters = () => {
  setFilters({
    companyId: '', subcompanyId: '', vesselId: '',
    vesselType: '', inspection: '', inspectionType: '',
    internalInspector: '', externalInspector: '',
    inspectionFromDate: '', inspectionToDate: '',
    fromPort: '', toPort: '',
    activeStatus: 'All', isFinalized: 'All', isVerified: 'All',
  })
}


  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            {/* Header */}
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Inspection Index</h3>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setIsModalVisible(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add New Inspection Details
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className='card-body py-4 bg-white border-top'>
                           <div className='row gx-3 gy-3 mb-4'>
                {/* Company (CGA) */}
                {roleId !== 4 && (
                  <div className='col-md-2'>
                    <label
                      className='form-label fw-semibold fs-7'
                      style={{color: '#A1A5B7'}}
                    >
                      Company
                    </label>
                    {isTopLevel ? (
                      <select
                        className='form-select'
                        name='companyId'
                        value={filters.companyId}
                        onChange={handleFilterChange}
                      >
                        <option value=''>All Companies</option>
                        {companies.map(c => (
                          <option key={c.id} value={String(c.id)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className='form-control' style={{background: '#f8f9fa'}}>
                        {companies.find(c => c.id === (effectiveCompanyId ?? 0))?.name || '-'}
                      </div>
                    )}
                  </div>
                )}

                {/* Subcompany */}
                {roleId !== 4 &&
                  Boolean(filters.companyId || (!isTopLevel && effectiveCompanyId)) &&
                  hasSubcompaniesForChosenCompany && (
                    <div className='col-md-2'>
                      <label
                        className='form-label fw-semibold fs-7'
                        style={{color: '#A1A5B7'}}
                      >
                        Subcompany
                      </label>
                      <select
                        className='form-select'
                        name='subcompanyId'
                        value={filters.subcompanyId}
                        onChange={handleFilterChange}
                      >
                        <option value=''>All Subcompanies</option>
                        {subcompaniesForChosenCompany.map(sc => (
                          <option key={sc.id} value={String(sc.id)}>
                            {sc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                {/* Vessel */}
                {!isCrew && (
                  <div className='col-md-2'>
                    <label
                      className='form-label fw-semibold fs-7'
                      style={{color: '#A1A5B7'}}
                    >
                      Vessel
                    </label>
                    <select
                      className='form-select'
                      name='vesselId'
                      value={filters.vesselId}
                      onChange={handleFilterChange}
                    >
                      <option value=''>All Vessels</option>
                      {vesselsForFilters.map(v => (
                        <option key={v.id} value={String(v.id)}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

               {/* Vessel Type */}
{!isCrew && (
  <div className='col-md-2'>
    <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
      Vessel Type
    </label>
    <select
      className='form-select'
      style={{
        border: '1px solid #E4E6EF',
        borderRadius: '6px',
        fontSize: '14px',
        padding: '8px 12px',
        color: '#5E6278',
      }}
      name='vesselType'
      value={filters.vesselType}
      onChange={handleFilterChange}
    >
      <option value=''>All Vessel Types</option>
      {vesselTypeOptions.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
)}


                {/* Additional Filters Button */}
                <div className='col-md-3 d-flex align-items-end'>
                  <button
                    type='button'
                    className='btn btn_primary text-nowrap'
                    // style={{
                    //   borderColor: '#E4E6EF',
                    //   color: '#5E6278',
                    //   fontSize: '14px',
                    //   padding: '8px 16px',
                    //   borderRadius: '6px',
                    //   height: 'fit-content'
                    // }}
                    onClick={() => setShowModal(true)}
                  >
                    Additional Filters
                  </button>

                  <button
                    type='button'
                    className='btn text-nowrap'
                    style={{
                      fontSize: '14px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      height: 'fit-content'
                    }}
                    onClick={handleClearFilters}
                  >
                    Clear All
                  </button>
                </div>
                </div>

                {/* Modal */}
                {showModal && (
                  <div 
                    className="modal fade show d-flex align-items-center justify-content-center" 
                    tabIndex={-1} 
                    style={{ 
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '110%',
                      zIndex: 1050
                    }}
                  >
                    <div className="modal-dialog" style={{ width: '100%', height: '80%' }}>
                      <div className="modal-content">
                        <div className="modal-header">
                          <h5 className="modal-title">Additional Filters</h5>
                          <button 
                            type="button" 
                            className="btn-close" 
                            onClick={handleCancel}
                          ></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                          <div className='row gx-4 gy-4'>
                            {/* Inspection */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                Inspection
                              </label>
                              <select
  className='form-select'
  style={{ border: '1px solid #E4E6EF', borderRadius: '6px', fontSize: '14px', padding: '10px 14px', color: '#5E6278', minHeight: '42px' }}
  name='inspection'
  value={filters.inspection}
  onChange={handleFilterChange}
>
  <option value=''>All Inspections</option>
  {kinds.map(k => (
    <option key={k.id} value={String(k.id)}>{k.name}</option>
  ))}
</select>
                            </div>

                            {/* Inspection Type */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                Inspection Type
                              </label>
                              <select
                                className='form-select'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='inspectionType'
                                value={filters.inspectionType}
                                onChange={handleFilterChange}
                              >
                                <option value=''>All Inspection Types</option>
                                {inspectionTypeOptionsDropdown.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>

                                                        {/* Internal Inspector (free-text) */}
                            <div className='col-lg-6 col-md-6'>
                              <label
                                className='form-label fw-semibold fs-7 mb-2'
                                style={{ color: '#A1A5B7' }}
                              >
                                Internal Inspector
                              </label>
                              <input
                                type='text'
                                className='form-control'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px',
                                }}
                                name='internalInspector'
                                value={filters.internalInspector}
                                onChange={handleFilterChange}
                                placeholder='Search internal inspector'
                              />
                            </div>

                            {/* External Inspector */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                External Inspector
                              </label>
                              <input
                                type='text'
                                className='form-control'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='externalInspector'
                                value={filters.externalInspector}
                                onChange={handleFilterChange}
                                placeholder='Search external inspector'
                              />
                            </div>

                            {/* Inspection From Date */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                Inspection From Date
                              </label>
                              <input
                                type='date'
                                className='form-control'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='inspectionFromDate'
                                value={filters.inspectionFromDate}
                                onChange={handleFilterChange}
                              />
                            </div>

                            {/* Inspection To Date */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                Inspection To Date
                              </label>
                              <input
                                type='date'
                                className='form-control'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='inspectionToDate'
                                value={filters.inspectionToDate}
                                onChange={handleFilterChange}
                              />
                            </div>

                            {/* From Port */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                From Port
                              </label>
                              <select
                                className='form-select'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='fromPort'
                                value={filters.fromPort}
                                onChange={handleFilterChange}
                              >
                                <option value=''>All Ports</option>
                                {fromPortOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>

                            {/* To Port */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                To Port
                              </label>
                              <select
                                className='form-select'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='toPort'
                                value={filters.toPort}
                                onChange={handleFilterChange}
                              >
                                <option value=''>All Ports</option>
                                {toPortOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>

                            {/* Show Active/Inactive */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                Show Active/Inactive
                              </label>
                              <select
                                className='form-select'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='activeStatus'
                                value={filters.activeStatus}
                                onChange={handleFilterChange}
                              >
                                <option value='All'>All</option>
                                <option value='Show Active'>Show Active</option>
                                <option value='Show Inactive'>Show Inactive</option>
                              </select>
                            </div>

                            {/* Is Verified */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                Is Verified
                              </label>
                              <select
                                className='form-select'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='isVerified'
                                value={filters.isVerified}
                                onChange={handleFilterChange}
                              >
                                <option value='All'>All</option>
                                <option value='Yes'>Yes</option>
                                <option value='No'>No</option>
                              </select>
                            </div>

                            {/* Is Finalized */}
                            <div className='col-lg-6 col-md-6'>
                              <label className='form-label fw-semibold fs-7 mb-2' style={{ color: '#A1A5B7' }}>
                                Is Finalized
                              </label>
                              <select
                                className='form-select'
                                style={{
                                  border: '1px solid #E4E6EF',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  padding: '10px 14px',
                                  color: '#5E6278',
                                  minHeight: '42px'
                                }}
                                name='isFinalized'
                                value={filters.isFinalized}
                                onChange={handleFilterChange}
                              >
                                <option value='All'>All</option>
                                <option value='Yes'>Yes</option>
                                <option value='No'>No</option>
                              </select>
                            </div>
                          </div>
                        </div>
                        {/* <div className="modal-footer">
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={handleCancel}
                          >
                            Cancel
                          </button>
                          <button 
                            type="button" 
                            className="btn btn_primary" 
                            onClick={handleSearch}
                          >
                            Search
                          </button>
                        </div> */}
                      </div>
                    </div>
                  </div>
                )}
              {/* Table */}
              <div className='report-table table-responsive' style={{ position: 'relative' }}>
  {loading && <div style={tableOverlayStyle}>{spinner}</div>}
  <div style={{ overflowX: 'auto' }}>
    <table className='table table-bordered align-middle'>
                {/* ---------- THEAD ---------- */}
                <thead className='table-header text-start'>
                  <tr>
                    <th className='text-center' style={{
                      minWidth: '80px',
                      // position: 'sticky',
                      left: 0,
                      zIndex: 3,
                      backgroundColor: '#f8f9fa',
                    }}>SR/NO</th>

                    {/* VESSEL */}
                    <th onClick={() => handleSort('vessel')} className="cursor-pointer" style={{ minWidth: '180px' }}>
                      <div className="d-flex align-items-center align-middle">
                        VESSEL
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'vessel'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* VESSEL TYPE */}
{!isCrew && (
  <th
    onClick={() => handleSort('vesselType')}
    className="cursor-pointer"
    style={{ minWidth: '160px' }}
  >
    <div className="d-flex align-items-center align-middle">
      VESSEL TYPE
      <div style={{ transform: 'translateY(-2px)' }}>
        <KTSVG
          path={`/media/map/sort-col-${
            sortConfig.key === 'vesselType'
              ? sortConfig.direction === 'asc'
                ? 'up-black'
                : 'down-black'
              : 'grey'
          }.svg`}
          className="svg-icon ms-2 custom-sort-icon"
        />
      </div>
    </div>
  </th>
)}

                    {/* INSPECTION */}
                    <th onClick={() => handleSort('inspection')} className="cursor-pointer" style={{ minWidth: '180px' }}>
                      <div className="d-flex align-items-center">
                        INSPECTION
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'inspection'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* INSPECTION TYPE */}
                    <th onClick={() => handleSort('inspectionType')} className="cursor-pointer" style={{ minWidth: '200px' }}>
                      <div className="d-flex align-items-center">
                        INSPECTION TYPE
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'inspectionType'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* INSPECTION DATE */}
                    <th onClick={() => handleSort('inspectionDate')} className="cursor-pointer" style={{ minWidth: '180px' }}>
                      <div className="d-flex align-items-center">
                        INSPECTION DATE
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'inspectionDate'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* INTERNAL INSPECTOR */}
                    <th onClick={() => handleSort('internalInspector')} className="cursor-pointer" style={{ minWidth: '180px' }}>
                      <div className="d-flex align-items-center">
                        INTERNAL INSPECTOR
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'internalInspector'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* EXTERNAL INSPECTOR */}
                    <th onClick={() => handleSort('externalInspector')} className="cursor-pointer" style={{ minWidth: '180px' }}>
                      <div className="d-flex align-items-center">
                        EXTERNAL INSPECTOR
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'externalInspector'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* FROM PORT */}
                    <th onClick={() => handleSort('fromPort')} className="cursor-pointer" style={{ minWidth: '140px' }}>
                      <div className="d-flex align-items-center">
                        FROM PORT
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'fromPort'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* TO PORT */}
                    <th onClick={() => handleSort('toPort')} className="cursor-pointer" style={{ minWidth: '140px' }}>
                      <div className="d-flex align-items-center">
                        TO PORT
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'toPort'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* HOURS ONBOARD */}
                    <th onClick={() => handleSort('hoursOnboard')} className="cursor-pointer text-center" style={{ minWidth: '160px' }}>
                      <div className="d-flex align-items-center justify-content-center">
                        HOURS ONBOARD
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'hoursOnboard'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* IS FINALIZED */}
                    <th onClick={() => handleSort('isFinalized')} className="cursor-pointer text-center" style={{ minWidth: '160px' }}>
                      <div className="d-flex align-items-center justify-content-center">
                        IS FINALIZED
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'isFinalized'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* IS VERIFIED */}
                    <th onClick={() => handleSort('isVerified')} className="cursor-pointer text-center" style={{ minWidth: '160px' }}>
                      <div className="d-flex align-items-center justify-content-center">
                        IS VERIFIED
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'isVerified'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* COUNT OF NCRs */}
                    <th onClick={() => handleSort('countNCRsObservations')} className="cursor-pointer text-center" style={{ minWidth: '250px' }}>
                      <div className="d-flex align-items-center justify-content-center">
                        COUNT OF NCRs AND OBSERVATIONS
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'countNCRsObservations'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* COUNT OF NCRs COMPLETED */}
                    <th onClick={() => handleSort('countNCRsObservationsCompleted')} className="cursor-pointer text-center" style={{ minWidth: '280px' }}>
                      <div className="d-flex align-items-center justify-content-center">
                        COUNT OF NCRs AND OBSERVATIONS COMPLETED
                        <div style={{ transform: 'translateY(-2px)' }}>
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'countNCRsObservationsCompleted'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className="svg-icon ms-2 custom-sort-icon"
                          />
                        </div>
                      </div>
                    </th>

                    {/* ACTIONS (sticky right) */}
                    <th
                      style={{
                        minWidth: '150px',
                        position: 'static',
                        right: 0,
                        backgroundColor: '#f8f9fa',
                        zIndex: 2,
                        textAlign: 'center',
                      }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>

                {/* ---------- TBODY ---------- */}
                <tbody className='table-body text-start'>
  {(bootLoading || loading) ? (
    // 🔁 Skeleton: 8 shimmering rows like CrewingList
    Array.from({length: 8}).map((_, i) => (
      <tr key={`skeleton-${i}`}>
        {Array.from({length: 15}).map((__, c) => (
          <td key={`s-${i}-${c}`} className="py-3">
            <div className="placeholder-wave">
              <div className="placeholder w-100" style={{height: 14, borderRadius: 4}} />
            </div>
          </td>
        ))}
      </tr>
    ))
  ) : (currentRecords.length === 0 && noDataDelayPassed) ? (
    <tr>
      <td colSpan={15} className='text-center text-muted py-5'>
        No inspection records found for the selected criteria.
      </td>
    </tr>
  ) : (
    currentRecords.map((record, index) => (
                      <tr key={record.id}>
                        <td className='text-center' style={{
                          minWidth: '80px',
                          // position: 'sticky',
                          left: 0,
                          // backgroundColor: '#fff',
                          zIndex: 2,
                        }}>{index + 1}</td>
                        <td className="text-dark fw-bold fs-6 text-nowrap" style={{ minWidth: '180px' }}>
                          {record.vessel}
                        </td>
                        {!isCrew && (
  <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '160px' }}>
    {record.vesselType}
  </td>
)}
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '180px' }}>
                          {record.inspection}
                        </td>
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '200px' }}>
                          {record.inspectionType}
                        </td>
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '180px' }}>
                          {formatDate(record.inspectionDate)}
                        </td>
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '180px' }}>
                          {record.internalInspector || '-'}
                        </td>
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '180px' }}>
                          {record.externalInspector || '-'}
                        </td>
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '140px' }}>
                          {record.fromPort || '-'}
                        </td>
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '140px' }}>
                          {record.toPort || '-'}
                        </td>
                        <td className="text-center text-dark fs-6 text-nowrap" style={{ minWidth: '160px' }}>
                          {record.hoursOnboard ? `${record.hoursOnboard}h` : '-'}
                        </td>
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '160px' }}>
                          {record.isFinalized || '-'}
                        </td>
                        <td className="text-dark fs-6 text-nowrap" style={{ minWidth: '160px' }}>
                          {record.isVerified || '-'}
                        </td>
                        <td className="text-center text-dark fw-bold fs-6 text-nowrap" style={{ minWidth: '250px' }}>
                          {record.countNCRsObservations}
                        </td>
                        <td className="text-center text-nowrap" style={{ minWidth: '280px' }}>
                          <div className="d-flex align-items-center justify-content-center">
                            <span className="text-dark fw-bold fs-6 me-2">
                              {record.countNCRsObservationsCompleted}
                            </span>
                            <div className="progress" style={{ width: '60px', height: '6px' }}>
                              <div
                                className="progress-bar bg-success"
                                style={{
                                  width: `${
                                    record.countNCRsObservations > 0
                                      ? (record.countNCRsObservationsCompleted / record.countNCRsObservations) * 100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                       {/* ACTIONS (sticky right) */}
<td
  style={{
    minWidth: '150px',
    position: 'static',
    right: 0,
    // backgroundColor: '#fff',
    textAlign: 'center',
    zIndex: 1,
  }}
>
  <div className='d-flex align-items-center justify-content-center  text-nowrap'>
    <button
      className='btn btn-icon btn-sm me-2'
      title='View'
      onClick={() => openView(record.id)}
    >
      <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3 text-primary' />
    </button>

    <button
      className='btn btn-icon btn-sm'
      title='Edit'
      onClick={() => openEdit(record.id)}
    >
      <KTSVG path='/media/map/edit-active.svg' className='' />
    </button>
  </div>
</td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>


                {/* Pagination */}
                <div 
                  className='pagination-wrapper d-flex justify-content-between align-items-center py-3'
                  style={{
                    position: 'static',
                    bottom: 0,
                    backgroundColor: '#fff',
                    zIndex: 10,
                    borderTop: '1px solid #dee2e6',
                    marginTop: 'auto'
                  }}
                >
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
                      Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedData.length)}</strong> of <strong>{sortedData.length}</strong>
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
                                    borderRadius: '6px'
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
                                  <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                </li>
                              )
                            }
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
                                    borderRadius: '6px',
                                    outline: 'none',
                                    boxShadow: 'none'
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
                                  <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
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
                                    borderRadius: '6px'
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

      {/* Add Inspection Modal */}
      <AddInspectionModal
  visible={isModalVisible}
  onClose={() => setIsModalVisible(false)}
  onSubmit={handleAddInspection}
  // pass the full vessel list (with company ids) — modal will narrow it locallly
  vessels={vessels}
  kinds={kinds}
  ports={ports}
  planOptions={planOptions}
  showCompanyFilters={roleId !== 4}
  // NEW
  companies={companies}
  subcompanies={subcompanies}
  crews={crews}
  rankMap={rankMap}
/>

{/* View Modal */}
<ViewInspectionModal
  visible={viewOpen}
  onClose={() => { setViewOpen(false); setViewing(null) }}
  record={viewing}
/>

{/* Full Edit Modal (same fields as Add) */}
<EditInspectionModal
  visible={editOpen}
  onClose={() => { setEditOpen(false); setEditing(null) }}
  record={editing}
  onSubmit={handleUpdateInspection}
  vessels={vessels}
  kinds={kinds}
  ports={ports}
  showCompanyFilters={roleId !== 4}
  companies={companies}
  subcompanies={subcompanies}
  crews={crews}
  rankMap={rankMap}
/>

    </div>
  )
}

export default InspectionIndex