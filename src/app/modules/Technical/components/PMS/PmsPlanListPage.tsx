import React, { FC, useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { useAuth } from '../../../auth'
import { getVesselList, getCompanyAdminList, getCompanyList } from '../../../Management/core/_requests'
import {
  getPmsPlans,
  getPmsPlan,
  createPmsPlan,
  updatePmsPlan,
  deletePmsPlan,
  getPmsPlanLines,
  derivePlanFromTemplate,
  getPmsTemplates,
} from '../../core/pms/_requests'
import { PmsPlanDto, PmsPlanStatus, PmsTemplateDto } from '../../core/pms/_models'
import { toast } from 'react-toastify'
import { AddPlanModal } from './AddPlanModal'
import { ViewPlanModal } from './ViewPlanModal'
import { EditPlanModal } from './EditPlanModal'
import type { Vessel } from '../../../Management/core/_models'

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

const PmsPlanListPage: FC = () => {
  const { currentUser, auth } = useAuth()
  const roleId = Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  const [filters, setFilters] = useState<{
    companyId: string
    subcompanyId: string
    vesselId: string
    status: string
  }>({
    companyId: '',
    subcompanyId: '',
    vesselId: '',
    status: '',
  })

  const [plans, setPlans] = useState<PmsPlanDto[]>([])
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])
  const [loadingLookups, setLoadingLookups] = useState(false)

  // Modals
  const [addOpen, setAddOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewing, setViewing] = useState<PmsPlanDto | null>(null)
  const [editing, setEditing] = useState<PmsPlanDto | null>(null)
  const [showDeriveModal, setShowDeriveModal] = useState(false)
  const [selectedPlanForDerive, setSelectedPlanForDerive] = useState<PmsPlanDto | null>(null)
  const [templates, setTemplates] = useState<PmsTemplateDto[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(0)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof PmsPlanDto | ''>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    loadLookups()
  }, [])

  useEffect(() => {
    loadPlans()
  }, [filters.vesselId, filters.status])

  const loadLookups = async () => {
    setLoadingLookups(true)
    try {
      const [groupsRaw, adminsRaw, vesselsData] = await Promise.all([
        getCompanyAdminList().catch(() => []),
        getCompanyList().catch(() => []),
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

      const validGroups = groups.filter(g => Number.isFinite(g.id))
      const validAdmins = admins.filter(a => Number.isFinite(a.id) && Number.isFinite(a.companyId))
      setCompanies(validGroups)
      setSubcompanies(validAdmins)

      // Scope vessels by role
      let vesselsForUser: Vessel[] = []
      if (roleId === 4) {
        const vId = currentUser?.vessel?.id
        vesselsForUser = vId ? vesselsData.filter((v: any) => v.id === vId) : []
        if (vId) {
          setFilters(prev => ({ ...prev, vesselId: String(vId) }))
        }
      } else {
        const operatorActsLikeSuperadmin = roleId === 6 && !currentUser?.companyGroupAdminId
        const operatorActsLikeGroupAdmin = roleId === 6 && !!currentUser?.companyGroupAdminId

        vesselsForUser = vesselsData.filter((v: any) => {
          const isActive = v?.active ?? true
          if (roleId === 1 || operatorActsLikeSuperadmin) return isActive
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

      setVessels(vesselsData)
      setVesselsScoped(vesselsForUser)

      // Auto-select first vessel
      if (vesselsForUser.length > 0 && !filters.vesselId) {
        const firstVessel = vesselsForUser[0]
        const v: any = firstVessel
        const companyGroupId = v.companyGroupAdmin?.id ?? v.companyGroupId ?? v.cgaid?.id ?? null
        const companyAdminId = v.companyAdmin?.id ?? v.companyId ?? null
        setFilters({
          companyId: companyGroupId ? String(companyGroupId) : '',
          subcompanyId: companyAdminId ? String(companyAdminId) : '',
          vesselId: String(firstVessel.id),
          status: '',
        })
      }
    } catch (error) {
      console.error('Error loading lookups:', error)
    } finally {
      setLoadingLookups(false)
    }
  }

  const loadPlans = async () => {
    setLoading(true)
    try {
      const vesselId = filters.vesselId ? Number(filters.vesselId) : undefined
      const data = await getPmsPlans(vesselId)
      setPlans(data)
    } catch (error) {
      console.error('Error loading plans:', error)
      toast.error('Failed to load plans', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

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

  const handleClearFilters = () => {
    setFilters({
      companyId: '',
      subcompanyId: '',
      vesselId: '',
      status: '',
    })
    setSearchTerm('')
  }

  const subcompaniesForChosenCompany = useMemo(() => {
    if (!filters.companyId) return []
    const cid = Number(filters.companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [filters.companyId, subcompanies])

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

  const filteredData = useMemo(() => {
    let data = [...plans]

    // Filter by status
    if (filters.status) {
      data = data.filter(p => p.status === (filters.status as PmsPlanStatus))
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      data = data.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.vesselName && p.vesselName.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term))
      )
    }

    // Sort
    if (sortColumn) {
      data.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
        }

        if (sortColumn === 'createdAt' || sortColumn === 'updatedAt') {
          const aTime = aVal ? new Date(String(aVal)).getTime() : 0
          const bTime = bVal ? new Date(String(bVal)).getTime() : 0
          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
        }

        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1
        if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    return data
  }, [plans, filters.status, searchTerm, sortColumn, sortOrder])

  const handleSort = (column: keyof PmsPlanDto) => {
    setSortColumn(prevCol => {
      if (prevCol === column) {
        setSortOrder(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
        return prevCol
      }
      setSortOrder('desc')
      return column
    })
  }

  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page)
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10))
    setCurrentPage(1)
  }

  const handleView = async (id: number) => {
    try {
      const plan = await getPmsPlan(id)
      setViewing(plan)
      setViewOpen(true)
    } catch (error) {
      console.error('Error loading plan:', error)
      toast.error('Failed to load plan', { position: 'top-center' })
    }
  }

  const handleEdit = async (id: number) => {
    try {
      const plan = await getPmsPlan(id)
      setEditing(plan)
      setEditOpen(true)
    } catch (error) {
      console.error('Error loading plan:', error)
      toast.error('Failed to load plan', { position: 'top-center' })
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this plan? This will also delete all plan lines.')) {
      return
    }
    try {
      await deletePmsPlan(id)
      toast.success('Plan deleted successfully', { position: 'top-center' })
      loadPlans()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete plan', { position: 'top-center' })
    }
  }

  const handleDeriveClick = async (plan: PmsPlanDto) => {
    try {
      const templatesData = await getPmsTemplates()
      setTemplates(templatesData)
      setSelectedPlanForDerive(plan)
      setSelectedTemplateId(0)
      setShowDeriveModal(true)
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Failed to load templates', { position: 'top-center' })
    }
  }

  const handleDeriveSubmit = async () => {
    if (!selectedPlanForDerive?.id || !selectedTemplateId) {
      toast.error('Please select a template', { position: 'top-center' })
      return
    }
  
    try {
      // Guard: prevent accidental duplicates
      const existing = await getPmsPlanLines(selectedPlanForDerive.id).catch(() => [])
      const replace = existing.length > 0
  
      const result = await derivePlanFromTemplate(selectedPlanForDerive.id, selectedTemplateId, replace)
      toast.success(`Derived ${result.linesCreated} plan lines from template`, { position: 'top-center' })
      setShowDeriveModal(false)
      setSelectedPlanForDerive(null)
      loadPlans()
    } catch (error: any) {
      toast.error(error.message || 'Failed to derive plan from template', { position: 'top-center' })
    }
  }  

  const getStatusBadgeClass = (status: PmsPlanStatus) => {
    switch (status) {
      case 'ACTIVE': return 'badge-light-success'
      case 'DRAFT': return 'badge-light-warning'
      case 'SUSPENDED': return 'badge-light-danger'
      case 'ARCHIVED': return 'badge-light-secondary'
      default: return 'badge-light'
    }
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>PMS Plans</h3>
                <span className='text-muted fs-7'>
                  Manage planned maintenance schedules for vessels
                </span>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn-primary'
                  onClick={() => setAddOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add New Plan
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className='card-body py-4 bg-white border-top'>
              <div className='row gx-3 gy-3 mb-4'>
                {/* Company */}
                {roleId !== 4 && (
                  <div className='col-md-2'>
                    <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                      Company
                    </label>
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
                  </div>
                )}

                {/* Subcompany */}
                {roleId !== 4 &&
                  Boolean(filters.companyId) &&
                  subcompaniesForChosenCompany.length > 0 && (
                    <div className='col-md-2'>
                      <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
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
                    <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
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
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Status
                  </label>
                  <select
                    className='form-select'
                    name='status'
                    value={filters.status}
                    onChange={handleFilterChange}
                  >
                    <option value=''>All Status</option>
                    <option value='DRAFT'>Draft</option>
                    <option value='ACTIVE'>Active</option>
                    <option value='SUSPENDED'>Suspended</option>
                    <option value='ARCHIVED'>Archived</option>
                  </select>
                </div>

                {/* Search */}
                <div className='col-md-4'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Search
                  </label>
                  <div className='position-relative'>
                    <div className='position-absolute ms-3' style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                      <KTSVG path='/media/icons/duotune/general/gen021.svg' className='svg-icon-2' />
                    </div>
                    <input
                      type='text'
                      className='form-control form-control-sm ps-10'
                      placeholder='Plan name, vessel, description...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

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

              {/* Table */}
              <div className='report-table table-responsive' style={{ position: 'relative' }}>
                {loading && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255,255,255,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 5,
                    }}
                  >
                    <div className='spinner-border' role='status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                  </div>
                )}
                <div style={{ overflowX: 'auto' }}>
                  <table className='table table-bordered align-middle'>
                    <thead className='table-header text-start'>
                      <tr>
                        <th style={{ minWidth: '70px' }} className='text-center text-nowrap'>
                          Sr/No
                        </th>
                        <th style={{ minWidth: '200px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Plan Name</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('name')}
                              disabled={plans.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'name'
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
                        <th style={{ minWidth: '180px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Vessel</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('vesselName')}
                              disabled={plans.length === 0}
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
                        <th style={{ minWidth: '200px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Description</span>
                          </div>
                        </th>
                        <th style={{ minWidth: '120px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Status</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('status')}
                              disabled={plans.length === 0}
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
                        <th style={{ minWidth: '100px' }} className='text-center'>
                          Version
                        </th>
                        <th style={{ minWidth: '150px', textAlign: 'center' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='table-body text-start'>
                      {loading ? (
                        <tr>
                          <td colSpan={7} className='text-center py-5'>
                            <div className='spinner-border' role='status'>
                              <span className='visually-hidden'>Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : currentRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className='text-center py-5 text-muted'>
                            No plans found
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((plan, idx) => (
                          <tr key={plan.id}>
                            <td className='text-center'>
                              {indexOfFirstRecord + idx + 1}
                            </td>
                            <td className='fw-semibold'>{plan.name}</td>
                            <td>{plan.vesselName || '-'}</td>
                            <td>
                              <span
                                title={plan.description || '-'}
                                style={{
                                  maxWidth: '200px',
                                  display: 'inline-block',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {plan.description || '-'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${getStatusBadgeClass(plan.status)}`}>
                                {plan.status}
                              </span>
                            </td>
                            <td className='text-center'>{plan.version || 1}</td>
                            <td style={{ textAlign: 'center' }}>
                              <div className='d-flex justify-content-center gap-1'>
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='View'
                                  onClick={() => handleView(plan.id!)}
                                >
                                  <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3 text-primary' />
                                </button>
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='Edit'
                                  onClick={() => handleEdit(plan.id!)}
                                >
                                  <KTSVG path='/media/map/edit-active.svg' className='svg-icon-3' />
                                </button>
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='Derive from Template'
                                  onClick={() => handleDeriveClick(plan)}
                                >
                                  <KTSVG path='/media/icons/duotune/arrows/arr071.svg' className='svg-icon-3 text-info' />
                                </button>
                                <button
                                  className='btn btn-icon btn-sm'
                                  title='Delete'
                                  onClick={() => handleDelete(plan.id!)}
                                >
                                  <KTSVG path='/media/icons/duotune/general/gen027.svg' className='svg-icon-3 text-danger' />
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
                {!loading && filteredData.length > 0 && (
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
                      <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                        Showing{' '}
                        <strong>
                          {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, filteredData.length)}
                        </strong>{' '}
                        of <strong>{filteredData.length}</strong>
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Plan Modal */}
      {addOpen && (
        <AddPlanModal
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onSubmit={async (data) => {
            try {
              const created = await createPmsPlan(data)
              toast.success('Plan created successfully', { position: 'top-center' })
              setAddOpen(false)
              loadPlans()
              return created
            } catch (error: any) {
              toast.error(error.message || 'Failed to create plan', { position: 'top-center' })
              throw error
            }
          }}
          vessels={vesselsScoped}
        />
      )}

      {/* View Plan Modal */}
      {viewOpen && viewing && (
        <ViewPlanModal
          visible={viewOpen}
          onClose={() => {
            setViewOpen(false)
            setViewing(null)
          }}
          plan={viewing}
        />
      )}

      {/* Edit Plan Modal */}
      {editOpen && editing && (
        <EditPlanModal
          visible={editOpen}
          onClose={() => {
            setEditOpen(false)
            setEditing(null)
          }}
          plan={editing}
          onSubmit={async (data) => {
            try {
              await updatePmsPlan(editing.id!, data)
              toast.success('Plan updated successfully', { position: 'top-center' })
              setEditOpen(false)
              setEditing(null)
              loadPlans()
            } catch (error: any) {
              toast.error(error.message || 'Failed to update plan', { position: 'top-center' })
            }
          }}
          vessels={vesselsScoped}
        />
      )}

      {/* Derive from Template Modal */}
      {showDeriveModal && selectedPlanForDerive && (
        <div className='position-fixed' style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.target === e.currentTarget && setShowDeriveModal(false)}>
          <div className='bg-white rounded shadow-lg p-4' style={{ width: '500px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <h6 className='fw-bold mb-3'>Derive Plan Lines from Template</h6>
            <div className='mb-3'>
              <div className='text-muted mb-2'>Plan: <strong>{selectedPlanForDerive.name}</strong></div>
              <label className='form-label fw-semibold fs-6 mb-2 text-dark'>Select Template</label>
              <select
                className='form-select'
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
              >
                <option value='0'>Select Template</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.machineryType && `(${t.machineryType})`}
                  </option>
                ))}
              </select>
            </div>
            <div className='d-flex justify-content-end gap-2'>
              <button type='button' className='btn btn-light btn-sm' onClick={() => { setShowDeriveModal(false); setSelectedPlanForDerive(null) }}>
                Cancel
              </button>
              <button
                type='button'
                className='btn btn-primary btn-sm'
                onClick={handleDeriveSubmit}
                disabled={!selectedTemplateId}
              >
                Derive Lines
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PmsPlanListPage
