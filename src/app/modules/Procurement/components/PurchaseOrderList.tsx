import React, { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { getPurchaseOrders, sendPurchaseOrder } from '../core/_requests'
import { PurchaseOrder } from '../core/_models'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { CreateReceiptModal } from './GoodsReceipt'

interface ViewPurchaseOrderModalProps {
  visible: boolean
  onClose: () => void
  purchaseOrder: PurchaseOrder | null
}

const ViewPurchaseOrderModal: FC<ViewPurchaseOrderModalProps> = ({ visible, onClose, purchaseOrder }) => {
  if (!visible || !purchaseOrder) return null

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      'SENT_TO_VENDOR': { bg: 'bg-primary', text: 'Sent to Vendor' },
      'PENDING_APPROVAL': { bg: 'bg-warning', text: 'Pending Approval' },
      'APPROVED': { bg: 'bg-success', text: 'Approved' },
      'REJECTED': { bg: 'bg-danger', text: 'Rejected' },
      'INVOICE_RECEIVED': { bg: 'bg-dark', text: 'Invoice Received' },
      'DELIVERED': { bg: 'bg-secondary', text: 'Delivered' },
      'COMPLETED': { bg: 'bg-info', text: 'Completed' }
    }
    const statusInfo = statusMap[status] || { bg: 'bg-secondary', text: status }
    return <span className={`badge ${statusInfo.bg} text-white`}>{statusInfo.text}</span>
  }

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1050,
      }}
    >
      <div className='modal-dialog modal-xl modal-dialog-centered' role='document'>
        <div className='modal-content bg-white'>
          <div className='modal-header border-bottom'>
            <div>
              <h3 className='modal-title fw-bold text-dark mb-1'>Purchase Order Details</h3>
              <p className='text-muted mb-0 fs-7'>{purchaseOrder.poNumber}</p>
            </div>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>

          <div className='modal-body' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Status and Basic Info */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <div className='d-flex justify-content-between align-items-center mb-3'>
                  <h5 className='fw-bold text-primary mb-0'>General Information</h5>
                  {getStatusBadge(purchaseOrder.status)}
                </div>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>PO Number</label>
                <p className='fs-6 text-dark fw-bold'>{purchaseOrder.poNumber}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Category</label>
                <p className='fs-6 text-dark'>{purchaseOrder.category.name}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Requisition No</label>
                <p className='fs-6 text-dark'>{purchaseOrder.requisitionNo}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>RFQ No</label>
                <p className='fs-6 text-dark'>{purchaseOrder.rfqNo}</p>
              </div>
              <div className='col-md-12'>
                <label className='form-label fw-semibold text-muted fs-7'>Description</label>
                <p className='fs-6 text-dark'>{purchaseOrder.description}</p>
              </div>
            </div>

            {/* Vendor Information */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <h5 className='fw-bold text-primary mb-3'>Vendor Information</h5>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Vendor Name</label>
                <p className='fs-6 text-dark fw-bold'>{purchaseOrder.vendor.name}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Vendor Code</label>
                <p className='fs-6 text-dark'>{purchaseOrder.vendor.code}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Email</label>
                <p className='fs-6 text-dark'>{purchaseOrder.vendor.email}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Contact Number</label>
                <p className='fs-6 text-dark'>{purchaseOrder.vendor.contactNo}</p>
              </div>
              {purchaseOrder.vendorContactName && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Contact Person</label>
                  <p className='fs-6 text-dark'>{purchaseOrder.vendorContactName}</p>
                </div>
              )}
              {purchaseOrder.vendorAddress && (
                <div className='col-md-12'>
                  <label className='form-label fw-semibold text-muted fs-7'>Vendor Address</label>
                  <p className='fs-6 text-dark'>{purchaseOrder.vendorAddress}</p>
                </div>
              )}
            </div>

            {/* Delivery & Pricing Information */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <h5 className='fw-bold text-primary mb-3'>Delivery & Pricing</h5>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Delivery Date</label>
                <p className='fs-6 text-dark'>{purchaseOrder.deliveryDate}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Total Amount</label>
                <p className='fs-6 text-dark fw-bold text-success'>${purchaseOrder.totalAmount.toFixed(2)}</p>
              </div>
              {purchaseOrder.quantity && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Quantity</label>
                  <p className='fs-6 text-dark'>{purchaseOrder.quantity}</p>
                </div>
              )}
              {purchaseOrder.unitPrice && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Unit Price</label>
                  <p className='fs-6 text-dark'>${purchaseOrder.unitPrice.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* Terms & Conditions */}
            {(purchaseOrder.paymentTerms || purchaseOrder.deliveryTerms || purchaseOrder.terms || purchaseOrder.specialInstructions) && (
              <>
                <div className='row mb-4'>
                  <div className='col-md-12'>
                    <h5 className='fw-bold text-primary mb-3'>Terms & Conditions</h5>
                  </div>
                </div>

                <div className='row g-4 mb-4'>
                  {purchaseOrder.paymentTerms && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Payment Terms</label>
                      <p className='fs-6 text-dark'>{purchaseOrder.paymentTerms}</p>
                    </div>
                  )}
                  {purchaseOrder.deliveryTerms && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Delivery Terms</label>
                      <p className='fs-6 text-dark'>{purchaseOrder.deliveryTerms}</p>
                    </div>
                  )}
                  {purchaseOrder.terms && (
                    <div className='col-md-12'>
                      <label className='form-label fw-semibold text-muted fs-7'>General Terms</label>
                      <p className='fs-6 text-dark'>{purchaseOrder.terms}</p>
                    </div>
                  )}
                  {purchaseOrder.specialInstructions && (
                    <div className='col-md-12'>
                      <label className='form-label fw-semibold text-muted fs-7'>Special Instructions</label>
                      <p className='fs-6 text-dark'>{purchaseOrder.specialInstructions}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tracking Information */}
            {(purchaseOrder.trackingNumber || purchaseOrder.currentLocation || purchaseOrder.estimatedArrivalDate) && (
              <>
                <div className='row mb-4'>
                  <div className='col-md-12'>
                    <h5 className='fw-bold text-primary mb-3'>Tracking Information</h5>
                  </div>
                </div>

                <div className='row g-4'>
                  {purchaseOrder.trackingNumber && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Tracking Number</label>
                      <p className='fs-6 text-dark'>{purchaseOrder.trackingNumber}</p>
                    </div>
                  )}
                  {purchaseOrder.currentLocation && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Current Location</label>
                      <p className='fs-6 text-dark'>{purchaseOrder.currentLocation}</p>
                    </div>
                  )}
                  {purchaseOrder.estimatedArrivalDate && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Estimated Arrival Date</label>
                      <p className='fs-6 text-dark'>{purchaseOrder.estimatedArrivalDate}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className='modal-footer border-top'>
            <button type='button' className='btn btn-light' onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CreatePurchaseOrderModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: any) => void
}

const CreatePurchaseOrderModal: FC<CreatePurchaseOrderModalProps> = ({ visible, onClose }) => {
  const handleClose = () => {
    onClose()
  }

  if (!visible) return null

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1050,
      }}
    >
      <div className='modal-dialog modal-dialog-centered' role='document'>
        <div className='modal-content bg-white'>
          <div className='modal-header'>
            <h5 className='modal-title'>Create New Purchase Order</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <div className='modal-body'>
            <p className='text-muted'>Purchase order creation form will be implemented here.</p>
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PurchaseOrdersList: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [purchaseOrderData, setPurchaseOrderData] = useState<PurchaseOrder[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isViewModalVisible, setIsViewModalVisible] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGoodsReceiptModalVisible, setIsGoodsReceiptModalVisible] = useState(false)
  const [selectedPOForReceipt, setSelectedPOForReceipt] = useState<number | null>(null)

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true)
        const data = await getPurchaseOrders()
        setPurchaseOrderData(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        console.error('Error fetching purchase orders:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPurchaseOrders()
  }, [])

  const filteredData = useMemo(() => {
    return purchaseOrderData.filter(record => {
      const matchesSearch = searchTerm === '' ||
        record.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.category.name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === '' || record.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, purchaseOrderData, statusFilter])

  const sortedData = useMemo(() => {
    let sortedRecords = [...filteredData]

    if (sortConfig.key !== null) {
      sortedRecords.sort((a, b) => {
        let aVal: any
        let bVal: any
        const key = sortConfig.key!

        if (key === 'poNumber') {
          aVal = a.poNumber.toLowerCase()
          bVal = b.poNumber.toLowerCase()
        } else if (key === 'vendor') {
          aVal = a.vendor.name.toLowerCase()
          bVal = b.vendor.name.toLowerCase()
        } else if (key === 'deliveryDate') {
          aVal = a.deliveryDate
          bVal = b.deliveryDate
        } else if (key === 'totalAmount') {
          aVal = a.totalAmount
          bVal = b.totalAmount
        } else {
          aVal = String((a as any)[key] || '').toLowerCase()
          bVal = String((b as any)[key] || '').toLowerCase()
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [filteredData, sortConfig])

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

  // Export Purchase Orders to PDF
  const exportPurchaseOrdersToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })

      // Title
      doc.setFontSize(16)
      doc.text('Purchase Orders', 14, 15)

      // Subtitle with date
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
      doc.text(`Total Purchase Orders: ${sortedData.length}`, 14, 28)

      // Prepare table data
      const tableData = sortedData.map(record => [
        record.poNumber || '',
        record.category.name || '',
        record.description || '',
        record.vendor.name || '',
        record.requisitionNo || '',
        record.rfqNo || '',
        record.deliveryDate || '',
        `$${record.totalAmount.toFixed(2)}`,
        record.status || ''
      ])

        // Generate table
        ; (doc as any).autoTable({
          head: [['PO Number', 'Category', 'Description', 'Vendor', 'Requisition', 'RFQ', 'Delivery Date', 'Total Amount', 'Status']],
          body: tableData,
          startY: 35,
          styles: {
            fontSize: 7,
            cellPadding: 2,
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 8,
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          columnStyles: {
            0: { cellWidth: 28 },  // PO Number
            1: { cellWidth: 25 },  // Category
            2: { cellWidth: 50 },  // Description
            3: { cellWidth: 35 },  // Vendor
            4: { cellWidth: 28 },  // Requisition
            5: { cellWidth: 25 },  // RFQ
            6: { cellWidth: 28 },  // Delivery Date
            7: { cellWidth: 25 },  // Total Amount
            8: { cellWidth: 30 },  // Status
          },
          margin: { top: 35, left: 10, right: 10 },
          pageBreak: 'auto',
          tableLineWidth: 0.1,
          tableLineColor: [200, 200, 200],
        })

      // Save the PDF
      doc.save(`Purchase_Orders_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF exported successfully!')
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('Failed to export PDF')
    }
  }

  const handleAddPurchaseOrder = (data: any) => {
    // This would be an API call to create a new purchase order
    console.log('Create purchase order:', data)
  }

  const handleViewPO = (record: PurchaseOrder) => {
    setSelectedPO(record)
    setIsViewModalVisible(true)
  }

  const handleSendPO = async (id: number) => {
    if (!window.confirm('Are you sure you want to send this Purchase Order to the vendor?')) return

    try {
      await sendPurchaseOrder(id)
      alert('Purchase Order sent successfully!')
      // Refresh the list
      const data = await getPurchaseOrders()
      setPurchaseOrderData(data)
    } catch (error: any) {
      console.error('Error sending purchase order:', error)
      alert(error.message || 'Failed to send purchase order')
    }
  }

  const handleCreateGoodsReceipt = (purchaseOrderId: number) => {
    setSelectedPOForReceipt(purchaseOrderId)
    setIsGoodsReceiptModalVisible(true)
  }

  const handleGoodsReceiptSubmit = () => {
    // Refresh the purchase orders list if needed
    setIsGoodsReceiptModalVisible(false)
    setSelectedPOForReceipt(null)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      'SENT_TO_VENDOR': { bg: 'bg-primary', text: 'Sent to Vendor' },
      'PENDING_APPROVAL': { bg: 'bg-warning', text: 'Pending Approval' },
      'APPROVED': { bg: 'bg-success', text: 'Approved' },
      'REJECTED': { bg: 'bg-danger', text: 'Rejected' },
      'INVOICE_RECEIVED': { bg: 'bg-dark', text: 'Invoice Received' },
      'DELIVERED': { bg: 'bg-secondary', text: 'Delivered' },
      'COMPLETED': { bg: 'bg-info', text: 'Completed' }
    }

    const statusInfo = statusMap[status] || { bg: 'bg-secondary', text: status }
    return <span className={`badge ${statusInfo.bg} text-white`}>{statusInfo.text}</span>
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between align-items-center bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Purchase Orders</h3>
                <p className='text-muted mb-0'>Create and manage purchase orders</p>
              </div>
              <div className='card-toolbar d-flex gap-2'>
                <button
                  type='button'
                  className='btn btn_primary'
                  style={{
                    backgroundColor: '',
                    color: 'white',
                    border: 'none'
                  }}
                  onClick={exportPurchaseOrdersToPDF}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr078.svg' className='svg-icon-2' />
                  Export
                </button>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setIsModalVisible(true)}
                >
                  <span className='me-2'>+</span>
                  Create Purchase Order
                </button>
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              <div className='d-flex gap-3 mb-4'>
                <div className='flex-grow-1'>
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
                      placeholder='Search purchase orders...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ width: '200px' }}>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Filter</label>
                  <select
                    className='form-select form-select-sm'
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      padding: '8px 12px'
                    }}
                  >
                    <option value=''>All Status</option>
                    <option value='PENDING_APPROVAL'>Pending Approval</option>
                    <option value='APPROVED'>Approved</option>
                    <option value='SENT_TO_VENDOR'>Sent to Vendor</option>
                    <option value='REJECTED'>Rejected</option>
                    <option value='INVOICE_RECEIVED'>Invoice Received</option>
                    <option value='DELIVERED'>Delivered</option>
                    <option value='COMPLETED'>Completed</option>
                  </select>
                </div>
              </div>

              <div className='mb-8'>
                <h4 className='fw-bold text-primary mb-4'>Purchase Orders ({sortedData.length})</h4>
                {loading ? (
                  <div className='text-center py-5'>
                    <div className='spinner-border text-primary' role='status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                  </div>
                ) : error ? (
                  <div className='alert alert-danger' role='alert'>
                    {error}
                  </div>
                ) : (
                  <div className='report-table table-responsive'>
                    <div style={{ overflowX: 'auto' }}>
                      <table className='table table-bordered align-middle'>
                        <thead className='table-header text-start'>
                          <tr>
                            <th onClick={() => handleSort('poNumber')} className='cursor-pointer align-middle'>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>PO Number</span>
                                <KTSVG
                                  path={`/media/map/sort-col-${sortConfig.key === 'poNumber' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </th>
                            <th className='align-middle' style={{ color: '#3F4254', fontWeight: 600 }}>Category</th>
                            <th className='align-middle' style={{ color: '#3F4254', fontWeight: 600 }}>Description</th>
                            <th onClick={() => handleSort('vendor')} className='cursor-pointer align-middle'>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>Vendor</span>
                                <KTSVG
                                  path={`/media/map/sort-col-${sortConfig.key === 'vendor' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </th>
                            <th onClick={() => handleSort('deliveryDate')} className='cursor-pointer align-middle'>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>Delivery Date</span>
                                <KTSVG
                                  path={`/media/map/sort-col-${sortConfig.key === 'deliveryDate' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </th>
                            <th onClick={() => handleSort('totalAmount')} className='cursor-pointer align-middle'>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>Total Amount</span>
                                <KTSVG
                                  path={`/media/map/sort-col-${sortConfig.key === 'totalAmount' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </th>
                            <th className='align-middle' style={{ color: '#3F4254', fontWeight: 600 }}>Status</th>
                            <th className='align-middle text-center' style={{ color: '#3F4254', fontWeight: 600 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className='table-body text-start'>
                          {currentRecords.length === 0 ? (
                            <tr>
                              <td colSpan={8} className='text-center text-muted py-5'>
                                No purchase orders found for the selected criteria.
                              </td>
                            </tr>
                          ) : (
                            currentRecords.map((record) => (
                              <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                <td className='text-primary fw-semibold fs-6' style={{ padding: '12px 16px' }}>
                                  <a href='#' className='text-primary text-hover-primary'>{record.poNumber}</a>
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.category.name}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px', maxWidth: '300px' }}>{record.description}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.vendor.name}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.deliveryDate}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>${record.totalAmount.toFixed(2)}</td>
                                <td style={{ padding: '12px 16px' }}>{getStatusBadge(record.status)}</td>
                                <td className='text-center' style={{ padding: '12px 16px' }}>
                                  <div className='d-flex justify-content-center align-items-center gap-1'>
                                    {record.status !== 'SENT_TO_VENDOR' &&
                                      record.status !== 'DELIVERED' &&
                                      record.status !== 'COMPLETED' &&
                                      record.status !== 'CONFIRMED' && (
                                        <button
                                          className='btn btn-sm btn-primary px-2'
                                          title='Send to Vendor'
                                          onClick={() => handleSendPO(record.id)}
                                          style={{ fontSize: '12px' }}
                                        >
                                          Send
                                        </button>
                                      )}
                                    {(record.status === 'SENT_TO_VENDOR' ||
                                      record.status === 'DELIVERED' ||
                                      record.status === 'APPROVED') && (
                                        <button
                                          className='btn btn-sm btn-success px-2'
                                          title='Create Goods Receipt'
                                          onClick={() => handleCreateGoodsReceipt(record.id)}
                                          style={{ fontSize: '12px' }}
                                        >
                                          Receipt
                                        </button>
                                      )}
                                    <button
                                      className='btn btn-sm px-0'
                                      title='View'
                                      onClick={() => handleViewPO(record)}
                                    >
                                      <KTSVG path='/media/map/ph_eye.svg' />
                                    </button>
                                    <button className='btn btn-sm px-0' title='Edit'>
                                      <KTSVG path='/media/map/edit-active.svg' />
                                    </button>
                                    <button className='btn btn-sm px-0' title='Delete'>
                                      <KTSVG path='/media/map/trash.svg' />
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Purchase Order Modal */}
      <ViewPurchaseOrderModal
        visible={isViewModalVisible}
        onClose={() => {
          setIsViewModalVisible(false)
          setSelectedPO(null)
        }}
        purchaseOrder={selectedPO}
      />

      {/* Create Purchase Order Modal */}
      <CreatePurchaseOrderModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleAddPurchaseOrder}
      />

      {/* Create Goods Receipt Modal */}
      <CreateReceiptModal
        visible={isGoodsReceiptModalVisible}
        onClose={() => {
          setIsGoodsReceiptModalVisible(false)
          setSelectedPOForReceipt(null)
        }}
        onSubmit={handleGoodsReceiptSubmit}
        purchaseOrderId={selectedPOForReceipt || undefined}
      />

      {/* Toast Container for notifications */}
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
    </div>
  )
}

export { PurchaseOrdersList }