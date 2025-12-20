import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { createGoodsReceipt, getGoodsReceipts, getPurchaseOrders } from '../core/_requests'
import { GoodsReceipt as GoodsReceiptType, CreateGoodsReceiptRequest, GoodsReceiptCondition, PurchaseOrder } from '../core/_models'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useAuth } from '../../auth'

type ReceiptItem = {
  inventoryItemId: number
  description: string
  partNumber: string
  expected: number
  received: number
  condition: GoodsReceiptCondition
  notes: string
}

interface CreateReceiptModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  purchaseOrderId?: number
}

const CreateReceiptModal: FC<CreateReceiptModalProps> = ({ visible, onClose, onSubmit, purchaseOrderId }) => {
  const [formData, setFormData] = useState({
    purchaseOrderId: purchaseOrderId ? purchaseOrderId.toString() : '',
    receivedDate: '',
    receivedBy: '',
    photos: [] as File[],
    items: [
      { inventoryItemId: 3, description: 'Test Starter motor', partNumber: 'PT987', expected: 40, received: 40, condition: 'GOOD', notes: '' }
    ] as ReceiptItem[],
    generalNotes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [isLoadingPOs, setIsLoadingPOs] = useState(false)

  // Load purchase orders when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadPurchaseOrders()
    }
  }, [visible])

  // Update form data when purchaseOrderId prop changes
  useEffect(() => {
    if (purchaseOrderId) {
      setFormData(prev => ({
        ...prev,
        purchaseOrderId: purchaseOrderId.toString()
      }))
    }
  }, [purchaseOrderId])

  const loadPurchaseOrders = async () => {
    setIsLoadingPOs(true)
    try {
      const pos = await getPurchaseOrders()
      console.log('Purchase orders loaded:', pos)
      setPurchaseOrders(pos)
    } catch (error: any) {
      console.error('Error loading purchase orders:', error)
      toast.error('Failed to load purchase orders')
    } finally {
      setIsLoadingPOs(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...Array.from(e.target.files!)]
      }))
    }
  }

  const handleSubmit = async () => {
    if (!formData.purchaseOrderId) {
      toast.error('Please select a purchase order')
      return
    }
    if (!formData.receivedDate || !formData.receivedBy) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: CreateGoodsReceiptRequest = {
        purchaseOrderId: parseInt(formData.purchaseOrderId),
        receivedDate: formData.receivedDate,
        receivedBy: formData.receivedBy,
        generalNotes: formData.generalNotes,
        lines: formData.items.map(item => ({
          inventoryItemId: item.inventoryItemId,
          itemDescription: item.description,
          partNumber: item.partNumber,
          expectedQty: item.expected,
          receivedQty: item.received,
          condition: item.condition,
          notes: item.notes
        }))
      }

      await createGoodsReceipt(payload, formData.photos)
      toast.success('Goods receipt created successfully!')
      handleClose()
      onSubmit()
    } catch (error: any) {
      console.error('Error creating goods receipt:', error)
      toast.error(error.message || 'Failed to create goods receipt')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      purchaseOrderId: purchaseOrderId ? purchaseOrderId.toString() : '',
      receivedDate: '',
      receivedBy: '',
      photos: [],
      items: [
        { inventoryItemId: 3, description: 'Test Starter motor', partNumber: 'PT987', expected: 40, received: 40, condition: 'GOOD', notes: '' }
      ],
      generalNotes: ''
    })
    setPurchaseOrders([])
    onClose()
  }

  if (!visible) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '60rem', overflowY: "scroll" }}>
        <div className="custom-modal-header d-flex justify-content-between align-items-center">
          <div>
            <h5 className='m-0'>Create Goods Receipt</h5>
            <p className='text-muted mb-0 fs-7'>Enter goods receipt details</p>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
          </button>
        </div>

        <div className="custom-modal-body">
          <div className='row g-3 mb-5'>
            <div className='col-md-3'>
              <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Purchase Order</label>
              {isLoadingPOs ? (
                <div className='form-control d-flex align-items-center'>
                  <div className='spinner-border spinner-border-sm me-2' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                  Loading POs...
                </div>
              ) : (
                <>
                  <select
                    className='form-select'
                    name='purchaseOrderId'
                    value={formData.purchaseOrderId}
                    onChange={handleInputChange}
                    style={{ color: '#000' }}
                    disabled={!!purchaseOrderId}
                  >
                    <option value=''>Select Purchase Order</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id.toString()}>
                        PO-{po.id} - {po.poNumber || `PO${po.id}`} | {po.vendor.name || 'Unknown Vendor'} | ${po.totalAmount?.toLocaleString() || '0'} | {po.status || 'Unknown Status'}
                      </option>
                    ))}
                  </select>
                  {purchaseOrders.length === 0 && !isLoadingPOs && (
                    <small className='text-muted'>No purchase orders available</small>
                  )}
                  {purchaseOrders.length > 0 && (
                    <small className='text-muted'>Format: PO-ID - PO Number | Vendor | Amount | Status</small>
                  )}
                </>
              )}
            </div>

            <div className='col-md-3'>
              <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Received Date</label>
              <input
                type='date'
                className='form-control'
                name='receivedDate'
                value={formData.receivedDate}
                onChange={handleInputChange}
                style={{ color: '#000' }}
              />
            </div>

            <div className='col-md-3'>
              <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Received By</label>
              <input
                type='text'
                className='form-control'
                name='receivedBy'
                value={formData.receivedBy}
                onChange={handleInputChange}
                placeholder='anthani835'
                style={{ color: '#000' }}
              />
            </div>

            <div className='col-md-3'>
              <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Photos</label>
              <input
                type='file'
                className='form-control'
                multiple
                accept='image/*'
                onChange={handlePhotoChange}
              />
              {formData.photos.length > 0 && (
                <small className='text-muted'>{formData.photos.length} file(s) selected</small>
              )}
            </div>
          </div>

          <div className='mb-4'>
            <h6 className='fw-bold mb-3' style={{ color: '#181C32' }}>Item Verification</h6>

            <div style={{ overflowX: 'visible' }}>
              <table className='table table-row-bordered align-middle' style={{ fontSize: '14px', width: '100%' }}>
                <thead style={{ backgroundColor: '#F5F8FA' }}>
                  <tr>
                    <th className='fw-semibold text-uppercase' style={{ color: '#7E8299', fontSize: '12px', padding: '12px', width: '25%' }}>Item Description</th>
                    <th className='fw-semibold text-uppercase text-center' style={{ color: '#7E8299', fontSize: '12px', padding: '12px', width: '10%' }}>Expected</th>
                    <th className='fw-semibold text-uppercase text-center' style={{ color: '#7E8299', fontSize: '12px', padding: '12px', width: '15%' }}>Received</th>
                    <th className='fw-semibold text-uppercase' style={{ color: '#7E8299', fontSize: '12px', padding: '12px', width: '20%' }}>Condition</th>
                    <th className='fw-semibold text-uppercase' style={{ color: '#7E8299', fontSize: '12px', padding: '12px', width: '30%' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: '12px', wordBreak: 'break-word' }}>
                        <div className='fw-semibold text-dark'>{item.description}</div>
                        <div className='text-muted' style={{ fontSize: '12px' }}>{item.partNumber}</div>
                      </td>
                      <td className='text-center' style={{ padding: '12px' }}>
                        <span className='fw-semibold'>{item.expected}</span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type='number'
                          className='form-control form-control-sm text-center'
                          value={item.received}
                          onChange={(e) => handleItemChange(index, 'received', parseInt(e.target.value) || 0)}
                          style={{ width: '100%', margin: '0 auto' }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          className='form-select form-select-sm'
                          value={item.condition}
                          onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value='GOOD'>Good</option>
                          <option value='DAMAGED'>Damaged</option>
                          <option value='MISSING'>Missing</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type='text'
                          className='form-control form-control-sm'
                          placeholder='Notes...'
                          value={item.notes}
                          onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>General Notes</label>
            <textarea
              className='form-control'
              name='generalNotes'
              value={formData.generalNotes}
              onChange={handleInputChange}
              rows={3}
              placeholder='Overall condition, packaging notes, certificate verification, etc.'
              style={{ color: '#000' }}
            />
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn_secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn btn_primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Complete Receipt'}
          </button>
        </div>
      </div>
    </div>
  )
}



const GoodsReceipt: FC = () => {
  const { currentUser } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [receiptData, setReceiptData] = useState<GoodsReceiptType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof GoodsReceiptType | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })
  const [isModalVisible, setIsModalVisible] = useState(false)

  // Check if user has permission to create goods receipts (role 1 = superadmin, role 4 = master)
  const canCreateReceipt = currentUser?.role?.id === 1 || currentUser?.role?.id === 4

  // Load goods receipts on component mount
  useEffect(() => {
    loadGoodsReceipts()
  }, [])

  const loadGoodsReceipts = async () => {
    setIsLoading(true)
    try {
      const data = await getGoodsReceipts()
      console.log('Goods receipts loaded:', data)
      setReceiptData(data)
    } catch (error: any) {
      console.error('Error loading goods receipts:', error)
      toast.error(error.message || 'Failed to load goods receipts')
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate stats based on status
  const completedReceipts = receiptData.filter(r => r.status === 'POSTED' || r.status === 'COMPLETED').length
  const pendingReceipts = receiptData.filter(r => r.status === 'PENDING' || r.status === 'DRAFT').length
  const discrepancies = receiptData.filter(r => r.discrepancy !== null && r.discrepancy !== 0).length

  // Calculate total items received
  const totalItemsReceived = receiptData.reduce((sum, r) => {
    const totalReceived = r.lines.reduce((lineSum, line) => lineSum + line.receivedQty, 0)
    return sum + totalReceived
  }, 0)

  const filteredData = useMemo(() => {
    return receiptData.filter(record => {
      const matchesSearch = searchTerm === '' ||
        record.id.toString().includes(searchTerm) ||
        record.purchaseOrderId.toString().includes(searchTerm) ||
        record.receivedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.generalNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.lines.some(line =>
          line.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
          line.partNumber.toLowerCase().includes(searchTerm.toLowerCase())
        )

      return matchesSearch
    })
  }, [searchTerm, receiptData])

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

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'POSTED': 'bg-success',
      'COMPLETED': 'bg-success',
      'PENDING': 'bg-warning',
      'DRAFT': 'bg-secondary',
      'DISCREPANCY': 'bg-danger'
    }
    const color = statusColors[status] || 'bg-secondary'
    return (
      <span className={`badge ${color} text-white`}>
        {status}
      </span>
    )
  }

  const handleSort = (key: keyof GoodsReceiptType) => {
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

  const handleCreateReceipt = () => {
    setIsModalVisible(true)
  }

  const handleSubmitReceipt = () => {
    // Refresh the data after creating receipt
    loadGoodsReceipts()
  }

  return (
    <>
      <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
        <div className='d-flex flex-column flex-column-fluid'>
          <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
            <div className='card'>
              <div className='card-header border-0 pt-6 bg-white'>
                <div>
                  <h3 className='card-label text-dark fw-bold'>Goods Receipt</h3>
                  <p className='text-muted mb-0'>Verify and receive delivered items</p>
                </div>
                {canCreateReceipt && (
                  <div className='card-toolbar'>
                    <button
                      type='button'
                      className='btn btn_primary'
                      onClick={handleCreateReceipt}
                    >
                      <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                      Create Goods Receipt
                    </button>
                  </div>
                )}
              </div>

              <div className='card-body py-4 bg-white border-top'>
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
                      placeholder='Search receipts...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className='mb-8'>
                  <h4 className='fw-bold text-primary mb-4'>Goods Receipts ({sortedData.length})</h4>
                  <div className='report-table table-responsive'>
                    <div style={{ overflowX: 'auto' }}>
                      <table className='table table-bordered align-middle'>
                        <thead className='table-header text-start'>
                          <tr>
                            <th onClick={() => handleSort('id')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>GRN ID</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'id' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th onClick={() => handleSort('purchaseOrderId')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>PO ID</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'purchaseOrderId' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th onClick={() => handleSort('receivedDate')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>Received Date</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'receivedDate' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Received By</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Items</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Status</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Photos</th>
                            <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className='table-body text-start'>
                          {isLoading ? (
                            <tr>
                              <td colSpan={8} className='text-center text-muted py-5'>
                                Loading goods receipts...
                              </td>
                            </tr>
                          ) : currentRecords.length === 0 ? (
                            <tr>
                              <td colSpan={8} className='text-center text-muted py-5'>
                                No receipts found for the selected criteria.
                              </td>
                            </tr>
                          ) : (
                            currentRecords.map((record) => (
                              <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>GRN-{record.id}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>PO-{record.purchaseOrderId}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.receivedDate}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.receivedBy}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  <div>
                                    {/* Remove duplicates by creating a unique set based on itemDescription and partNumber */}
                                    {Array.from(new Map(record.lines.map(line =>
                                      [`${line.itemDescription}-${line.partNumber}`, line]
                                    )).values()).map((line, idx) => (
                                      <div key={idx} className='mb-1'>
                                        <span className='fw-semibold'>{line.itemDescription}</span>
                                        <span className='text-muted ms-2'>({line.receivedQty}/{line.expectedQty})</span>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>{getStatusBadge(record.status)}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  {record.photos.length > 0 ? (
                                    <span className='badge bg-primary'>{record.photos.length} photo(s)</span>
                                  ) : (
                                    <span className='text-muted'>No photos</span>
                                  )}
                                </td>
                                <td className='text-center' style={{ padding: '12px 16px' }}>
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
      <CreateReceiptModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleSubmitReceipt}
      />
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ top: "5rem" }}
      />
    </>
  )
}

export default GoodsReceipt
export { CreateReceiptModal }