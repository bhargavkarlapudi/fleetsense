import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { getRequisitions, getPorts } from '../core/_requests'
import { Requisition, Port } from '../core/_models'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useAuth } from '../../auth'

interface ApprovalItem {
  id: number
  reqNumber: string
  title: string
  requestedBy: string
  amount: number
  dueDate: string
  port: string
  priority: 'High' | 'Medium' | 'Low'
  justification: string
  status: 'Pending'
}

interface ProcessedItem {
  id: number
  reqNumber: string
  title: string
  requester: string
  amount: number
  processedDate: string
  processedBy: string
  status: 'Approved' | 'Rejected'
  comments: string
}

const Approvals: FC = () => {
  const { currentUser, auth } = useAuth()
  const userRole = currentUser?.role?.id || auth?.role?.id || 4
  const [activeTab, setActiveTab] = useState<'pending' | 'processed'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [ports, setPorts] = useState<Port[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })

  // Load data on component mount and when user role changes
  useEffect(() => {
    loadData()
  }, [userRole])

  const loadData = async () => {
    setIsLoading(true)
    try {
      console.log('Loading approvals data for user role:', userRole)

      // Load requisitions and ports
      const [requisitionsResponse, portsResponse] = await Promise.all([
        getRequisitions(0, 1000), // Get all requisitions
        getPorts()
      ])

      console.log('Total requisitions loaded:', requisitionsResponse.content.length)
      console.log('Vessel approved requisitions:', requisitionsResponse.content.filter(req => req.status === 'VESSEL_APPROVED').length)
      console.log('Shore approved requisitions:', requisitionsResponse.content.filter(req => req.status === 'SHORE_APPROVED').length)

      setRequisitions(requisitionsResponse.content)
      setPorts(portsResponse)
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast.error('Failed to load approvals data')
    } finally {
      setIsLoading(false)
    }
  }

  // Convert requisition to ApprovalItem format
  const convertToApprovalItem = (req: Requisition): ApprovalItem => {
    const port = ports.find(p => p.id === req.requestedPortId)?.name || req.customPortName || 'N/A'
    const priority = req.type === 'HIGH' ? 'High' : req.type === 'MEDIUM' ? 'Medium' : 'Low'
    const amount = (req.estimatedUnitPrice || 0) * (req.quantity || 1)

    return {
      id: req.id,
      reqNumber: req.requisition_code || `REQ-${req.id}`,
      title: req.title || 'No Title',
      requestedBy: 'Vessel User', // You might want to add this field to the Requisition model
      amount: amount,
      dueDate: req.requiredDeliveryDate || new Date().toISOString().split('T')[0],
      port: port,
      priority: priority,
      justification: req.justification || 'No justification provided',
      status: 'Pending'
    }
  }

  // Convert requisition to ProcessedItem format
  const convertToProcessedItem = (req: Requisition): ProcessedItem => {
    const amount = (req.estimatedUnitPrice || 0) * (req.quantity || 1)

    return {
      id: req.id,
      reqNumber: req.requisition_code || `REQ-${req.id}`,
      title: req.title || 'No Title',
      requester: 'Vessel User', // You might want to add this field to the Requisition model
      amount: amount,
      processedDate: new Date().toISOString().split('T')[0], // You might want to add processedDate to the model
      processedBy: 'Shore Manager', // You might want to add this field to the Requisition model
      status: req.status === 'SHORE_APPROVED' ? 'Approved' : 'Rejected',
      comments: req.status === 'SHORE_APPROVED' ? 'Approved for procurement. Proceed with RFQ process.' : 'Rejected by shore management.'
    }
  }

  const filteredPendingData = useMemo(() => {
    if (activeTab !== 'pending') return []

    // For roles 1, 4, and 5 - show all vessel approved requisitions (pending shore approval)
    // These roles should have full visibility in the approvals module
    let vesselApprovedReqs: Requisition[] = []

    if (userRole === 1 || userRole === 4 || userRole === 5) {
      // Show all vessel approved requisitions for these roles
      vesselApprovedReqs = requisitions.filter(req => req.status === 'VESSEL_APPROVED')
    } else {
      // For other roles, apply existing filtering logic if needed
      vesselApprovedReqs = requisitions.filter(req => req.status === 'VESSEL_APPROVED')
    }

    return vesselApprovedReqs
      .map(convertToApprovalItem)
      .filter(record => {
        const matchesSearch = searchTerm === '' ||
          record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.reqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.requestedBy.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
      })
  }, [searchTerm, activeTab, requisitions, ports, userRole])

  const filteredProcessedData = useMemo(() => {
    if (activeTab !== 'processed') return []

    // For roles 1, 4, and 5 - show all shore approved requisitions
    // These roles should have full visibility in the approvals module
    let shoreApprovedReqs: Requisition[] = []

    if (userRole === 1 || userRole === 4 || userRole === 5) {
      // Show all shore approved requisitions for these roles
      shoreApprovedReqs = requisitions.filter(req => req.status === 'SHORE_APPROVED')
    } else {
      // For other roles, apply existing filtering logic if needed
      shoreApprovedReqs = requisitions.filter(req => req.status === 'SHORE_APPROVED')
    }

    return shoreApprovedReqs
      .map(convertToProcessedItem)
      .filter(record => {
        const matchesSearch = searchTerm === '' ||
          record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.reqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.requester.toLowerCase().includes(searchTerm.toLowerCase())

        return matchesSearch
      })
  }, [searchTerm, activeTab, requisitions, ports, userRole])

  const sortedData = useMemo(() => {
    if (activeTab === 'pending') {
      let sortedRecords = [...filteredPendingData]

      if (sortConfig.key !== null) {
        sortedRecords.sort((a: any, b: any) => {
          const aVal = String(a[sortConfig.key!] || '').toLowerCase()
          const bVal = String(b[sortConfig.key!] || '').toLowerCase()

          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
          return 0
        })
      }
      return sortedRecords
    }
    return filteredProcessedData
  }, [filteredPendingData, filteredProcessedData, sortConfig, activeTab])

  const handleSort = (key: string) => {
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

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'High': return 'badge-danger'
      case 'Medium': return 'badge-warning'
      case 'Low': return 'badge-info'
      default: return 'badge-secondary'
    }
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between align-items-center bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Approval Management</h3>
                <p className='text-muted mb-0'>
                  {userRole === 1 && 'Full access to view all approval workflows and requisition statuses'}
                  {userRole === 4 && 'View vessel and shore approval workflows for requisitions'}
                  {userRole === 5 && 'View and manage approval workflows for company requisitions'}
                  {![1, 4, 5].includes(userRole) && 'Review and approve requisitions and purchase orders'}
                  <span className='ms-3 badge badge-light-info'>
                    Role: {userRole === 1 ? 'Superadmin' : userRole === 4 ? 'Chief Officer/Master' : userRole === 5 ? 'Company' : `Role ${userRole}`}
                  </span>
                </p>
              </div>
              <div>
                <button
                  className='btn btn-sm btn-light-primary'
                  onClick={loadData}
                  disabled={isLoading}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr078.svg' className='svg-icon-2' />
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              {/* Tabs */}
              <div className='mb-4'>
                <div className="bg-light d-inline-flex align-items-center gap-2 p-2 rounded shadow-sm">
                  <button
                    onClick={() => {
                      setActiveTab('pending')
                      setCurrentPage(1)
                    }}
                    className={`btn btn-sm px-4 py-2 rounded ${activeTab === 'pending'
                      ? 'bg-white fw-bold shadow-sm'
                      : 'btn-light text-muted'
                      }`}
                    style={{ border: 'none' }}
                  >
                    Pending Approvals ({filteredPendingData.length})
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('processed')
                      setCurrentPage(1)
                    }}
                    className={`btn btn-sm px-4 py-2 rounded ${activeTab === 'processed'
                      ? 'bg-white fw-bold shadow-sm'
                      : 'btn-light text-muted'
                      }`}
                    style={{ border: 'none' }}
                  >
                    Processed ({filteredProcessedData.length})
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className='row gx-3 gy-3 mb-4'>
                <div className='col-md-6'>
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
                      placeholder='Search requisitions, titles, or requesters...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className='text-center py-5'>
                  <div className='spinner-border text-primary' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                  <p className='text-muted mt-2'>Loading approvals...</p>
                </div>
              )}

              {/* Processed Tab - Table View */}
              {!isLoading && activeTab === 'processed' && (
                <div className='mb-8'>
                  <h4 className='fw-bold text-primary mb-4'>
                    Processed Approvals ({filteredProcessedData.length})
                  </h4>

                  <div className='report-table table-responsive'>
                    <div style={{ overflowX: 'auto' }}>
                      <table className='table table-bordered align-middle'>
                        <thead className='table-header text-start'>
                          <tr>
                            <th onClick={() => handleSort('reqNumber')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>REQ NUMBER</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'reqNumber' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th onClick={() => handleSort('title')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>TITLE</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'title' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>REQUESTER</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>AMOUNT</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>PROCESSED DATE</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>PROCESSED BY</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>STATUS</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>COMMENTS</th>
                          </tr>
                        </thead>
                        <tbody className='table-body text-start'>
                          {currentRecords.length === 0 ? (
                            <tr>
                              <td colSpan={8} className='text-center text-muted py-5'>
                                No processed approvals found.
                              </td>
                            </tr>
                          ) : (
                            (currentRecords as ProcessedItem[]).map((record) => (
                              <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>
                                  {record.reqNumber}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  {record.title}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  {record.requester}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  ${record.amount.toLocaleString()}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  {record.processedDate}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  {record.processedBy}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span className={`badge ${record.status === 'Approved' ? 'submitted' : 'rejected'} text-white`}>
                                    {record.status}
                                  </span>
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px', maxWidth: '300px' }}>
                                  {record.comments}
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
              )}

              {/* Pending Tab - Table View */}
              {!isLoading && activeTab === 'pending' && (
                <div className='mb-8'>
                  <h4 className='fw-bold text-primary mb-4'>
                    Pending Approvals ({filteredPendingData.length})
                  </h4>

                  <div className='report-table table-responsive'>
                    <div style={{ overflowX: 'auto' }}>
                      <table className='table table-bordered align-middle'>
                        <thead className='table-header text-start'>
                          <tr>
                            <th onClick={() => handleSort('reqNumber')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>REQ NUMBER</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'reqNumber' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th onClick={() => handleSort('title')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>TITLE</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'title' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>REQUESTED BY</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>AMOUNT</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>DUE DATE</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>PORT</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>PRIORITY</th>
                            <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className='table-body text-start'>
                          {currentRecords.length === 0 ? (
                            <tr>
                              <td colSpan={8} className='text-center text-muted py-5'>
                                No pending approvals found.
                              </td>
                            </tr>
                          ) : (
                            (currentRecords as ApprovalItem[]).map((record) => (
                              <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>
                                  {record.reqNumber}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  {record.title}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  <div className='d-flex align-items-center'>
                                    <KTSVG path='/media/icons/duotune/communication/com006.svg' className='svg-icon-2 me-2 text-muted' />
                                    {record.requestedBy}
                                  </div>
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  <div className='d-flex align-items-center'>
                                    <KTSVG path='/media/icons/duotune/finance/fin010.svg' className='svg-icon-2 me-2 text-muted' />
                                    ${record.amount.toLocaleString()}
                                  </div>
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  <div className='d-flex align-items-center'>
                                    <KTSVG path='/media/icons/duotune/general/gen014.svg' className='svg-icon-2 me-2 text-muted' />
                                    {record.dueDate}
                                  </div>
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  {record.port}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span className={`badge ${getPriorityBadgeClass(record.priority)} text-white`}>
                                    {record.priority}
                                  </span>
                                </td>
                                <td className='text-center' style={{ padding: '12px 16px' }}>
                                  <button className='btn btn_primary btn-sm'>
                                    Review
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
              )}
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}

export default Approvals