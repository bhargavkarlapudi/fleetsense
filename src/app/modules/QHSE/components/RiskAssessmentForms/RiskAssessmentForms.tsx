import React, { FC, useEffect, useMemo, useState } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { useAuth } from '../../../auth'
import { getCompanyAdminList, getCompanyList, getVesselList } from '../../../Management/core/_requests'
import type { Vessel } from '../../../Management/core/_models'

import {
  listRiskAssessmentsByVessel,
  createRiskAssessment,
  updateRiskAssessment,
  replaceRiskAssessmentFile,
  softDeleteRiskAssessment,
  mapRiskAssessmentDtoToRow,
} from '../../core/_requests'
import type { RiskAssessmentRecord } from '../../core/_models'
import { ManualPlanViewer } from '../ManualPlanViewer'
import { AddRiskAssessmentModal } from './AddRiskAssessmentModal'
import { EditRiskAssessmentModal } from './EditRiskAssessmentModal'
import { RiskAssessmentRevisionsModal } from './RiskAssessmentRevisionsModal'

type VesselOption = {
  id: number
  name: string
}

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

const RiskAssessmentForms: FC = () => {
  const { auth, currentUser } = useAuth()

  const roleId: number =
    Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  // ======= Lookups =======
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])
  const [lookupsReady, setLookupsReady] = useState(false)
  const [loadingLookups, setLoadingLookups] = useState(false)

  const [filters, setFilters] = useState<{ companyId: string; subcompanyId: string }>({
    companyId: '',
    subcompanyId: '',
  })
  const [selectedVesselId, setSelectedVesselId] = useState<number | ''>('')

  const [didAutoSelectVessel, setDidAutoSelectVessel] = useState(false)

  // ======= Data =======
  const [records, setRecords] = useState<RiskAssessmentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: keyof RiskAssessmentRecord | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })

  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [viewerRecord, setViewerRecord] = useState<RiskAssessmentRecord | null>(null)

  const [addVisible, setAddVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RiskAssessmentRecord | null>(null)

  const [revModal, setRevModal] = useState<{
    id: number
    name: string
    visible: boolean
  }>({ id: 0, name: '', visible: false })

  const userId = String(
    (auth?.userDetails as any)?.id ??
      (currentUser as any)?.id ??
      ''
  )

  const userDisplayName = (() => {
    const u = (auth?.userDetails as any) || {}
    const cu = (currentUser as any) || {}
    return (
      u.username ||
      cu.username ||
      [cu.firstName, cu.lastName].filter(Boolean).join(' ').trim() ||
      u.name ||
      `User#${userId}`
    )
  })()

  // ======= Load lookups (Company / Subcompany / Vessels) =======
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
        setVessels(vesselList)

        // Scope vessels similar to Defect list
        let vesselsForUser: Vessel[] = []

        if (roleId === 4) {
          const vId = (currentUser as any)?.vessel?.id
          vesselsForUser = vId ? vesselList.filter((v: any) => v.id === vId) : []
        } else {
          const isSuperadmin = roleId === 1
          const isOperator = roleId === 6
          const operatorActsLikeSuperadmin = isOperator && !(currentUser as any)?.companyGroupAdminId
          const operatorActsLikeGroupAdmin = isOperator && !!(currentUser as any)?.companyGroupAdminId

          vesselsForUser = vesselList.filter((v: any) => {
            const isActive = v?.active ?? true
            if (isSuperadmin || operatorActsLikeSuperadmin) return isActive

            if (roleId === 5 || operatorActsLikeGroupAdmin) {
              const cgaId =
                (currentUser as any)?.companyGroupAdminId ??
                (currentUser as any)?.companyGroupAdmin?.id
              return (
                isActive &&
                (v?.companyGroupAdmin?.id === cgaId ||
                  v?.companyGroupId === cgaId ||
                  v?.cgaid?.id === cgaId)
              )
            }

            if (roleId === 2) {
              const caId =
                (currentUser as any)?.companyAdminId ??
                (currentUser as any)?.companyAdmin?.id
              return isActive && (v?.companyAdmin?.id === caId || v?.companyId === caId)
            }

            // other roles: no vessels by default
            return false
          })
        }

        setVesselsScoped(vesselsForUser)
      } catch (e) {
        console.error('Failed to load Risk Assessment lookups', e)
        setCompanies([])
        setSubcompanies([])
        setVessels([])
        setVesselsScoped([])
      } finally {
        setLoadingLookups(false)
        setLookupsReady(true)
      }
    }

    loadLookups()
  }, [roleId, currentUser])

  // Derived: subcompanies for chosen company
  const subcompaniesForChosenCompany = useMemo(() => {
    if (!filters.companyId) return []
    const cid = Number(filters.companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [filters.companyId, subcompanies])

  const hasSubcompaniesForChosenCompany = subcompaniesForChosenCompany.length > 0

  // Derived: vessels filtered by company / subcompany
  const vesselsForFilters = useMemo(() => {
    let list = vesselsScoped
    if (filters.companyId) {
      const cid = Number(filters.companyId)
      list = list.filter((v: any) =>
        Number(v.companyGroupAdmin?.id ?? v.companyGroupId ?? v.cgaid?.id) === cid
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

  // Auto-select default vessel once lookups are ready
  useEffect(() => {
    if (!lookupsReady || didAutoSelectVessel) return
    const firstVessel = vesselsForFilters[0]
    if (!firstVessel) return

    setFilters(prev => {
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
        companyId: companyGroupId ? String(companyGroupId) : prev.companyId,
        subcompanyId: companyAdminId ? String(companyAdminId) : prev.subcompanyId,
      }
    })

    setSelectedVesselId(Number(firstVessel.id))
    setDidAutoSelectVessel(true)
  }, [lookupsReady, vesselsForFilters, didAutoSelectVessel])

  const effectiveVesselId = selectedVesselId ? Number(selectedVesselId) : undefined

  // Vessel options for dropdowns / modal
  const vesselOptions: VesselOption[] = useMemo(
    () =>
      vesselsForFilters.map((v: any) => ({
        id: Number(v.id),
        name: v.name || v.vesselName || v.fleet_name || `Vessel #${v.id}`,
      })),
    [vesselsForFilters]
  )

  // Helper: selected vessel's company/subcompany names for Add modal
  const selectedVessel = useMemo(
    () => vessels.find(v => Number(v.id) === Number(selectedVesselId)),
    [vessels, selectedVesselId]
  )

  const selectedCompanyId =
    selectedVessel
      ? Number(
          (selectedVessel as any).companyGroupAdmin?.id ??
          (selectedVessel as any).companyGroupId ??
          (selectedVessel as any).cgaid?.id ??
          0
        )
      : 0

  const selectedSubcompanyId =
    selectedVessel
      ? Number(
          (selectedVessel as any).companyAdmin?.id ??
          (selectedVessel as any).companyId ??
          0
        )
      : 0

  const selectedCompanyName: string | undefined =
    selectedCompanyId
      ? companies.find((c) => c.id === selectedCompanyId)?.name
      : undefined

  const selectedSubcompanyName: string | undefined =
    selectedSubcompanyId
      ? subcompanies.find((sc) => sc.id === selectedSubcompanyId)?.name
      : undefined

  // ======= Load risk assessments =======
  const loadRiskAssessments = async () => {
    const vId = effectiveVesselId
    if (!vId) {
      setRecords([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await listRiskAssessmentsByVessel(vId)
      setRecords((list || []).map((d) => {
        const row = mapRiskAssessmentDtoToRow(d)
        // Populate vesselName from vessels list if missing
        if (!row.vesselName || row.vesselName === '-') {
          const vessel = vessels.find((v: any) => Number(v.id) === Number(d.vesselId))
          if (vessel) {
            row.vesselName = (vessel as any).fleet_name || vessel.name || `Vessel #${vessel.id}`
          }
        }
        return row
      }))
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to load risk assessments')
      toast.error(e?.message || 'Failed to load risk assessments')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!effectiveVesselId) {
      setRecords([])
      return
    }
    loadRiskAssessments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveVesselId])

  // ======= Filtering & sorting =======
  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return records.filter((r) => {
      if (!term) return true
      return (
        r.assessmentNumber.toLowerCase().includes(term) ||
        (r.vesselName || '').toLowerCase().includes(term) ||
        (r.uploadedByName || '').toLowerCase().includes(term) ||
        r.file.name.toLowerCase().includes(term) ||
        (r.remarks || '').toLowerCase().includes(term)
      )
    })
  }, [records, searchTerm])

  const sortedData = useMemo(() => {
    const arr = [...filteredData]
    if (!sortConfig.key) return arr

    const key = sortConfig.key
    const dir = sortConfig.direction

    arr.sort((a, b) => {
      const av = (a[key] ?? '') as any
      const bv = (b[key] ?? '') as any

      // numeric sort for revisionCount
      if (key === 'revisionCount') {
        const an = Number(av ?? 0)
        const bn = Number(bv ?? 0)
        if (an < bn) return dir === 'asc' ? -1 : 1
        if (an > bn) return dir === 'asc' ? 1 : -1
        return 0
      }

      const as = String(av ?? '').toLowerCase()
      const bs = String(bv ?? '').toLowerCase()

      if (as < bs) return dir === 'asc' ? -1 : 1
      if (as > bs) return dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [filteredData, sortConfig])

  const handleSort = (key: keyof RiskAssessmentRecord) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage))

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page)
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setCurrentPage(1)
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const truncateText = (t: string, max = 60) =>
    t && t.length > max ? `${t.substring(0, max)}...` : t

  const handleCompanyFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target
    setFilters(prev => {
      if (name === 'companyId') {
        return { companyId: value, subcompanyId: '' }
      }
      if (name === 'subcompanyId') {
        return { ...prev, subcompanyId: value }
      }
      return prev
    })
    // reset vessel when company/subcompany changes
    setSelectedVesselId('')
  }

  // ======= Add =======
  type AddPayload = {
    vesselId: number
    dateOfIssue?: string
    remarks?: string
    __file: File
  }

  const handleAdd = async (data: AddPayload) => {
    const vId = data.vesselId || effectiveVesselId
    if (!vId) {
      toast.error('Select a vessel first')
      return
    }
    if (!data.__file) {
      toast.error('File is required')
      return
    }

    try {
      await createRiskAssessment({
        vesselId: Number(vId),
        dateOfIssue: data.dateOfIssue,
        uploadedBy: userId || '0',
        uploadedByName: userDisplayName,
        remarks: data.remarks,
        file: data.__file,
      })
      await loadRiskAssessments()
      toast.success('Risk assessment form added')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to add risk assessment form')
    }
  }

  // ======= Edit =======
  type EditPayload = {
    id: number
    dateOfIssue?: string
    remarks?: string
    __file?: File | null
  }

  const openEdit = (rec: RiskAssessmentRecord) => {
    setEditingRecord(rec)
    setEditVisible(true)
  }

  const handleEdit = async (data: EditPayload) => {
    try {
      await updateRiskAssessment(data.id, {
        id: data.id,
        dateOfIssue: data.dateOfIssue || undefined,
        remarks: data.remarks || undefined,
      })

      if (data.__file) {
        await replaceRiskAssessmentFile(data.id, data.__file)
      }

      await loadRiskAssessments()
      toast.success('Risk assessment updated')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to update risk assessment')
    } finally {
      setEditVisible(false)
      setEditingRecord(null)
    }
  }

  // ======= Delete / Revisions =======
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this risk assessment form?')) return
    try {
      await softDeleteRiskAssessment(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      toast.success('Risk assessment deleted')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to delete risk assessment')
    }
  }

  const openRevisions = (rec: RiskAssessmentRecord) => {
    setRevModal({ id: rec.id, name: rec.assessmentNumber, visible: true })
  }

  const renderPagination = () => {
    const pages: JSX.Element[] = []
    const showPages = 5
    let startPage = Math.max(1, currentPage - 2)
    let endPage = Math.min(totalPages, startPage + showPages - 1)

    if (endPage - startPage < showPages - 1) {
      startPage = Math.max(1, endPage - showPages + 1)
    }

    if (startPage > 1) {
      pages.push(
        <li key={1} className='page-item'>
          <button className='page-link text-muted' onClick={() => handlePageChange(1)}>1</button>
        </li>
      )
      if (startPage > 2) {
        pages.push(
          <li key='ellipsis1' className='page-item disabled'>
            <span className='page-link border-0 text-muted'>...</span>
          </li>
        )
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
          <button
            className='page-link text-muted'
            style={{ backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent' }}
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
            <span className='page-link border-0 text-muted'>...</span>
          </li>
        )
      }
      pages.push(
        <li key={totalPages} className='page-item'>
          <button className='page-link text-muted' onClick={() => handlePageChange(totalPages)}>
            {totalPages}
          </button>
        </li>
      )
    }

    return (
      <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button className='page-link text-muted' onClick={() => handlePageChange(currentPage - 1)}>‹</button>
        </li>
        {pages}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button className='page-link text-muted' onClick={() => handlePageChange(currentPage + 1)}>›</button>
        </li>
      </ul>
    )
  }

  const sortIconPath = (col: keyof RiskAssessmentRecord) =>
    `/media/map/sort-col-${
      sortConfig.key === col
        ? sortConfig.direction === 'asc'
          ? 'up-black'
          : 'down-black'
        : 'grey'
    }.svg`

  const columnCount = 8 // Sr, Assessment, Vessel, Uploaded, Uploaded By, File, Remarks, Actions

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            {/* Header */}
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Risk Assessment Forms</h3>
                <span className='text-muted mt-1 fw-semibold fs-7'>
                  Vessel-scoped risk assessment documents (5 year validity from issue)
                </span>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setAddVisible(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add Risk Assessment
                </button>
              </div>
            </div>

            {/* Body */}
            <div className='card-body py-4 bg-white border-top'>
              {/* Filters / Search */}
              <div className='row g-3 align-items-end mb-4'>
                {/* Company */}
                {!isCrew && (
                  <div className='col-md-3 col-lg-2'>
                    <label className='form-label text-muted fw-semibold fs-7 mb-2'>Company</label>
                    <select
                      className='form-select form-select-sm'
                      name='companyId'
                      value={filters.companyId}
                      onChange={handleCompanyFilterChange}
                    >
                      <option value=''>All Companies</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Subcompany */}
                {!isCrew && hasSubcompaniesForChosenCompany && (
                  <div className='col-md-3 col-lg-2'>
                    <label className='form-label text-muted fw-semibold fs-7 mb-2'>Subcompany</label>
                    <select
                      className='form-select form-select-sm'
                      name='subcompanyId'
                      value={filters.subcompanyId}
                      onChange={handleCompanyFilterChange}
                    >
                      <option value=''>All Subcompanies</option>
                      {subcompaniesForChosenCompany.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Vessel */}
                <div className='col-md-3 col-lg-2'>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Vessel</label>
                  <div style={{ maxWidth: 260 }}>
                    <select
                      className='form-select form-select-sm'
                      value={selectedVesselId || ''}
                      onChange={(e) =>
                        setSelectedVesselId(e.target.value ? Number(e.target.value) : '')
                      }
                    >
                      <option value=''>Select Vessel</option>
                      {vesselOptions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Search */}
                <div className='col-md-6 col-lg-6'>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Search</label>
                  <div className='d-flex align-items-center'>
                    <div className='position-relative' style={{ maxWidth: 340, width: '100%' }}>
                      <div
                        className='position-absolute ms-3'
                        style={{ top: '50%', transform: 'translateY(-50%)' }}
                      >
                        <KTSVG path='/media/icons/duotune/general/gen021.svg' className='svg-icon-2' />
                      </div>
                      <input
                        type='text'
                        className='form-control form-control-sm ps-10'
                        placeholder='Search risk forms...'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    {searchTerm && (
                      <button
                        type='button'
                        className='btn btn-outline-secondary btn-sm ms-2'
                        onClick={() => setSearchTerm('')}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== TABLE FOR ADDED ENTRIES (like Defect List) ===== */}
              <div className='report-table table-responsive' style={{ position: 'relative' }}>
                {loadingLookups && (
                  <div className='text-muted px-3 pb-2'>Loading vessel / company data...</div>
                )}
                {error && !loading && (
                  <div className='text-danger px-3 pb-2'>{error}</div>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <table className='table table-bordered align-middle'>
                  <thead className='table-header text-start'>
                    <tr>
                      {/* Sr/No */}
                      <th className='text-center text-nowrap' style={{ minWidth: '60px' }}>
                        Sr/No
                      </th>

                      {/* Assessment Number */}
                      <th style={{ minWidth: '160px' }}>
                        <div className='d-flex align-items-center text-nowrap'>
                          <span className='me-1'>Assessment No.</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('assessmentNumber')}
                            disabled={records.length === 0}
                          >
                            <KTSVG
                              path={sortIconPath('assessmentNumber')}
                              className='svg-icon-3'
                            />
                          </button>
                        </div>
                      </th>

                      {/* Vessel */}
                      <th style={{ minWidth: '180px' }}>
                        <div className='d-flex align-items-center text-nowrap'>
                          <span className='me-1'>Vessel</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('vesselName')}
                            disabled={records.length === 0}
                          >
                            <KTSVG
                              path={sortIconPath('vesselName')}
                              className='svg-icon-3'
                            />
                          </button>
                        </div>
                      </th>

                      {/* Uploaded On */}
                      <th style={{ minWidth: '150px' }}>
                        <div className='d-flex align-items-center text-nowrap'>
                          <span className='me-1'>Uploaded On</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('uploadedDate')}
                            disabled={records.length === 0}
                          >
                            <KTSVG
                              path={sortIconPath('uploadedDate')}
                              className='svg-icon-3'
                            />
                          </button>
                        </div>
                      </th>

                      {/* Uploaded By */}
                      <th style={{ minWidth: '160px' }}>
                        <div className='d-flex align-items-center text-nowrap'>
                          <span className='me-1'>Uploaded By</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('uploadedByName')}
                            disabled={records.length === 0}
                          >
                            <KTSVG
                              path={sortIconPath('uploadedByName')}
                              className='svg-icon-3'
                            />
                          </button>
                        </div>
                      </th>

                      {/* File */}
                      <th style={{ minWidth: '220px' }}>
                        File
                      </th>

                      {/* Remarks */}
                      <th style={{ minWidth: '220px' }}>
                        <div className='d-flex align-items-center text-nowrap'>
                          <span className='me-1'>Remarks</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('remarks')}
                            disabled={records.length === 0}
                          >
                            <KTSVG
                              path={sortIconPath('remarks')}
                              className='svg-icon-3'
                            />
                          </button>
                        </div>
                      </th>

                      {/* Actions */}
                      <th style={{ minWidth: '150px', textAlign: 'center' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className='table-body text-start'>
                    {loading ? (
                      // simple skeleton: 6 rows
                      Array.from({ length: 6 }).map((_, i) => (
                        <tr key={`skeleton-${i}`}>
                          {Array.from({ length: columnCount }).map((__, c) => (
                            <td key={`s-${i}-${c}`} className='py-3'>
                              <div className='placeholder-wave'>
                                <div
                                  className='placeholder w-100'
                                  style={{ height: 14, borderRadius: 4 }}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : currentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={columnCount} className='text-center py-5 text-muted'>
                          {effectiveVesselId
                            ? 'No risk assessment forms found for this vessel.'
                            : 'Select a vessel to view risk assessment forms.'}
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((r, idx) => (
                        <tr key={r.id}>
                          {/* Sr/No */}
                          <td className='text-center'>
                            {indexOfFirstRecord + idx + 1}
                          </td>

                          {/* Assessment Number */}
                          <td className='text-nowrap'>
                            {r.assessmentNumber || '-'}
                          </td>

                          {/* Vessel */}
                          <td className='fw-bold text-nowrap'>
                            {r.vesselName || '-'}
                          </td>

                          {/* Uploaded On */}
                          <td className='text-nowrap'>
                            {formatDate(r.uploadedDate as any)}
                          </td>

                          {/* Uploaded By */}
                          <td className='text-nowrap'>
                            {r.uploadedByName || '-'}
                          </td>

                          {/* File */}
<td>
  {r.file?.name ? (
    <div className='d-flex align-items-center'>
      <button
        type='button'
        className='btn btn-light-primary btn-sm align-self-start me-2'
        onClick={() => setViewerRecord(r)}
      >
        <KTSVG
          path='/media/icons/duotune/files/fil003.svg'
          className='svg-icon-3 me-1'
        />
        View File
      </button>
      <span
        className='text-muted small text-truncate'
        style={{ maxWidth: 200 }}
        title={r.file.name}
      >
        {/* {truncateText(r.file.name, 50)} */}
        {typeof r.file.size === 'number' && r.file.size > 0 && (
          <>({formatFileSize(r.file.size)})</>
        )}
      </span>
    </div>
  ) : (
    '-'
  )}
</td>

                          {/* Remarks */}
                          <td>
                            <span
                              title={r.remarks || '-'}
                              style={{
                                maxWidth: '260px',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                verticalAlign: 'middle',
                              }}
                            >
                              {r.remarks || '-'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'left' }} className='text-nowrap'>
                            <div className='d-flex justify-content-left gap-1'>
                              {/* View */}
                              <button
                                className='btn btn-icon btn-sm'
                                title='View File'
                                onClick={() => setViewerRecord(r)}
                              >
                                <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3 text-primary' />
                              </button>

                              {/* Edit */}
                              <button
                                className='btn btn-icon btn-sm'
                                title='Edit'
                                onClick={() => openEdit(r)}
                              >
                                <KTSVG path='/media/map/edit-active.svg' className='svg-icon-3' />
                              </button>

                              {/* History (Revisions) */}
                              <button
                                className='btn btn-icon btn-sm'
                                title='History'
                                onClick={() => openRevisions(r)}
                              >
                                <KTSVG path='/media/icons/duotune/abstract/abs026.svg' className='svg-icon-3 text-info' />
                              </button>

                              {/* Delete */}
                              <button
                                className='btn btn-icon btn-sm'
                                title='Delete'
                                onClick={() => handleDelete(r.id)}
                              >
                                <KTSVG
                                  path='/media/icons/duotune/general/gen027.svg'
                                  className='svg-icon-3 text-danger'
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
              {/* ===== END TABLE ===== */}

              {/* Pagination footer - outside table-responsive to prevent horizontal scrolling */}
              <div
                className='d-flex justify-content-between align-items-center py-3 border-top'
                style={{ backgroundColor: '#fff', position: 'static' }}
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
                  <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                    Showing{' '}
                    <strong>
                      {sortedData.length === 0 ? 0 : indexOfFirstRecord + 1}-
                      {Math.min(indexOfLastRecord, sortedData.length)}
                    </strong>{' '}
                    of <strong>{sortedData.length}</strong>
                  </span>
                  <nav>{renderPagination()}</nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Viewer */}
      {viewerRecord && (
        <ManualPlanViewer
          manual={{
            id: viewerRecord.id,
            name: viewerRecord.assessmentNumber,
            uploadedDate: viewerRecord.uploadedDate,
            file: { name: viewerRecord.file.name },
            remarks: viewerRecord.remarks,
          }}
          onClose={() => setViewerRecord(null)}
        />
      )}

      {/* Add Modal */}
      <AddRiskAssessmentModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSubmit={handleAdd}
        vessels={vesselsScoped}
        companies={companies}
        subcompanies={subcompanies}
        showCompanyFilters={!isCrew}
        isCrew={isCrew}
        defaultVesselId={isCrew ? vesselsScoped[0]?.id : undefined}
      />

      {/* Edit Modal */}
      {editVisible && editingRecord && (
        <EditRiskAssessmentModal
          visible={editVisible}
          onClose={() => {
            setEditVisible(false)
            setEditingRecord(null)
          }}
          record={editingRecord}
          onSubmit={handleEdit}
          vesselName={editingRecord.vesselName}
          onViewFile={() => setViewerRecord(editingRecord)}
        />
      )}

      {/* Revisions Modal */}
      <RiskAssessmentRevisionsModal
        riskId={revModal.id}
        name={revModal.name}
        visible={revModal.visible}
        onClose={() => setRevModal((s) => ({ ...s, visible: false }))}
      />

      <ToastContainer
        position='top-center'
        newestOnTop
        closeOnClick
        pauseOnHover={false}
        autoClose={3000}
        theme='colored'
      />
    </div>
  )
}

export default RiskAssessmentForms
