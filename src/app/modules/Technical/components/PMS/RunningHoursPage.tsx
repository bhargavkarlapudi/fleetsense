import React, { FC, useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { useAuth } from '../../../auth'
import { getVesselList } from '../../../Management/core/_requests'
import { getRunningHourCounters, createRunningHourReading, updateRunningHourCounter } from '../../core/pms/_requests'
import { getEquipmentByVessel } from '../../core/_requests'
import { RunningHourCounterDto, RunningHourReadingDto } from '../../core/pms/_models'
import { EquipmentDto } from '../../core/_models'
import { toast } from 'react-toastify'
import { RunningHoursModal } from './RunningHoursModal'
import { EditCounterModal } from './EditCounterModal'
import { BulkUploadModal } from './BulkUploadModal'
import type { Vessel } from '../../../Management/core/_models'

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

const RunningHoursPage: FC = () => {
  const { currentUser, auth } = useAuth()
  const roleId = Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  const [filters, setFilters] = useState<{
    companyId: string
    subcompanyId: string
    vesselId: string
    equipmentId: string
  }>({
    companyId: '',
    subcompanyId: '',
    vesselId: '',
    equipmentId: '',
  })

  const [counters, setCounters] = useState<RunningHourCounterDto[]>([])
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [subcompaniesForChosenCompany, setSubcompaniesForChosenCompany] = useState<Subcompany[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselsScoped, setVesselsScoped] = useState<Vessel[]>([])
  const [equipment, setEquipment] = useState<EquipmentDto[]>([])
  const [loadingLookups, setLoadingLookups] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCounter, setSelectedCounter] = useState<RunningHourCounterDto | null>(null)
  const [editCounterOpen, setEditCounterOpen] = useState(false)
  const [editingCounter, setEditingCounter] = useState<RunningHourCounterDto | null>(null)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')

  // Sorting
  const [sortColumn, setSortColumn] = useState<keyof RunningHourCounterDto | ''>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadLookups()
  }, [])

  useEffect(() => {
    if (filters.vesselId) {
      loadEquipment(Number(filters.vesselId))
    } else {
      setEquipment([])
    }
  }, [filters.vesselId])

  useEffect(() => {
    loadCounters()
  }, [filters.vesselId, filters.equipmentId])

  const loadLookups = async () => {
    setLoadingLookups(true)
    try {
      const [groupsRaw, adminsRaw, vesselsData] = await Promise.all([
        import('../../../Management/core/_requests').then(m => m.getCompanyAdminList?.().catch(() => [])),
        import('../../../Management/core/_requests').then(m => m.getCompanyList?.().catch(() => [])),
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
          equipmentId: '',
        })
      }
    } catch (error) {
      console.error('Error loading lookups:', error)
    } finally {
      setLoadingLookups(false)
    }
  }

  const loadEquipment = async (vesselId: number) => {
    try {
      const data = await getEquipmentByVessel(vesselId)
      setEquipment(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
    }
  }

  const loadCounters = async () => {
    setLoading(true)
    try {
      const vesselId = filters.vesselId ? Number(filters.vesselId) : undefined
      const data = await getRunningHourCounters(vesselId)
      setCounters(data)
    } catch (error) {
      console.error('Error loading counters:', error)
      toast.error('Failed to load running hour counters')
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
        next.equipmentId = ''
      }
      if (name === 'subcompanyId') {
        next.vesselId = ''
        next.equipmentId = ''
      }
      if (name === 'vesselId') {
        next.equipmentId = ''
      }
      return next
    })
  }

  const handleClearFilters = () => {
    setFilters({
      companyId: '',
      subcompanyId: '',
      vesselId: '',
      equipmentId: '',
    })
    setSearchTerm('')
  }

  const filteredData = useMemo(() => {
    let data = [...counters]

    // Filter by equipment
    if (filters.equipmentId) {
      const eqId = Number(filters.equipmentId)
      data = data.filter(c => c.equipmentId === eqId)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      data = data.filter(c =>
        c.name.toLowerCase().includes(term) ||
        (c.equipmentName && c.equipmentName.toLowerCase().includes(term))
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

        const aStr = String(aVal).toLowerCase()
        const bStr = String(bVal).toLowerCase()
        if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1
        if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1
        return 0
      })
    }

    return data
  }, [counters, filters.equipmentId, searchTerm, sortColumn, sortOrder])

  const handleSort = (column: keyof RunningHourCounterDto) => {
    setSortColumn(prevCol => {
      if (prevCol === column) {
        setSortOrder(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'))
        return prevCol
      }
      setSortOrder('asc')
      return column
    })
  }

  const subcompaniesForChosenCompanyMemo = useMemo(() => {
    if (!filters.companyId) return []
    const cid = Number(filters.companyId)
    return subcompanies.filter(sc => sc.companyId === cid)
  }, [filters.companyId, subcompanies])

  useEffect(() => {
    setSubcompaniesForChosenCompany(subcompaniesForChosenCompanyMemo)
  }, [subcompaniesForChosenCompanyMemo])

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

  const handleAddReading = (counter: RunningHourCounterDto) => {
    setSelectedCounter(counter)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedCounter(null)
  }

  const handleModalSuccess = () => {
    handleModalClose()
    loadCounters()
  }

  const handleEditCounter = (counter: RunningHourCounterDto) => {
    setEditingCounter(counter)
    setEditCounterOpen(true)
  }

  const handleEditCounterSuccess = () => {
    setEditCounterOpen(false)
    setEditingCounter(null)
    loadCounters()
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Running Hours</h3>
                <span className='text-muted fs-7'>
                  Manage running hour counters and readings for equipment
                </span>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn-sm btn-light-primary me-2 btn-outline'
                  onClick={() => setBulkUploadOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/files/fil003.svg' className='svg-icon-3 me-1' />
                  Bulk Upload
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

                {/* Equipment */}
                {filters.vesselId && (
                  <div className='col-md-2'>
                    <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                      Equipment
                    </label>
                    <select
                      className='form-select'
                      name='equipmentId'
                      value={filters.equipmentId}
                      onChange={handleFilterChange}
                    >
                      <option value=''>All Equipment</option>
                      {equipment.map(eq => (
                        <option key={eq.id} value={String(eq.id)}>
                          {eq.name} {eq.code && `(${eq.code})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Search */}
                <div className='col-md-3'>
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
                      placeholder='Counter name, equipment...'
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
                            <span className='me-1'>Counter Name</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('name')}
                              disabled={counters.length === 0}
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
                          </div>
                        </th>
                        <th style={{ minWidth: '200px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Equipment</span>
                          </div>
                        </th>
                        <th style={{ minWidth: '150px' }}>
                          <div className='d-flex align-items-center text-nowrap'>
                            <span className='me-1'>Current Value</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('currentValue')}
                              disabled={counters.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'currentValue'
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
                            <span className='me-1'>Last Updated</span>
                            <button
                              type='button'
                              className='btn btn-link p-0 m-0 pb-1'
                              onClick={() => handleSort('lastUpdatedAt')}
                              disabled={counters.length === 0}
                            >
                              <KTSVG
                                path={`/media/map/sort-col-${
                                  sortColumn === 'lastUpdatedAt'
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
                            No running hour counters found
                          </td>
                        </tr>
                      ) : (
                        currentRecords.map((counter, idx) => (
                          <tr key={counter.id}>
                            <td className='text-center'>
                              {indexOfFirstRecord + idx + 1}
                            </td>
                            <td className='fw-semibold'>{counter.name}</td>
                            <td>{counter.vesselName || '-'}</td>
                            <td>{counter.equipmentName || '-'}</td>
                            <td className='text-end'>{counter.currentValue.toLocaleString()}</td>
                            <td>
                              {counter.lastUpdatedAt
                                ? new Date(counter.lastUpdatedAt).toLocaleString()
                                : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <div className='d-flex justify-content-center gap-1'>
                                <button
                                  className='btn btn-sm btn-primary'
                                  onClick={() => handleAddReading(counter)}
                                >
                                  Add Reading
                                </button>
                                <button
                                  className='btn btn-sm btn-light'
                                  onClick={() => handleEditCounter(counter)}
                                  title='Edit Counter'
                                >
                                  <KTSVG path='/media/icons/duotune/general/gen055.svg' className='svg-icon-3' />
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

      {modalOpen && selectedCounter && (
        <RunningHoursModal
          visible={modalOpen}
          onClose={handleModalClose}
          counter={selectedCounter}
          onSuccess={handleModalSuccess}
        />
      )}

      {editCounterOpen && editingCounter && (
        <EditCounterModal
          visible={editCounterOpen}
          onClose={() => {
            setEditCounterOpen(false)
            setEditingCounter(null)
          }}
          counter={editingCounter}
          onSuccess={handleEditCounterSuccess}
        />
      )}

      <BulkUploadModal
        visible={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() => {
          loadCounters()
        }}
      />
    </div>
  )
}

export default RunningHoursPage
