import { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { getRFQs, getQuotationsByRFQ, selectQuotation, closeQuotation } from '../core/_requests'
import { useAuth } from '../../auth'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface VendorQuotation {
  id: number
  vendor: string
  vendorCode: string
  vendorEmail: string
  vendorContact: string
  price: number
  deliveryTime: string
  deliveryPort: string
  paymentTerms: string
  validity: string
  rating: number
  percentage: number
  currency: string
  status: string
  totalOrders: number
  issueCount: number
  requisitionQuantity?: number
  remainingQuantityToFulfillReq?: number
  actualQuantityAssignedToVendor?: number
}

interface ExpandedCards {
  [key: number]: boolean
}

interface RFQOption {
  id: number
  title: string
  status: string
}

interface APIQuotation {
  id: number
  rfqId: number
  rfq: {
    id: number
    title: string
    requisitionId: number
    requisition: {
      title: string
      description: string
      category: {
        name: string
      }
      requiredDeliveryDate: string
      quantity: number
      remainingQuantityToFulfillReq?: number
    }
    itemDescription: string
    deliveryPortOverride: {
      id: number
      main_port: string
    } | null
  }
  vendorId: number
  vendor: {
    id: number
    code: string
    name: string
    email: string
    contactNo: string
    totalOrders: number
    avgDeliveryDays: number
    issueCount: number
  }
  totalAmount: number
  promisedDeliveryDate: string | null
  currency: string
  terms: string
  status: string
  actualQuantityAssignedToVendor?: number
}

interface ViewPastRFQModalProps {
  visible: boolean
  onClose: () => void
  rfq: any | null
}

const ViewPastRFQModal: FC<ViewPastRFQModalProps> = ({ visible, onClose, rfq }) => {
  if (!visible || !rfq) return null

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      'CLOSED': { bg: 'bg-success', text: 'Closed' },
      'SENT': { bg: 'bg-primary', text: 'Sent' },
      'DRAFT': { bg: 'bg-secondary', text: 'Draft' }
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
              <h3 className='modal-title fw-bold text-dark mb-1'>Past RFQ Details</h3>
              <p className='text-muted mb-0 fs-7'>{rfq.title}</p>
            </div>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>

          <div className='modal-body' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Status and Basic Info */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <div className='d-flex justify-content-between align-items-center mb-3'>
                  <h5 className='fw-bold text-primary mb-0'>General Information</h5>
                  {getStatusBadge(rfq.status)}
                </div>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>RFQ Number</label>
                <p className='fs-6 text-dark fw-bold'>{rfq.title}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Item Description</label>
                <p className='fs-6 text-dark'>{rfq.itemDescription || 'N/A'}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Requisition</label>
                <p className='fs-6 text-dark'>{rfq.requisition?.title || 'N/A'}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Response Due Date</label>
                <p className='fs-6 text-dark'>{rfq.responseDueDate || 'N/A'}</p>
              </div>
            </div>

            {/* Selected Vendor Information */}
            {rfq.selectedQuotation && (
              <>
                <div className='row mb-4'>
                  <div className='col-md-12'>
                    <h5 className='fw-bold text-primary mb-3'>Selected Vendor</h5>
                  </div>
                </div>

                <div className='row g-4 mb-4'>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-muted fs-7'>Vendor Name</label>
                    <p className='fs-6 text-dark fw-bold'>{rfq.selectedQuotation.vendor?.name || 'N/A'}</p>
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-muted fs-7'>Vendor Code</label>
                    <p className='fs-6 text-dark'>{rfq.selectedQuotation.vendor?.code || 'N/A'}</p>
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-muted fs-7'>Email</label>
                    <p className='fs-6 text-dark'>{rfq.selectedQuotation.vendor?.email || 'N/A'}</p>
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-muted fs-7'>Contact Number</label>
                    <p className='fs-6 text-dark'>{rfq.selectedQuotation.vendor?.contactNo || 'N/A'}</p>
                  </div>
                </div>

                {/* Pricing Information */}
                <div className='row mb-4'>
                  <div className='col-md-12'>
                    <h5 className='fw-bold text-primary mb-3'>Pricing & Delivery</h5>
                  </div>
                </div>

                <div className='row g-4 mb-4'>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-muted fs-7'>Total Amount</label>
                    <p className='fs-6 text-dark fw-bold text-success'>
                      {rfq.selectedQuotation.currency || 'USD'} {rfq.selectedQuotation.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-muted fs-7'>Promised Delivery Date</label>
                    <p className='fs-6 text-dark'>{rfq.selectedQuotation.promisedDeliveryDate || 'N/A'}</p>
                  </div>
                  {rfq.selectedQuotation.terms && (
                    <div className='col-md-12'>
                      <label className='form-label fw-semibold text-muted fs-7'>Terms</label>
                      <p className='fs-6 text-dark'>{rfq.selectedQuotation.terms}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* All Quotations Summary */}
            {rfq.quotations && rfq.quotations.length > 0 && (
              <>
                <div className='row mb-4'>
                  <div className='col-md-12'>
                    <h5 className='fw-bold text-primary mb-3'>All Quotations ({rfq.quotations.length})</h5>
                  </div>
                </div>

                <div className='table-responsive'>
                  <table className='table table-bordered align-middle'>
                    <thead className='table-light'>
                      <tr>
                        <th>Vendor</th>
                        <th>Total Amount</th>
                        <th>Delivery Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rfq.quotations.map((quotation: any, index: number) => (
                        <tr key={index}>
                          <td className='text-dark'>{quotation.vendor?.name || 'N/A'}</td>
                          <td className='text-dark'>
                            {quotation.currency || 'USD'} {quotation.totalAmount?.toFixed(2) || '0.00'}
                          </td>
                          <td className='text-dark'>{quotation.promisedDeliveryDate || 'N/A'}</td>
                          <td>
                            <span className={`badge ${quotation.status === 'SELECTED' ? 'bg-success' : 'bg-secondary'}`}>
                              {quotation.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

const QuotationManagement: FC = () => {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'recent' | 'past'>('recent')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedRFQ, setSelectedRFQ] = useState<number | null>(null)
  const [rfqOptions, setRfqOptions] = useState<RFQOption[]>([])
  const [quotations, setQuotations] = useState<APIQuotation[]>([])
  const [loading, setLoading] = useState(false)
  const [vendorQuotations, setVendorQuotations] = useState<VendorQuotation[]>([])
  const [expandedCards, setExpandedCards] = useState<ExpandedCards>({})

  // Past RFQs states
  const [pastRFQs, setPastRFQs] = useState<any[]>([])
  const [pastRFQsLoading, setPastRFQsLoading] = useState(false)
  const [pastCurrentPage, setPastCurrentPage] = useState(1)
  const [pastRowsPerPage, setPastRowsPerPage] = useState(10)
  const [selectedPastRFQ, setSelectedPastRFQ] = useState<any | null>(null)
  const [isViewPastRFQModalVisible, setIsViewPastRFQModalVisible] = useState(false)

  const rfqDetails = selectedRFQ && quotations.length > 0 ? {
    rfqNumber: quotations[0].rfq.title,
    itemService: quotations[0].rfq.itemDescription,
    quantities: 1,
    department: quotations[0].rfq.requisition.category.name,
    requestedDate: quotations[0].rfq.requisition.requiredDeliveryDate
  } : {
    rfqNumber: 'Select RFQ',
    itemService: '-',
    quantities: 0,
    department: '-',
    requestedDate: '-'
  }

  // Fetch available RFQs on component mount
  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        const roleId = currentUser?.role?.id
        // For superadmin (role 1), don't pass cgaid to get all RFQs
        const cgaid = roleId === 1 ? undefined : currentUser?.companyGroupAdminId
        console.log('Fetching RFQs for roleId:', roleId, 'cgaid:', cgaid)
        const rfqsData = await getRFQs(cgaid)
        console.log('Total RFQs fetched:', rfqsData.length, rfqsData)

        // Check each RFQ for submitted quotations
        const validRFQs: RFQOption[] = []

        for (const rfq of rfqsData) {
          try {
            // Skip closed RFQs - they should only appear in Past RFQs tab
            if ((rfq as any).status === 'CLOSED') {
              console.log(`✗ Skipping RFQ ${rfq.id} - status is CLOSED`)
              continue
            }

            console.log(`Checking RFQ ${rfq.id} (${rfq.title}) for quotations...`)
            const quotationsData = await getQuotationsByRFQ(rfq.id)
            console.log(`RFQ ${rfq.id} quotations response:`, quotationsData)

            // Check if there are any quotations with SUBMITTED or SELECTED status
            if (Array.isArray(quotationsData) && quotationsData.length > 0) {
              const validQuotations = quotationsData.filter((q: any) => {
                console.log(`  Quotation ${q.id} status:`, q.status, typeof q.status)
                return q.status === 'SUBMITTED' || q.status === 'SELECTED'
              })
              console.log(`RFQ ${rfq.id} has ${validQuotations.length} valid quotations out of ${quotationsData.length} total`)

              if (validQuotations.length > 0) {
                console.log(`✓ Including RFQ ${rfq.id} (${rfq.title})`)
                validRFQs.push({
                  id: rfq.id,
                  title: rfq.title,
                  status: rfq.status
                })
              } else {
                console.log(`✗ Skipping RFQ ${rfq.id} - no valid quotations`)
              }
            } else {
              console.log(`✗ Skipping RFQ ${rfq.id} - no quotations at all`)
            }
          } catch (error) {
            console.error(`Error checking quotations for RFQ ${rfq.id}:`, error)
          }
        }

        console.log('Final RFQs with submitted quotations:', validRFQs)
        setRfqOptions(validRFQs)
      } catch (error) {
        console.error('Error fetching RFQs:', error)
        setRfqOptions([])
      }
    }
    fetchRFQs()
  }, [currentUser])

  // Fetch quotations when RFQ is selected
  useEffect(() => {
    if (selectedRFQ) {
      fetchQuotations(selectedRFQ)
    }
  }, [selectedRFQ])

  const fetchQuotations = async (rfqId: number) => {
    setLoading(true)
    try {
      const quotationsData = await getQuotationsByRFQ(rfqId)
      console.log('Quotations API response:', quotationsData)
      setQuotations(quotationsData)

      // Filter to only show SUBMITTED or SELECTED quotations
      const validQuotations = quotationsData.filter((q: APIQuotation) =>
        q.status === 'SUBMITTED' || q.status === 'SELECTED'
      )

      // Check if response has data
      if (!validQuotations || validQuotations.length === 0) {
        console.log('No valid quotations found in response')
        setVendorQuotations([])
        setLoading(false)
        return
      }

      // Transform API data to vendor quotations format
      const transformedData: VendorQuotation[] = validQuotations.map((q: APIQuotation) => {
        // Calculate delivery time in days
        const deliveryDays = q.promisedDeliveryDate
          ? Math.ceil((new Date(q.promisedDeliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0

        return {
          id: q.id,
          vendor: q.vendor.name,
          vendorCode: q.vendor.code,
          vendorEmail: q.vendor.email,
          vendorContact: q.vendor.contactNo,
          price: q.totalAmount,
          deliveryTime: deliveryDays > 0 ? `${deliveryDays} days` : 'TBD',
          deliveryPort: q.rfq.deliveryPortOverride?.main_port || 'N/A',
          paymentTerms: q.terms,
          validity: q.status === 'SUBMITTED' ? 'Valid' : q.status,
          rating: q.vendor.avgDeliveryDays > 0 ? Math.min(5, 5 - (q.vendor.avgDeliveryDays / 10)) : 4.0,
          percentage: 0, // Will be calculated below
          currency: q.currency,
          status: q.status,
          totalOrders: q.vendor.totalOrders,
          issueCount: q.vendor.issueCount,
          requisitionQuantity: q.rfq.requisition.quantity,
          remainingQuantityToFulfillReq: q.rfq.requisition.remainingQuantityToFulfillReq ?? 1,
          actualQuantityAssignedToVendor: q.actualQuantityAssignedToVendor ?? 0
        }
      })

      console.log('Transformed vendor quotations:', transformedData)

      // Calculate percentages based on price competitiveness
      const totalPrice = transformedData.reduce((sum, v) => sum + v.price, 0)
      transformedData.forEach(v => {
        v.percentage = totalPrice > 0 ? Math.round((v.price / totalPrice) * 100) : 0
      })

      setVendorQuotations(transformedData)
    } catch (error) {
      console.error('Error fetching quotations:', error)
      setVendorQuotations([])
    } finally {
      setLoading(false)
    }
  }

  const bestMatch = vendorQuotations.length > 0
    ? vendorQuotations.reduce((prev, current) => {
      // Best match is lowest price
      return current.price < prev.price ? current : prev
    })
    : null

  const getVendorColor = (vendor: string, index: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
    return colors[index % colors.length]
  }

  // Pagination logic
  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const currentRecords = vendorQuotations.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(vendorQuotations.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1)
  }

  const handleSelectQuotation = async (quotationId: number, actualQuantityAssignedToVendor?: number) => {
    try {
      setLoading(true)
      await selectQuotation(quotationId, actualQuantityAssignedToVendor)
      // Refresh the quotations list after selection
      if (selectedRFQ) {
        await fetchQuotations(selectedRFQ)
      }
      toast.success('Quotation selected successfully!')
    } catch (error: any) {
      console.error('Error selecting quotation:', error)
      toast.error(error.message || 'Failed to select quotation')
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizeSelection = async () => {
    if (!selectedRFQ) {
      toast.error('Please select an RFQ first')
      return
    }

    // Check if there's at least one selected quotation
    const hasSelectedQuotation = quotations.some(q => q.status === 'SELECTED')
    if (!hasSelectedQuotation) {
      toast.error('Please select at least one quotation before finalizing')
      return
    }

    if (!window.confirm('Are you sure you want to finalize the selection? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      await closeQuotation(selectedRFQ)
      toast.success('Selection finalized successfully! The RFQ has been moved to Past RFQs.')

      // Clear the selected RFQ since it's now closed
      setSelectedRFQ(null)
      setQuotations([])
      setVendorQuotations([])

      // Switch to Past RFQs tab to show the closed RFQ
      setActiveTab('past')

      // The Past RFQs will be loaded automatically by the useEffect when tab changes
    } catch (error: any) {
      console.error('Error finalizing selection:', error)
      toast.error(error.message || 'Failed to finalize selection')
    } finally {
      setLoading(false)
    }
  }

  const toggleCardExpansion = (vendorId: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [vendorId]: !prev[vendorId]
    }))
  }

  // Fetch past (closed) RFQs
  const fetchPastRFQs = async () => {
    setPastRFQsLoading(true)
    try {
      const roleId = currentUser?.role?.id
      const rfqsData = await getRFQs()

      // Filter for closed RFQs
      const closedRFQs = rfqsData.filter((rfq: any) => rfq.status === 'CLOSED')

      // For each closed RFQ, fetch its quotations to get complete data
      const rfqsWithQuotations = await Promise.all(
        closedRFQs.map(async (rfq: any) => {
          try {
            const quotationsData = await getQuotationsByRFQ(rfq.id)
            const selectedQuotation = quotationsData.find((q: any) => q.status === 'SELECTED')

            return {
              ...rfq,
              quotations: quotationsData,
              selectedQuotation: selectedQuotation || null
            }
          } catch (error) {
            console.error(`Error fetching quotations for RFQ ${rfq.id}:`, error)
            return {
              ...rfq,
              quotations: [],
              selectedQuotation: null
            }
          }
        })
      )

      setPastRFQs(rfqsWithQuotations)
    } catch (error) {
      console.error('Error fetching past RFQs:', error)
      toast.error('Failed to load past RFQs')
    } finally {
      setPastRFQsLoading(false)
    }
  }

  // Load past RFQs when Past tab is selected
  useEffect(() => {
    if (activeTab === 'past') {
      fetchPastRFQs()
    }
  }, [activeTab])

  const handleViewPastRFQ = (rfq: any) => {
    setSelectedPastRFQ(rfq)
    setIsViewPastRFQModalVisible(true)
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div id='kt_app_content_container' className='app-container container-fluid'>
            <div className='card'>
              <div className='card-header border-0 pt-5 pb-3 bg-white'>
                <div className='d-flex flex-column w-100'>
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <div>
                      <h3 className='card-label text-dark fw-bold mb-1' style={{ fontSize: '20px' }}>Quotation Management</h3>
                      <p className='text-muted mb-0' style={{ fontSize: '13px' }}>Review and compare quotations from multiple vendors</p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className='btn-group' style={{ marginBottom: '10px' }}>
                    <button
                      className={`btn btn-sm ${activeTab === 'recent' ? 'btn_primary' : 'btn-light'}`}
                      onClick={() => setActiveTab('recent')}
                    >
                      Recent RFQs
                    </button>
                    <button
                      className={`btn btn-sm ${activeTab === 'past' ? 'btn_primary' : 'btn-light'}`}
                      onClick={() => setActiveTab('past')}
                    >
                      Past RFQs
                    </button>
                  </div>
                </div>
              </div>

              <div className='card-body py-3 bg-white border-top'>
                {/* Recent RFQs Tab Content */}
                {activeTab === 'recent' && (
                  <>
                    {/* RFQ Selection Dropdown */}
                    <div className='row mb-4'>
                      <div className='col-12 col-md-4'>
                        <label className='form-label fw-bold text-dark mb-2' style={{ fontSize: '13px' }}>Select RFQ</label>
                        <select
                          className='form-select'
                          value={selectedRFQ || ''}
                          onChange={(e) => setSelectedRFQ(Number(e.target.value))}
                          style={{ fontSize: '14px' }}
                        >
                          <option value=''>-- Select RFQ --</option>
                          {rfqOptions.map(rfq => (
                            <option key={rfq.id} value={rfq.id}>
                              {rfq.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {loading && (
                      <div className='text-center py-5'>
                        <div className='spinner-border text-primary' role='status'>
                          <span className='visually-hidden'>Loading...</span>
                        </div>
                      </div>
                    )}

                    {!loading && selectedRFQ && vendorQuotations.length === 0 && (
                      <div className='alert alert-info'>
                        No quotations found for this RFQ.
                      </div>
                    )}

                    {!loading && selectedRFQ && vendorQuotations.length > 0 && (
                      <>
                        {/* RFQ Details Card */}
                        <div className='row mb-4'>
                          <div className='col-md-12'>
                            <div className='custom-card p-4 border rounded bg-light'>
                              <div className='d-flex justify-content-between align-items-center mb-3'>
                                <h6 className='fw-bold text-primary mb-0' style={{ fontSize: '15px' }}>{rfqDetails.rfqNumber}</h6>
                              </div>
                              <div className='row g-3'>
                                <div className='col-12 col-sm-6 col-md-3'>
                                  <label className='form-label text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Items/Service</label>
                                  <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{rfqDetails.itemService}</div>
                                </div>
                                <div className='col-12 col-sm-6 col-md-2'>
                                  <label className='form-label text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Quantities</label>
                                  <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{rfqDetails.quantities}</div>
                                </div>
                                <div className='col-12 col-sm-6 col-md-3'>
                                  <label className='form-label text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Department</label>
                                  <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{rfqDetails.department}</div>
                                </div>
                                <div className='col-12 col-sm-6 col-md-4'>
                                  <label className='form-label text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Requested Date</label>
                                  <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{rfqDetails.requestedDate}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Main Content Row */}
                        <div className='row g-3 g-md-5 align-items-start mb-4'>
                          {/* Left Column: Vendor Evaluation */}
                          <div className='col-12 col-lg-3'>
                            <div className='custom-card p-4 border rounded h-100'>
                              <h6 className='fw-bold text-dark mb-4' style={{ fontSize: '15px' }}>Vendor Evaluation</h6>
                              {vendorQuotations.map((vendor, index) => (
                                <div key={vendor.id} className='d-flex align-items-center mb-3 p-3 rounded border' style={{ backgroundColor: '#fff' }}>
                                  <div
                                    className='rounded-circle me-3 d-flex align-items-center justify-content-center shadow-sm'
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      backgroundColor: getVendorColor(vendor.vendor, index),
                                      color: '#fff',
                                      fontSize: '16px',
                                      fontWeight: 700
                                    }}
                                  >
                                    {vendor.vendor.charAt(0)}
                                  </div>
                                  <div className='flex-grow-1'>
                                    <div className='fw-bold text-dark' style={{ fontSize: '14px' }}>{vendor.vendor}</div>
                                    <div className='d-flex align-items-center mt-1'>
                                      <KTSVG path='/media/icons/duotune/art/art002.svg' className='svg-icon-5 me-1 text-warning' />
                                      <span className='text-muted fw-semibold' style={{ fontSize: '12px' }}>
                                        Rating: <span className='text-dark'>{vendor.rating.toFixed(1)}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Right Column: Comparative Analysis */}
                          <div className='col-12 col-lg-9'>
                            <h5 className='fw-bold text-dark mb-3' style={{ fontSize: '16px', color: '#009EF7' }}>Comparative Analysis</h5>

                            {/* Vendor Performance Summary Card */}
                            <div className='border rounded p-3 p-md-4' style={{ backgroundColor: '#fff' }}>
                              <h6 className='fw-bold text-dark mb-4' style={{ fontSize: '15px' }}>Vendor Performance Summary</h6>

                              <div className='row align-items-center'>
                                {/* Donut Chart Section */}
                                <div className='col-12 col-md-4 d-flex flex-column align-items-center justify-content-center border-md-end mb-4 mb-md-0'>
                                  <div className='position-relative d-flex justify-content-center align-items-center mb-3' style={{ height: '160px', width: '160px' }}>
                                    <svg width='160' height='160' viewBox='0 0 200 200'>
                                      {vendorQuotations.map((vendor, index) => {
                                        const prevPercentages = vendorQuotations.slice(0, index).reduce((sum, v) => sum + v.percentage, 0)
                                        return (
                                          <circle
                                            key={vendor.id}
                                            cx='100'
                                            cy='100'
                                            r='70'
                                            fill='none'
                                            stroke={getVendorColor(vendor.vendor, index)}
                                            strokeWidth='25'
                                            strokeDasharray={`${vendor.percentage * 4.4} 440`}
                                            strokeDashoffset={`-${prevPercentages * 4.4}`}
                                            transform='rotate(-90 100 100)'
                                            style={{ transition: 'all 0.5s ease' }}
                                          />
                                        )
                                      })}
                                    </svg>
                                    <div className='position-absolute text-center'>
                                      <div className='text-muted fw-semibold' style={{ fontSize: '11px', textTransform: 'uppercase' }}>Best Match</div>
                                      <div className='fw-bolder text-dark' style={{ fontSize: '16px' }}>{bestMatch?.vendor || '-'}</div>
                                    </div>
                                  </div>

                                  {/* Legend */}
                                  <div className='d-flex flex-column align-items-start ps-4'>
                                    {vendorQuotations.map((vendor, index) => (
                                      <div key={vendor.id} className='d-flex align-items-center mb-2'>
                                        <div className='rounded-circle me-2'
                                          style={{ width: '10px', height: '10px', backgroundColor: getVendorColor(vendor.vendor, index) }}
                                        />
                                        <span className='text-gray-700 fw-semibold me-2' style={{ fontSize: '13px' }}>{vendor.vendor}</span>
                                        <span className='text-muted fw-bold' style={{ fontSize: '13px' }}>{vendor.percentage}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Progress Bars Section */}
                                <div className='col-12 col-md-8 ps-md-5'>
                                  {/* Price Comparison */}
                                  <div className='mb-5'>
                                    <div className='d-flex justify-content-between align-items-center mb-2'>
                                      <span className='text-dark fw-bold' style={{ fontSize: '13px' }}>Price Comparison ({vendorQuotations[0]?.currency || 'USD'})</span>
                                      <span className='badge badge-light-success fw-semibold' style={{ fontSize: '11px' }}>Lower is better</span>
                                    </div>
                                    {vendorQuotations.map((vendor, index) => (
                                      <div key={vendor.id} className='mb-2'>
                                        <div className='d-flex justify-content-between mb-1'>
                                          <span className='text-gray-600 fw-semibold' style={{ fontSize: '12px' }}>{vendor.vendor}</span>
                                          <span className='fw-bold text-dark' style={{ fontSize: '13px' }}>{vendor.currency} {vendor.price.toLocaleString()}</span>
                                        </div>
                                        <div className='progress rounded-pill' style={{ height: '10px', backgroundColor: '#F3F6F9' }}>
                                          <div className='progress-bar rounded-pill' role="progressbar"
                                            style={{
                                              width: `${(vendor.price / Math.max(...vendorQuotations.map(v => v.price))) * 100}%`,
                                              backgroundColor: getVendorColor(vendor.vendor, index)
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Delivery Time */}
                                  <div>
                                    <div className='d-flex justify-content-between align-items-center mb-2'>
                                      <span className='text-dark fw-bold' style={{ fontSize: '13px' }}>Delivery Time</span>
                                      <span className='badge badge-light-success fw-semibold' style={{ fontSize: '11px' }}>Lower is better</span>
                                    </div>
                                    {vendorQuotations.map((vendor, index) => {
                                      const deliveryDays = parseInt(vendor.deliveryTime) || 0
                                      const maxDays = Math.max(...vendorQuotations.map(v => parseInt(v.deliveryTime) || 0))
                                      return (
                                        <div key={vendor.id} className='mb-2'>
                                          <div className='d-flex justify-content-between mb-1'>
                                            <span className='text-gray-600 fw-semibold' style={{ fontSize: '12px' }}>{vendor.vendor}</span>
                                            <span className='fw-bold text-dark' style={{ fontSize: '13px' }}>{vendor.deliveryTime}</span>
                                          </div>
                                          <div className='progress rounded-pill' style={{ height: '10px', backgroundColor: '#F3F6F9' }}>
                                            <div className='progress-bar rounded-pill' role="progressbar"
                                              style={{
                                                width: maxDays > 0 ? `${(deliveryDays / maxDays) * 100}%` : '0%',
                                                backgroundColor: getVendorColor(vendor.vendor, index)
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Vendor Quotations Card View */}
                        <div className='mb-2'>
                          <h6 className='fw-bold text-dark mb-3' style={{ fontSize: '15px' }}>Vendor Quotations</h6>
                          <div className='row g-4'>
                            {vendorQuotations.map((vendor, index) => {
                              const isExpanded = expandedCards[vendor.id]
                              const vendorColor = getVendorColor(vendor.vendor, index)

                              return (
                                <div key={vendor.id} className='col-12 col-lg-6'>
                                  <div
                                    className='card border shadow-sm'
                                    style={{
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                      borderLeft: `4px solid ${vendorColor}`,
                                      backgroundColor: '#E8F4F8'
                                    }}
                                  >
                                    {/* Card Header - Always Visible */}
                                    <div
                                      className='card-body p-3 p-md-4'
                                      onClick={() => toggleCardExpansion(vendor.id)}
                                    >
                                      <div className='d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center'>
                                        <div className='d-flex align-items-center flex-grow-1 mb-3 mb-md-0 w-100'>
                                          {/* Vendor Avatar */}
                                          <div
                                            className='rounded-circle me-3 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0'
                                            style={{
                                              width: '50px',
                                              height: '50px',
                                              backgroundColor: vendorColor,
                                              color: '#fff',
                                              fontSize: '18px',
                                              fontWeight: 700
                                            }}
                                          >
                                            {vendor.vendor.charAt(0)}
                                          </div>

                                          {/* Vendor Info */}
                                          <div className='flex-grow-1'>
                                            <div className='d-flex flex-column flex-sm-row align-items-start align-items-sm-center mb-1'>
                                              <h5 className='fw-bold text-dark mb-1 mb-sm-0 me-3' style={{ fontSize: '16px' }}>
                                                {vendor.vendor}
                                              </h5>
                                              <span className={`badge ${vendor.status === 'SUBMITTED' ? 'badge-light-success' : 'badge-light-warning'} fw-bold`}>
                                                {vendor.validity}
                                              </span>
                                            </div>
                                            <div className='text-muted' style={{ fontSize: '13px' }}>
                                              {vendor.vendorCode} • {vendor.vendorEmail}
                                            </div>
                                          </div>

                                          {/* Expand Icon - Mobile */}
                                          <div className='ms-3 d-md-none'>
                                            <KTSVG
                                              path={isExpanded ? '/media/icons/duotune/arrows/arr061.svg' : '/media/icons/duotune/arrows/arr064.svg'}
                                              className='svg-icon-2 text-muted'
                                            />
                                          </div>
                                        </div>

                                        {/* Quick Info */}
                                        <div className='d-flex flex-wrap align-items-center gap-3 gap-md-4 w-100 w-md-auto'>
                                          <div className='text-center'>
                                            <div className='text-muted fw-semibold' style={{ fontSize: '11px' }}>QUOTED PRICE</div>
                                            <div className='fw-bold text-dark' style={{ fontSize: '14px' }}>
                                              {vendor.currency} {vendor.price.toLocaleString()}
                                            </div>
                                          </div>
                                          <div className='text-center'>
                                            <div className='text-muted fw-semibold' style={{ fontSize: '11px' }}>DELIVERY TIME</div>
                                            <div className='fw-bold text-dark' style={{ fontSize: '14px' }}>
                                              {vendor.deliveryTime}
                                            </div>
                                          </div>
                                          <div className='text-center'>
                                            <div className='text-muted fw-semibold' style={{ fontSize: '11px' }}>RATING</div>
                                            <div className='d-flex align-items-center justify-content-center'>
                                              <KTSVG path='/media/icons/duotune/art/art002.svg' className='svg-icon-5 me-1 text-warning' />
                                              <span className='fw-bold text-dark' style={{ fontSize: '14px' }}>
                                                {vendor.rating.toFixed(1)}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Expand Icon - Desktop */}
                                          <div className='ms-3 d-none d-md-block'>
                                            <KTSVG
                                              path={isExpanded ? '/media/icons/duotune/arrows/arr061.svg' : '/media/icons/duotune/arrows/arr064.svg'}
                                              className='svg-icon-2 text-muted'
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                      <div className='card-body pt-0 pb-4 px-4 border-top'>
                                        <div className='row g-4 mt-2'>
                                          {/* Left Column - Vendor Details */}
                                          <div className='col-12 col-md-6'>
                                            <h6 className='fw-bold text-dark mb-3' style={{ fontSize: '14px' }}>Vendor Details</h6>
                                            <div className='mb-3'>
                                              <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Contact Number</label>
                                              <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.vendorContact}</div>
                                            </div>
                                            <div className='mb-3'>
                                              <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Email Address</label>
                                              <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.vendorEmail}</div>
                                            </div>
                                            <div className='mb-3'>
                                              <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Vendor Code</label>
                                              <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.vendorCode}</div>
                                            </div>
                                            <div className='row'>
                                              <div className='col-6'>
                                                <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Total Orders</label>
                                                <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.totalOrders}</div>
                                              </div>
                                              <div className='col-6'>
                                                <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Issue Count</label>
                                                <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.issueCount}</div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Right Column - Quotation Details */}
                                          <div className='col-12 col-md-6'>
                                            <h6 className='fw-bold text-dark mb-3' style={{ fontSize: '14px' }}>Quotation Details</h6>
                                            <div className='mb-3'>
                                              <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Delivery Port</label>
                                              <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.deliveryPort}</div>
                                            </div>
                                            <div className='mb-3'>
                                              <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Payment Terms</label>
                                              <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.paymentTerms}</div>
                                            </div>
                                            <div className='mb-3'>
                                              <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Currency</label>
                                              <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.currency}</div>
                                            </div>
                                            {vendor.requisitionQuantity && (
                                              <div className='mb-3'>
                                                <label className='text-muted fw-semibold mb-1' style={{ fontSize: '12px' }}>Quantity</label>
                                                <div className='text-dark fw-bold' style={{ fontSize: '14px' }}>{vendor.requisitionQuantity}</div>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className='d-flex flex-column flex-sm-row justify-content-end gap-2 mt-4 pt-3 border-top'>
                                          <button className='btn btn-sm btn-light-primary w-100 w-sm-auto'>
                                            <KTSVG path='/media/icons/duotune/general/gen004.svg' className='svg-icon-3 me-1' />
                                            View Details
                                          </button>
                                          {vendor.remainingQuantityToFulfillReq === 0 && vendor.status !== 'SELECTED' && (
                                            <div className='alert alert-warning mb-2 py-2 px-3' style={{ fontSize: '12px' }}>
                                              <i className='bi bi-exclamation-triangle-fill me-2'></i>
                                              Requisition requirements have already been fulfilled
                                            </div>
                                          )}
                                          <button
                                            className='btn btn-sm btn-primary w-100 w-sm-auto'
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSelectQuotation(vendor.id, vendor.actualQuantityAssignedToVendor)
                                            }}
                                            disabled={vendor.status === 'SELECTED' || loading || vendor.remainingQuantityToFulfillReq === 0}
                                            title={vendor.remainingQuantityToFulfillReq === 0 ? 'Requisition requirements have already been fulfilled' : ''}
                                          >
                                            {vendor.status === 'SELECTED' ? 'Selected' : 'Select Quotation'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className='d-flex flex-column flex-sm-row justify-content-end gap-3 mt-5 pt-3 border-top'>
                          <button className='btn btn-light btn-active-light-primary w-100 w-sm-auto'>Download Comparison</button>
                          <button className='btn btn-light btn-active-light-primary w-100 w-sm-auto'>Request Revision</button>
                          <button
                            className='btn btn-primary w-100 w-sm-auto'
                            onClick={handleFinalizeSelection}
                            disabled={loading}
                          >
                            {loading ? 'Finalizing...' : 'Finalize Selection'}
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Past RFQs Tab Content */}
                {activeTab === 'past' && (
                  <>
                    <h4 className='fw-bold text-primary mb-4'>Past RFQs ({pastRFQs.length})</h4>

                    {pastRFQsLoading ? (
                      <div className='text-center py-5'>
                        <div className='spinner-border text-primary' role='status'>
                          <span className='visually-hidden'>Loading...</span>
                        </div>
                      </div>
                    ) : (
                      <div className='report-table table-responsive'>
                        <div style={{ overflowX: 'auto' }}>
                          <table className='table table-bordered align-middle'>
                            <thead className='table-header text-start'>
                              <tr>
                                <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>RFQ NUMBER</th>
                                <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ITEM DESCRIPTION</th>
                                <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>REQUISITION</th>
                                <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>SELECTED VENDOR</th>
                                <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>TOTAL AMOUNT</th>
                                <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>DELIVERY DATE</th>
                                <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>STATUS</th>
                                <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody className='table-body text-start'>
                              {pastRFQs.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className='text-center text-muted py-5'>
                                    No past RFQs found.
                                  </td>
                                </tr>
                              ) : (
                                pastRFQs
                                  .slice((pastCurrentPage - 1) * pastRowsPerPage, pastCurrentPage * pastRowsPerPage)
                                  .map((rfq) => (
                                    <tr key={rfq.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                      <td className='text-primary fw-semibold fs-6' style={{ padding: '12px 16px' }}>
                                        {rfq.title}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', maxWidth: '300px' }}>
                                        {rfq.itemDescription}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                        {rfq.requisition?.requisition_code || 'N/A'}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                        {rfq.selectedQuotation?.vendor?.name || 'N/A'}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                        ${rfq.selectedQuotation?.totalAmount?.toFixed(2) || '0.00'}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                        {rfq.selectedQuotation?.promisedDeliveryDate || 'N/A'}
                                      </td>
                                      <td style={{ padding: '12px 16px' }}>
                                        <span className='badge bg-secondary text-white'>CLOSED</span>
                                      </td>
                                      <td className='text-center' style={{ padding: '12px 16px' }}>
                                        <button
                                          className='btn btn-sm px-0'
                                          title='View'
                                          onClick={() => handleViewPastRFQ(rfq)}
                                        >
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
                        {pastRFQs.length > 0 && (
                          <div className='pagination-wrapper d-flex justify-content-between align-items-center py-3'>
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
                                value={pastRowsPerPage}
                                onChange={(e) => {
                                  setPastRowsPerPage(parseInt(e.target.value))
                                  setPastCurrentPage(1)
                                }}
                              >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                            <div className='d-flex align-items-center'>
                              <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                                Showing <strong>{((pastCurrentPage - 1) * pastRowsPerPage) + 1}-{Math.min(pastCurrentPage * pastRowsPerPage, pastRFQs.length)}</strong> of <strong>{pastRFQs.length}</strong>
                              </span>

                              <nav>
                                <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                  <li className={`page-item ${pastCurrentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => setPastCurrentPage(pastCurrentPage - 1)}
                                      disabled={pastCurrentPage === 1}
                                    >
                                      ‹
                                    </button>
                                  </li>

                                  {(() => {
                                    const totalPages = Math.ceil(pastRFQs.length / pastRowsPerPage)
                                    const pages = []
                                    const showPages = 5
                                    let startPage = Math.max(1, pastCurrentPage - 2)
                                    let endPage = Math.min(totalPages, startPage + showPages - 1)

                                    if (endPage - startPage < showPages - 1) {
                                      startPage = Math.max(1, endPage - showPages + 1)
                                    }

                                    for (let i = startPage; i <= endPage; i++) {
                                      pages.push(
                                        <li key={i} className={`page-item ${pastCurrentPage === i ? 'active' : ''}`}>
                                          <button
                                            className='page-link text-muted'
                                            style={{
                                              backgroundColor: pastCurrentPage === i ? '#F4F9FF' : 'transparent',
                                              border: '1px solid #dee2e6',
                                              padding: '8px 12px',
                                              fontSize: '14px',
                                              minWidth: '40px',
                                              borderRadius: '6px'
                                            }}
                                            onClick={() => setPastCurrentPage(i)}
                                          >
                                            {i}
                                          </button>
                                        </li>
                                      )
                                    }
                                    return pages
                                  })()}

                                  <li className={`page-item ${pastCurrentPage === Math.ceil(pastRFQs.length / pastRowsPerPage) ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => setPastCurrentPage(pastCurrentPage + 1)}
                                      disabled={pastCurrentPage === Math.ceil(pastRFQs.length / pastRowsPerPage)}
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
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Past RFQ Modal */}
      <ViewPastRFQModal
        visible={isViewPastRFQModalVisible}
        onClose={() => {
          setIsViewPastRFQModalVisible(false)
          setSelectedPastRFQ(null)
        }}
        rfq={selectedPastRFQ}
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
    </div>
  )
}

export { QuotationManagement }
