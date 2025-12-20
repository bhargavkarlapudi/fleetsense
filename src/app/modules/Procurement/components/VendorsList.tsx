import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { Link } from 'react-router-dom'
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor
} from '../core/_requests'
import {
  VendorDisplay,
  Vendor,
  CreateVendorRequest,
  VendorStatus
} from '../core/_models'

interface AddVendorModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
}

const AddVendorModal: FC<AddVendorModalProps> = ({ visible, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    categories: '',
    regions: '',
    address: '',
    paymentTerms: '',
    status: 'Approved' as VendorStatus
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {}
    
    if (!formData.name.trim()) newErrors.name = 'Vendor Name is required'
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Contact Person is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
    if (!formData.categories.trim()) newErrors.categories = 'Categories are required'
    if (!formData.regions.trim()) newErrors.regions = 'Regions are required'
    if (!formData.address.trim()) newErrors.address = 'Address is required'
    if (!formData.paymentTerms) newErrors.paymentTerms = 'Payment Terms are required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    
    setIsSubmitting(true)
    try {
      const payload: CreateVendorRequest = {
        name: formData.name,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        categories: formData.categories.split(',').map(c => c.trim()).filter(c => c),
        regions: formData.regions.split(',').map(r => r.trim()).filter(r => r),
        address: formData.address,
        paymentTerms: formData.paymentTerms,
        status: formData.status
      }
      
      await createVendor(payload)
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error creating vendor:', error)
      alert(error.message || 'Failed to create vendor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      categories: '',
      regions: '',
      address: '',
      paymentTerms: '',
      status: 'Approved'
    })
    setErrors({})
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
            <h5 className='modal-title'>Add New Vendor</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <div className='modal-body' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className='row g-3'>
              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vendor Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder='e.g., Marine Tech Solutions'
                  style={{ color: '#000' }}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Contact Person</label>
                <input
                  type='text'
                  className={`form-control ${errors.contactPerson ? 'is-invalid' : ''}`}
                  name='contactPerson'
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  placeholder='e.g., John Smith'
                  style={{ color: '#000' }}
                />
                {errors.contactPerson && <div className='invalid-feedback'>{errors.contactPerson}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Email</label>
                <input
                  type='email'
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder='email@example.com'
                  style={{ color: '#000' }}
                />
                {errors.email && <div className='invalid-feedback'>{errors.email}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Phone</label>
                <input
                  type='text'
                  className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                  name='phone'
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder='+65 1234 5678'
                  style={{ color: '#000' }}
                />
                {errors.phone && <div className='invalid-feedback'>{errors.phone}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Categories</label>
                <input
                  type='text'
                  className={`form-control ${errors.categories ? 'is-invalid' : ''}`}
                  name='categories'
                  value={formData.categories}
                  onChange={handleInputChange}
                  placeholder='Spares, Tools, Equipment (comma separated)'
                  style={{ color: '#000' }}
                />
                {errors.categories && <div className='invalid-feedback'>{errors.categories}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Regions</label>
                <input
                  type='text'
                  className={`form-control ${errors.regions ? 'is-invalid' : ''}`}
                  name='regions'
                  value={formData.regions}
                  onChange={handleInputChange}
                  placeholder='Singapore, Malaysia (comma separated)'
                  style={{ color: '#000' }}
                />
                {errors.regions && <div className='invalid-feedback'>{errors.regions}</div>}
              </div>

              <div className='col-md-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Address</label>
                <textarea
                  className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                  name='address'
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder='Complete address'
                  rows={3}
                  style={{ color: '#000' }}
                />
                {errors.address && <div className='invalid-feedback'>{errors.address}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Payment Terms</label>
                <select
                  className={`form-select ${errors.paymentTerms ? 'is-invalid' : ''}`}
                  name='paymentTerms'
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Payment Terms</option>
                  <option value='Net 30'>Net 30</option>
                  <option value='Net 45'>Net 45</option>
                  <option value='Net 60'>Net 60</option>
                  <option value='Due on Receipt'>Due on Receipt</option>
                </select>
                {errors.paymentTerms && <div className='invalid-feedback'>{errors.paymentTerms}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Status</label>
                <select
                  className='form-select'
                  name='status'
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value='Approved'>Approved</option>
                  <option value='Preferred'>Preferred</option>
                  <option value='Under Review'>Under Review</option>
                </select>
              </div>
            </div>
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button 
              type='button' 
              className='btn btn_primary'
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Vendor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const VendorsList: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [vendorData, setVendorData] = useState<VendorDisplay[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [sortConfig, setSortConfig] = useState<{
    key: keyof VendorDisplay | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })

  useEffect(() => {
    loadVendors()
  }, [])

  const loadVendors = async () => {
    setIsLoading(true)
    try {
      const response = await getVendors(0, 1000)
      
      const displayItems: VendorDisplay[] = response.content.map(vendor => ({
        id: vendor.id,
        vendorId: vendor.vendorCode || vendor.code || `VEN-${vendor.id}`,
        name: vendor.name,
        contact: vendor.contactPerson || vendor.contactNo || '',
        email: vendor.email,
        phone: vendor.phone || vendor.contactNo || '',
        categories: vendor.categories || [],
        regions: vendor.regions || [],
        status: vendor.status || (vendor.tag === 'PREMIUM' ? 'Preferred' : 'Approved'),
        orders: vendor.orderCount || vendor.totalOrders || 0,
        avgDelivery: vendor.avgDeliveryTime || (vendor.avgDeliveryDays ? `${vendor.avgDeliveryDays} days` : 'N/A'),
        rating: vendor.rating || 0,
        address: vendor.address || '',
        paymentTerms: vendor.paymentTerms || 'N/A'
      }))
      
      setVendorData(displayItems)
    } catch (error) {
      console.error('Error loading vendors:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate summary statistics
  const totalVendors = vendorData.length
  const preferredVendors = vendorData.filter(v => v.status === 'Preferred').length
  const approvedVendors = vendorData.filter(v => v.status === 'Approved').length
  const underReview = vendorData.filter(v => v.status === 'Under Review').length

  const filteredData = useMemo(() => {
    return vendorData.filter(record => {
      const matchesSearch = searchTerm === '' || 
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.vendorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.contact && record.contact.toLowerCase().includes(searchTerm.toLowerCase())) ||
        record.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
      
      return matchesSearch
    })
  }, [searchTerm, vendorData])

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

  const handleSort = (key: keyof VendorDisplay) => {
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

  const getStatusBadge = (status?: string) => {
    const statusColors: Record<string, string> = {
      'Preferred': 'submitted',
      'Approved': 'bg-success',
      'Under Review': 'bg-warning',
      'Blocklisted': 'rejected'
    }
    const displayStatus = status || 'Approved'
    return (
      <span className={`badge ${statusColors[displayStatus] || 'bg-secondary'} text-white`}>
        {displayStatus}
      </span>
    )
  }

  const handleAddVendorSuccess = () => {
    loadVendors()
  }

  const handleDeleteVendor = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return
    
    try {
      await deleteVendor(id)
      await loadVendors()
    } catch (error: any) {
      console.error('Error deleting vendor:', error)
      alert(error.message || 'Failed to delete vendor')
    }
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between align-items-center bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Vendor Management</h3>
                <p className='text-muted mb-0'>Manage your vendor directory, categorize suppliers, and track performance</p>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setIsModalVisible(true)}
                >
                  <span className='me-2'>+</span>
                  Add Vendor
                </button>
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              {/* Summary Cards */}
              <div className="row mb-4">
                {[
                  { title: "Total Vendors", value: totalVendors.toString(), path: "/media/icons/duotune/communication/com014.svg" },
                  { title: "Preferred", value: preferredVendors.toString(), path: "/media/icons/duotune/general/gen049.svg" },
                  { title: "Approved", value: approvedVendors.toString(), path: "/media/icons/duotune/general/gen043.svg" },
                  { title: "Under Review", value: underReview.toString(), path: "/media/icons/duotune/general/gen014.svg" },
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
                    placeholder='Search vendors, contact persons, or categories...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Vendors Table */}
              <div className='mb-8'>
                <h4 className='fw-bold text-primary mb-4'>Vendors ({sortedData.length})</h4>
                
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
                            <th onClick={() => handleSort('vendorId')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>VENDOR ID</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG 
                                    path={`/media/map/sort-col-${sortConfig.key === 'vendorId' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`} 
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th onClick={() => handleSort('name')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600 }}>NAME</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG 
                                    path={`/media/map/sort-col-${sortConfig.key === 'name' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`} 
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>CONTACT PERSON</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>CATEGORIES</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>REGIONS</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>STATUS</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ORDERS</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>AVG DELIVERY</th>
                            <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody className='table-body text-start'>
                          {currentRecords.length === 0 ? (
                            <tr>
                              <td colSpan={9} className='text-center text-muted py-5'>
                                No vendors found for the selected criteria.
                              </td>
                            </tr>
                          ) : (
                            currentRecords.map((record) => (
                              <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px' }}>
                                  <Link to={`/vendors/${record.id}`}>{record.vendorId}</Link>
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.name}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.contact}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  {record.categories.slice(0, 2).map((cat, idx) => (
                                    <span key={idx} className='badge draft text-white me-1 mb-1'>{cat}</span>
                                  ))}
                                  {record.categories.length > 2 && (
                                    <span className='badge draft text-white'>+{record.categories.length - 2}</span>
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  {record.regions.slice(0, 2).map((region, idx) => (
                                    <span key={idx} className='badge submitted text-white me-1 mb-1'>{region}</span>
                                  ))}
                                  {record.regions.length > 2 && (
                                    <span className='badge submitted text-white'>+{record.regions.length - 2}</span>
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px' }}>{getStatusBadge(record.status)}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.orders}</td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px' }}>{record.avgDelivery}</td>
                                <td className='text-center' style={{ padding: '12px 16px' }}>
                                  <button className='btn btn-sm px-0 me-2' title='View'>
                                    <KTSVG path='/media/map/ph_eye.svg' />
                                  </button>
                                  <button className='btn btn-sm px-0 me-2' title='Edit'>
                                    <KTSVG path='/media/map/edit-active.svg' />
                                  </button>
                                  <button 
                                    className='btn btn-sm px-0' 
                                    title='Delete'
                                    onClick={() => handleDeleteVendor(record.id)}
                                  >
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Vendor Modal */}
      <AddVendorModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleAddVendorSuccess}
      />
    </div>
  )
}

export { VendorsList }