import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import {
  getRFQs,
  getNextRFQCode,
  createRFQFromRequisition,
  inviteVendorsToRFQ,
  inviteVendorsToRFQLines,
  sendRFQ,
  deleteRFQ,
  getRequisitions,
  getVendors,
  getPorts,
  getRFQVendors,
  getVendorCategories,
  getPartById,
  getVendorById,
  getRFQById
} from '../core/_requests'
import {
  RFQDisplay,
  CreateRFQFromRequisitionRequest,
  RFQ,
  Requisition,
  Vendor,
  Port
} from '../core/_models'
import { useAuth } from '../../auth'

interface CreateRFQModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  requisitions: Requisition[]
  vendors: Vendor[]
  ports: Port[]
  currentUserCgaid?: number
}

const CreateRFQModal: FC<CreateRFQModalProps> = ({ visible, onClose, onSubmit, requisitions, vendors, ports, currentUserCgaid }) => {
  const [formData, setFormData] = useState({
    requisitionId: '',
    title: '',
    itemDescription: '',
    technicalSpecifications: '',
    responseDueDate: '',
    deliveryPortId: '',
    selectedVendors: [] as number[],
    lineVendorSelection: {} as { [lineId: number]: number[] }
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [hasMultipleLines, setHasMultipleLines] = useState(false)
  const [createSeparateRFQs, setCreateSeparateRFQs] = useState(false)

  useEffect(() => {
    if (visible) {
      // Check for URL parameter first
      const urlParams = new URLSearchParams(window.location.search)
      const requisitionId = urlParams.get('requisitionId')

      if (requisitionId && !formData.requisitionId) {
        // Pre-select the requisition from URL
        setFormData(prev => ({
          ...prev,
          requisitionId: requisitionId
        }))
      }

      if (formData.requisitionId) {
        const req = requisitions.find(r => r.id === parseInt(formData.requisitionId))
        if (req) {
          const hasLines = !!(req.lines && req.lines.length > 0)
          setHasMultipleLines(hasLines)

          // Initialize line vendor selection if has lines
          if (hasLines) {
            const lineVendorSelection: { [lineId: number]: number[] } = {}
            req.lines!.forEach(line => {
              lineVendorSelection[line.id] = []
            })
            setFormData(prev => ({
              ...prev,
              title: `RFQ - ${req.title}`,
              itemDescription: req.description,
              deliveryPortId: req.requestedPortId?.toString() || '',
              lineVendorSelection
            }))
          } else {
            setFormData(prev => ({
              ...prev,
              title: `RFQ - ${req.title}`,
              itemDescription: req.description,
              deliveryPortId: req.requestedPortId?.toString() || ''
            }))
          }
        }
      }
    }
  }, [formData.requisitionId, requisitions, visible])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleVendorToggle = (vendorId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedVendors: prev.selectedVendors.includes(vendorId)
        ? prev.selectedVendors.filter(id => id !== vendorId)
        : [...prev.selectedVendors, vendorId]
    }))
  }

  const handleLineVendorToggle = (lineId: number, vendorId: number) => {
    setFormData(prev => {
      const currentLineVendors = prev.lineVendorSelection[lineId] || []
      const newLineVendors = currentLineVendors.includes(vendorId)
        ? currentLineVendors.filter(id => id !== vendorId)
        : [...currentLineVendors, vendorId]

      return {
        ...prev,
        lineVendorSelection: {
          ...prev.lineVendorSelection,
          [lineId]: newLineVendors
        }
      }
    })
  }

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.requisitionId) {
      newErrors.requisitionId = 'Please select a requisition'
    }
    if (!formData.title.trim()) newErrors.title = 'RFQ Title is required'
    if (!formData.itemDescription.trim()) newErrors.itemDescription = 'Item Description is required'
    if (!formData.technicalSpecifications.trim()) newErrors.technicalSpecifications = 'Technical Specifications are required'
    if (!formData.responseDueDate) newErrors.responseDueDate = 'Response Due Date is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors: { [key: string]: string } = {}

    if (hasMultipleLines && createSeparateRFQs) {
      // Validate that each line has at least one vendor selected
      const selectedReq = requisitions.find(r => r.id === parseInt(formData.requisitionId))
      if (selectedReq && selectedReq.lines) {
        const hasEmptyLines = selectedReq.lines.some(line =>
          !formData.lineVendorSelection[line.id] || formData.lineVendorSelection[line.id].length === 0
        )
        if (hasEmptyLines) {
          newErrors.selectedVendors = 'Please select at least one vendor for each subcomponent'
        }
      }
    } else {
      if (formData.selectedVendors.length === 0) {
        newErrors.selectedVendors = 'Please select at least one vendor'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    setIsSubmitting(true)
    try {
      // Get cgaid from the selected requisition
      const selectedReq = requisitions.find(r => r.id === parseInt(formData.requisitionId))
      if (!selectedReq) {
        toast.error('Selected requisition not found')
        return
      }

      // Check if requisition has lines
      const hasLines = selectedReq.lines && selectedReq.lines.length > 0
      console.log('Requisition has lines:', hasLines, 'Lines:', selectedReq.lines)

      // Use current user's cgaid for the RFQ
      const cgaid = currentUserCgaid || 26 // Fallback to 26 if not available
      console.log('Creating RFQ with cgaid:', cgaid)

      if (hasLines && createSeparateRFQs) {
        // Create separate RFQs for each line with different vendors
        console.log('Creating separate RFQs for each subcomponent')

        const createdRFQs: RFQ[] = []
        for (const line of selectedReq.lines!) {
          const lineVendors = formData.lineVendorSelection[line.id] || []
          if (lineVendors.length === 0) continue

          // Get part/subcomponent details for the title
          const part = await getPartById(line.partId)
          const lineTitle = `${formData.title} - ${part.name || `Line ${line.id}`}`

          const payload: CreateRFQFromRequisitionRequest = {
            title: lineTitle,
            responseDueDate: formData.responseDueDate,
            cgaid: cgaid,
            caid: null,
            itemDescription: `${formData.itemDescription} - Subcomponent: ${part.name || line.subcomponentId}`,
            technicalSpecifications: formData.technicalSpecifications,
            deliveryPortOverrideId: formData.deliveryPortId ? parseInt(formData.deliveryPortId) : null
          }

          console.log('Creating RFQ for line:', line.id, 'with payload:', payload)
          const rfq = await createRFQFromRequisition(parseInt(formData.requisitionId), payload)

          // Invite vendors for this specific line
          const lineInvitations = [{
            requisitionLineId: line.id,
            vendorIds: lineVendors
          }]

          const updatedRfq = await inviteVendorsToRFQLines(rfq.id, lineInvitations)
          createdRFQs.push(updatedRfq)
          console.log('RFQ created for line:', line.id, 'RFQ ID:', updatedRfq.id)
        }

        toast.success(`Successfully created ${createdRFQs.length} RFQ(s) for different subcomponents!`)
      } else {
        // Original behavior: Create one RFQ for all lines or single item
        const payload: CreateRFQFromRequisitionRequest = {
          title: formData.title,
          responseDueDate: formData.responseDueDate,
          cgaid: cgaid,
          caid: null,
          itemDescription: formData.itemDescription,
          technicalSpecifications: formData.technicalSpecifications,
          deliveryPortOverrideId: formData.deliveryPortId ? parseInt(formData.deliveryPortId) : null
        }

        console.log('Creating RFQ with payload:', payload)
        const rfq = await createRFQFromRequisition(parseInt(formData.requisitionId), payload)
        console.log('RFQ created:', rfq)

        // Invite vendors based on whether requisition has lines
        let updatedRfq: RFQ

        if (hasLines) {
          // If requisition has lines, invite vendors for each line
          console.log('Requisition has lines, inviting vendors per line')

          // Create line invitations - invite same vendors to all lines
          const lineInvitations = selectedReq.lines!.map(line => ({
            requisitionLineId: line.id,
            vendorIds: formData.selectedVendors
          }))

          console.log('Line invitations:', lineInvitations)
          updatedRfq = await inviteVendorsToRFQLines(rfq.id, lineInvitations)
          console.log('Vendors invited to lines:', updatedRfq)
        } else {
          // If no lines, invite vendors to the RFQ directly (old behavior)
          console.log('Requisition has no lines, inviting vendors to RFQ')
          updatedRfq = await inviteVendorsToRFQ(rfq.id, formData.selectedVendors)
          console.log('Vendors invited:', formData.selectedVendors, 'Updated RFQ:', updatedRfq)
        }

        console.log('RFQ created with status:', updatedRfq.status)
        console.log('Invited vendors:', updatedRfq.invitedVendorIds)

        toast.success('RFQ created and vendors invited successfully!')
      }

      handleClose()

      // Call onSubmit to refresh the table
      await onSubmit()

      // Clear URL parameters after successful creation
      window.history.replaceState({}, document.title, window.location.pathname)
    } catch (error: any) {
      console.error('Error creating RFQ:', error)
      toast.error(error.message || 'Failed to create RFQ')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      requisitionId: '',
      title: '',
      itemDescription: '',
      technicalSpecifications: '',
      responseDueDate: '',
      deliveryPortId: '',
      selectedVendors: [],
      lineVendorSelection: {}
    })
    setErrors({})
    setStep(1)
    setHasMultipleLines(false)
    setCreateSeparateRFQs(false)
  }

  const handleClose = () => {
    resetForm()
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
      <div className='modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <div>
              <h5 className='modal-title'>Create New RFQ</h5>
              <p className='text-muted mb-0 fs-7'>Step {step} of 2: {step === 1 ? 'RFQ Details' : 'Select Vendors'}</p>
            </div>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <div className='modal-body' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {step === 1 ? (
              <div className='row g-3'>
                <div className='col-md-12'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Select Requisition</label>
                  <select
                    className={`form-select ${errors.requisitionId ? 'is-invalid' : ''}`}
                    name='requisitionId'
                    value={formData.requisitionId}
                    onChange={handleInputChange}
                  >
                    <option value=''>Select a requisition</option>
                    {requisitions.filter(req => req.status === 'SHORE_APPROVED').map(req => (
                      <option key={req.id} value={req.id}>
                        {req.requisition_code} - {req.title} ({req.status})
                      </option>
                    ))}
                  </select>
                  {errors.requisitionId && <div className='invalid-feedback'>{errors.requisitionId}</div>}
                </div>

                <div className='col-md-12'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>RFQ Title</label>
                  <input
                    type='text'
                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                    name='title'
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder='RFQ title (auto-generated from requisition)'
                    style={{ color: '#000' }}
                  />
                  {errors.title && <div className='invalid-feedback'>{errors.title}</div>}
                </div>

                <div className='col-md-12'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Item Description</label>
                  <textarea
                    className={`form-control ${errors.itemDescription ? 'is-invalid' : ''}`}
                    name='itemDescription'
                    value={formData.itemDescription}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder='Brief description of the item or service'
                    style={{ color: '#000' }}
                  />
                  {errors.itemDescription && <div className='invalid-feedback'>{errors.itemDescription}</div>}
                </div>

                <div className='col-md-12'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Technical Specifications</label>
                  <textarea
                    className={`form-control ${errors.technicalSpecifications ? 'is-invalid' : ''}`}
                    name='technicalSpecifications'
                    value={formData.technicalSpecifications}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder='Detailed technical specifications (e.g., Micron: 10μ; OD: 80mm; Height: 120mm)'
                    style={{ color: '#000' }}
                  />
                  {errors.technicalSpecifications && <div className='invalid-feedback'>{errors.technicalSpecifications}</div>}
                </div>

                <div className='col-md-6'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Response Due Date</label>
                  <input
                    type='date'
                    className={`form-control ${errors.responseDueDate ? 'is-invalid' : ''}`}
                    name='responseDueDate'
                    value={formData.responseDueDate}
                    onChange={handleInputChange}
                    style={{ color: '#000' }}
                  />
                  {errors.responseDueDate && <div className='invalid-feedback'>{errors.responseDueDate}</div>}
                </div>

                <div className='col-md-6'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Delivery Port (Optional Override)
                  </label>
                  <select
                    className={`form-select ${errors.deliveryPortId ? 'is-invalid' : ''}`}
                    name='deliveryPortId'
                    value={formData.deliveryPortId}
                    onChange={handleInputChange}
                  >
                    <option value=''>Use requisition port</option>
                    {ports.map(port => (
                      <option key={port.id} value={port.id}>
                        {port.name || port.main_port}{port.code ? ` (${port.code})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.deliveryPortId && <div className='invalid-feedback'>{errors.deliveryPortId}</div>}
                </div>
              </div>
            ) : (
              <div>
                <h6 className='fw-bold mb-3'>Select Vendors to Invite (3-5 recommended)</h6>

                {hasMultipleLines && (
                  <div className='alert alert-info mb-4'>
                    <div className='form-check'>
                      <input
                        className='form-check-input'
                        type='checkbox'
                        id='createSeparateRFQs'
                        checked={createSeparateRFQs}
                        onChange={(e) => setCreateSeparateRFQs(e.target.checked)}
                      />
                      <label className='form-check-label' htmlFor='createSeparateRFQs'>
                        Create separate RFQs for each subcomponent with different vendors
                      </label>
                    </div>
                    <small className='text-muted d-block mt-2'>
                      This requisition has multiple subcomponents. Enable this option to select different vendors for each subcomponent.
                    </small>
                  </div>
                )}

                {errors.selectedVendors && (
                  <div className='alert alert-danger'>{errors.selectedVendors}</div>
                )}

                {hasMultipleLines && createSeparateRFQs ? (
                  // Show vendor selection per line
                  <div>
                    {requisitions.find(r => r.id === parseInt(formData.requisitionId))?.lines?.map((line, lineIndex) => (
                      <div key={line.id} className='mb-4 border rounded p-3'>
                        <h6 className='fw-bold mb-3'>
                          Subcomponent {lineIndex + 1} - Part ID: {line.partId}
                          <span className='badge bg-secondary ms-2'>Qty: {line.quantity}</span>
                        </h6>
                        <div className='row g-3'>
                          {vendors.filter(v => v.status !== 'Blocklisted' && v.tag !== 'BLOCKLISTED').map(vendor => {
                            const isSelected = formData.lineVendorSelection[line.id]?.includes(vendor.id) || false
                            return (
                              <div key={vendor.id} className='col-md-6'>
                                <div
                                  className={`card cursor-pointer ${isSelected ? 'border-primary' : ''}`}
                                  onClick={() => handleLineVendorToggle(line.id, vendor.id)}
                                  style={{
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#F4F9FF' : 'white'
                                  }}
                                >
                                  <div className='card-body p-2'>
                                    <div className='d-flex align-items-center'>
                                      <input
                                        type='checkbox'
                                        className='form-check-input me-2'
                                        checked={isSelected}
                                        onChange={() => { }}
                                      />
                                      <div className='flex-grow-1'>
                                        <h6 className='mb-0 fs-7 fw-bold'>{vendor.name}</h6>
                                        <small className='text-muted'>{vendor.email}</small>
                                      </div>
                                      <span className={`badge badge-sm ${vendor.tag === 'PREMIUM' || vendor.status === 'Preferred' ? 'bg-success' : 'bg-primary'}`}>
                                        {vendor.tag || vendor.status || 'NORMAL'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className='mt-2 text-muted'>
                          <small>Selected: {formData.lineVendorSelection[line.id]?.length || 0} vendor(s)</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Show regular vendor selection (all vendors for all lines)
                  <div>
                    <div className='row g-3'>
                      {vendors.filter(v => v.status !== 'Blocklisted' && v.tag !== 'BLOCKLISTED').map(vendor => (
                        <div key={vendor.id} className='col-md-6'>
                          <div
                            className={`card cursor-pointer ${formData.selectedVendors.includes(vendor.id) ? 'border-primary' : ''}`}
                            onClick={() => handleVendorToggle(vendor.id)}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: formData.selectedVendors.includes(vendor.id) ? '#F4F9FF' : 'white'
                            }}
                          >
                            <div className='card-body p-3'>
                              <div className='d-flex justify-content-between align-items-start'>
                                <div className='flex-grow-1'>
                                  <div className='d-flex align-items-center mb-2'>
                                    <input
                                      type='checkbox'
                                      className='form-check-input me-2'
                                      checked={formData.selectedVendors.includes(vendor.id)}
                                      onChange={() => { }}
                                    />
                                    <h6 className='mb-0 fw-bold'>{vendor.name}</h6>
                                  </div>
                                  <p className='text-muted mb-1 fs-7'>{vendor.email}</p>
                                  {(vendor.contactPerson || vendor.contactNo) && (
                                    <p className='text-muted mb-1 fs-7'>{vendor.contactPerson || vendor.contactNo}</p>
                                  )}
                                  <div className='d-flex gap-1 flex-wrap mt-2'>
                                    {vendor.categories && vendor.categories.length > 0 ? (
                                      <>
                                        {vendor.categories.slice(0, 2).map((cat, idx) => (
                                          <span key={idx} className='badge bg-secondary'>{cat}</span>
                                        ))}
                                        {vendor.categories.length > 2 && (
                                          <span className='badge bg-secondary'>+{vendor.categories.length - 2}</span>
                                        )}
                                      </>
                                    ) : (
                                      <span className='text-muted fs-7'>No categories</span>
                                    )}
                                  </div>
                                  {vendor.rating !== undefined && vendor.rating > 0 && (
                                    <div className='mt-2'>
                                      <small className='text-warning'>Rating: {vendor.rating}/5</small>
                                    </div>
                                  )}
                                </div>
                                <span className={`badge ${vendor.tag === 'PREMIUM' || vendor.status === 'Preferred' ? 'bg-success' : 'bg-primary'}`}>
                                  {vendor.tag || vendor.status || 'NORMAL'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {vendors.filter(v => v.status !== 'Blocklisted' && v.tag !== 'BLOCKLISTED').length === 0 && (
                      <p className='text-center text-muted py-5'>No vendors available. Please add vendors first.</p>
                    )}
                    <div className='mt-3 text-muted'>
                      <small>Selected: {formData.selectedVendors.length} vendor(s)</small>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            {step === 1 ? (
              <button
                type='button'
                className='btn btn_primary'
                onClick={handleNext}
              >
                Next: Select Vendors
              </button>
            ) : (
              <>
                <button
                  type='button'
                  className='btn btn-secondary btn-sm'
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating & Sending...' : 'Create & Send RFQ'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface ViewRFQModalProps {
  visible: boolean
  onClose: () => void
  rfq: RFQDisplay | null
}

const ViewRFQModal: FC<ViewRFQModalProps> = ({ visible, onClose, rfq }) => {
  if (!visible || !rfq) return null

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      'DRAFT': { bg: 'bg-secondary', text: 'Draft' },
      'SENT': { bg: 'bg-primary', text: 'Sent' },
      'RESPONDED': { bg: 'bg-success', text: 'Responded' },
      'PENDING': { bg: 'bg-warning', text: 'Pending' }
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
              <h3 className='modal-title fw-bold text-dark mb-1'>RFQ Details</h3>
              <p className='text-muted mb-0 fs-7'>{rfq.rfqNumber}</p>
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
                <p className='fs-6 text-dark fw-bold'>{rfq.rfqNumber}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Item Name</label>
                <p className='fs-6 text-dark'>{rfq.itemName}</p>
              </div>
              {rfq.requisitionNumber && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Requisition Number</label>
                  <p className='fs-6 text-dark'>{rfq.requisitionNumber}</p>
                </div>
              )}
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Response Due Date</label>
                <p className='fs-6 text-dark'>{rfq.responseDueDate}</p>
              </div>
              <div className='col-md-12'>
                <label className='form-label fw-semibold text-muted fs-7'>Item Description</label>
                <p className='fs-6 text-dark'>{rfq.itemDescription}</p>
              </div>
            </div>

            {/* Delivery & Quantity Information */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <h5 className='fw-bold text-primary mb-3'>Delivery & Quantity</h5>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Delivery Port</label>
                <p className='fs-6 text-dark'>{rfq.deliveryPort}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Quantity</label>
                <p className='fs-6 text-dark'>{rfq.quantity}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Estimated Value</label>
                <p className='fs-6 text-dark fw-bold text-success'>${rfq.estimatedValue}</p>
              </div>
            </div>

            {/* Vendor Information */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <h5 className='fw-bold text-primary mb-3'>Vendor Information</h5>
              </div>
            </div>

            {/* Show vendor names if available, otherwise show count */}
            {rfq.vendorDetails && rfq.vendorDetails.length > 0 ? (
              <>
                <div className='row g-4 mb-4'>
                  <div className='col-md-12'>
                    <label className='form-label fw-semibold text-muted fs-7'>Invited Vendors</label>
                    <p className='fs-6 text-dark fw-bold'>
                      {rfq.vendorDetails.map((vendor, index) => (
                        <span key={index}>
                          {vendor.vendorName}
                          {index < rfq.vendorDetails.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label fw-semibold text-muted fs-7'>Responses</label>
                    <p className='fs-6 text-dark'>{rfq.responses}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className='row g-4 mb-4'>
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Invited Vendors</label>
                  <p className='fs-6 text-dark fw-bold'>{rfq.vendors}</p>
                </div>
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Responses</label>
                  <p className='fs-6 text-dark'>{rfq.responses}</p>
                </div>
              </div>
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

const RFQManagement: FC = () => {
  const { currentUser, auth } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [rfqData, setRfqData] = useState<RFQDisplay[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: keyof RFQDisplay | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isViewModalVisible, setIsViewModalVisible] = useState(false)
  const [selectedRFQ, setSelectedRFQ] = useState<RFQDisplay | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [requisitions, setRequisitions] = useState<Requisition[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [ports, setPorts] = useState<Port[]>([])

  // Get user role from auth context
  const userRole = currentUser?.role?.id || auth?.role?.id || 4

  // Get vesselId from user context
  const vesselId = currentUser?.vessel?.id || 1

  useEffect(() => {
    if (vesselId) {
      loadInitialData()
    }

    // Check if there's a requisitionId in URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const requisitionId = urlParams.get('requisitionId')
    if (requisitionId) {
      // Open modal automatically if requisitionId is provided
      setIsModalVisible(true)
    }
  }, [vesselId])

  useEffect(() => {
    // Load RFQs when component mounts or when ports/requisitions are loaded
    loadRFQs()
  }, [ports, requisitions])

  const loadInitialData = async () => {
    try {
      const [reqResponse, vendorResponse, portsData, vendorCategoriesData] = await Promise.all([
        getRequisitions(undefined, undefined, vesselId),
        getVendors(0, 1000),
        getPorts(),
        getVendorCategories()
      ])
      console.log('RFQ - All requisitions:', reqResponse.content.map(r => ({ id: r.id, code: r.requisition_code, status: r.status })))
      console.log('RFQ - Shore approved requisitions:', reqResponse.content.filter(r => r.status === 'SHORE_APPROVED'))
      console.log('RFQ - Unique status values:', Array.from(new Set(reqResponse.content.map(r => r.status))))
      console.log('RFQ - Vendors loaded:', vendorResponse.content)
      console.log('RFQ - Vendor categories loaded:', vendorCategoriesData)

      // Map vendors to include category names instead of just IDs
      const vendorsWithCategories = vendorResponse.content.map(vendor => ({
        ...vendor,
        categories: vendor.categoryIds
          ? vendor.categoryIds.map(catId => {
            const category = vendorCategoriesData.find(c => c.id === catId)
            return category ? category.name : `Category ${catId}`
          })
          : []
      }))

      console.log('RFQ - Vendors with categories:', vendorsWithCategories)

      setRequisitions(reqResponse.content)
      setVendors(vendorsWithCategories)
      setPorts(portsData)
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }

  const loadRFQs = async () => {
    setIsLoading(true)
    try {
      // Get cgaid from current user for filtering RFQs (optional - load all if not set)
      const cgaid = currentUser?.companyGroupAdminId
      console.log('Loading RFQs with cgaid:', cgaid)
      const rfqs: RFQ[] = await getRFQs(cgaid)
      console.log('RFQ Response:', rfqs)
      console.log('RFQs loaded:', rfqs.length)

      // Process RFQs for display
      const displayItemsPromises = rfqs.map(async (rfq: RFQ) => {
        const port = ports.find(p => p.id === (rfq.deliveryPortOverrideId || rfq.deliveryPortId))
        const req = requisitions.find(r => r.id === rfq.requisitionId)

        // Get vendor count from invitedVendorIds or try to fetch
        let vendorCount = 0
        if (rfq.invitedVendorIds && rfq.invitedVendorIds.length > 0) {
          vendorCount = rfq.invitedVendorIds.length
        } else {
          try {
            const vendorIds = await getRFQVendors(rfq.id)
            vendorCount = vendorIds.length
          } catch (error) {
            console.warn(`Could not fetch vendors for RFQ ${rfq.id}`)
          }
        }

        // Get quantity and estimated value from RFQ or fallback to requisition
        const quantity = rfq.quantity || req?.quantity
        const uom = rfq.uom || req?.uom
        const estimatedValue = rfq.estimatedValue || (req?.estimatedUnitPrice && req?.quantity ? req.estimatedUnitPrice * req.quantity : null)

        return {
          id: rfq.id,
          rfqNumber: rfq.rfqNumber || `RFQ-${rfq.id}`,
          status: rfq.status,
          itemName: rfq.itemName || rfq.title,
          itemDescription: rfq.itemDescription,
          requisitionNumber: req?.requisition_code,
          responseDueDate: rfq.responseDueDate,
          deliveryPort: port?.name || port?.main_port || 'N/A',
          estimatedValue: estimatedValue ? estimatedValue.toLocaleString() : 'N/A',
          quantity: quantity && uom ? `${quantity} ${uom}` : (quantity ? quantity.toString() : 'N/A'),
          vendors: vendorCount,
          responses: `0/${vendorCount}`,
          vendorDetails: []
        }
      })

      const displayItems = await Promise.all(displayItemsPromises)
      setRfqData(displayItems)
    } catch (error: any) {
      console.error('Error loading RFQs:', error)
      toast.error('Failed to load RFQs: ' + (error.message || 'Unknown error'))
      setRfqData([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddRFQSuccess = async () => {
    // Reload RFQs from API to get the latest data
    console.log('RFQ created successfully, reloading RFQ list...')
    await loadRFQs()
    console.log('RFQ list reloaded')
  }

  const handleDeleteRFQ = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this RFQ?')) return

    try {
      await deleteRFQ(id)
      toast.success('RFQ deleted successfully!')
      await loadRFQs()
    } catch (error: any) {
      console.error('Error deleting RFQ:', error)
      toast.error(error.message || 'Failed to delete RFQ')
    }
  }

  const handleViewRFQ = async (record: RFQDisplay) => {
    try {
      // Fetch full RFQ details including vendor IDs
      const fullRFQ = await getRFQById(record.id)

      // Fetch vendor details for all invited vendors
      const vendorDetailsPromises = fullRFQ.invitedVendorIds.map(async (vendorId) => {
        try {
          const vendor = await getVendorById(vendorId)
          return {
            vendorId: vendor.id,
            vendorName: vendor.name,
            status: 'Pending' as 'Responded' | 'Pending',
            responseDate: undefined
          }
        } catch (error) {
          console.error(`Error fetching vendor ${vendorId}:`, error)
          return {
            vendorId: vendorId,
            vendorName: `Vendor ${vendorId}`,
            status: 'Pending' as 'Responded' | 'Pending',
            responseDate: undefined
          }
        }
      })

      const vendorDetails = await Promise.all(vendorDetailsPromises)

      // Update the record with vendor details
      const updatedRecord = {
        ...record,
        vendorDetails
      }

      setSelectedRFQ(updatedRecord)
      setIsViewModalVisible(true)
    } catch (error) {
      console.error('Error fetching RFQ details:', error)
      toast.error('Failed to load RFQ details')
    }
  }

  const handleSendRFQ = async (id: number) => {
    if (!window.confirm('Are you sure you want to send this RFQ to vendors?')) return

    try {
      await sendRFQ(id, { status: 'SENT' })
      toast.success('RFQ sent successfully!')
      await loadRFQs()
    } catch (error: any) {
      console.error('Error sending RFQ:', error)
      toast.error(error.message || 'Failed to send RFQ')
    }
  }

  const filteredData = useMemo(() => {
    return rfqData.filter(record => {
      const matchesSearch = searchTerm === '' ||
        record.rfqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.deliveryPort.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesSearch
    })
  }, [searchTerm, rfqData])

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

  const handleSort = (key: keyof RFQDisplay) => {
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

  // Export RFQs to PDF
  const exportRFQsToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })

      // Title
      doc.setFontSize(16)
      doc.text('RFQ Management', 14, 15)

      // Subtitle with date
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
      doc.text(`Total RFQs: ${sortedData.length}`, 14, 28)

      // Prepare table data
      const tableData = sortedData.map(record => [
        record.rfqNumber || '',
        record.status || '',
        record.itemName || '',
        record.requisitionNumber || 'Manual',
        record.responseDueDate || '',
        record.deliveryPort || '',
        record.vendors?.toString() || '0',
        record.responses || '0/1'
      ])

        // Generate table
        ; (doc as any).autoTable({
          head: [['RFQ Number', 'Status', 'Item Name', 'Requisition', 'Due Date', 'Port', 'Vendors', 'Responses']],
          body: tableData,
          startY: 35,
          styles: {
            fontSize: 8,
            cellPadding: 3,
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 9,
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          columnStyles: {
            0: { cellWidth: 30 },  // RFQ Number
            1: { cellWidth: 25 },  // Status
            2: { cellWidth: 60 },  // Item Name
            3: { cellWidth: 35 },  // Requisition
            4: { cellWidth: 28 },  // Due Date
            5: { cellWidth: 35 },  // Port
            6: { cellWidth: 20 },  // Vendors
            7: { cellWidth: 25 },  // Responses
          },
          margin: { top: 35, left: 10, right: 10 },
          pageBreak: 'auto',
          tableLineWidth: 0.1,
          tableLineColor: [200, 200, 200],
        })

      // Save the PDF
      doc.save(`RFQ_List_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF exported successfully!')
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('Failed to export PDF')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      'DRAFT': 'bg-secondary',
      'SENT': 'bg-primary',
      'SUBMITTED': 'bg-info',
      'RESPONDED': 'bg-success',
      'PENDING': 'bg-warning'
    }
    return (
      <span className={`badge ${statusColors[status] || 'bg-secondary'} text-white fw-bold`}>
        {status}
      </span>
    )
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between align-items-center bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>RFQ Management</h3>
                <p className='text-muted mb-0'>Create and manage requests for quotations</p>
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
                  onClick={exportRFQsToPDF}
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
                  Create RFQ
                </button>
              </div>
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
                    placeholder='Search RFQs...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className='mb-8'>
                <h4 className='fw-bold text-primary mb-4'>RFQs ({sortedData.length})</h4>

                {isLoading ? (
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
                            <th onClick={() => handleSort('rfqNumber')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>RFQ NUMBER</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'rfqNumber' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>STATUS</th>
                            <th onClick={() => handleSort('itemName')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>ITEM NAME</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'itemName' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>REQUISITION</th>
                            <th onClick={() => handleSort('responseDueDate')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>DUE DATE</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'responseDueDate' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>PORT</th>
                            <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>VENDORS</th>
                            <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>RESPONSES</th>
                            <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className='table-body text-start'>
                          {currentRecords.length === 0 ? (
                            <tr>
                              <td colSpan={9} className='text-center text-muted py-5'>
                                No RFQs found for the selected criteria.
                              </td>
                            </tr>
                          ) : (
                            currentRecords.map((record) => (
                              <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>{record.rfqNumber}</td>
                                <td style={{ padding: '12px 16px' }}>{getStatusBadge(record.status)}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px', maxWidth: '300px' }}>{record.itemName}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>
                                  {record.requisitionNumber ? (
                                    <a href='#' className='text-primary text-hover-primary'>{record.requisitionNumber}</a>
                                  ) : (
                                    <span className='text-muted'>Manual</span>
                                  )}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.responseDueDate}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.deliveryPort}</td>
                                <td className='text-dark fs-6 text-center' style={{ padding: '12px 16px' }}>{record.vendors}</td>
                                <td className='text-dark fs-6 text-center' style={{ padding: '12px 16px' }}>{record.responses}</td>
                                <td className='text-center' style={{ padding: '12px 16px' }}>
                                  <div className='d-flex justify-content-center align-items-center gap-2'>
                                    {record.status === 'DRAFT' && (
                                      <button
                                        className='btn btn-sm btn-primary'
                                        title='Send RFQ'
                                        onClick={() => handleSendRFQ(record.id)}
                                      >
                                        Send
                                      </button>
                                    )}
                                    <button
                                      className='btn btn-sm px-0'
                                      title='View'
                                      onClick={() => handleViewRFQ(record)}
                                    >
                                      <KTSVG path='/media/map/ph_eye.svg' />
                                    </button>
                                    {userRole === 1 && (
                                      <button
                                        className='btn btn-sm px-0'
                                        title='Delete'
                                        onClick={() => handleDeleteRFQ(record.id)}
                                      >
                                        <KTSVG path='/media/map/trash.svg' />
                                      </button>
                                    )}
                                  </div>
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ViewRFQModal
        visible={isViewModalVisible}
        onClose={() => {
          setIsViewModalVisible(false)
          setSelectedRFQ(null)
        }}
        rfq={selectedRFQ}
      />

      <CreateRFQModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleAddRFQSuccess}
        requisitions={requisitions}
        vendors={vendors}
        ports={ports}
        currentUserCgaid={currentUser?.companyGroupAdminId}
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



export default RFQManagement