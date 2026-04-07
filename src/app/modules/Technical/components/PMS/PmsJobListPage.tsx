import React, { FC, useEffect, useState, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { useAuth } from '../../../auth'
import { getCompanyAdminList, getCompanyList, getVesselList } from '../../../Management/core/_requests'
import { toast } from 'react-toastify'
import type { Vessel } from '../../../Management/core/_models'
import type { PmsJobRecord, PmsJobState } from '../../core/pms/_models'
import {
  searchPmsJobs,
  startPmsJob,
  completePmsJob,
  verifyPmsJob,
  deferPmsJob,
  cancelPmsJob,
  bulkStartJobs,
  bulkDeferJobs,
  bulkCancelJobs,
} from '../../core/pms/_requests'
import { PmsJobDetailModal } from './PmsJobDetailModal'
import { CompleteJobModal } from './CompleteJobModal'
import { CreateUnplannedJobModal } from './CreateUnplannedJobModal'
import { BatchJobActionModal } from './BatchJobActionModal'

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

const PmsJobListPage: FC = () => {
  const { currentUser, auth } = useAuth()
  const roleId = Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  const [filters, setFilters] = useState<{
    companyId: string
    subcompanyId: string
    vesselId: string
    state: string
    fromDate: string
    toDate: string
    criticality: string
    scheduleType: string
    equipmentIds: number[]
    showOverdueOnly: boolean
  }>({
    companyId: '',
    subcompanyId: '',
    vesselId: '',
    state: '',
    fromDate: '',
    toDate: '',
    criticality: '',
    scheduleType: '',
    equipmentIds: [],
    showOverdueOnly: false,
  })

  const [records, setRecords] = useState<PmsJobRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])

  const [viewOpen, setViewOpen] = useState(false)
  const [viewing, setViewing] = useState<PmsJobRecord | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completing, setCompleting] = useState<PmsJobRecord | null>(null)
  const [createJobOpen, setCreateJobOpen] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof PmsJobRecord | ''>('dueDate')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Batch selection
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set())
  const [batchActionOpen, setBatchActionOpen] = useState(false)

  useEffect(() => {
    loadLookups()
    loadData()
  }, [])

  useEffect(() => {
    loadData()
  }, [filters])

  const loadLookups = async () => {
    try {
      const [groupsRaw, adminsRaw, vesselsData] = await Promise.all([
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

      // Auto-select first vessel (for non-crew users, crew already has vessel set above)
      if (vesselsForUser.length > 0 && !filters.vesselId) {
        const firstVessel = vesselsForUser[0]
        const v: any = firstVessel
        const companyGroupId = v.companyGroupAdmin?.id ?? v.companyGroupId ?? v.cgaid?.id ?? null
        const companyAdminId = v.companyAdmin?.id ?? v.companyId ?? null
        setFilters({
          companyId: companyGroupId ? String(companyGroupId) : '',
          subcompanyId: companyAdminId ? String(companyAdminId) : '',
          vesselId: String(firstVessel.id),
          state: '',
          fromDate: '',
          toDate: '',
          criticality: '',
          scheduleType: '',
          equipmentIds: [],
          showOverdueOnly: false,
        })
      }
    } catch (error) {
      console.error('Error loading lookups:', error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const vesselId = filters.vesselId ? Number(filters.vesselId) : undefined
      const state = filters.state ? (filters.state as PmsJobState) : undefined
      const jobs = await searchPmsJobs(vesselId, state, filters.fromDate || undefined, filters.toDate || undefined)
      setRecords(jobs)
    } catch (error) {
      console.error('Error loading jobs:', error)
      toast.error('Failed to load jobs', { position: 'top-center' })
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
      state: '',
      fromDate: '',
      toDate: '',
      criticality: '',
      scheduleType: '',
      equipmentIds: [],
      showOverdueOnly: false,
    })
    setSearchTerm('')
  }

  const isOverdue = (record: PmsJobRecord): boolean => {
    if (record.state !== 'PLANNED' && record.state !== 'IN_PROGRESS') return false
    if (!record.dueDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(record.dueDate)
    return dueDate < today
  }

  const getOverdueDays = (record: PmsJobRecord): number => {
    if (!isOverdue(record) || !record.dueDate) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(record.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatJobDate = (dateStr?: string | null): string => {
    if (!dateStr) return '-'
    try {
      const date = new Date(dateStr)
      const day = date.getDate()
      const month = date.toLocaleString('en-US', { month: 'short' })
      const year = date.getFullYear()
      return `${day} ${month} ${year}`
    } catch {
      return dateStr
    }
  }

  const determineHybridTrigger = (record: PmsJobRecord): 'date' | 'counter' | 'both' | 'unknown' => {
    if (!record.dueDate || !record.dueCounter) return 'unknown'
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(record.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    const dateCrossed = today >= dueDate
    
    // Check if job was recently created and date is in future, likely counter triggered
    if (record.createdAt) {
      const createdDate = new Date(record.createdAt)
      createdDate.setHours(0, 0, 0, 0)
      const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      // If job was created within last 2 days and date is in future, counter likely triggered
      if (daysSinceCreation <= 2 && today < dueDate) {
        return 'counter'
      }
      // If date is overdue and job was created when date was already due, date likely triggered
      if (dateCrossed) {
        return 'date'
      }
    }
    return 'unknown'
  }

  const filteredData = useMemo(() => {
    let data = [...records]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      data = data.filter(j =>
        j.jobCode?.toLowerCase().includes(term) ||
        j.title.toLowerCase().includes(term) ||
        (j.vesselName && j.vesselName.toLowerCase().includes(term)) ||
        (j.equipmentName && j.equipmentName.toLowerCase().includes(term)) ||
        (j.componentName && j.componentName.toLowerCase().includes(term))
      )
    }

    // Criticality filter
    if (filters.criticality) {
      data = data.filter(j => j.criticality === filters.criticality)
    }

    // Schedule type filter
    if (filters.scheduleType) {
      data = data.filter(j => j.scheduleType === filters.scheduleType)
    }

    // Equipment filter
    if (filters.equipmentIds.length > 0) {
      data = data.filter(j => j.equipmentId && filters.equipmentIds.includes(j.equipmentId))
    }

    // Overdue filter
    if (filters.showOverdueOnly) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      data = data.filter(j => {
        if (j.state !== 'PLANNED' && j.state !== 'IN_PROGRESS') return false
        if (j.dueDate) {
          const dueDate = new Date(j.dueDate)
          return dueDate < today
        }
        return false
      })
    }

    // Sort
    if (sortColumn) {
      data.sort((a, b) => {
        const aVal = a[sortColumn]
        const bVal = b[sortColumn]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        if (sortColumn === 'dueDate' || sortColumn === 'actualCompletionDate' || sortColumn === 'createdAt') {
          const aTime = aVal ? new Date(String(aVal)).getTime() : 0
          const bTime = bVal ? new Date(String(bVal)).getTime() : 0
          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
        }

        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1
        if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    return data
  }, [records, searchTerm, filters, sortColumn, sortOrder])

  const handleSort = (column: keyof PmsJobRecord) => {
    setSortColumn(prevCol => {
      if (prevCol === column) {
        setSortOrder(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
        return prevCol
      }
      setSortOrder('desc')
      return column
    })
  }

  const handleSelectJob = (jobId: number) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedJobs.size === currentRecords.length) {
      setSelectedJobs(new Set())
    } else {
      setSelectedJobs(new Set(currentRecords.map(r => r.id!).filter(Boolean)))
    }
  }

  const handleBulkStart = async () => {
    if (selectedJobs.size === 0) {
      toast.error('Please select at least one job', { position: 'top-center' })
      return
    }
    try {
      const result = await bulkStartJobs(Array.from(selectedJobs))
      toast.success(`Started ${result.successful.length} job(s)${result.failed && Object.keys(result.failed).length > 0 ? `. ${Object.keys(result.failed).length} failed.` : ''}`, { position: 'top-center' })
      setSelectedJobs(new Set())
      loadData()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start jobs', { position: 'top-center' })
    }
  }

  const subcompaniesForChosenCompany = useMemo(() => {
    if (!filters.companyId) return []
    const cid = Number(filters.companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [filters.companyId, subcompanies])

  const filteredVessels = useMemo(() => {
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

  const handleView = (record: PmsJobRecord) => {
    setViewing(record)
    setViewOpen(true)
  }

  const handleStart = async (id: number) => {
    try {
      await startPmsJob(id)
      toast.success('Job started successfully', { position: 'top-center' })
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to start job', { position: 'top-center' })
    }
  }

  const handleComplete = (record: PmsJobRecord) => {
    setCompleting(record)
    setCompleteOpen(true)
  }

  const handleVerify = async (id: number) => {
    try {
      await verifyPmsJob(id)
      toast.success('Job verified successfully', { position: 'top-center' })
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify job', { position: 'top-center' })
    }
  }

  function getStateBadgeColor(state: PmsJobState): string {
    switch (state) {
      case 'PLANNED': return 'badge-light-primary'
      case 'IN_PROGRESS': return 'badge-light-warning'
      case 'COMPLETED': return 'badge-light-info'
      case 'VERIFIED': return 'badge-light-success'
      case 'CLOSED': return 'badge-light-success'
      case 'DEFERRED': return 'badge-light-secondary'
      case 'CANCELLED': return 'badge-light-danger'
      default: return 'badge-light'
    }
  }

  function getJobTypeBadgeColor(jobType?: string | null): string {
    if (!jobType) return 'badge-light'
    switch (jobType.toUpperCase()) {
      case 'I': return 'badge-light-info' // Inspect
      case 'G': return 'badge-light-primary' // General
      case 'O': return 'badge-light-warning' // Overhaul
      case 'C': return 'badge-light-secondary' // Conditional
      case 'A': return 'badge-light-success' // Adjust
      case 'R': return 'badge-light-danger' // Renew
      case 'S': return 'badge-light-info' // Service
      case 'T': return 'badge-light-primary' // Test
      case 'M': return 'badge-light-warning' // Maintenance
      case 'D': return 'badge-light-secondary' // Dismantle
      case 'L': return 'badge-light-success' // Lubricate
      default: return 'badge-light'
    }
  }

  function getJobTypeLabel(jobType?: string | null): string {
    if (!jobType) return '-'
    switch (jobType.toUpperCase()) {
      case 'I': return 'Inspect'
      case 'G': return 'General'
      case 'O': return 'Overhaul'
      case 'C': return 'Conditional'
      case 'A': return 'Adjust'
      case 'R': return 'Renew'
      case 'S': return 'Service'
      case 'T': return 'Test'
      case 'M': return 'Maintenance'
      case 'D': return 'Dismantle'
      case 'L': return 'Lubricate'
      default: return jobType
    }
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>PMS Jobs</h3>
                <span className='text-muted fs-7'>
                  Manage and track planned maintenance jobs
                </span>
              </div>
              <div className='card-toolbar d-flex gap-2'>
                {selectedJobs.size > 0 && (
                  <>
                    <button
                      type='button'
                      className='btn btn-sm btn-success'
                      onClick={handleBulkStart}
                    >
                      <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                      Start Selected ({selectedJobs.size})
                    </button>
                    <button
                      type='button'
                      className='btn btn-sm btn-warning'
                      onClick={() => {
                        if (selectedJobs.size === 0) {
                          toast.error('Please select at least one job', { position: 'top-center' })
                          return
                        }
                        setBatchActionOpen(true)
                      }}
                    >
                      <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-2' />
                      Batch Actions ({selectedJobs.size})
                    </button>
                    <button
                      type='button'
                      className='btn btn-sm btn-light'
                      onClick={() => setSelectedJobs(new Set())}
                    >
                      Clear Selection
                    </button>
                  </>
                )}
                <button 
                  type='button' 
                  className='btn btn-primary'
                  onClick={() => setCreateJobOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Create Job
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
                      {filteredVessels.map(v => (
                        <option key={v.id} value={String(v.id)}>
                          {(v as any).fleet_name || v.name || `Vessel ${v.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* State */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    State
                  </label>
                  <select
                    className='form-select'
                    name='state'
                    value={filters.state}
                    onChange={handleFilterChange}
                  >
                    <option value=''>All States</option>
                    <option value='PLANNED'>Planned</option>
                    <option value='IN_PROGRESS'>In Progress</option>
                    <option value='COMPLETED'>Completed</option>
                    <option value='VERIFIED'>Verified</option>
                    <option value='CLOSED'>Closed</option>
                    <option value='DEFERRED'>Deferred</option>
                    <option value='CANCELLED'>Cancelled</option>
                  </select>
                </div>

                {/* Criticality Filter */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Criticality
                  </label>
                  <select
                    className='form-select'
                    name='criticality'
                    value={filters.criticality}
                    onChange={handleFilterChange}
                  >
                    <option value=''>All</option>
                    <option value='CRITICAL'>Critical</option>
                    <option value='HIGH'>High</option>
                    <option value='MEDIUM'>Medium</option>
                    <option value='LOW'>Low</option>
                  </select>
                </div>

                {/* Schedule Type Filter */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Schedule Type
                  </label>
                  <select
                    className='form-select'
                    name='scheduleType'
                    value={filters.scheduleType}
                    onChange={handleFilterChange}
                  >
                    <option value=''>All</option>
                    <option value='TIME'>Time-based</option>
                    <option value='RUNNING_HOURS'>Running Hours</option>
                    <option value='HYBRID_WHICHEVER_FIRST'>Hybrid (Whichever First)</option>
                    <option value='HYBRID_BOTH_REQUIRED'>Hybrid (Both Required)</option>
                    <option value='EVENT'>Event-based</option>
                  </select>
                </div>

                {/* Overdue Only Toggle */}
                <div className='col-md-2 d-flex align-items-end'>
                  <div className='form-check form-switch'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      id='showOverdueOnly'
                      checked={filters.showOverdueOnly}
                      onChange={(e) => setFilters(prev => ({ ...prev, showOverdueOnly: e.target.checked }))}
                    />
                    <label className='form-check-label fw-semibold fs-7' style={{ color: '#A1A5B7' }} htmlFor='showOverdueOnly'>
                      Overdue Only
                    </label>
                  </div>
                </div>

                {/* From Date */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
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
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
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

                {/* Search */}
                <div className='col-md-2'>
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
                      placeholder='Job code, title...'
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
                        <th style={{ minWidth: '50px' }} className='text-center'>
                          <input
                            type='checkbox'
                            className='form-check-input'
                            checked={selectedJobs.size > 0 && selectedJobs.size === currentRecords.length}
                            onChange={handleSelectAll}
                            title='Select All'
                          />
                        </th>
                        <th style={{ minWidth: '70px' }} className='text-center text-nowrap'>
                          Sr/No
                        </th>
                        <th style={{ minWidth: '140px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Job Code</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('jobCode')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'jobCode'
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
                        <th style={{ minWidth: '100px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Job Type</span>
                          </div>
                        </th>
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
                        <th style={{ minWidth: '300px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Equipment &gt; Component/SubComponent</span>
                          </div>
                        </th>
                        <th style={{ minWidth: '250px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Task Description</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('title')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'title'
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
                        <th style={{ minWidth: '140px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Job Due Reason</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('dueDate')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'dueDate'
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
                        <th style={{ minWidth: '130px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Job Created</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('createdAt')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'createdAt'
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
                        <th style={{ minWidth: '130px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Last Job Done Date</span>
                          </div>
                        </th>
                        <th style={{ minWidth: '120px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>State</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('state')}
                              disabled={records.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'state'
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
                        <th style={{ minWidth: '200px', textAlign: 'center' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='table-body text-start'>
                      {loading ? (
                        <tr>
                          <td colSpan={14} className='text-center py-5'>
                            <div className='spinner-border' role='status'>
                              <span className='visually-hidden'>Loading...</span>
                            </div>
                          </td>
                        </tr>
                      ) : currentRecords.length === 0 ? (
                        <tr>
                          <td colSpan={14} className='text-center py-5 text-muted'>
                            No jobs found
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((record, idx) => {
                          // Build hierarchy with badges similar to ViewPlanModal
                          const hierarchyElements = []
                          if (record.equipmentName) {
                            hierarchyElements.push(
                              <span key="eq" className="badge badge-light-primary me-1">
                                <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-3 me-1' />
                                {record.equipmentName}
                              </span>
                            )
                          }
                          if (record.componentName) {
                            const isTarget = !record.subComponentName // Component is target if no subcomponent
                            hierarchyElements.push(
                              <span key="comp" className={`badge ${isTarget ? 'badge-light-warning' : 'badge-light-info'} me-1 ${isTarget ? 'fs-6' : ''}`}>
                                <KTSVG path='/media/icons/duotune/general/gen024.svg' className='svg-icon-3 me-1' />
                                {record.componentName}
                              </span>
                            )
                          }
                          if (record.subComponentName) {
                            hierarchyElements.push(
                              <span key="sub" className="badge badge-light-success me-1 fs-6">
                                <KTSVG path='/media/icons/duotune/general/gen023.svg' className='svg-icon-3 me-1' />
                                {record.subComponentName}
                              </span>
                            )
                          }

                          return (
                            <tr key={record.id}>
                              <td className='text-center'>
                                <input
                                  type='checkbox'
                                  className='form-check-input'
                                  checked={selectedJobs.has(record.id!)}
                                  onChange={() => handleSelectJob(record.id!)}
                                  title='Select Job'
                                />
                              </td>
                              <td className='text-center'>
                                {indexOfFirstRecord + idx + 1}
                              </td>
                              <td className='fw-semibold'>{record.jobCode || '-'}</td>
                              <td>
                                {record.jobType ? (
                                  <span className={`badge ${getJobTypeBadgeColor(record.jobType)}`} title={getJobTypeLabel(record.jobType)}>
                                    {record.jobType}
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td>{record.vesselName || '-'}</td>
                              <td>
                                <div className='d-flex flex-wrap align-items-center gap-1'>
                                  {hierarchyElements.length > 0 ? hierarchyElements : <span className='text-muted'>-</span>}
                                </div>
                              </td>
                              <td>
                                <span
                                  title={record.jobDescription || record.title}
                                  style={{
                                    maxWidth: '250px',
                                    display: 'inline-block',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {record.jobDescription || record.title || '-'}
                                </span>
                              </td>
                              <td className='text-nowrap'>
                                {record.scheduleType === 'HYBRID_WHICHEVER_FIRST' || record.scheduleType === 'HYBRID_BOTH_REQUIRED' ? (
                                  record.dueDate && record.dueCounter ? (
                                    (() => {
                                      const trigger = determineHybridTrigger(record)
                                      const dateStyle = trigger === 'counter' ? { opacity: 0.5 } : {}
                                      const counterStyle = trigger === 'date' ? { opacity: 0.5 } : {}
                                      return (
                                        <div>
                                          <span style={dateStyle}>{formatJobDate(record.dueDate)}</span> <span className="text-muted">OR</span> <span style={counterStyle}>{record.dueCounter.toLocaleString()} hrs</span>
                                          {isOverdue(record) && (
                                            <span className='badge badge-light-danger ms-2' title={`${getOverdueDays(record)} days overdue`}>
                                              {getOverdueDays(record)}d overdue
                                            </span>
                                          )}
                                        </div>
                                      )
                                    })()
                                  ) : record.dueDate ? (
                                    <div>
                                      {formatJobDate(record.dueDate)}
                                      {isOverdue(record) && (
                                        <span className='badge badge-light-danger ms-2' title={`${getOverdueDays(record)} days overdue`}>
                                          {getOverdueDays(record)}d overdue
                                        </span>
                                      )}
                                    </div>
                                  ) : record.dueCounter ? (
                                    <div>
                                      {record.dueCounter.toLocaleString()} hrs
                                    </div>
                                  ) : '-'
                                ) : record.dueDate ? (
                                  <div>
                                    {formatJobDate(record.dueDate)}
                                    {isOverdue(record) && (
                                      <span className='badge badge-light-danger ms-2' title={`${getOverdueDays(record)} days overdue`}>
                                        {getOverdueDays(record)}d overdue
                                      </span>
                                    )}
                                  </div>
                                ) : record.dueCounter ? (
                                  <div>
                                    {record.dueCounter.toLocaleString()} hrs
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className='text-nowrap'>
                                {formatJobDate(record.createdAt)}
                              </td>
                              <td className='text-nowrap'>
                                {formatJobDate(record.lastDoneDate)}
                              </td>
                              <td>
                                <span className={`badge ${getStateBadgeColor(record.state)}`}>
                                  {record.state}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className='d-flex justify-content-center gap-1'>
                                  <button
                                    className='btn btn-icon btn-sm'
                                    title='View'
                                    onClick={() => handleView(record)}
                                  >
                                    <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3 text-primary' />
                                  </button>
                                  {record.state === 'PLANNED' && (
                                    <button
                                      className='btn btn-sm btn-primary'
                                      onClick={() => handleStart(record.id!)}
                                      title='Start Job'
                                    >
                                      Start
                                    </button>
                                  )}
                                  {record.state === 'IN_PROGRESS' && (
                                    <button
                                      className='btn btn-sm btn-success'
                                      onClick={() => handleComplete(record)}
                                      title='Complete Job'
                                    >
                                      Complete
                                    </button>
                                  )}
                                  {record.state === 'COMPLETED' && (
                                    <button
                                      className='btn btn-sm btn-info'
                                      onClick={() => handleVerify(record.id!)}
                                      title='Verify Job'
                                    >
                                      Verify
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

      {viewOpen && viewing && (
        <PmsJobDetailModal
          visible={viewOpen}
          onClose={() => {
            setViewOpen(false)
            setViewing(null)
          }}
          record={viewing}
          onRefresh={loadData}
        />
      )}

      {completeOpen && completing && (
        <CompleteJobModal
          visible={completeOpen}
          onClose={() => {
            setCompleteOpen(false)
            setCompleting(null)
          }}
          job={completing}
          onSuccess={() => {
            setCompleteOpen(false)
            setCompleting(null)
            loadData()
          }}
        />
      )}

      <CreateUnplannedJobModal
        visible={createJobOpen}
        onClose={() => setCreateJobOpen(false)}
        onSuccess={() => {
          setCreateJobOpen(false)
          loadData()
        }}
        vessels={filteredVessels}
        companies={companies}
        subcompanies={subcompanies}
        showCompanyFilters={roleId !== 4}
        isCrew={isCrew}
      />

      <BatchJobActionModal
        visible={batchActionOpen}
        selectedJobIds={Array.from(selectedJobs)}
        onClose={() => {
          setBatchActionOpen(false)
        }}
        onSuccess={() => {
          setSelectedJobs(new Set())
          loadData()
        }}
      />
    </div>
  )
}

export default PmsJobListPage
