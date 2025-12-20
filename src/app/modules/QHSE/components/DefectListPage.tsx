import React, {FC, useEffect, useMemo, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {useAuth} from '../../auth'
import {getCompanyAdminList, getCompanyList, getVesselList} from '../../Management/core/_requests'
import {toast} from 'react-toastify'
import html2pdf from 'html2pdf.js'

import type {Vessel} from '../../Management/core/_models'
import type {
  QHSEDefectDto,
  DefectRecord,
  DefectCategory,
} from '../core/_models'

import {
  searchDefects,
  mapDefectToRow,
  createDefect,
  getDefect,
  updateDefect,
  uploadDefectAttachment,
  uploadDefectClosureEvidence,
  defectAttachmentViewUrl,
  defectAttachmentDownloadUrl,
  defectClosureViewUrl,
  defectClosureDownloadUrl,
  submitDefect,
  closeDefect,
  defectAttachmentFileViewUrl,
  defectAttachmentFileDownloadUrl,
  listDefectAttachments,
  type DefectAttachmentInfo,
} from '../core/_requests'

import {FileViewerModal} from '../components/FileViewerModal'

import AddDefectModal, {DefectSubmitShape} from './AddDefectModal'
import {ViewDefectModal} from './ViewDefectModal'
import {EditDefectModal} from './EditDefectModal'
import DefectSubmitModal from './DefectSubmitModal'
import DefectClosureModal from './DefectClosureModal'
import DefectAttachmentsModal from './DefectAttachmentsModal'


// narrow types for filters
type CompanyGroup = {id: number; name: string}
type Subcompany = {id: number; name: string; companyId: number}

const niceEnum = (s?: string | null) =>
  s ? s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '-'

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

const statusBadgeClass = (status?: string | null, isCrew?: boolean) => {
  if (!status) return 'badge-light'

  switch (status) {
    case 'SAVE':
      // Saved → light secondary
      return 'badge-light-secondary'
    case 'SUBMIT':
      // Submitted:
      //  - crew: light danger
      //  - non-crew (Ready for Review): light warning / orange
      return isCrew ? 'badge-light-danger' : 'badge-light-warning'
    case 'CLOSE':
    case 'CLOSED':
      // Closed → light green
      return 'badge-light-success'
    case 'CANCELLED':
    case 'CANCEL':
      return 'badge-light-danger'
    default:
      return 'badge-light'
  }
}

const DefectListPage: FC = () => {
  // --- auth / role ---
    const {currentUser, auth} = useAuth()

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
  const isCompanyScoped = !isTopLevel

  const effectiveCompanyId = isTopLevel
    ? undefined
    : (myCgaId ?? undefined)

  // --- filters ---
 type LinkFilter = 'ALL' | 'INSPECTION' | 'AUDIT'

const [filters, setFilters] = useState<{
  companyId: string
  subcompanyId: string
  vesselId: string
  category: string
  dacCode: string
  fromDate: string
  toDate: string
  activeStatus: string
  linkType: LinkFilter
}>({
  companyId: '',
  subcompanyId: '',
  vesselId: '',
  category: '',
  dacCode: '',
  fromDate: '',
  toDate: '',
  activeStatus: 'All', // All / Show Active / Show Inactive (maps to activeOnly)
  linkType: 'ALL',
})
  const [searchTerm, setSearchTerm] = useState('')

  // --- lookups ---
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])
  const [loadingLookups, setLoadingLookups] = useState(false)
  const [lookupsReady, setLookupsReady] = useState(false)

  // --- maps (id->meta) ---
  const [vesselMetaMap, setVesselMetaMap] = useState<
    Record<number, {name: string; companyGroupAdminId?: number | null; companyAdminId?: number | null}>
  >({})

  // --- data ---
  const [records, setRecords] = useState<DefectRecord[]>([])
  const [loading, setLoading] = useState(false)

  // boot-time + “no data” delay (for skeleton + empty state)
  const [bootLoading, setBootLoading] = useState(true)
  const [noDataDelayPassed, setNoDataDelayPassed] = useState(false)

  // --- pagination / sorting ---
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

    // ensure we only auto-select default vessel once
  const [didAutoSelectVessel, setDidAutoSelectVessel] = useState(false)

  // Column-wise sorting (same pattern as Crew Assignment)
const [sortColumn, setSortColumn] = useState<keyof DefectRecord | ''>('dateDefect')
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')   // latest first

  // --- modals ---
  const [addOpen, setAddOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewing, setViewing] = useState<QHSEDefectDto | null>(null)
  const [editing, setEditing] = useState<QHSEDefectDto | null>(null)

    // Shared file viewer modal (for list + view/edit screens)
  const [fileModal, setFileModal] = useState<{
    visible: boolean
    title: string
    fileName?: string
    viewUrl?: string
    downloadUrl?: string
  }>({
    visible: false,
    title: '',
    fileName: undefined,
    viewUrl: undefined,
    downloadUrl: undefined,
  })

    const [attachmentsModal, setAttachmentsModal] = useState<{
  visible: boolean
  defectNumber: string | null
  loading: boolean
  items: { fileName: string; viewUrl: string; downloadUrl: string }[]
}>({
  visible: false,
  defectNumber: null,
  loading: false,
  items: [],
})

    // Submit confirmation modal
  const [submitId, setSubmitId] = useState<number | null>(null)

  // Closure modal (for closure evidence + closure remark)
  const [closingDefect, setClosingDefect] = useState<DefectRecord | null>(null)


  const openAttachmentFromRow = (rec: DefectRecord) => {
    setFileModal({
      visible: true,
      title: 'Defect Attachment',
      fileName: rec.attachmentPath || 'attachment',
      viewUrl: defectAttachmentViewUrl(rec.id),
      downloadUrl: defectAttachmentDownloadUrl(rec.id),
    })
  }

  const openClosureFromRow = (rec: DefectRecord) => {
    setFileModal({
      visible: true,
      title: 'Closure Evidence',
      fileName: rec.closureEvidencePath || 'closure-evidence',
      viewUrl: defectClosureViewUrl(rec.id),
      downloadUrl: defectClosureDownloadUrl(rec.id),
    })
  }

    const openAttachmentsModal = async (defectId: number, defectNumber?: string | null) => {
  // Ensure file viewer is closed when opening the list
  setFileModal(prev => ({
    ...prev,
    visible: false,
    fileName: undefined,
    viewUrl: undefined,
    downloadUrl: undefined,
  }))

  const label = defectNumber ? String(defectNumber) : String(defectId)

  setAttachmentsModal({
    visible: true,
    defectNumber: label,
    loading: true,
    items: [],
  })

  try {
    const list = await listDefectAttachments(defectId)
    const items = list.map((it: DefectAttachmentInfo) => ({
      fileName: it.fileName,
      viewUrl: defectAttachmentFileViewUrl(defectId, it.fileName),
      downloadUrl: defectAttachmentFileDownloadUrl(defectId, it.fileName),
    }))

    setAttachmentsModal({
      visible: true,
      defectNumber: label,
      loading: false,
      items,
    })
  } catch (e) {
    console.error('Failed to load defect attachments', e)
    toast.error('Failed to load attachments', {position: 'top-center'})
    setAttachmentsModal(prev => ({...prev, loading: false}))
  }
}


    const renderStatusLabel = (r: DefectRecord): string => {
    if (!r.status) return '-'

    if (r.status === 'SAVE') return 'Saved'

    if (r.status === 'SUBMIT') {
      // Crew: "Submitted"
      // Others: "Ready for Review"
      return isCrew ? 'Submitted' : 'Ready for Review'
    }

    if (r.status === 'CLOSE') {
      if (r.closureResult === 'TO_BE_REVIEWED_NEXT_INSPECTION') {
        return 'Closed and TBR'
      }
      return 'Closed Satisfactorily'
    }

    return r.statusLabel || '-'
  }


  // -----------------------
  // Load lookups (Company, Subcompany, Vessel) - similar to InspectionIndex
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

        // Scope vessels by role like other pages
        let vesselsForUser: Vessel[] = []

        if (roleId === 4) {
          // crew: only own vessel
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

        // build meta map used when mapping DTO -> row
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
        console.error('Failed to load defect lookups', e)
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

  // Derived: vessels filtered by Company / Subcompany filters
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

      // Auto-select default company / subcompany / vessel (only once)
  useEffect(() => {
    if (!lookupsReady) return
    if (didAutoSelectVessel) return

    const firstVessel = vesselsForFilters[0]
    if (!firstVessel) return

    setFilters(prev => {
      // if vessel already set between render and effect, don't override
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


  const hasSubcompaniesForChosenCompany = subcompaniesForChosenCompany.length > 0

  // -----------------------
  // Load defects
  // -----------------------
  const loadDefects = async () => {
    if (!lookupsReady) return
    setLoading(true)
    try {
      const params = {
        companyGroupId: filters.companyId
          ? Number(filters.companyId)
          : effectiveCompanyId,
        companyId: filters.subcompanyId ? Number(filters.subcompanyId) : undefined,
        vesselId: filters.vesselId ? Number(filters.vesselId) : undefined,
        category: filters.category ? (filters.category as DefectCategory) : undefined,
        dacCode: filters.dacCode ? Number(filters.dacCode) : undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
        activeOnly: filters.activeStatus === 'Show Active'
          ? true
          : (filters.activeStatus === 'Show Inactive'
              ? false
              : undefined),
      }

      const list = await searchDefects(params)
      const mapped: DefectRecord[] = list.map(d => {
        const meta = vesselMetaMap[d.vesselId] || {}
        return mapDefectToRow(
          {
            ...d,
            vesselName: d.vesselName || meta.name || '-',
          },
          {
            companyGroupAdminId: meta.companyGroupAdminId ?? null,
            companyAdminId: meta.companyAdminId ?? null,
          }
        )
      })
      setRecords(mapped)
        } catch (e) {
      console.error('Failed to load defects', e)
      setRecords([])
      toast.error('Failed to load defects', {position: 'top-center'})
    } finally {
      setLoading(false)
    }
  }

    useEffect(() => {
    if (!lookupsReady) return
    ;(async () => {
      setBootLoading(true)
      try {
        await loadDefects()
      } finally {
        setBootLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupsReady, effectiveCompanyId])

  // Reload when filters change significantly
  useEffect(() => {
    if (!lookupsReady) return
    loadDefects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.companyId,
    filters.subcompanyId,
    filters.vesselId,
    filters.category,
    filters.dacCode,
    filters.fromDate,
    filters.toDate,
    filters.activeStatus,
  ])

    useEffect(() => {
    if (bootLoading || loading) {
      setNoDataDelayPassed(false)
      return
    }
    const t = setTimeout(() => setNoDataDelayPassed(true), 500) // small UX delay
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
    category: '',
    dacCode: '',
    fromDate: '',
    toDate: '',
    activeStatus: 'All',
    linkType: 'ALL',
  })
}

    const handleExportPdf = () => {
    try {
      if (!sortedData.length) {
        toast.warning('No defects to export for the selected filters', {
          position: 'top-center',
        })
        return
      }

      const now = new Date()
      const headerText = 'Defects & Observations List'
      const subHeaderText = `Exported on ${now.toLocaleDateString()}`

      const headers: string[] = [
        'Sr/No',
        'Defect No.',
      ]

      if (showVesselColumn) {
        headers.push('Vessel')
      }

      headers.push(
        'Description',
        'Category',
        'Audit / Inspection', 
        'DAC Code',
        'Date Observed',
        'Date Defect Raised On',
        'Department',
        'Status',
      )

      let html = `
        <div style="font-family: Arial, sans-serif; font-size: 9px; width: 100%;">
          <h3 style="text-align:center; margin: 0 0 4px 0;">${headerText}</h3>
          <div style="text-align:center; margin-bottom: 8px;">${subHeaderText}</div>
          <table style="border-collapse: collapse; width: 100%; table-layout: fixed;">
            <thead>
              <tr>
                ${headers
                  .map(
                    (h) =>
                      `<th style="border: 1px solid #999; padding: 4px; word-wrap: break-word; background:#f5f5f5;">${h}</th>`
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
      `

      sortedData.forEach((r, index) => {
        const cells: string[] = []

        // Sr/No
        cells.push(String(index + 1))

        // Defect No
        cells.push(r.defectNumber || '-')

        // Vessel (only when header is present)
        if (showVesselColumn) {
          cells.push(r.vesselName || '-')
        }

        // Description (truncate long text to avoid overflow)
        const desc =
          r.description && r.description.length > 300
            ? r.description.slice(0, 297) + '…'
            : r.description || '-'
        cells.push(desc)

        // Category
        cells.push(r.categoryLabel || '-')

// Audit / Inspection
      const linkText =
        r.linkedType === 'INSPECTION' && r.linkedLabel
          ? `Inspection – ${r.linkedLabel}`
          : r.linkedType === 'AUDIT' && r.linkedLabel
          ? `Audit – ${r.linkedLabel}`
          : '-'
      cells.push(linkText)

        // DAC Code
        cells.push(r.dacCode != null ? String(r.dacCode) : '-')

        // Dates
        cells.push(r.dateObserved || '-')
        cells.push(r.dateDefect || '-')

        // Department
        cells.push(r.departmentLabel || '-')

        // Status (use same label as table)
        cells.push(renderStatusLabel(r))

        html += `
          <tr>
            ${cells
              .map(
                (c) =>
                  `<td style="border: 1px solid #999; padding: 4px; vertical-align: top; word-wrap: break-word;">${c}</td>`
              )
              .join('')}
          </tr>
        `
      })

      html += `
            </tbody>
          </table>
        </div>
      `

      const element = document.createElement('div')
      element.innerHTML = html

      const opt = {
        margin: [10, 10, 10, 10],
        filename: 'defects-list.pdf',
        image: {type: 'jpeg', quality: 0.98},
        html2canvas: {scale: 2, useCORS: true},
        jsPDF: {unit: 'pt', format: 'a4', orientation: 'landscape'},
      }

      // @ts-ignore – html2pdf typings
      html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.error('Export PDF failed', err)
      toast.error('Failed to export PDF', {position: 'top-center'})
    }
  }

   const handleSort = (column: keyof DefectRecord) => {
    setSortColumn(prevCol => {
      if (prevCol === column) {
        // same column → just toggle direction
        setSortOrder(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
        return prevCol
      }
      // new column → start with ascending
      setSortOrder('asc')
      return column
    })
  }


  const filteredData = useMemo(() => {
  return records.filter(r => {
    const matchesSearch =
      (r.vesselName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(searchTerm.toLowerCase())

    const byCompany =
      !filters.companyId ||
      Number(r.companyGroupAdminId) === Number(filters.companyId)

    const bySubcompany =
      !filters.subcompanyId ||
      Number(r.companyAdminId) === Number(filters.subcompanyId)

    const byVessel =
      !filters.vesselId ||
      Number(r.vesselId) === Number(filters.vesselId)

    const byCategory =
      !filters.category ||
      r.category === (filters.category as DefectCategory)

    const byDac =
      !filters.dacCode ||
      r.dacCode === Number(filters.dacCode)

    const byDateFrom =
      !filters.fromDate ||
      (!r.dateDefect || new Date(r.dateDefect) >= new Date(filters.fromDate))

    const byDateTo =
      !filters.toDate ||
      (!r.dateDefect || new Date(r.dateDefect) <= new Date(filters.toDate))

    // --- NEW: filter by linked type (inspection / audit) ---
    const byLinkType =
      filters.linkType === 'ALL' ||
      (filters.linkType === 'INSPECTION' && r.linkedType === 'INSPECTION') ||
      (filters.linkType === 'AUDIT' && r.linkedType === 'AUDIT')

    return (
      matchesSearch &&
      byCompany &&
      bySubcompany &&
      byVessel &&
      byCategory &&
      byDac &&
      byDateFrom &&
      byDateTo &&
      byLinkType
    )
  })
}, [records, searchTerm, filters])

    const sortedData = useMemo(() => {
    const data = [...filteredData]
    if (!sortColumn) return data // no column chosen → keep API order

    data.sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]

      // Date columns
      if (sortColumn === 'dateObserved' || sortColumn === 'dateDefect') {
        const aTime = aVal ? new Date(String(aVal)).getTime() : 0
        const bTime = bVal ? new Date(String(bVal)).getTime() : 0
        const diff = aTime - bTime
        return sortOrder === 'asc' ? diff : -diff
      }

      // Numeric columns
      if (sortColumn === 'dacCode') {
        const aNum = typeof aVal === 'number' ? aVal : Number(aVal ?? 0)
        const bNum = typeof bVal === 'number' ? bVal : Number(bVal ?? 0)
        const diff = aNum - bNum
        return sortOrder === 'asc' ? diff : -diff
      }

      // Fallback: string compare
      const aStr = (aVal ?? '').toString().toLowerCase()
      const bStr = (bVal ?? '').toString().toLowerCase()

      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return data
  }, [filteredData, sortColumn, sortOrder])

    // Show Vessel column only when "All Vessels" is selected in filter
  const showVesselColumn = !filters.vesselId

  // Update this if you later add/remove columns below
  const columnCount = showVesselColumn ? 15 : 14

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

  // -----------------------
  // Modals: View / Edit / Add
  // -----------------------
  const openView = async (id: number) => {
    try {
      const dto = await getDefect(id)
      // fill vesselName from meta if missing
      const meta = vesselMetaMap[dto.vesselId] || {}
      setViewing({
        ...dto,
        vesselName: dto.vesselName || meta.name || '-',
      })
      setViewOpen(true)
    } catch (e) {
      console.error('Failed to load defect', e)
    }
  }

  const openEdit = async (id: number) => {
    try {
      const dto = await getDefect(id)
      const meta = vesselMetaMap[dto.vesselId] || {}
      setEditing({
        ...dto,
        vesselName: dto.vesselName || meta.name || '-',
      })
      setEditOpen(true)
    } catch (e) {
      console.error('Failed to load defect', e)
    }
  }

      const handleSubmitDefectRow = async (id: number) => {
    try {
      await submitDefect(id)
      toast.success('Defect submitted successfully', {position: 'top-center'})
      await loadDefects()
    } catch (e: any) {
      console.error('Submit defect failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to submit defect',
        {position: 'top-center'}
      )
    }
  }

     const handleSaveReview = async (
    rec: DefectRecord,
    file: File | null,
    closureRemark: string
  ) => {
    try {
      if (file) {
        await uploadDefectClosureEvidence(rec.id, file)
      }

      if (closureRemark && closureRemark.trim().length > 0) {
        await updateDefect(rec.id, { closureRemark } as Partial<QHSEDefectDto>)
      }

      toast.success('Review saved successfully', { position: 'top-center' })
      await loadDefects()
    } catch (e: any) {
      console.error('Save review failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to save review',
        { position: 'top-center' }
      )
    }
  }

  const handleCloseWithResult = async (
    rec: DefectRecord,
    file: File | null,
    closureRemark: string,
    result: 'SATISFACTORY' | 'TO_BE_REVIEWED_NEXT_INSPECTION'
  ) => {
    try {
      if (file) {
        await uploadDefectClosureEvidence(rec.id, file)
      }

      if (closureRemark && closureRemark.trim().length > 0) {
        await updateDefect(rec.id, { closureRemark } as Partial<QHSEDefectDto>)
      }

      await closeDefect(rec.id, result)

      toast.success('Defect closed successfully', { position: 'top-center' })
      await loadDefects()
    } catch (e: any) {
      console.error('Close defect failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to close defect',
        { position: 'top-center' }
      )
    }
  }

const handleAddDefect = async (form: DefectSubmitShape) => {
  // ✅ NEW: validate linkType / linkId same way as modal
  if (!form.vesselId) {
    toast.error('Vessel is required', { position: 'top-center' })
    return
  }

  if (!form.linkType) {
    toast.error('Select "Inspection", "Audit" or "None (general)" in Linked To.', {
      position: 'top-center',
    })
    return
  }

  if ((form.linkType === 'INSPECTION' || form.linkType === 'AUDIT') && !form.linkId) {
    toast.error('Please choose one Inspection / Audit for the selected vessel.', {
      position: 'top-center',
    })
    return
  }

  const payload: Omit<
    QHSEDefectDto,
    'id' | 'createdAt' | 'updatedAt' | 'vesselName' | 'displayTitle' | 'defectNumber' | 'status'
  > = {
    vesselId: Number(form.vesselId),
    category: form.category as DefectCategory,
    tpiSubCategory:
      form.category === 'THIRD_PARTY_INSPECTION' && form.tpiSubCategory
        ? (form.tpiSubCategory as any)
        : undefined,
    dacCode: Number(form.dacCode),
    dacActionName: form.dacActionName || undefined,
    smsCode: form.dacCode === '99' && form.smsCode ? (form.smsCode as any) : undefined,
    description: form.description || undefined,
    dateObserved: form.dateObserved || undefined,
    dateDefect: form.dateDefect || undefined,
    applicableRequisitionNumber: form.applicableRequisitionNumber || undefined,
    department: form.department ? (form.department as any) : undefined,
    correctiveAction: form.correctiveAction || undefined,
    preventiveAction: form.preventiveAction || undefined,
    attachmentPath: undefined,
    closureEvidencePath: undefined,
    remarks: form.remarks || undefined,
    active: true,
  }

  // ✅ Only send inspectionId / auditId when linked; for None(general) send neither
  const linkIdNum = Number(form.linkId)
  if (form.linkType === 'INSPECTION') {
    ;(payload as any).inspectionId = linkIdNum
  } else if (form.linkType === 'AUDIT') {
    ;(payload as any).auditId = linkIdNum
  }

  try {
    const created = await createDefect(payload)

    const defectId = Number(created.id)
    if (defectId && form.attachmentFiles && form.attachmentFiles.length > 0) {
      await uploadDefectAttachment(defectId, form.attachmentFiles)
    }

    toast.success('Defect created successfully', {position: 'top-center'})
    setAddOpen(false)
    await loadDefects()
  } catch (e: any) {
    console.error('Create defect failed', e)
    toast.error(e?.response?.data?.message || 'Failed to create defect', {
      position: 'top-center',
    })
  }
}

      const handleUpdateDefect = async (form: DefectSubmitShape) => {
    if (!editing?.id) return

    const partial: Partial<QHSEDefectDto> = {
      vesselId: Number(form.vesselId),
      category: form.category as DefectCategory,
      tpiSubCategory:
        form.category === 'THIRD_PARTY_INSPECTION' && form.tpiSubCategory
          ? (form.tpiSubCategory as any)
          : null,
      dacCode: Number(form.dacCode),
      dacActionName: form.dacActionName || undefined,
      smsCode: form.dacCode === '99' && form.smsCode
        ? (form.smsCode as any)
        : null,
      description: form.description || undefined,
      dateObserved: form.dateObserved || undefined,
      dateDefect: form.dateDefect || undefined,
      applicableRequisitionNumber: form.applicableRequisitionNumber || undefined,
      department: form.department ? (form.department as any) : null,
      correctiveAction: form.correctiveAction || undefined,
      preventiveAction: form.preventiveAction || undefined,
      remarks: form.remarks || undefined,
    }

    try {
      const updated = await updateDefect(editing.id, partial)

            const defectId = Number(updated.id)
      if (defectId && form.attachmentFiles && form.attachmentFiles.length > 0) {
        await uploadDefectAttachment(defectId, form.attachmentFiles)
      }

      toast.success('Defect updated successfully', {position: 'top-center'})
      setEditOpen(false)
      setEditing(null)
      await loadDefects()
    } catch (e: any) {
      console.error('Update defect failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to update defect',
        {position: 'top-center'}
      )
    }
  }


  const getCategoryOptions = () => [
    {value: '', label: 'All Categories'},
    {value: 'THIRD_PARTY_INSPECTION', label: 'Third party inspection'},
    {value: 'SHIP_OBSERVATION', label: 'Ship observation'},
    {value: 'OFFICE_INSPECTION', label: 'Office inspection'},
  ]

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            {/* Header */}
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Defects & Observations List</h3>
                {/* <span className='text-muted fs-7'>
                  Manage QHSE defects raised from inspections, ship observations & office inspections.
                </span> */}
              </div>
                            <div className='card-toolbar d-flex gap-2'>
                <button
                  type='button'
                  className='btn btn-sm btn-light-primary me-2 btn-outline'
                  onClick={handleExportPdf}
                >
                  <KTSVG
                    path='/media/icons/duotune/files/fil003.svg'
                    className='svg-icon-3 me-1'
                  />
                  Export PDF
                </button>

                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setAddOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add New Defect
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className='card-body py-4 bg-white border-top'>
              <div className='row gx-3 gy-3 mb-4'>
                                {/* Company (CGA) */}
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
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className='form-control' style={{background:'#f8f9fa'}}>
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
                          <option key={sc.id} value={String(sc.id)}>{sc.name}</option>
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

                {/* Category */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    Category
                  </label>
                  <select
                    className='form-select'
                    name='category'
                    value={filters.category}
                    onChange={handleFilterChange}
                  >
                    {getCategoryOptions().map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Linked To: Inspection / Audit */}
<div className='col-md-2'>
  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
    Linked To
  </label>
  <select
    className='form-select'
    name='linkType'
    value={filters.linkType}
    onChange={handleFilterChange}
  >
    <option value='ALL'>All (Audit & Inspection)</option>
    <option value='INSPECTION'>Inspection only</option>
    <option value='AUDIT'>Audit only</option>
  </select>
</div>


                {/* DAC Code */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    DAC Code
                  </label>
                  <input
                    type='number'
                    className='form-control'
                    name='dacCode'
                    value={filters.dacCode}
                    onChange={handleFilterChange}
                    placeholder='e.g. 10, 15, 99'
                  />
                </div>

                {/* Search text */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    Search
                  </label>
                  <input
                    type='text'
                    className='form-control'
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder='Vessel / description'
                  />
                </div>

                <div className='col-md-2 d-flex align-items-end'>
                  <button
                    type='button'
                    className='btn btn-light me-2'
                    onClick={handleClearFilters}
                  >
                    Clear All
                  </button>
                  {/* {loading || loadingLookups ? (
                    <span className='text-muted'>Loading...</span>
                  ) : null} */}
                </div>
              </div>

              <div className='row gx-3 gy-3 mb-4'>
                {/* Date From */}
                {/* <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color:'#A1A5B7'}}>
                    From Date
                  </label>
                  <input
                    type='date'
                    className='form-control'
                    name='fromDate'
                    value={filters.fromDate}
                    onChange={handleFilterChange}
                  />
                </div> */}
                {/* Date To */}
                {/* <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color:'#A1A5B7'}}>
                    To Date
                  </label>
                  <input
                    type='date'
                    className='form-control'
                    name='toDate'
                    value={filters.toDate}
                    onChange={handleFilterChange}
                  />
                </div> */}

                {/* Active status */}
                {/* <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color:'#A1A5B7'}}>
                    Active Status
                  </label>
                  <select
                    className='form-select'
                    name='activeStatus'
                    value={filters.activeStatus}
                    onChange={handleFilterChange}
                  >
                    <option value='All'>All</option>
                    <option value='Show Active'>Show Active</option>
                    <option value='Show Inactive'>Show Inactive</option>
                  </select>
                </div> */}

                {/* <div className='col-md-3 d-flex align-items-end'>
                  <button
                    type='button'
                    className='btn btn-light me-2'
                    onClick={handleClearFilters}
                  >
                    Clear All
                  </button>
                  {loading || loadingLookups ? (
                    <span className='text-muted'>Loading...</span>
                  ) : null}
                </div> */}
              </div>

                            {/* Table */}
              <div className='report-table table-responsive' style={{position: 'relative'}}>
                {loading && <div style={tableOverlayStyle}>{spinner}</div>}
                <div style={{overflowX: 'auto'}}>
                  <table className='table table-bordered align-middle'>
                  <thead className='table-header text-start'>
  <tr>
    {/* Sr/No (not sortable) */}
    <th className='text-center text-nowrap' style={{minWidth: '70px'}}>
      Sr/No
    </th>

    {/* Defect Number */}
    <th style={{minWidth: '140px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>Defect No.</span>
        <button
          type='button'
          className='btn btn-link p-0 m-0 pb-1'
          onClick={() => handleSort('defectNumber')}
          disabled={records.length === 0}
        >
          <KTSVG
            path={`/media/map/sort-col-${
              sortColumn === 'defectNumber'
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

    {/* Vessel – only when All Vessels selected */}
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

    {/* Description */}
    <th style={{minWidth: '260px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>Description</span>
        <button
          type='button'
          className='btn btn-link p-0 m-0 pb-1'
          onClick={() => handleSort('description')}
          disabled={records.length === 0}
        >
          <KTSVG
            path={`/media/map/sort-col-${
              sortColumn === 'description'
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

    {/* Category */}
    <th style={{minWidth: '160px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>Category</span>
        <button
          type='button'
          className='btn btn-link p-0 m-0 pb-1'
          onClick={() => handleSort('categoryLabel')}
          disabled={records.length === 0}
        >
          <KTSVG
            path={`/media/map/sort-col-${
              sortColumn === 'categoryLabel'
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

        {/* Audit / Inspection */}
    <th style={{minWidth: '220px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>Audit / Inspection</span>
        {/* If you later want sorting, you can add a sort icon/button here */}
      </div>
    </th>


    {/* DAC Code */}
    <th style={{minWidth: '120px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>DAC Code</span>
        <button
          type='button'
          className='btn btn-link p-0 m-0 pb-1'
          onClick={() => handleSort('dacCode')}
          disabled={records.length === 0}
        >
          <KTSVG
            path={`/media/map/sort-col-${
              sortColumn === 'dacCode'
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

    {/* Date Observed */}
    <th style={{minWidth: '140px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>Date Observed</span>
        <button
          type='button'
          className='btn btn-link p-0 m-0 pb-1'
          onClick={() => handleSort('dateObserved')}
          disabled={records.length === 0}
        >
          <KTSVG
            path={`/media/map/sort-col-${
              sortColumn === 'dateObserved'
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

    {/* Date Defect Raised On */}
    <th style={{minWidth: '160px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>Date Defect Raised On</span>
        <button
          type='button'
          className='btn btn-link p-0 m-0 pb-1'
          onClick={() => handleSort('dateDefect')}
          disabled={records.length === 0}
        >
          <KTSVG
            path={`/media/map/sort-col-${
              sortColumn === 'dateDefect'
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

    {/* Department */}
    <th style={{minWidth: '180px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>Department</span>
        <button
          type='button'
          className='btn btn-link p-0 m-0 pb-1'
          onClick={() => handleSort('departmentLabel')}
          disabled={records.length === 0}
        >
          <KTSVG
            path={`/media/map/sort-col-${
              sortColumn === 'departmentLabel'
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

    {/* Status */}
    <th style={{minWidth: '120px'}}>
      <div className='d-flex align-items-center text-nowrap'>
        <span className='me-1'>Status</span>
        <button
          type='button'
          className='btn btn-link p-0 m-0 pb-1'
          onClick={() => handleSort('statusLabel')}
          disabled={records.length === 0}
        >
          <KTSVG
            path={`/media/map/sort-col-${
              sortColumn === 'statusLabel'
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
    <th style={{minWidth: '120px'}}>
      Attachment
    </th>

    {/* Closure Evidence */}
    <th style={{minWidth: '160px'}}>
      Closure Evidence
    </th>

    {/* Actions */}
    <th style={{minWidth: '150px', textAlign: 'center'}}>
      Actions
    </th>
  </tr>
</thead>

                   <tbody className='table-body text-start'>
  {(bootLoading || loading) ? (
    // Skeleton
    Array.from({length: 8}).map((_, i) => (
      <tr key={`skeleton-${i}`}>
        {Array.from({length: columnCount}).map((__, c) => (
          <td key={`s-${i}-${c}`} className='py-3'>
            <div className='placeholder-wave'>
              <div
                className='placeholder w-100'
                style={{height: 14, borderRadius: 4}}
              />
            </div>
          </td>
        ))}
      </tr>
    ))
  ) : (currentRecords.length === 0 && noDataDelayPassed) ? (
    <tr>
      <td colSpan={columnCount} className='text-center py-5 text-muted'>
        No defects found for the selected criteria.
      </td>
    </tr>
    ) : (
    currentRecords.map((r, idx) => {
      // ----- Prefix-based rules -----
      const defectNo = r.defectNumber || ''
      const isVType = defectNo.startsWith('V-')   // Vessel/Master defects
      const isOType = defectNo.startsWith('O-')   // Office defects

      const isSaveLike = !r.status || r.status === 'SAVE'

      // V-...  → only crew can Edit/Submit while in SAVE
      // O-...  → only non-crew can Edit/Submit while in SAVE
      // others → keep old behaviour (anyone with access can Edit/Submit)
      const canEditOrSubmit =
        isSaveLike &&
        (
          (isVType && isCrew) ||
          (isOType && !isCrew) ||
          (!isVType && !isOType) // fallback for legacy / no-prefix numbers
        )

      return (
        <tr key={r.id}>
          {/* Sr/No */}
          <td className='text-center'>
            {indexOfFirstRecord + idx + 1}
          </td>

          {/* Defect Number */}
          <td className='text-nowrap'>
            {r.defectNumber || '-'}
          </td>

          {/* Vessel – only when All Vessels selected */}
          {showVesselColumn && (
            <td className='fw-bold text-nowrap'>
              {r.vesselName}
            </td>
          )}

          {/* Description (single line with tooltip) */}
<td>
  <span
    title={r.description || '-'}
    style={{
      maxWidth: '260px',
      display: 'inline-block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      verticalAlign: 'middle',
    }}
  >
    {r.description || '-'}
  </span>
</td>

          {/* Category */}
<td className='text-nowrap'>
  {r.categoryLabel}
</td>

{/* Audit / Inspection */}
<td className='text-nowrap'>
  {r.linkedType === 'INSPECTION' && r.linkedLabel
    ? <>Inspection – <span className='fw-semibold'>{r.linkedLabel}</span></>
    : r.linkedType === 'AUDIT' && r.linkedLabel
    ? <>Audit – <span className='fw-semibold'>{r.linkedLabel}</span></>
    : <span className='text-muted'>-</span>}
</td>

{/* DAC Code */}
<td className='text-center'>
  {r.dacCode}
</td>

          {/* Date Observed */}
          <td className='text-nowrap'>
            {r.dateObserved || '-'}
          </td>

          {/* Date Defect Raised On */}
          <td className='text-nowrap'>
            {r.dateDefect || '-'}
          </td>

          {/* Department */}
          <td className='text-nowrap'>
            {r.departmentLabel || '-'}
          </td>

          {/* Status */}
          <td className='text-nowrap'>
            {r.status ? (
              <span className={`badge ${statusBadgeClass(r.status, isCrew)}`}>
                {renderStatusLabel(r)}
              </span>
            ) : (
              '-'
            )}
          </td>

          {/* Attachment (multi-file) */}
          <td className='text-center'>
            {r.attachmentPath ? (
              <button
                type='button'
                className='btn btn-light-primary btn-sm d-inline-flex align-items-center text-nowrap'
                onClick={() => openAttachmentsModal(r.id, r.defectNumber || null)}
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

          {/* Closure Evidence */}
          <td className='text-center'>
            {r.closureEvidencePath ? (
              <button
                type='button'
                className='btn btn-light-success btn-sm d-inline-flex align-items-center'
                onClick={() => openClosureFromRow(r)}
              >
                <KTSVG
                  path='/media/icons/duotune/files/fil003.svg'
                  className='svg-icon-3 me-1'
                />
                View
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

              {/* Edit – restricted by prefix & role */}
              {canEditOrSubmit && (
                <button
                  className='btn btn-icon btn-sm'
                  title='Edit'
                  onClick={() => openEdit(r.id)}
                >
                  <KTSVG path='/media/map/edit-active.svg' className='svg-icon-3' />
                </button>
              )}

              {/* Submit – restricted by prefix & role */}
              {canEditOrSubmit && (
                <button
                  type='button'
                  className='btn btn-light-primary btn-sm'
                  title='Submit Defect'
                  onClick={() => setSubmitId(r.id)}
                >
                  Submit Defect
                </button>
              )}

              {/* Close / Review in SUBMIT */}
              {r.status === 'SUBMIT' && (
  <button
    type='button'
    className={`btn btn-sm ${
      isCrew ? 'btn-light-warning' : 'btn-light-primary'
    }`}
    title='Review / Close Defect'
    onClick={() => setClosingDefect(r)}
  >
    Review / Close
  </button>
)}
            </div>
          </td>
        </tr>
      )
    })
  )}
</tbody>
                </table>
                </div>

                                {/* Pagination (same pattern as InspectionIndex) */}
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

      {/* Submit confirmation modal */}
      <DefectSubmitModal
        visible={submitId !== null}
        onCancel={() => setSubmitId(null)}
        onConfirm={async () => {
          if (submitId == null) return
          await handleSubmitDefectRow(submitId)
          setSubmitId(null)
        }}
      />

            {/* Defect closure modal */}
      <DefectClosureModal
        visible={!!closingDefect}
        defect={closingDefect}
        isCrew={isCrew}
        onCancel={() => setClosingDefect(null)}
        onSaveOnly={async (file, remark) => {
          if (!closingDefect) return
          await handleSaveReview(closingDefect, file, remark)
          setClosingDefect(null)
        }}
        onCloseWithResult={async (file, remark, result) => {
          if (!closingDefect) return
          await handleCloseWithResult(closingDefect, file, remark, result)
          setClosingDefect(null)
        }}
      />


      {/* Add Defect Modal */}
      <AddDefectModal
  visible={addOpen}
  onClose={() => setAddOpen(false)}
  onSubmit={handleAddDefect}
  vessels={vesselsScoped}
  companies={companies}
  subcompanies={subcompanies}
  showCompanyFilters={roleId !== 4}
  isCrew={isCrew}
  defaultVesselId={vesselsScoped[0]?.id}
/>


      {/* View modal */}
      <ViewDefectModal
  visible={viewOpen}
  onClose={() => { setViewOpen(false); setViewing(null) }}
  record={viewing}
  onOpenAttachments={(rec) => {
    if (!rec?.id) return
    openAttachmentsModal(rec.id, rec.defectNumber ?? null)
  }}
/>

      {/* Edit modal */}
      <EditDefectModal
  visible={editOpen}
  onClose={() => { setEditOpen(false); setEditing(null) }}
  record={editing}
  onSubmit={handleUpdateDefect}
  vessels={vesselsScoped}
  companies={companies}
  subcompanies={subcompanies}
  showCompanyFilters={roleId !== 4}
  isCrew={isCrew}
  disableVesselChange={!isCrew}
  onOpenAttachments={(rec) => {
    if (!rec?.id) return
    openAttachmentsModal(rec.id, rec.defectNumber ?? null)
  }}
/>

       {/* Shared File Viewer Modal */}
      <FileViewerModal
        visible={fileModal.visible}
        onClose={() =>
          setFileModal(prev => ({...prev, visible: false}))
        }
        title={fileModal.title}
        fileName={fileModal.fileName}
        viewUrl={fileModal.viewUrl}
        downloadUrl={fileModal.downloadUrl}
      />

                {/* Multi-attachment viewer modal (separate component) */}
      <DefectAttachmentsModal
  visible={attachmentsModal.visible}
  defectNumber={attachmentsModal.defectNumber}
  loading={attachmentsModal.loading}
  items={attachmentsModal.items}
  onClose={() =>
    setAttachmentsModal(prev => ({ ...prev, visible: false }))
  }
  onViewFile={(item) => {
    // 1) Close attachments modal
    setAttachmentsModal(prev => ({ ...prev, visible: false }))

    // 2) Open File Viewer modal with selected file
    setFileModal({
      visible: true,
      title: 'Defect Attachment',
      fileName: item.fileName,
      viewUrl: item.viewUrl,
      downloadUrl: item.downloadUrl,
    })
  }}
/>


    </div>
  )
}

export default DefectListPage