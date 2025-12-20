import { FC, useState, useMemo } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'

type DeliveryRecord = {
  id: number
  deliveryNumber: string
  status: 'In Transit' | 'Preparing' | 'Delivered' | 'Delayed'
  priority: 'High Priority' | 'Medium Priority' | 'Low Priority'
  itemName: string
  vendor: string
  port: string
  dueDate: string
  eta: string
  value: string
  currentLocation: string
  contact: string
  email: string
  progress: number
}

const mockDeliveryData: DeliveryRecord[] = [
  {
    id: 1,
    deliveryNumber: 'DEL-2024-001',
    status: 'In Transit',
    priority: 'High Priority',
    itemName: 'Main Engine Cylinder Head Gasket Set',
    vendor: 'Marine Parts Singapore',
    port: 'Singapore',
    dueDate: '2024-02-01',
    eta: '2024-01-30 14:00',
    value: '$11,200',
    currentLocation: 'Singapore Port - Terminal 3',
    contact: 'Mr. Wong Wei Ming',
    email: 'wong@sms.com.sg',
    progress: 60
  },
  {
    id: 2,
    deliveryNumber: 'DEL-2024-002',
    status: 'Preparing',
    priority: 'High Priority',
    itemName: 'Immersion Suits Safety Equipment',
    vendor: 'Safety Marine Equipment',
    port: 'Dubai',
    dueDate: '2024-01-30',
    eta: '2024-01-29 10:00',
    value: '$3,480',
    currentLocation: 'Dubai Maritime City - Warehouse',
    contact: 'Mr. Ahmed Hassan',
    email: 'ahmed@sme.ae',
    progress: 30
  },
  {
    id: 3,
    deliveryNumber: 'DEL-2024-003',
    status: 'Delivered',
    priority: 'Medium Priority',
    itemName: 'Navigation Radar Magnetron',
    vendor: 'Euro Marine Supply',
    port: 'Rotterdam',
    dueDate: '2024-01-25',
    eta: '2024-01-25 08:00',
    value: '$8,200',
    currentLocation: 'Vessel - Bridge Storage',
    contact: 'Mr. Jan Vermeer',
    email: 'jan@euromarine.nl',
    progress: 100
  },
  {
    id: 4,
    deliveryNumber: 'DEL-2024-004',
    status: 'In Transit',
    priority: 'Low Priority',
    itemName: 'Hydraulic Pump Assembly',
    vendor: 'Baltic Ship Parts',
    port: 'Hamburg',
    dueDate: '2024-02-05',
    eta: '2024-02-03 16:00',
    value: '$15,000',
    currentLocation: 'Hamburg Port - Terminal 1',
    contact: 'Mr. Klaus Schmidt',
    email: 'klaus@baltic-ship.de',
    progress: 45
  }
]

const DeliveryTracking: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [deliveryData] = useState<DeliveryRecord[]>(mockDeliveryData)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DeliveryRecord | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })

  // Calculate summary statistics
  const activeDeliveries = deliveryData.filter(d => d.status === 'In Transit' || d.status === 'Preparing').length
  const inTransit = deliveryData.filter(d => d.status === 'In Transit').length
  const dueToday = deliveryData.filter(d => {
    const today = new Date().toISOString().split('T')[0]
    return d.dueDate === today
  }).length
  const totalValue = deliveryData.reduce((sum, d) => {
    const value = parseFloat(d.value.replace(/[$,]/g, ''))
    return sum + value
  }, 0)

  const filteredData = useMemo(() => {
    return deliveryData.filter(record => {
      const matchesSearch = searchTerm === '' || 
        record.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.port.toLowerCase().includes(searchTerm.toLowerCase())
      
      return matchesSearch
    })
  }, [searchTerm, deliveryData])

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

  const handleSort = (key: keyof DeliveryRecord) => {
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

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'In Transit': 'bg-primary',
      'Preparing': 'bg-warning',
      'Delivered': 'bg-success',
      'Delayed': 'bg-danger'
    }
    return (
      <span className={`badge ${statusColors[status]} text-white`}>
        {status}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const priorityColors: Record<string, string> = {
      'High Priority': 'bg-danger',
      'Medium Priority': 'bg-warning',
      'Low Priority': 'bg-info'
    }
    return (
      <span className={`badge ${priorityColors[priority]} text-white`}>
        {priority}
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
                <h3 className='card-label text-dark fw-bold'>Delivery Coordination</h3>
                <p className='text-muted mb-0'>Track and coordinate deliveries with vendors and ship agents</p>
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              {/* Summary Cards - Same style as Inventory */}
              <div className="row mb-4">
                {[
                  { title: "Active Deliveries", value: activeDeliveries.toString(), path: "/media/icons/duotune/general/gen049.svg", color: "primary" },
                  { title: "In Transit", value: inTransit.toString(), path: "/media/icons/duotune/maps/map001.svg", color: "warning" },
                  { title: "Due Today", value: dueToday.toString(), path: "/media/icons/duotune/general/gen014.svg", color: "danger" },
                  { title: "Total Value", value: `$${(totalValue / 1000).toFixed(1)}K`, path: "/media/icons/duotune/finance/fin006.svg", color: "success" },
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

              {/* Search Bar */}
              <div className='mb-4'>
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
                    placeholder='Search deliveries...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Deliveries Table */}
              <div className='mb-8'>
                <h4 className='fw-bold text-primary mb-4'>Active Deliveries ({sortedData.length})</h4>
                <div className='report-table table-responsive'>
                  <div style={{ overflowX: 'auto' }}>
                    <table className='table table-bordered align-middle'>
                      <thead className='table-header text-start'>
                        <tr>
                          <th onClick={() => handleSort('deliveryNumber')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                            <div className='d-flex align-items-center'>
                              <span style={{ color: '#3F4254', fontWeight: 600 }}>Delivery No.</span>
                              <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG 
                                  path={`/media/map/sort-col-${sortConfig.key === 'deliveryNumber' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`} 
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </div>
                          </th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Status</th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Priority</th>
                          <th onClick={() => handleSort('itemName')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                            <div className='d-flex align-items-center'>
                              <span style={{ color: '#3F4254', fontWeight: 600 }}>Item Name</span>
                              <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG 
                                  path={`/media/map/sort-col-${sortConfig.key === 'itemName' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`} 
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </div>
                          </th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Vendor</th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Port</th>
                          <th onClick={() => handleSort('dueDate')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                            <div className='d-flex align-items-center'>
                              <span style={{ color: '#3F4254', fontWeight: 600 }}>Due Date</span>
                              <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG 
                                  path={`/media/map/sort-col-${sortConfig.key === 'dueDate' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`} 
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </div>
                          </th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Value</th>
                          <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className='table-body text-start'>
                        {currentRecords.length === 0 ? (
                          <tr>
                            <td colSpan={9} className='text-center text-muted py-5'>
                              No deliveries found for the selected criteria.
                            </td>
                          </tr>
                        ) : (
                          currentRecords.map((record) => (
                            <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                              <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>{record.deliveryNumber}</td>
                              <td style={{ padding: '12px 16px' }}>{getStatusBadge(record.status)}</td>
                              <td style={{ padding: '12px 16px' }}>{getPriorityBadge(record.priority)}</td>
                              <td className='text-dark fs-6' style={{ padding: '12px 16px', maxWidth: '300px' }}>{record.itemName}</td>
                              <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.vendor}</td>
                              <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.port}</td>
                              <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.dueDate}</td>
                              <td className='text-dark fs-6 fw-semibold' style={{ padding: '12px 16px' }}>{record.value}</td>
                              <td className='text-center' style={{ padding: '12px 16px' }}>
                                <button className='btn btn-sm px-0' title='Edit'>
                                  <KTSVG path='/media/map/edit-active.svg' />
                                </button>
                                <button className='btn btn-sm px-0' title='View'>
                                  <KTSVG path='/media/map/ph_eye.svg' />
                                </button>
                                <button className='btn btn-sm px-0' title='Delete'>
                                  <KTSVG path='/media/map/trash.svg' />
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

export default DeliveryTracking