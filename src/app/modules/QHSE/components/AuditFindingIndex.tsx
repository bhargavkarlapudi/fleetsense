import React, {FC, useEffect, useMemo, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {useAuth} from '../../auth'
import {toast} from 'react-toastify'
import {getCompanyAdminList, getCompanyList, getVesselList} from '../../Management/core/_requests'
import {FileViewerModal} from '../components/FileViewerModal'
import AuditFindingAttachmentsModal from './AuditFindingAttachmentsModal'

import type {Vessel} from '../../Management/core/_models'
import type {
  QHSEAuditFindingDto,
  AuditFindingRecord,
  FindingStatus,
  AuditFindingAttachmentInfo,
  FindingType,
} from '../core/_models'
import type {AuditDto} from '../core/_models'
import {
  searchAuditFindings,
  createAuditFinding,
  getAuditFinding,
  updateAuditFinding,
  uploadAuditFindingAttachments,
  listAuditFindingAttachments,
  AuditFindingAttachmentViewUrl,
  AuditFindingAttachmentDownloadUrl,
  searchAudits,
  deleteAuditFindingAttachment,
  AuditFindingAttachmentFileViewUrl,
  AuditFindingAttachmentFileDownloadUrl,
} from '../core/_requests'

import AddAuditFindingModal from './AddAuditFindingModal'
import {ViewAuditFindingModal} from './ViewAuditFindingModal'
import EditAuditFindingModal from './EditAuditFindingModal'
import type {AuditFindingSubmitShape} from '../core/_models'

const stripHtml = (html?: string | null): string =>
  html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''

type CompanyGroup = {id: number; name: string}
type Subcompany = {id: number; name: string; companyId: number}

const tableOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(255,255,255,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 5,
}

const spinner = (
  <div className='spinner-border' role='status' aria-label='Loading'>
    <span className='visually-hidden'>Loading...</span>
  </div>
)

const niceEnum = (s?: string | null) =>
  s ? s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'

const statusBadgeClass = (status?: FindingStatus | null) => {
  switch (status) {
    case 'SATISFACTORY':
      return 'badge-light-success'
    case 'NON_CRITICAL':
      return 'badge-light-primary'
    case 'CRITICAL':
      return 'badge-light-danger'
    case 'OBSERVATION':
      return 'badge-light-warning'
    case 'OPPORTUNITY_FOR_IMPROVEMENT':
      return 'badge-light-info'
    default:
      return 'badge-light'
  }
}

const AuditFindingIndex: FC = () => {
  const {currentUser, auth} = useAuth()

  // --- roles / scoping same as Defects ---
  const roleId: number =
    Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0

  const isCrew = roleId === 4
  const myCgaId: number | null =
    currentUser?.companyGroupAdminId ??
    currentUser?.companyGroupAdmin?.id ??
    (currentUser?.role?.id === 5 ? (currentUser as any)?.roleEntityId : null) ??
    null

  const isOperator = roleId === 6
  const isSuperadmin = roleId === 1
  const isTopLevel = isSuperadmin || (isOperator && !myCgaId)

  const effectiveCompanyId = isTopLevel ? undefined : (myCgaId ?? undefined)

  // filters
  const [filters, setFilters] = useState({
    companyId: '',
    subcompanyId: '',
    vesselId: '',
    status: 'All',        // All / enum from FindingStatus
    findingType: 'All',   // All / enum from FindingType
    fromDate: '',
    toDate: '',
  })
  const [searchTerm, setSearchTerm] = useState('')

  // lookups
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])
  const [vesselMetaMap, setVesselMetaMap] = useState<
    Record<number, {name: string; companyGroupAdminId?: number | null; companyAdminId?: number | null}>
  >({})

  const [lookupsReady, setLookupsReady] = useState(false)
  const [loadingLookups, setLoadingLookups] = useState(false)

  // Audit dropdown for Add/Edit
  const [auditOptions, setAuditOptions] = useState<{id: number; label: string}[]>([])

  // data
  const [records, setRecords] = useState<AuditFindingRecord[]>([])
  const [loading, setLoading] = useState(false)

  const [bootLoading, setBootLoading] = useState(true)
  const [noDataDelayPassed, setNoDataDelayPassed] = useState(false)

  // pagination / sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortColumn, setSortColumn] = useState<keyof AuditFindingRecord | ''>('findingDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [didAutoSelectVessel, setDidAutoSelectVessel] = useState(false)

  // modals
  const [addOpen, setAddOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewing, setViewing] = useState<QHSEAuditFindingDto | null>(null)
  const [editing, setEditing] = useState<QHSEAuditFindingDto | null>(null)

  // file viewer (single file)
  const [fileModal, setFileModal] = useState<{
    visible: boolean
    title: string
    fileName?: string
    viewUrl?: string
    downloadUrl?: string
  }>({
    visible: false,
    title: '',
  })

  // multi-attachment list
  const [attachmentsModal, setAttachmentsModal] = useState<{
    visible: boolean
    findingId: number | null
    findingLabel: string | null
    loading: boolean
    items: {fileName: string; viewUrl: string; downloadUrl: string}[]
  }>({
    visible: false,
    findingId: null,
    findingLabel: null,
    loading: false,
    items: [],
  })

  // -----------------------
  // Lookups: Company / Subcompany / Vessels
  // -----------------------
  useEffect(() => {
    const loadLookups = async () => {
      setLoadingLookups(true)
      try {
        const [groupsRaw, adminsRaw, vesselList] = await Promise.all([
          getCompanyAdminList?.().catch(() => []),
          getCompanyList?.().catch(() => []),
          getVesselList().catch(() => [] as Vessel[]),
        ])

        const groups: CompanyGroup[] = Array.isArray(groupsRaw)
          ? groupsRaw.map((g: any) => ({
              id: Number(g.id),
              name: g.name ?? g.companyGroupAdminName ?? `Group #${g.id}`,
            }))
          : []

        const admins: Subcompany[] = Array.isArray(adminsRaw)
          ? adminsRaw.map((a: any) => ({
              id: Number(a.id),
              name: a.name ?? a.companyAdminName ?? `Company #${a.id}`,
              companyId: Number(
                a.cgaid?.id ??
                  a.cga?.id ??
                  a.companyGroupAdminId ??
                  a.companyGroupId
              ),
            }))
          : []

        setCompanies(groups.filter(g => Number.isFinite(g.id)))
        setSubcompanies(admins.filter(a => Number.isFinite(a.id) && Number.isFinite(a.companyId)))

        // scope vessels by role
        let vesselsForUser: Vessel[] = []

        if (roleId === 4) {
          const vId = currentUser?.vessel?.id
          vesselsForUser = vId ? vesselList.filter((v: any) => v.id === vId) : []
        } else {
          const operatorActsLikeSuperadmin = isOperator && !currentUser?.companyGroupAdminId
          const operatorActsLikeGroupAdmin = isOperator && !!currentUser?.companyGroupAdminId

          vesselsForUser = vesselList.filter((v: any) => {
            const isActive = v?.active ?? true
            if (isSuperadmin || operatorActsLikeSuperadmin) return isActive
            if (roleId === 5 || operatorActsLikeGroupAdmin) {
              const cgaId = currentUser?.companyGroupAdminId ?? currentUser?.companyGroupAdmin?.id
              return isActive && (v?.companyGroupAdmin?.id === cgaId || v?.companyGroupId === cgaId)
            }
            if (roleId === 2) {
              const caId = currentUser?.companyAdminId ?? currentUser?.companyAdmin?.id
              return isActive && (v?.companyAdmin?.id === caId || v?.companyId === caId)
            }
            return false
          })
        }

        setVessels(vesselList)
        setVesselsScoped(vesselsForUser)

        // meta map for vesselName + tenant ids
        const meta: Record<number, {name: string; companyGroupAdminId?: number | null; companyAdminId?: number | null}> = {}
        for (const v of vesselList as any[]) {
          const id = Number(v.id)
          meta[id] = {
            name: v.fleet_name || v.name || `Vessel ${id}`,
            companyGroupAdminId: Number(
              v.companyGroupAdmin?.id ??
                v.companyGroupId ??
                v.cgaid?.id
            ) || null,
            companyAdminId: Number(
              v.companyAdmin?.id ??
                v.companyId
            ) || null,
          }
        }
        setVesselMetaMap(meta)
      } catch (e) {
        console.error('Failed to load lookups (findings)', e)
        setCompanies([])
        setSubcompanies([])
        setVessels([])
        setVesselsScoped([])
        setVesselMetaMap({})
      } finally {
        setLoadingLookups(false)
        setLookupsReady(true)
      }
    }

    loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, currentUser])

  // derived: vessels filtered by company / subcompany
  const vesselsForFilters = useMemo(() => {
    let list = vesselsScoped
    if (filters.companyId) {
      const cid = Number(filters.companyId)
      list = list.filter((v: any) =>
        Number(v.companyGroupAdmin?.id ?? v.companyGroupId) === cid
      )
    }
    if (filters.subcompanyId) {
      const scid = Number(filters.subcompanyId)
      list = list.filter((v: any) =>
        Number(v.companyAdmin?.id ?? v.companyId) === scid
      )
    }
    return list
  }, [vesselsScoped, filters.companyId, filters.subcompanyId])

  const subcompaniesForChosenCompany = useMemo(() => {
    if (!filters.companyId) return []
    const cid = Number(filters.companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [filters.companyId, subcompanies])

  const hasSubcompaniesForChosenCompany = subcompaniesForChosenCompany.length > 0

  // auto-select default company / vessel (once)
  useEffect(() => {
    if (!lookupsReady) return
    if (didAutoSelectVessel) return

    const firstVessel = vesselsForFilters[0]
    if (!firstVessel) return

    setFilters(prev => {
      if (prev.vesselId) return prev
      const v: any = firstVessel
      const companyGroupId =
        v.companyGroupAdmin?.id ??
        v.companyGroupId ??
        v.cgaid?.id ??
        null
      const companyAdminId =
        v.companyAdmin?.id ??
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupsReady, vesselsForFilters, didAutoSelectVessel])

  // -----------------------
  // Load Audit options for dropdown (finalized Audits)
  // -----------------------
  const loadAuditOptions = async () => {
    try {
      const res = await searchAudits({
        companyGroupId: filters.companyId
          ? Number(filters.companyId)
          : effectiveCompanyId,
        companyId: filters.subcompanyId ? Number(filters.subcompanyId) : undefined,
        vesselId: filters.vesselId ? Number(filters.vesselId) : undefined,
        isFinalized: true,
        activeOnly: true,
      })

      const list: AuditDto[] = Array.isArray(res?.content)
        ? res.content
        : (Array.isArray(res) ? res : [])

      const options = list.map((d: AuditDto) => {
        const vesselMeta = d.vesselId ? vesselMetaMap[d.vesselId] : undefined
        const vName = d.vesselName || vesselMeta?.name || '-'
        const labelParts = [
          vName,
          d.auditKindName || d.auditType || '',
          d.auditFromDate || d.auditToDate || '',
        ].filter(Boolean)

        return {
          id: d.id,
          label: labelParts.join(' — '),
        }
      })

      setAuditOptions(options)
    } catch (e) {
      console.error('Failed to load audit options', e)
      setAuditOptions([])
    }
  }

  useEffect(() => {
    if (!lookupsReady) return
    loadAuditOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    lookupsReady,
    filters.companyId,
    filters.subcompanyId,
    filters.vesselId,
    effectiveCompanyId,
  ])

  // -----------------------
  // Load findings
  // -----------------------
  const normalizeDate = (s?: string | null): string | null => {
    if (!s) return null
    return s.substring(0, 10)
  }

  /** we treat "finding date" in UI as the audit date now */
  const deriveAuditDate = (d: QHSEAuditFindingDto): string | null => {
    // Prefer AuditFromDate, fall back to AuditToDate
    const raw =
      (d as any).auditFromDate ||
      (d as any).auditToDate ||
      null

    if (!raw) return null
    return normalizeDate(String(raw))
  }

  const mapDtoToRecord = (d: QHSEAuditFindingDto): AuditFindingRecord => {
    const meta = d.vesselId ? vesselMetaMap[d.vesselId] : undefined

    const label = (d as any).findingLabel || d.findingName || ''

    const htmlDetails = d.description || d.findingName || ''
    const textDetails = stripHtml(htmlDetails)

    return {
      id: d.id,
      vesselName: d.vesselName || meta?.name || '-',
      auditName: d.auditKindName || d.auditType || '-',
      findingLabel: label,
      findingName: textDetails || label || '',
      critical: (d as any).critical ?? (d as any).isPositive ?? null,
      status: d.status,
      findingType: d.findingType ?? null,
      // this is now Audit DATE
      findingDate: deriveAuditDate(d),
      attachmentPath: d.attachmentPath || null,
      vesselId: d.vesselId ?? null,
      companyGroupAdminId:
        (d as any).companyGroupAdminId ?? meta?.companyGroupAdminId ?? null,
      companyAdminId:
        (d as any).companyAdminId ?? meta?.companyAdminId ?? null,
    }
  }

  const loadFindings = async () => {
    if (!lookupsReady) return
    setLoading(true)
    try {
      const params = {
        companyGroupId: filters.companyId ? Number(filters.companyId) : effectiveCompanyId,
        companyId: filters.subcompanyId ? Number(filters.subcompanyId) : undefined,
        vesselId: filters.vesselId ? Number(filters.vesselId) : undefined,
        status: filters.status === 'All' ? undefined : (filters.status as FindingStatus),
        findingType:
          filters.findingType === 'All'
            ? undefined
            : (filters.findingType as FindingType),
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        activeOnly: undefined,
      }

      const list = await searchAuditFindings(params)
      setRecords(list.map(mapDtoToRecord))
    } catch (e) {
      console.error('Failed to load audit findings', e)
      setRecords([])
      toast.error('Failed to load audit findings', {position: 'top-center'})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lookupsReady) return
    ;(async () => {
      setBootLoading(true)
      try {
        await loadFindings()
      } finally {
        setBootLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupsReady, effectiveCompanyId])

  useEffect(() => {
    if (!lookupsReady) return
    loadFindings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.companyId,
    filters.subcompanyId,
    filters.vesselId,
    filters.status,
    filters.findingType,
    filters.fromDate,
    filters.toDate,
  ])

  useEffect(() => {
    if (bootLoading || loading) {
      setNoDataDelayPassed(false)
      return
    }
    const t = setTimeout(() => setNoDataDelayPassed(true), 500)
    return () => clearTimeout(t)
  }, [bootLoading, loading])

  // -----------------------
  // Handlers
  // -----------------------
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const {name, value} = e.target
    setFilters(prev => {
      const next = {...prev, [name]: value}
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

  const handleClearFilters = () => {
    setFilters({
      companyId: '',
      subcompanyId: '',
      vesselId: '',
      status: 'All',
      findingType: 'All',
      fromDate: '',
      toDate: '',
    })
    setSearchTerm('')
  }

  const filteredData = useMemo(() => {
    return records.filter(r => {
      const matchesSearch =
        (r.vesselName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.auditName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.findingLabel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.findingName || '').toLowerCase().includes(searchTerm.toLowerCase())

      const byCompany =
        !filters.companyId ||
        Number(r.companyGroupAdminId) === Number(filters.companyId)

      const bySubcompany =
        !filters.subcompanyId ||
        Number(r.companyAdminId) === Number(filters.subcompanyId)

      const byVessel =
        !filters.vesselId ||
        Number(r.vesselId) === Number(filters.vesselId)

      const byStatus =
        filters.status === 'All' ||
        r.status === (filters.status as FindingStatus)

      const byFindingType =
        filters.findingType === 'All' ||
        !r.findingType ||
        r.findingType === (filters.findingType as FindingType)

      const byFromDate =
        !filters.fromDate ||
        (!r.findingDate || new Date(r.findingDate) >= new Date(filters.fromDate))

      const byToDate =
        !filters.toDate ||
        (!r.findingDate || new Date(r.findingDate) <= new Date(filters.toDate))

      return (
        matchesSearch &&
        byCompany &&
        bySubcompany &&
        byVessel &&
        byStatus &&
        byFindingType &&
        byFromDate &&
        byToDate
      )
    })
  }, [records, searchTerm, filters])

  const sortedData = useMemo(() => {
    const data = [...filteredData]
    if (!sortColumn) return data

    data.sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      if (sortColumn === 'findingDate') {
        const aTime = aVal ? new Date(String(aVal)).getTime() : 0
        const bTime = bVal ? new Date(String(bVal)).getTime() : 0
        const diff = aTime - bTime
        return sortOrder === 'asc' ? diff : -diff
      }

      const aStr = (aVal ?? '').toString().toLowerCase()
      const bStr = (bVal ?? '').toString().toLowerCase()
      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return data
  }, [filteredData, sortColumn, sortOrder])

  const showVesselColumn = !filters.vesselId
  const columnCount = showVesselColumn ? 11 : 10

  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page)
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setCurrentPage(1)
  }

  const handleSort = (col: keyof AuditFindingRecord) => {
    setSortColumn(col)
    setSortOrder(prev =>
      sortColumn === col && prev === 'asc' ? 'desc' : 'asc'
    )
  }

  // -----------------------
  // Modals: view / edit / add
  // -----------------------
  const openView = async (id: number) => {
    try {
      const dto = await getAuditFinding(id)
      setViewing(dto)
      setViewOpen(true)
    } catch (e) {
      console.error('Failed to get finding', e)
    }
  }

  const openEdit = async (id: number) => {
    try {
      const dto = await getAuditFinding(id)
      setEditing(dto)
      setEditOpen(true)
    } catch (e) {
      console.error('Failed to get finding', e)
    }
  }

  const openAttachmentsModal = async (rec: AuditFindingRecord | QHSEAuditFindingDto) => {
    const id = Number(rec.id)
    const label =
      (rec as any).findingLabel ||
      (rec as any).findingName ||
      `#${id}`

    setAttachmentsModal({
      visible: true,
      findingId: id,
      findingLabel: label,
      loading: true,
      items: [],
    })

    try {
      const list: AuditFindingAttachmentInfo[] = await listAuditFindingAttachments(id)
      const items = list.map(it => ({
        fileName: it.fileName,
        viewUrl: AuditFindingAttachmentFileViewUrl(id, it.fileName),
        downloadUrl: AuditFindingAttachmentFileDownloadUrl(id, it.fileName),
      }))

      setAttachmentsModal(prev => ({
        ...prev,
        loading: false,
        items,
      }))
    } catch (e) {
      console.error('Failed to load finding attachments', e)
      toast.error('Failed to load attachments', {position: 'top-center'})
      setAttachmentsModal(prev => ({...prev, loading: false}))
    }
  }

  const handleAddFinding = async (form: AuditFindingSubmitShape) => {
    const payload: Partial<QHSEAuditFindingDto> & {
      auditId: number
      findingName: string
      status: FindingStatus
    } = {
      auditId: Number(form.auditId),
      findingName: form.findingName,
      description: form.description,
      // no findingDate – date comes from audit itself
      isPositive:
        form.critical === 'YES' ? true :
        form.critical === 'NO' ? false : undefined,
      remarks: form.remarks || undefined,
      status: form.status as FindingStatus,
      findingType: form.findingType as any,
      active: true,
    }

    try {
      const created = await createAuditFinding(payload)
      const id = Number(created.id)
      if (id && form.attachmentFiles && form.attachmentFiles.length > 0) {
        await uploadAuditFindingAttachments(id, form.attachmentFiles)
      }
      toast.success('Audit finding created successfully', {position: 'top-center'})
      setAddOpen(false)
      await loadFindings()
    } catch (e: any) {
      console.error('Create audit finding failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to create finding',
        {position: 'top-center'}
      )
    }
  }

  const handleUpdateFinding = async (form: AuditFindingSubmitShape) => {
    if (!editing?.id) return

    const partial: Partial<QHSEAuditFindingDto> = {
      auditId: Number(form.auditId),
      findingName: form.findingName,
      description: form.description,
      // no findingDate – audit date is already tied to the audit
      isPositive:
        form.critical === 'YES' ? true :
        form.critical === 'NO' ? false : undefined,
      remarks: form.remarks || undefined,
      status: form.status as FindingStatus,
      findingType: form.findingType as any,
    }

    try {
      const updated = await updateAuditFinding(editing.id, partial)
      const id = Number(updated.id)
      if (id && form.attachmentFiles && form.attachmentFiles.length > 0) {
        await uploadAuditFindingAttachments(id, form.attachmentFiles)
      }

      toast.success('Audit finding updated successfully', {position: 'top-center'})
      setEditOpen(false)
      setEditing(null)
      await loadFindings()
    } catch (e: any) {
      console.error('Update audit finding failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to update finding',
        {position: 'top-center'}
      )
    }
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            {/* Header */}
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Audit Findings</h3>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setAddOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add New Finding
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className='card-body py-4 bg-white border-top'>
              <div className='row gx-3 gy-3 mb-4'>
                {/* Company */}
                {roleId !== 4 && (
                  <div className='col-md-2'>
                    <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
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
                      <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
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
                    <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
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
                          {(v as any).fleet_name || v.name || `Vessel ${v.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    Status
                  </label>
                  <select
                    className='form-select'
                    name='status'
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value='All'>All</option>
                    <option value='SATISFACTORY'>Satisfactory</option>
                    <option value='NON_CRITICAL'>Non-critical</option>
                    <option value='CRITICAL'>Critical</option>
                    <option value='OBSERVATION'>Observation</option>
                    <option value='OPPORTUNITY_FOR_IMPROVEMENT'>Opportunity for improvement</option>
                  </select>
                </div>

                {/* Finding Type */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    Finding Type
                  </label>
                  <select
                    className='form-select'
                    name='findingType'
                    value={filters.findingType}
                    onChange={handleFilterChange}
                  >
                    <option value='All'>All</option>
                    <option value='NON_CONFORMITY_REPORT'>Non conformity report</option>
                    <option value='OBSERVATION_NOTE'>Observation note</option>
                    <option value='FAILURE_NOTE'>Failure note</option>
                    <option value='DEVIATION_NOTE'>Deviation note</option>
                  </select>
                </div>

                {/* Search */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    Search
                  </label>
                  <input
                    type='text'
                    className='form-control'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder='Vessel / audit / finding'
                  />
                </div>

                {/* Clear */}
                <div className='col-md-2 d-flex align-items-end'>
                  <button
                    type='button'
                    className='btn btn-light'
                    onClick={handleClearFilters}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className='row gx-3 gy-3 mb-4'>
                {/* From Date */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    From Date
                  </label>
                  <input
                    type='date'
                    className='form-control'
                    name='fromDate'
                    value={filters.fromDate}
                    onChange={handleFilterChange}
                  />
                </div>

                {/* To Date */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    To Date
                  </label>
                  <input
                    type='date'
                    className='form-control'
                    name='toDate'
                    value={filters.toDate}
                    onChange={handleFilterChange}
                  />
                </div>
              </div>

              {/* Table */}
              <div className='report-table table-responsive' style={{position: 'relative'}}>
                {loading && <div style={tableOverlayStyle}>{spinner}</div>}
                <div style={{overflowX: 'auto'}}>
                  <table className='table table-bordered align-middle'>
                    <thead className='table-header text-start'>
                      <tr>
                        {/* Sr/No */}
                        <th className='text-center text-nowrap' style={{minWidth: '70px'}}>
                          Sr/No
                        </th>

                        {/* Vessel */}
                        {showVesselColumn && (
                          <th style={{minWidth: '180px'}}>
                            <div className='d-flex align-items-center text-nowrap'>
                              <span className='me-1'>Vessel</span>
                              <button
                                type='button'
                                className='btn btn-link p-0 m-0 pb-1'
                                onClick={() => handleSort('vesselName')}
                                disabled={records.length === 0}
                              >
                                <KTSVG
                                  path={`/media/map/sort-col-${
                                    sortColumn === 'vesselName'
                                      ? sortOrder === 'asc'
                                        ? 'up-black'
                                        : 'down-black'
                                      : 'grey'
                                  }.svg`}
                                  className='svg-icon-3'
                                />
                              </button>
                            </div>
                          </th>
                        )}

                        {/* Audit */}
                        <th style={{minWidth: '200px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Audit</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('auditName')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'auditName'
                                    ? sortOrder === 'asc'
                                      ? 'up-black'
                                      : 'down-black'
                                    : 'grey'
                                }.svg`}
                                className='svg-icon-3'
                              />
                            </button>
                          </div>
                        </th>

                        {/* Finding Label */}
                        <th style={{minWidth: '180px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Finding Label</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('findingLabel')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'findingLabel'
                                    ? sortOrder === 'asc'
                                      ? 'up-black'
                                      : 'down-black'
                                    : 'grey'
                                }.svg`}
                                className='svg-icon-3'
                              />
                            </button>
                          </div>
                        </th>

                        {/* Finding Details */}
                        <th style={{minWidth: '260px'}}>Finding Details</th>

                        {/* Critical */}
                        <th style={{minWidth: '100px'}}>Critical</th>

                        {/* Status */}
                        <th style={{minWidth: '140px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Status</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('status')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'status'
                                    ? sortOrder === 'asc'
                                      ? 'up-black'
                                      : 'down-black'
                                    : 'grey'
                                }.svg`}
                                className='svg-icon-3'
                              />
                            </button>
                          </div>
                        </th>

                        {/* Finding Type */}
                        <th style={{minWidth: '160px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Finding Type</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('findingType')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'findingType'
                                    ? sortOrder === 'asc'
                                      ? 'up-black'
                                      : 'down-black'
                                    : 'grey'
                                }.svg`}
                                className='svg-icon-3'
                              />
                            </button>
                          </div>
                        </th>

                        {/* Audit Date */}
                        <th style={{minWidth: '140px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Audit Date</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('findingDate')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'findingDate'
                                    ? sortOrder === 'asc'
                                      ? 'up-black'
                                      : 'down-black'
                                    : 'grey'
                                }.svg`}
                                className='svg-icon-3'
                              />
                            </button>
                          </div>
                        </th>

                        {/* Attachment */}
                        <th style={{minWidth: '130px'}}>Attachment</th>

                        {/* Actions */}
                        <th style={{minWidth: '130px', textAlign: 'center'}}>Actions</th>
                      </tr>
                    </thead>

                    <tbody className='table-body text-start'>
                      {(bootLoading || loading) ? (
                        // skeleton
                        Array.from({length: 8}).map((_, i) => (
                          <tr key={`skeleton-${i}`}>
                            {Array.from({length: columnCount}).map((__, c) => (
                              <td key={`s-${i}-${c}`} className='py-3'>
                                <div className='placeholder-wave'>
                                  <div className='placeholder w-100' style={{height: 14, borderRadius: 4}} />
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (currentRecords.length === 0 && noDataDelayPassed) ? (
                        <tr>
                          <td colSpan={columnCount} className='text-center py-5 text-muted'>
                            No audit findings found for the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((r, idx) => (
                          <tr key={r.id}>
                            {/* Sr/No */}
                            <td className='text-center'>
                              {indexOfFirstRecord + idx + 1}
                            </td>

                            {/* Vessel */}
                            {showVesselColumn && (
                              <td className='fw-bold text-nowrap'>
                                {r.vesselName || '-'}
                              </td>
                            )}

                            {/* Audit */}
                            <td className='text-nowrap'>
                              {r.auditName || '-'}
                            </td>

                            {/* Finding Label */}
                            <td className='text-nowrap'>
                              {r.findingLabel || '-'}
                            </td>

                            {/* Finding Details */}
                            <td>
                              <span
                                title={r.findingName || '-'}
                                style={{
                                  maxWidth: '260px',
                                  display: 'inline-block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  verticalAlign: 'middle',
                                }}
                              >
                                {r.findingName || '-'}
                              </span>
                            </td>

                            {/* Critical */}
                            <td className='text-center'>
                              {r.critical === true ? 'Yes' : r.critical === false ? 'No' : '-'}
                            </td>

                            {/* Status */}
                            <td className='text-nowrap'>
                              {r.status ? (
                                <span className={`badge ${statusBadgeClass(r.status)}`}>
                                  {niceEnum(r.status)}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>

                            {/* Finding Type */}
                            <td className='text-nowrap'>
                              {r.findingType ? niceEnum(r.findingType) : '-'}
                            </td>

                            {/* Audit Date */}
                            <td className='text-nowrap'>
                              {r.findingDate || '-'}
                            </td>

                            {/* Attachment */}
                            <td className='text-center'>
                              {r.attachmentPath ? (
                                <button
                                  type='button'
                                  className='btn btn-light-primary btn-sm d-inline-flex align-items-center text-nowrap'
                                  onClick={() => openAttachmentsModal(r)}
                                >
                                  <KTSVG
                                    path='/media/icons/duotune/files/fil003.svg'
                                    className='svg-icon-3 me-1'
                                  />
                                  View Files
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{textAlign: 'left'}} className='text-nowrap'>
                              <div className='d-flex justify-content-left gap-1'>
                                {/* View */}
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='View'
                                  onClick={() => openView(r.id)}
                                >
                                  <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3 text-primary' />
                                </button>

                                {/* Edit */}
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='Edit'
                                  onClick={() => openEdit(r.id)}
                                >
                                  <KTSVG path='/media/map/edit-active.svg' className='svg-icon-3' />
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
                  className='pagination-wrapper d-flex justify-content-between align-items-center py-3 border-top'
                  style={{
                    position: 'static',
                    bottom: 0,
                    backgroundColor: '#fff',
                    zIndex: 10,
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
                        {((currentPage - 1) * rowsPerPage) + 1}-
                        {Math.min(currentPage * rowsPerPage, sortedData.length)}
                      </strong>{' '}
                      of <strong>{sortedData.length}</strong>
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
                                    backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent',
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

                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
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
          </div>
        </div>
      </div>



      {/* Add Finding */}
      <AddAuditFindingModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddFinding}
        audits={auditOptions}
      />

      {/* View Finding */}
      <ViewAuditFindingModal
        visible={viewOpen}
        onClose={() => {
          setViewOpen(false)
          setViewing(null)
        }}
        record={viewing}
        onOpenAttachments={rec => openAttachmentsModal(rec)}
      />

      {/* Edit Finding */}
      <EditAuditFindingModal
        visible={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditing(null)
        }}
        record={editing}
        audits={auditOptions}
        onSubmit={handleUpdateFinding}
      />

      {/* Shared File Viewer */}
      <FileViewerModal
        visible={fileModal.visible}
        onClose={() => setFileModal(prev => ({...prev, visible: false}))}
        title={fileModal.title}
        fileName={fileModal.fileName}
        viewUrl={fileModal.viewUrl}
        downloadUrl={fileModal.downloadUrl}
      />

      <AuditFindingAttachmentsModal
        visible={attachmentsModal.visible}
        findingLabel={attachmentsModal.findingLabel}
        loading={attachmentsModal.loading}
        items={attachmentsModal.items}
        onClose={() =>
          setAttachmentsModal(prev => ({...prev, visible: false}))
        }
        onViewFile={item => {
          setFileModal({
            visible: true,
            title: 'Finding Attachment',
            fileName: item.fileName,
            viewUrl: item.viewUrl,
            downloadUrl: item.downloadUrl,
          })
        }}
      />

    </div>
  )
}

export default AuditFindingIndex
