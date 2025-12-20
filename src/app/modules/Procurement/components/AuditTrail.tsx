import { FC, useState, useMemo } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'

type AuditRecord = {
  id: number
  timestamp: string
  user: string
  role: string
  module: string
  action: string
  entity: string
  description: string
}

const mockAuditData: AuditRecord[] = [
  {
    id: 1,
    timestamp: '2024-01-31 14:30:15',
    user: 'Captain Smith',
    role: 'Master',
    module: 'Requisitions',
    action: 'CREATE',
    entity: 'REQ-2024-004',
    description: 'Created new requisition for Engine Oil Filter'
  },
  {
    id: 2,
    timestamp: '2024-01-31 13:45:22',
    user: 'John Smith',
    role: 'Chief Engineer',
    module: 'Approvals',
    action: 'APPROVE',
    entity: 'REQ-2024-001',
    description: 'Approved requisition for Main Engine Cyli...'
  },
  {
    id: 3,
    timestamp: '2024-01-31 12:20:45',
    user: 'Sarah Wilson',
    role: 'Procurement Manager',
    module: 'RFQ',
    action: 'CREATE',
    entity: 'RFQ-2024-005',
    description: 'Created RFQ for Navigation Equipment'
  },
  {
    id: 4,
    timestamp: '2024-01-31 11:15:30',
    user: 'Marine Parts Singapore',
    role: 'Vendor',
    module: 'Quotation Management',
    action: 'SUBMIT',
    entity: 'QUO-2024-001',
    description: 'Submitted quotation for RFQ-2024-001'
  },

]

const AuditTrail: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [auditData] = useState<AuditRecord[]>(mockAuditData)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AuditRecord | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })

  const [filters, setFilters] = useState({
    module: '',
    action: '',
    date: ''
  })

  // Calculate summary statistics
  const totalEvents = auditData.length
  const activeUsers = new Set(auditData.map(d => d.user)).size
  const modulesUsed = new Set(auditData.map(d => d.module)).size
  const todayEvents = auditData.filter(d => {
    const today = new Date().toISOString().split('T')[0]
    return d.timestamp.split(' ')[0] === today
  }).length

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const filteredData = useMemo(() => {
    return auditData.filter(record => {
      const matchesSearch = searchTerm === '' ||
        record.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesModule = filters.module === '' || record.module === filters.module
      const matchesAction = filters.action === '' || record.action === filters.action

      return matchesSearch && matchesModule && matchesAction
    })
  }, [searchTerm, auditData, filters])

  const sortedData = useMemo(() => {
    let sortedRecords = [...filteredData]

    if (sortConfig.key !== null) {
      sortedRecords.sort((a, b) => {
        const aVal = String(a[sortConfig.key!] || '').toLowerCase()
        const bVal = String(b[sortConfig.key!] || '').toLowerCase()

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [filteredData, sortConfig])

  const handleSort = (key: keyof AuditRecord) => {
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

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      'CREATE': 'bg-success',
      'UPDATE': 'bg-primary',
      'DELETE': 'bg-danger',
      'APPROVE': 'bg-info',
      'REJECT': 'bg-warning',
      'SUBMIT': 'bg-secondary',
      'VIEW': 'bg-light text-dark'
    }
    return (
      <span className={`badge ${actionColors[action] || 'bg-secondary'} text-white`}>
        {action}
      </span>
    )
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Audit Trail</h3>
                <p className='text-muted mb-0'>Complete transaction log and system activity tracking</p>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr078.svg' className='svg-icon-2' />
                  Export Log
                </button>
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              {/* Summary Cards */}
              <div className="row mb-4">
                {[
                  { title: "Total Events", value: totalEvents.toString(), path: "/media/icons/duotune/general/gen049.svg", color: "primary" },
                  { title: "Active Users", value: activeUsers.toString(), path: "/media/icons/duotune/communication/com006.svg", color: "success" },
                  { title: "Modules Used", value: modulesUsed.toString(), path: "/media/icons/duotune/coding/cod001.svg", color: "info" },
                  { title: "Today's Events", value: todayEvents.toString(), path: "/media/icons/duotune/general/gen014.svg", color: "warning" },
                ].map((card, index) => (
                  <div key={index} className="col-md-3 mb-3">
                    <div className="custom-card p-3">
                      <div className='d-flex justify-content-between'>
                        <div>
                          <h2 className="fw-bold mb-1">{card.value}</h2>
                          <h6 className="card-title">{card.title}</h6>
                        </div>
                        <KTSVG path={card.path} className='svg-icon svg-icon-2x' />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search and Filters Row */}
              <div className='row gx-3 gy-3 mb-4'>
                <div className='col-md-4'>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Search</label>
                  <div className='position-relative'>
                    <div
                      className='position-absolute ms-3'
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <KTSVG
                        path='/media/icons/duotune/general/gen021.svg'
                        className='svg-icon-2'
                      />
                    </div>
                    <input
                      type='text'
                      className='form-control form-control-sm ps-10'
                      placeholder='Search by description, entity, or user...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    All Modules
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
                    value={filters.module}
                    onChange={(e) => handleFilterChange('module', e.target.value)}
                  >
                    <option value=''>All Modules</option>
                    <option value='Requisitions'>Requisitions</option>
                    <option value='Approvals'>Approvals</option>
                    <option value='RFQ'>RFQ</option>
                    <option value='Quotation Management'>Quotation Management</option>
                    <option value='Purchase Orders'>Purchase Orders</option>
                    <option value='Goods Receipt'>Goods Receipt</option>
                    <option value='Invoice Management'>Invoice Management</option>
                    <option value='User Management'>User Management</option>
                  </select>
                </div>

                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    All Actions
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
                    value={filters.action}
                    onChange={(e) => handleFilterChange('action', e.target.value)}
                  >
                    <option value=''>All Actions</option>
                    <option value='CREATE'>Create</option>
                    <option value='UPDATE'>Update</option>
                    <option value='DELETE'>Delete</option>
                    <option value='APPROVE'>Approve</option>
                    <option value='REJECT'>Reject</option>
                    <option value='SUBMIT'>Submit</option>
                    <option value='VIEW'>View</option>
                  </select>
                </div>

                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    Date
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
                    value={filters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                  />
                </div>
              </div>

              {/* Activity Log Table */}
              <div className='mb-8'>
                <h4 className='fw-bold text-primary mb-4'>Activity Log ({sortedData.length} entries)</h4>
                <div className='report-table table-responsive'>
                  <div style={{ overflowX: 'auto' }}>
                    <table className='table table-bordered align-middle'>
                      <thead className='table-header text-start'>
                        <tr>
                          <th onClick={() => handleSort('timestamp')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                            <div className='d-flex align-items-center'>
                              <span style={{ color: '#3F4254', fontWeight: 600 }}>TIMESTAMP</span>
                              <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG
                                  path={`/media/map/sort-col-${sortConfig.key === 'timestamp' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </div>
                          </th>
                          <th onClick={() => handleSort('user')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                            <div className='d-flex align-items-center'>
                              <span style={{ color: '#3F4254', fontWeight: 600 }}>USER</span>
                              <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG
                                  path={`/media/map/sort-col-${sortConfig.key === 'user' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </div>
                          </th>
                          <th onClick={() => handleSort('module')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                            <div className='d-flex align-items-center'>
                              <span style={{ color: '#3F4254', fontWeight: 600 }}>MODULE</span>
                              <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG
                                  path={`/media/map/sort-col-${sortConfig.key === 'module' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </div>
                          </th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ACTION</th>
                          <th onClick={() => handleSort('entity')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                            <div className='d-flex align-items-center'>
                              <span style={{ color: '#3F4254', fontWeight: 600 }}>ENTITY</span>
                              <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG
                                  path={`/media/map/sort-col-${sortConfig.key === 'entity' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </div>
                          </th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>DESCRIPTION</th>
                          <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className='table-body text-start'>
                        {currentRecords.length === 0 ? (
                          <tr>
                            <td colSpan={7} className='text-center text-muted py-5'>
                              No audit records found for the selected criteria.
                            </td>
                          </tr>
                        ) : (
                          currentRecords.map((record) => (
                            <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                              <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.timestamp}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <div className='text-dark fw-semibold fs-6'>{record.user}</div>
                                <div className='text-muted fs-7'>{record.role}</div>
                              </td>
                              <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                <div className='d-flex align-items-center'>
                                  <KTSVG path='/media/icons/duotune/files/fil003.svg' className='svg-icon-3 me-2' />
                                  {record.module}
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>{getActionBadge(record.action)}</td>
                              <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>{record.entity}</td>
                              <td className='text-dark fs-6' style={{ padding: '12px 16px', maxWidth: '400px' }}>{record.description}</td>
                              <td className='text-center' style={{ padding: '12px 16px' }}>
                                <button className='btn btn-sm px-0' title='View'>
                                  <KTSVG path='/media/map/ph_eye.svg' />
                                </button>
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
                        Showing <strong>{currentRecords.length > 0 ? ((currentPage - 1) * rowsPerPage) + 1 : 0}-{Math.min(currentPage * rowsPerPage, sortedData.length)}</strong> of <strong>{sortedData.length}</strong>
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

                          <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
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
      </div>
    </div>
  )
}

export default AuditTrail