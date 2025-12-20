import React, {FC, useEffect, useMemo, useState} from 'react'
import {KTSVG} from '../../../../_metronic/helpers'
import {useAuth} from '../../auth'
import {getCompanyAdminList, getCompanyList, getVesselList} from '../../Management/core/_requests'
import {toast} from 'react-toastify'
import html2pdf from 'html2pdf.js'

import type {Vessel} from '../../Management/core/_models'
import type {
  QHSENearMissReportDto,
  NearMissRecord,
  NearMissOccurrenceType,
  NearMissStatus,
} from '../core/_models'

import {
  searchNearMissReports,
  mapNearMissToRow,
  createNearMissReport,
  getNearMissReport,
  updateNearMissReport,
  uploadNearMissSupportingDocuments,
  nearMissSupportingViewUrl,
  nearMissSupportingDownloadUrl,
  nearMissSupportingFileViewUrl,
  nearMissSupportingFileDownloadUrl,
  listNearMissSupportingDocuments,
  type NearMissAttachmentInfo,
  submitNearMissReport,
  closeNearMissReport,
} from '../core/_requests'

import {FileViewerModal} from '../components/FileViewerModal'
import {AddNearMissModal, NearMissSubmitShape} from './AddNearMissModal'
import {ViewNearMissModal} from './ViewNearMissModal'
import {EditNearMissModal} from './EditNearMissModal'
import {NearMissClosureModal} from './NearMissClosureModal'
import NearMissAttachmentsModal from './NearMissAttachmentsModal'
import {NearMissSubmitModal} from './NearMissSubmitModal' 


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

const statusBadgeClass = (status?: string | null, isCrew?: boolean) => {
  if (!status) return 'badge-light'

  switch (status) {
    case 'SAVE':
      return 'badge-light-secondary'
    case 'SUBMIT':
      return isCrew ? 'badge-light-danger' : 'badge-light-warning'
    case 'CLOSE':
      return 'badge-light-success'
    default:
      return 'badge-light'
  }
}

const NearMissReports: FC = () => {
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

  const effectiveCompanyId = isTopLevel ? undefined : (myCgaId ?? undefined)

  // Filters
  const [filters, setFilters] = useState<{
    companyId: string
    subcompanyId: string
    vesselId: string
    occurrenceType: string
    status: string
    fromDate: string
    toDate: string
  }>({
    companyId: '',
    subcompanyId: '',
    vesselId: '',
    occurrenceType: '',
    status: '',
    fromDate: '',
    toDate: '',
  })

  const [searchTerm, setSearchTerm] = useState('')

  // Lookups
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])
  const [loadingLookups, setLoadingLookups] = useState(false)
  const [lookupsReady, setLookupsReady] = useState(false)

  const [vesselMetaMap, setVesselMetaMap] = useState<
    Record<number, {name: string; companyGroupAdminId?: number | null; companyAdminId?: number | null}>
  >({})

  // data
  const [records, setRecords] = useState<NearMissRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [noDataDelayPassed, setNoDataDelayPassed] = useState(false)

  // pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // sorting
  const [sortColumn, setSortColumn] = useState<keyof NearMissRecord | ''>('dateOfOccurrence')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const [didAutoSelectVessel, setDidAutoSelectVessel] = useState(false)

  // modals
  const [addOpen, setAddOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewing, setViewing] = useState<QHSENearMissReportDto | null>(null)
  const [editing, setEditing] = useState<QHSENearMissReportDto | null>(null)

  const [closingReport, setClosingReport] = useState<NearMissRecord | null>(null)
  const [submitId, setSubmitId] = useState<number | null>(null)
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

  const [attachmentsModal, setAttachmentsModal] = useState<{
    visible: boolean
    reportNumber: string | null
    loading: boolean
    items: {fileName: string; viewUrl: string; downloadUrl: string}[]
  }>({
    visible: false,
    reportNumber: null,
    loading: false,
    items: [],
  })

  const openSupportingListModal = async (id: number, reportNumber?: string | null) => {
    setFileModal(prev => ({...prev, visible: false}))
    const label = reportNumber ? String(reportNumber) : String(id)

    setAttachmentsModal({
      visible: true,
      reportNumber: label,
      loading: true,
      items: [],
    })

    try {
      const list = await listNearMissSupportingDocuments(id)
      const items = list.map((it: NearMissAttachmentInfo) => ({
        fileName: it.fileName,
        viewUrl: nearMissSupportingFileViewUrl(id, it.fileName),
        downloadUrl: nearMissSupportingFileDownloadUrl(id, it.fileName),
      }))
      setAttachmentsModal({
        visible: true,
        reportNumber: label,
        loading: false,
        items,
      })
    } catch (e) {
      console.error('Failed to load near miss attachments', e)
      toast.error('Failed to load attachments', {position: 'top-center'})
      setAttachmentsModal(prev => ({...prev, loading: false}))
    }
  }

  const renderStatusLabel = (r: NearMissRecord): string => {
    if (!r.status) return '-'
    if (r.status === 'SAVE') return 'Saved'
    if (r.status === 'SUBMIT') {
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

  // ==========================
  // Lookups
  // ==========================

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
        console.error('Failed to load near miss lookups', e)
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

  // Auto-select default vessel
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

  // ==========================
  // Load near miss reports
  // ==========================

  const loadNearMissReports = async () => {
    if (!lookupsReady) return
    setLoading(true)
    try {
      const params = {
        companyGroupId: filters.companyId
          ? Number(filters.companyId)
          : effectiveCompanyId,
        companyId: filters.subcompanyId ? Number(filters.subcompanyId) : undefined,
        vesselId: filters.vesselId ? Number(filters.vesselId) : undefined,
        occurrenceType: filters.occurrenceType
          ? (filters.occurrenceType as NearMissOccurrenceType)
          : undefined,
        status: filters.status
          ? (filters.status as NearMissStatus)
          : undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      }

      const list = await searchNearMissReports(params)
      const mapped: NearMissRecord[] = list.map(d => {
        const meta = vesselMetaMap[d.vesselId] || {}
        return mapNearMissToRow(
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
      console.error('Failed to load near miss reports', e)
      setRecords([])
      toast.error('Failed to load near miss reports', {position: 'top-center'})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!lookupsReady) return
    ;(async () => {
      setBootLoading(true)
      try {
        await loadNearMissReports()
      } finally {
        setBootLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupsReady, effectiveCompanyId])

  useEffect(() => {
    if (!lookupsReady) return
    loadNearMissReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.companyId,
    filters.subcompanyId,
    filters.vesselId,
    filters.occurrenceType,
    filters.status,
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

  // ==========================
  // Handlers
  // ==========================

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
      occurrenceType: '',
      status: '',
      fromDate: '',
      toDate: '',
    })
    setSearchTerm('')
  }

  const handleSort = (column: keyof NearMissRecord) => {
    setSortColumn(prev => {
      if (prev === column) {
        setSortOrder(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortOrder('asc')
      return column
    })
  }

  const filteredData = useMemo(() => {
    return records.filter(r => {
      const matchesSearch =
        (r.vesselName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.locationPosition || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.descriptionOfOccurrence || '').toLowerCase().includes(searchTerm.toLowerCase())

      const byCompany =
        !filters.companyId ||
        Number(r.companyGroupAdminId) === Number(filters.companyId)

      const bySubcompany =
        !filters.subcompanyId ||
        Number(r.companyAdminId) === Number(filters.subcompanyId)

      const byVessel =
        !filters.vesselId ||
        Number(r.vesselId) === Number(filters.vesselId)

      const byOccurrence =
        !filters.occurrenceType ||
        r.occurrenceTypes.includes(filters.occurrenceType as NearMissOccurrenceType)

      const byStatus =
        !filters.status ||
        r.status === (filters.status as NearMissStatus)

      const byFromDate =
        !filters.fromDate ||
        (!r.dateOfOccurrence || new Date(r.dateOfOccurrence) >= new Date(filters.fromDate))

      const byToDate =
        !filters.toDate ||
        (!r.dateOfOccurrence || new Date(r.dateOfOccurrence) <= new Date(filters.toDate))

      return (
        matchesSearch &&
        byCompany &&
        bySubcompany &&
        byVessel &&
        byOccurrence &&
        byStatus &&
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

      if (
        sortColumn === 'dateOfOccurrence' ||
        sortColumn === 'dateReported' ||
        sortColumn === 'dateIssued'
      ) {
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

  const handleExportPdf = () => {
    try {
      if (!sortedData.length) {
        toast.warning('No near miss reports to export for the selected filters', {
          position: 'top-center',
        })
        return
      }

      const now = new Date()
      const headerText = 'Near Miss Reports'
      const subHeaderText = `Exported on ${now.toLocaleDateString()}`

      const headers: string[] = [
        'Sr/No',
        'Report No.',
      ]

      if (showVesselColumn) {
        headers.push('Vessel')
      }

      headers.push(
  'Occurrence Types',
  'Date of Occurrence',
  'Date of Report',
  'Location',
  'Reported By',
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

        cells.push(String(index + 1))
        cells.push(r.reportNumber || '-')

        if (showVesselColumn) {
          cells.push(r.vesselName || '-')
        }

        cells.push(r.occurrenceTypesLabel || '-')
cells.push(r.dateOfOccurrence || '-')
cells.push(r.dateReported || '-')  // new column for report date
cells.push(r.locationPosition || '-')
cells.push(r.reportedBy || '-')
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
        filename: 'near-miss-reports.pdf',
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

  // -----------------------
  // Modals: View / Edit / Add
  // -----------------------

  const openView = async (id: number) => {
    try {
      const dto = await getNearMissReport(id)
      const meta = vesselMetaMap[dto.vesselId] || {}
      setViewing({
        ...dto,
        vesselName: dto.vesselName || meta.name || '-',
      })
      setViewOpen(true)
    } catch (e) {
      console.error('Failed to load near miss report', e)
    }
  }

  const openEdit = async (id: number) => {
    try {
      const dto = await getNearMissReport(id)
      const meta = vesselMetaMap[dto.vesselId] || {}
      setEditing({
        ...dto,
        vesselName: dto.vesselName || meta.name || '-',
      })
      setEditOpen(true)
    } catch (e) {
      console.error('Failed to load near miss report', e)
    }
  }

  const handleSubmitNearMissRow = async (id: number) => {
    try {
      await submitNearMissReport(id)
      toast.success('Near miss report submitted successfully', {position: 'top-center'})
      await loadNearMissReports()
    } catch (e: any) {
      console.error('Submit near miss failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to submit near miss report',
        {position: 'top-center'}
      )
    }
  }

  const handleAddNearMiss = async (form: NearMissSubmitShape) => {
    if (!form.vesselId) {
      toast.error('Please select a vessel', {position: 'top-center'})
      return
    }
    if (!form.occurrenceTypes || form.occurrenceTypes.length === 0) {
      toast.error('Please select at least one occurrence type', {position: 'top-center'})
      return
    }

    const payload: Omit<
      QHSENearMissReportDto,
      'id' | 'createdAt' | 'updatedAt' | 'vesselName' | 'reportNumber' | 'status'
    > = {
      vesselId: Number(form.vesselId),
      locationPosition: form.locationPosition || undefined,
      reportIssuedBy: form.reportIssuedBy || undefined,
      dateIssued: form.dateIssued || undefined,

      dateOfOccurrence: form.dateOfOccurrence || undefined,
      timeOfOccurrence: form.timeOfOccurrence || undefined,

      reportedBy: form.reportedBy || undefined,
      reportedTo: form.reportedTo || undefined,
      dateReported: form.dateReported || undefined,
      timeReported: form.timeReported || undefined,

      occurrenceTypes: form.occurrenceTypes,

      personalInjuryFormCompleted: form.personalInjuryFormCompleted,
      anyStatementsAttached: form.anyStatementsAttached,

      locationOfOccurrence: form.locationOfOccurrence || [],

      descriptionOfOccurrence: form.descriptionOfOccurrence || undefined,

      substandardActs: form.substandardActs || [],
      substandardConditions: form.substandardConditions || [],

      personsInjured: form.personsInjured || undefined,
      personsInvolved: form.personsInvolved || undefined,
      personsWitness: form.personsWitness || undefined,
      typeOfInjury: form.typeOfInjury || undefined,

      immediateBasicCause: form.immediateBasicCause || undefined,
      rootCause: form.rootCause || undefined,
      correctiveActionsProposed: form.correctiveActionsProposed || undefined,
      preventativeActionsProposed: form.preventativeActionsProposed || undefined,

      objectiveEvidence: form.objectiveEvidence || undefined,
      supportingDocsPrimaryPath: undefined,

      dpaConclusionsAndRecommendations: form.dpaConclusionsAndRecommendations || undefined,

      active: true,
      closureResult: null,
    }

    try {
      const created = await createNearMissReport(payload)

      const reportId = Number(created.id)
      if (reportId && form.supportingFiles && form.supportingFiles.length > 0) {
        await uploadNearMissSupportingDocuments(reportId, form.supportingFiles)
      }

      toast.success('Near miss report created successfully', {position: 'top-center'})
      setAddOpen(false)
      await loadNearMissReports()
    } catch (e: any) {
      console.error('Create near miss failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to create near miss report',
        {position: 'top-center'}
      )
    }
  }

  const handleUpdateNearMiss = async (form: NearMissSubmitShape) => {
    if (!editing?.id) return

    const partial: Partial<QHSENearMissReportDto> = {
// NOTE: vesselId is intentionally NOT updated.
    // Once a Near Miss is created, its vessel cannot be changed.
    // vesselId: Number(form.vesselId),
      locationPosition: form.locationPosition || undefined,
      reportIssuedBy: form.reportIssuedBy || undefined,
      dateIssued: form.dateIssued || undefined,

      dateOfOccurrence: form.dateOfOccurrence || undefined,
      timeOfOccurrence: form.timeOfOccurrence || undefined,

      reportedBy: form.reportedBy || undefined,
      reportedTo: form.reportedTo || undefined,
      dateReported: form.dateReported || undefined,
      timeReported: form.timeReported || undefined,

      occurrenceTypes: form.occurrenceTypes,
      personalInjuryFormCompleted: form.personalInjuryFormCompleted,
      anyStatementsAttached: form.anyStatementsAttached,
      locationOfOccurrence: form.locationOfOccurrence || [],

      descriptionOfOccurrence: form.descriptionOfOccurrence || undefined,

      substandardActs: form.substandardActs || [],
      substandardConditions: form.substandardConditions || [],

      personsInjured: form.personsInjured || undefined,
      personsInvolved: form.personsInvolved || undefined,
      personsWitness: form.personsWitness || undefined,
      typeOfInjury: form.typeOfInjury || undefined,

      immediateBasicCause: form.immediateBasicCause || undefined,
      rootCause: form.rootCause || undefined,
      correctiveActionsProposed: form.correctiveActionsProposed || undefined,
      preventativeActionsProposed: form.preventativeActionsProposed || undefined,

      objectiveEvidence: form.objectiveEvidence || undefined,
      dpaConclusionsAndRecommendations: form.dpaConclusionsAndRecommendations || undefined,
    }

    try {
      const updated = await updateNearMissReport(editing.id, partial)

      const reportId = Number(updated.id)
      if (reportId && form.supportingFiles && form.supportingFiles.length > 0) {
        await uploadNearMissSupportingDocuments(reportId, form.supportingFiles)
      }

      toast.success('Near miss report updated successfully', {position: 'top-center'})
      setEditOpen(false)
      setEditing(null)
      await loadNearMissReports()
    } catch (e: any) {
      console.error('Update near miss failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to update near miss report',
        {position: 'top-center'}
      )
    }
  }

  const handleSaveReview = async (
    rec: NearMissRecord,
    files: File[] | null,
    dpaConclusions: string,
    objectiveEvidence: string
  ) => {
    try {
      if (files && files.length > 0) {
        await uploadNearMissSupportingDocuments(rec.id, files)
      }

      if ((dpaConclusions && dpaConclusions.trim()) || (objectiveEvidence && objectiveEvidence.trim())) {
        await updateNearMissReport(rec.id, {
          dpaConclusionsAndRecommendations: dpaConclusions || undefined,
          objectiveEvidence: objectiveEvidence || undefined,
        } as Partial<QHSENearMissReportDto>)
      }

      toast.success('Review saved successfully', {position: 'top-center'})
      await loadNearMissReports()
    } catch (e: any) {
      console.error('Save review failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to save review',
        {position: 'top-center'}
      )
    }
  }

  const handleCloseWithResult = async (
    rec: NearMissRecord,
    files: File[] | null,
    dpaConclusions: string,
    objectiveEvidence: string,
    result: 'SATISFACTORY' | 'TO_BE_REVIEWED_NEXT_INSPECTION'
  ) => {
    try {
      if (files && files.length > 0) {
        await uploadNearMissSupportingDocuments(rec.id, files)
      }

      if ((dpaConclusions && dpaConclusions.trim()) || (objectiveEvidence && objectiveEvidence.trim())) {
        await updateNearMissReport(rec.id, {
          dpaConclusionsAndRecommendations: dpaConclusions || undefined,
          objectiveEvidence: objectiveEvidence || undefined,
        } as Partial<QHSENearMissReportDto>)
      }

      await closeNearMissReport(rec.id, result)

      toast.success('Near miss report closed successfully', {position: 'top-center'})
      setClosingReport(null)
      await loadNearMissReports()
    } catch (e: any) {
      console.error('Close near miss failed', e)
      toast.error(
        e?.response?.data?.message || 'Failed to close near miss report',
        {position: 'top-center'}
      )
    }
  }

  const getOccurrenceOptions = () => [
    {value: '', label: 'All Occurrence Types'},
    {value: 'ACCIDENT', label: 'Accident'},
    {value: 'INCIDENT', label: 'Incident'},
    {value: 'NEAR_MISS', label: 'Near miss'},
    {value: 'HIGH_SEVERITY_NEAR_MISS', label: 'High severity near miss'},
  ]

  const getStatusOptions = () => [
    {value: '', label: 'All Status'},
    {value: 'SAVE', label: 'Saved'},
    {value: 'SUBMIT', label: 'Submitted / Ready for Review'},
    {value: 'CLOSE', label: 'Closed'},
  ]

  // -----------------------
  // Render
  // -----------------------

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            {/* Header */}
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Near Miss Reports</h3>
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
                  Add New Near Miss
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

                {/* Occurrence Type */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color: '#A1A5B7'}}>
                    Occurrence Type
                  </label>
                  <select
                    className='form-select'
                    name='occurrenceType'
                    value={filters.occurrenceType}
                    onChange={handleFilterChange}
                  >
                    {getOccurrenceOptions().map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

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
                    {getStatusOptions().map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
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
                    placeholder='Vessel / location / description'
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
                  {loadingLookups && (
                    <span className='text-muted small'>Loading lookups...</span>
                  )}
                </div>
              </div>

              <div className='row gx-3 gy-3 mb-4'>
                {/* Date From */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color:'#A1A5B7'}}>
                    From Date (Occurrence)
                  </label>
                  <input
                    type='date'
                    className='form-control'
                    name='fromDate'
                    value={filters.fromDate}
                    onChange={handleFilterChange}
                  />
                </div>
                {/* Date To */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{color:'#A1A5B7'}}>
                    To Date (Occurrence)
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

                        {/* Report No */}
                        <th style={{minWidth: '140px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Report No.</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('reportNumber')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'reportNumber'
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

                        {/* Occurrence Types */}
                        <th style={{minWidth: '220px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Occurrence Types</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('occurrenceTypesLabel')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'occurrenceTypesLabel'
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

                        {/* Date of Occurrence */}
                        <th style={{minWidth: '160px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Date of Occurrence</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('dateOfOccurrence')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'dateOfOccurrence'
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

                        {/* Date of Report */}
<th style={{minWidth: '160px'}}>
  <div className='d-flex align-items-center text-nowrap'>
    <span className='me-1'>Date of Report</span>
    <button
      type='button'
      className='btn btn-link p-0 m-0 pb-1'
      onClick={() => handleSort('dateReported')}
      disabled={records.length === 0}
    >
      <KTSVG
        path={`/media/map/sort-col-${
          sortColumn === 'dateReported'
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


                        {/* Location */}
                        <th style={{minWidth: '200px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Location</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('locationPosition')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'locationPosition'
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

                        {/* Reported By */}
                        <th style={{minWidth: '160px'}}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Reported By</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('reportedBy')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'reportedBy'
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

                        {/* Attachments */}
                        <th style={{minWidth: '140px'}}>
                          Supporting Docs
                        </th>

                        {/* Actions */}
                        <th style={{minWidth: '160px', textAlign: 'center'}}>
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className='table-body text-start'>
                      {(bootLoading || loading) ? (
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
                            No near miss reports found for the selected criteria.
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((r, idx) => {
                          const reportNo = r.reportNumber || ''
                          const isVType = reportNo.startsWith('V-')
                          const isOType = reportNo.startsWith('O-')

                          const isSaveLike = !r.status || r.status === 'SAVE'

                          const canEditOrSubmit =
                            isSaveLike &&
                            (
                              (isVType && isCrew) ||
                              (isOType && !isCrew) ||
                              (!isVType && !isOType)
                            )

                          return (
                            <tr key={r.id}>
                              {/* Sr/No */}
                              <td className='text-center'>
                                {indexOfFirstRecord + idx + 1}
                              </td>

                              {/* Report No */}
                              <td className='text-nowrap'>
                                {r.reportNumber || '-'}
                              </td>

                              {/* Vessel */}
                              {showVesselColumn && (
                                <td className='fw-bold text-nowrap'>
                                  {r.vesselName}
                                </td>
                              )}

                              {/* Occurrence Types */}
                              <td>
                                <span
                                  title={r.occurrenceTypesLabel || '-'}
                                  style={{
                                    maxWidth: '220px',
                                    display: 'inline-block',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    verticalAlign: 'middle',
                                  }}
                                >
                                  {r.occurrenceTypesLabel || '-'}
                                </span>
                              </td>

                              {/* Date of Occurrence */}
                              <td className='text-nowrap'>
                                {r.dateOfOccurrence || '-'}
                                {r.timeOfOccurrence && (
                                  <span className='text-muted ms-1'>
                                    {r.timeOfOccurrence}
                                  </span>
                                )}
                              </td>

                              {/* Date of Report */}
<td className='text-nowrap'>
  {r.dateReported || '-'}
  {r.timeReported && (
    <span className='text-muted ms-1'>
      {r.timeReported}
    </span>
  )}
</td>

                              {/* Location */}
                              <td>
                                <span
                                  title={r.locationPosition || '-'}
                                  style={{
                                    maxWidth: '200px',
                                    display: 'inline-block',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    verticalAlign: 'middle',
                                  }}
                                >
                                  {r.locationPosition || '-'}
                                </span>
                              </td>

                              {/* Reported By */}
                              <td className='text-nowrap'>
                                {r.reportedBy || '-'}
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

                              {/* Supporting Docs */}
                              <td className='text-center'>
                                {r.supportingDocsPrimaryPath ? (
                                  <button
                                    type='button'
                                    className='btn btn-light-primary btn-sm d-inline-flex align-items-center text-nowrap'
                                    onClick={() => openSupportingListModal(r.id, r.reportNumber || null)}
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
                                  {canEditOrSubmit && (
                                    <button
                                      className='btn btn-icon btn-sm'
                                      title='Edit'
                                      onClick={() => openEdit(r.id)}
                                    >
                                      <KTSVG path='/media/map/edit-active.svg' className='svg-icon-3' />
                                    </button>
                                  )}

                                  {/* Submit */}
                                  {canEditOrSubmit && (
  <button
    type='button'
    className='btn btn-light-primary btn-sm'
    title='Submit Report'
    onClick={() => setSubmitId(r.id)}
  >
    Submit
  </button>
)}

                                  {/* Review / Close (office side) */}
                                  {r.status === 'SUBMIT' && !isCrew && (
                                    <button
                                      type='button'
                                      className='btn btn-light-warning btn-sm'
                                      title='Review / Close Near Miss'
                                      onClick={() => setClosingReport(r)}
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
                        {sortedData.length === 0
                          ? 0
                          : ((currentPage - 1) * rowsPerPage) + 1}
                        -
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

                        <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
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

          {/* Add Near Miss Modal */}
<AddNearMissModal
  visible={addOpen}
  isCrew={isCrew}
  vessels={vesselsScoped}               // full allowed list for this user
  companies={companies}
  subcompanies={subcompanies}
  isTopLevel={isTopLevel}
  effectiveCompanyId={effectiveCompanyId ?? undefined}
  defaultVesselId={isCrew ? currentUser?.vessel?.id : undefined}
  onCancel={() => setAddOpen(false)}
  onSubmit={handleAddNearMiss}
/>


          {/* View Near Miss Modal */}
                   {/* View Near Miss Modal */}
          <ViewNearMissModal
            visible={viewOpen}
            record={viewing}
            onCancel={() => {
              setViewOpen(false)
              setViewing(null)
            }}
            onOpenSupporting={openSupportingListModal}
          />

          {/* Edit Near Miss Modal */}
          <EditNearMissModal
            visible={editOpen}
            isCrew={isCrew}
            vessels={vesselsForFilters}
            record={editing}
            onCancel={() => {
              setEditOpen(false)
              setEditing(null)
            }}
            onSubmit={handleUpdateNearMiss}
          />

                    {/* Submit confirmation modal – same UX as DefectSubmitModal */}
          <NearMissSubmitModal
            visible={submitId !== null}
            onCancel={() => setSubmitId(null)}
            onConfirm={async () => {
              if (submitId == null) return
              await handleSubmitNearMissRow(submitId)
              setSubmitId(null)
            }}
          />

          {/* Closure Modal */}
          <NearMissClosureModal
            visible={!!closingReport}
            record={closingReport}
            onCancel={() => setClosingReport(null)}
            onSaveReview={handleSaveReview}
            onCloseWithResult={handleCloseWithResult}
          />

          {/* Shared File Viewer */}
          <FileViewerModal
  visible={fileModal.visible}
  title={fileModal.title}
  fileName={fileModal.fileName}
  viewUrl={fileModal.viewUrl}
  downloadUrl={fileModal.downloadUrl}
  onClose={() =>
    setFileModal(prev => ({
      ...prev,
      visible: false,
    }))
  }
/>

<NearMissAttachmentsModal
  visible={attachmentsModal.visible}
  reportNumber={attachmentsModal.reportNumber}
  loading={attachmentsModal.loading}
  items={attachmentsModal.items}
  onClose={() =>
    setAttachmentsModal(prev => ({...prev, visible: false}))
  }
/>


          {/* Attachments list modal */}
          {/* {attachmentsModal.visible && (
            <div className='modal fade show d-block' tabIndex={-1} role='dialog'>
              <div className='modal-dialog modal-lg' role='document'>
                <div className='modal-content'>
                  <div className='modal-header'>
                    <h5 className='modal-title'>
                      Supporting Documents – {attachmentsModal.reportNumber ?? ''}
                    </h5>
                    <button
                      type='button'
                      className='btn-close'
                      aria-label='Close'
                      onClick={() =>
                        setAttachmentsModal({
                          visible: false,
                          reportNumber: null,
                          loading: false,
                          items: [],
                        })
                      }
                    />
                  </div>
                  <div className='modal-body'>
                    {attachmentsModal.loading ? (
                      <div className='d-flex justify-content-center py-4'>
                        {spinner}
                      </div>
                    ) : attachmentsModal.items.length === 0 ? (
                      <div className='text-muted text-center py-3'>
                        No supporting documents uploaded.
                      </div>
                    ) : (
                      <table className='table table-sm align-middle'>
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th style={{width: '180px'}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attachmentsModal.items.map(it => (
                            <tr key={it.fileName}>
                              <td>{it.fileName}</td>
                              <td>
                                <div className='d-flex gap-2'>
                                  <button
                                    type='button'
                                    className='btn btn-light-primary btn-sm'
                                    onClick={() =>
                                      setFileModal({
                                        visible: true,
                                        title: it.fileName,
                                        fileName: it.fileName,
                                        viewUrl: it.viewUrl,
                                        downloadUrl: it.downloadUrl,
                                      })
                                    }
                                  >
                                    View
                                  </button>
                                  <a
                                    href={it.downloadUrl}
                                    className='btn btn-light-secondary btn-sm'
                                    target='_blank'
                                    rel='noreferrer'
                                  >
                                    Download
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className='modal-footer'>
                    <button
                      type='button'
                      className='btn btn-light'
                      onClick={() =>
                        setAttachmentsModal({
                          visible: false,
                          reportNumber: null,
                          loading: false,
                          items: [],
                        })
                      }
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )} */}
        </div>
      </div>
    </div>
  )
}

export default NearMissReports
