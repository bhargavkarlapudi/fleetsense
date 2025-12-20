import { FC, useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import {
  getCargoOperations,
  getVesselList,
  getCompanyList,
  getCompanyAdminList,
  type CargoOperationFilters,
  type CargoOperationPageResponse,
} from '../core/_requests'
import { CargoOperation, Vessel } from '../core/_models'
import { useAuth } from '../../auth'
import AddCargoModal from './AddCargoModal'
import EditCargoModal from './EditCargoModal'
import ViewCargoModal from './ViewCargoModal'
import { toast } from 'react-toastify'

type CompanyGroup = { id: number; name: string }
type Subcompany = { id: number; name: string; companyId: number }

const CargoPage: FC = () => {
  const { currentUser, auth } = useAuth()
  const roleId: number =
    Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  const [cargoData, setCargoData] = useState<CargoOperationPageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1) // 1-based like Defect list
  const [pageSize, setPageSize] = useState(10)
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  const [subcompanies, setSubcompanies] = useState<Subcompany[]>([])
  const [subcompanyId, setSubcompanyId] = useState<string>('')
  const [didAutoSelectVessel, setDidAutoSelectVessel] = useState(false)

  type SortColumn =
    | ''
    | 'vesselName'
    | 'voyageNumber'
    | 'breakupType'
    | 'detailsCount'
    | 'remarks'
    | 'createdDateTime'

  const [sortColumn, setSortColumn] = useState<SortColumn>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Filters
  const [filters, setFilters] = useState<CargoOperationFilters>({
    companyId: null,
    vesselId: null,
    breakupType: null,
    fromDate: null,
    toDate: null,
    searchText: null,
  })

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedCargo, setSelectedCargo] = useState<CargoOperation | null>(null)

  useEffect(() => {
    loadVessels()
    loadLookups()
  }, [])

  useEffect(() => {
    loadCargoOperations()
  }, [currentPage, pageSize, filters])

  const loadLookups = async () => {
    try {
      const [groupsRaw, adminsRaw] = await Promise.all([
        getCompanyAdminList?.().catch(() => []),
        getCompanyList?.().catch(() => []),
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

      setCompanies(groups.filter((g) => Number.isFinite(g.id)))
      setSubcompanies(admins.filter((a) => Number.isFinite(a.id) && Number.isFinite(a.companyId)))
    } catch (e) {
      console.error('Failed to load company lookups', e)
      setCompanies([])
      setSubcompanies([])
    }
  }

  const loadVessels = async () => {
    try {
      const data = await getVesselList()
      setVessels(data)
    } catch (error) {
      console.error('Error loading vessels:', error)
    }
  }

  const vesselsForFilters = useMemo(() => {
    let list = vessels
    if (filters.companyId) {
      const cid = Number(filters.companyId)
      list = list.filter((v: any) =>
        Number(v.companyGroupAdmin?.id ?? v.companyGroupId) === cid
      )
    }
    if (subcompanyId) {
      const scid = Number(subcompanyId)
      list = list.filter((v: any) =>
        Number(v.companyAdmin?.id ?? v.companyId) === scid
      )
    }
    return list
  }, [vessels, filters.companyId, subcompanyId])

  const subcompaniesForChosenCompany = useMemo(() => {
    if (!filters.companyId) return []
    const cid = Number(filters.companyId)
    return subcompanies.filter((sc) => sc.companyId === cid)
  }, [filters.companyId, subcompanies])

  // Auto-select default vessel once (like Defect List)
  useEffect(() => {
    if (didAutoSelectVessel) return
    const firstVessel = vesselsForFilters[0]
    if (!firstVessel) return

    setFilters((prev) => {
      if (prev.vesselId) return prev
      return {
        ...prev,
        vesselId: firstVessel.id,
      }
    })
    setDidAutoSelectVessel(true)
  }, [vesselsForFilters, didAutoSelectVessel])

  const loadCargoOperations = async () => {
    setLoading(true)
    try {
      const data = await getCargoOperations({
        ...filters,
        page: currentPage - 1, // backend is 0-based, UI is 1-based
        size: pageSize,
      })
      setCargoData(data)
    } catch (error: any) {
      toast.error(error.message || 'Error loading cargo operations', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (name: keyof CargoOperationFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [name]: value }))
    setCurrentPage(1)
    // reset sort when filters change substantially
    setSortColumn('')
    setSortOrder('asc')
  }

  const handleClearFilters = () => {
    setFilters({
      companyId: null,
      vesselId: null,
      breakupType: null,
      fromDate: null,
      toDate: null,
      searchText: null,
    })
    setSubcompanyId('')
    setCurrentPage(1)
    setSortColumn('')
    setSortOrder('asc')
  }

  const handleAddSuccess = () => {
    setIsAddModalOpen(false)
    loadCargoOperations()
    toast.success('Cargo operation created successfully', { position: 'top-center' })
  }

  const handleEditSuccess = () => {
    setIsEditModalOpen(false)
    setSelectedCargo(null)
    loadCargoOperations()
    toast.success('Cargo operation updated successfully', { position: 'top-center' })
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this cargo operation?')) return

    try {
      const { deleteCargoOperation } = await import('../core/_requests')
      await deleteCargoOperation(id)
      loadCargoOperations()
      toast.success('Cargo operation deleted successfully', { position: 'top-center' })
    } catch (error: any) {
      toast.error(error.message || 'Error deleting cargo operation', { position: 'top-center' })
    }
  }

  const handleView = (cargo: CargoOperation) => {
    setSelectedCargo(cargo)
    setIsViewModalOpen(true)
  }

  const handleEdit = (cargo: CargoOperation) => {
    setSelectedCargo(cargo)
    setIsEditModalOpen(true)
  }

  const totalPages = cargoData?.totalPages || 0
  const totalElements = cargoData?.totalElements || 0

  const sortedContent = useMemo(() => {
    if (!cargoData?.content) return []
    const rows = [...cargoData.content]
    if (!sortColumn) return rows

    rows.sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortColumn) {
        case 'vesselName':
          aVal = a.vesselName || ''
          bVal = b.vesselName || ''
          break
        case 'voyageNumber':
          aVal = a.voyageNumber || ''
          bVal = b.voyageNumber || ''
          break
        case 'breakupType':
          aVal = a.breakupType || ''
          bVal = b.breakupType || ''
          break
        case 'detailsCount':
          aVal = a.details?.length || 0
          bVal = b.details?.length || 0
          break
        case 'remarks':
          aVal = a.remarks || ''
          bVal = b.remarks || ''
          break
        case 'createdDateTime':
          aVal = a.createdDateTime ? new Date(a.createdDateTime).getTime() : 0
          bVal = b.createdDateTime ? new Date(b.createdDateTime).getTime() : 0
          break
        default:
          aVal = ''
          bVal = ''
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        const diff = aVal - bVal
        return sortOrder === 'asc' ? diff : -diff
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()

      if (aStr < bStr) return sortOrder === 'asc' ? -1 : 1
      if (aStr > bStr) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return rows
  }, [cargoData, sortColumn, sortOrder])

  const handleSort = (column: SortColumn) => {
    setSortColumn((prevCol) => {
      if (prevCol === column) {
        setSortOrder((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'))
        return prevCol
      }
      setSortOrder('asc')
      return column
    })
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Cargo Operations</h3>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add Cargo Operation
                </button>
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              {/* Filters */}
              <div className='row gx-3 gy-3 mb-4'>
                {/* Company */}
                {!isCrew && (
                  <div className='col-md-2'>
                    <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                      Company
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
                      value={filters.companyId || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        handleFilterChange('companyId', val ? Number(val) : null)
                        setSubcompanyId('')
                        handleFilterChange('vesselId', null)
                      }}
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

                {/* Subcompany (conditional) */}
                {!isCrew && subcompaniesForChosenCompany.length > 0 && (
                  <div className='col-md-2'>
                    <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                      Subcompany
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
                      value={subcompanyId}
                      onChange={(e) => {
                        const val = e.target.value
                        setSubcompanyId(val)
                        handleFilterChange('vesselId', null)
                      }}
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

                {/* Vessel (required in forms; optional in filters) */}
                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Vessel
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
                    value={filters.vesselId || ''}
                    onChange={(e) =>
                      handleFilterChange(
                        'vesselId',
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value=''>All Vessels</option>
                    {vesselsForFilters.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.fleet_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Breakup Type
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
                    value={filters.breakupType || ''}
                    onChange={(e) => handleFilterChange('breakupType', e.target.value || null)}
                  >
                    <option value=''>All Types</option>
                    <option value='TANK'>Tank</option>
                    <option value='HOLD'>Hold</option>
                  </select>
                </div>

                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    From Date
                  </label>
                  <input
                    type='date'
                    className='form-control'
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      fontSize: '14px',
                      padding: '8px 12px',
                      color: '#5E6278',
                    }}
                    value={filters.fromDate || ''}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value || null)}
                  />
                </div>

                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    To Date
                  </label>
                  <input
                    type='date'
                    className='form-control'
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      fontSize: '14px',
                      padding: '8px 12px',
                      color: '#5E6278',
                    }}
                    value={filters.toDate || ''}
                    onChange={(e) => handleFilterChange('toDate', e.target.value || null)}
                  />
                </div>

                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Search
                  </label>
                  <input
                    type='text'
                    className='form-control'
                    placeholder='Search remarks or cargo name...'
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      fontSize: '14px',
                      padding: '8px 12px',
                      color: '#5E6278',
                    }}
                    value={filters.searchText || ''}
                    onChange={(e) => handleFilterChange('searchText', e.target.value || null)}
                  />
                </div>

                <div className='col-md-12 d-flex align-items-end gap-2'>
                  <button
                    type='button'
                    className='btn btn_primary'
                    onClick={loadCargoOperations}
                  >
                    Search
                  </button>
                  <button
                    type='button'
                    className='btn btn-light'
                    style={{
                      fontSize: '14px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      height: 'fit-content'
                    }}
                    onClick={handleClearFilters}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className='report-table table-responsive' style={{ position: 'relative' }}>
                <table className='table table-bordered align-middle'>
                  <thead className='table-header text-start'>
                    <tr>
                      <th style={{ width: '60px' }}>Sr/No</th>
                      <th style={{ minWidth: '160px' }}>
                        <div className='d-flex align-items-center text-nowrap'>
                          <span className='me-1'>Vessel</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('vesselName')}
                            disabled={!cargoData?.content?.length}
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
                      <th style={{ minWidth: '140px' }}>
                        <div className='d-flex align-items-center text-nowrap'>
                          <span className='me-1'>Voyage</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('voyageNumber')}
                            disabled={!cargoData?.content?.length}
                          >
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortColumn === 'voyageNumber'
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
                          <span className='me-1'>Breakup Type</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('breakupType')}
                            disabled={!cargoData?.content?.length}
                          >
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortColumn === 'breakupType'
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
                      <th style={{ minWidth: '120px' }}>
                        <div className='d-flex align-items-center text-nowrap'>
                          <span className='me-1'>Details Count</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('detailsCount')}
                            disabled={!cargoData?.content?.length}
                          >
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortColumn === 'detailsCount'
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
                          <span className='me-1'>Remarks</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('remarks')}
                            disabled={!cargoData?.content?.length}
                          >
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortColumn === 'remarks'
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
                          <span className='me-1'>Created Date</span>
                          <button
                            type='button'
                            className='btn btn-link p-0 m-0 pb-1'
                            onClick={() => handleSort('createdDateTime')}
                            disabled={!cargoData?.content?.length}
                          >
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortColumn === 'createdDateTime'
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
                      <th className='text-center' style={{ minWidth: '140px' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='table-body text-start'>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className='text-center py-5'>
                          <div className='spinner-border' role='status'>
                            <span className='visually-hidden'>Loading...</span>
                          </div>
                        </td>
                      </tr>
                    ) : !sortedContent.length ? (
                      <tr>
                        <td colSpan={8} className='text-center text-muted py-5'>
                          No cargo operations found.
                        </td>
                      </tr>
                    ) : (
                      sortedContent.map((cargo, index) => (
                        <tr key={cargo.id}>
                          <td className='text-center text-dark fs-6'>
                            {(currentPage - 1) * pageSize + index + 1}
                          </td>
                          <td className='text-dark fw-semibold fs-6'>
                            {cargo.vesselName || 'N/A'}
                          </td>
                          <td className='text-dark fs-6'>{cargo.voyageNumber || 'N/A'}</td>
                          <td className='text-dark fs-6'>{cargo.breakupType}</td>
                          <td className='text-dark fs-6'>
                            {cargo.details?.length || 0}
                          </td>
                          <td
                            className='text-dark fs-6'
                            style={{
                              maxWidth: '200px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={cargo.remarks || '-'}
                          >
                            {cargo.remarks || '-'}
                          </td>
                          <td className='text-dark fs-6'>
                            {cargo.createdDateTime
                              ? new Date(cargo.createdDateTime).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className='text-center'>
                            <div className='d-flex justify-content-center gap-2'>
                              <button
                                className='btn btn-sm btn-icon'
                                onClick={() => handleView(cargo)}
                                title='View'
                              >
                                <KTSVG
                                  path='/media/map/ph_eye.svg'
                                  className='svg-icon-3 text-primary'
                                />
                              </button>
                              <button
                                className='btn btn-sm btn-icon'
                                onClick={() => handleEdit(cargo)}
                                title='Edit'
                              >
                                <KTSVG
                                  path='/media/map/edit-active.svg'
                                  className='svg-icon-3'
                                />
                              </button>
                              <button
                                className='btn btn-sm btn-icon'
                                onClick={() => cargo.id && handleDelete(cargo.id)}
                                title='Delete'
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
                {/* Pagination – styled like Defect list */}
              {cargoData && totalPages > 0 && (
                <div className='d-flex justify-content-between align-items-center py-3 border-top'>
                  <div className='d-flex align-items-center'>
                    <span className='text-muted me-2 ms-2'>Rows per page</span>
                    <select
                      className='form-select'
                      style={{
                        width: '70px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        padding: '4px 8px',
                      }}
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className='d-flex align-items-center me-2'>
                    <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                      Showing{' '}
                      <strong>
                        {totalElements > 0
                          ? (currentPage - 1) * pageSize + 1
                          : 0}
                        -
                        {Math.min(currentPage * pageSize, totalElements)}
                      </strong>{' '}
                      of <strong>{totalElements}</strong>
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
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                                  onClick={() => setCurrentPage(1)}
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
                                    style={{
                                      backgroundColor: 'transparent',
                                      padding: '4px 8px',
                                    }}
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
                                  onClick={() => setCurrentPage(i)}
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
                                    style={{
                                      backgroundColor: 'transparent',
                                      padding: '4px 8px',
                                    }}
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
                                  onClick={() => setCurrentPage(totalPages)}
                                >
                                  {totalPages}
                                </button>
                              </li>
                            )
                          }

                          return pages
                        })()}

                        <li
                          className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}
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
                            onClick={() =>
                              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                            }
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

      {/* Modals */}
      <AddCargoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        companies={companies}
        subcompanies={subcompanies}
        vessels={vessels}
      />
      {selectedCargo && (
        <>
          <EditCargoModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false)
              setSelectedCargo(null)
            }}
            cargo={selectedCargo}
            onSuccess={handleEditSuccess}
          />
          <ViewCargoModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false)
              setSelectedCargo(null)
            }}
            cargo={selectedCargo}
          />
        </>
      )}
    </div>
  )
}

export default CargoPage

