import { FC, useState, useMemo } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'

interface User {
  id: string
  name: string
  role: string
  email: string
  phone: string
  vessel: string
  status: 'Active' | 'Inactive'
  userType: 'Vessel' | 'Shore'
  permissions: string[]
  lastLogin: string
  initials: string
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Captain Smith',
    role: 'Master',
    email: 'captain.smith@oceanpioneer.com',
    phone: '+1 234 567 8901',
    vessel: 'MV Ocean Pioneer',
    status: 'Active',
    userType: 'Vessel',
    permissions: ['create requisition', 'approve vessel', 'view all', 'manage crew'],
    lastLogin: '2024-01-31 14:30',
    initials: 'CS'
  },
  {
    id: '2',
    name: 'John Smith',
    role: 'Chief Engineer',
    email: 'chief.engineer@oceanpioneer.com',
    phone: '+1 234 567 8902',
    vessel: 'MV Ocean Pioneer',
    status: 'Active',
    userType: 'Vessel',
    permissions: ['create requisition', 'approve engineering', 'view technical'],
    lastLogin: '2024-01-31 13:45',
    initials: 'JS'
  }
]

const roles = [
  'Master',
  'Chief Engineer',
  'Chief Officer',
  'Procurement Manager',
  'Procurement Officer',
  'Finance Manager'
]

interface AddUserModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
}

const AddUserModal: FC<AddUserModalProps> = ({ visible, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    location: 'Vessel',
    vessel: ''
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.role) newErrors.role = 'Role is required'
    if (!formData.location) newErrors.location = 'Location is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('User added successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(error.message || 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: '',
      location: 'Vessel',
      vessel: ''
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
      <div className='modal-dialog modal-dialog-centered' role='document' style={{ maxWidth: '600px' }}>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Add New User</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <div className='modal-body' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className='row g-3'>
              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Full Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
                  name='fullName'
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder='e.g., John Smith'
                  style={{ color: '#000' }}
                />
                {errors.fullName && <div className='invalid-feedback'>{errors.fullName}</div>}
              </div>

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Email</label>
                <input
                  type='email'
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name='email'
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder='e.g., john.smith@example.com'
                  style={{ color: '#000' }}
                />
                {errors.email && <div className='invalid-feedback'>{errors.email}</div>}
              </div>

              <div className='col-12'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Phone</label>
                <input
                  type='text'
                  className='form-control'
                  name='phone'
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder='e.g., +1 234 567 8901'
                  style={{ color: '#000' }}
                />
              </div>

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Role</label>
                <select
                  className={`form-select ${errors.role ? 'is-invalid' : ''}`}
                  name='role'
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Role</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                {errors.role && <div className='invalid-feedback'>{errors.role}</div>}
              </div>

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Location</label>
                <select
                  className={`form-select ${errors.location ? 'is-invalid' : ''}`}
                  name='location'
                  value={formData.location}
                  onChange={handleInputChange}
                >
                  <option value='Vessel'>Vessel</option>
                  <option value='Shore'>Shore</option>
                </select>
                {errors.location && <div className='invalid-feedback'>{errors.location}</div>}
              </div>

              {formData.location === 'Vessel' && (
                <div className='col-12'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vessel</label>
                  <input
                    type='text'
                    className='form-control'
                    name='vessel'
                    value={formData.vessel}
                    onChange={handleInputChange}
                    placeholder='e.g., MV Ocean Pioneer'
                    style={{ color: '#000' }}
                  />
                </div>
              )}
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
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const UserManagement: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [users] = useState<User[]>(mockUsers)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedRole, setSelectedRole] = useState('')
  
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })

  // Summary statistics
  const totalUsers = users.length
  const activeUsers = users.filter(user => user.status === 'Active').length
  const vesselUsers = users.filter(user => user.userType === 'Vessel').length
  const shoreUsers = users.filter(user => user.userType === 'Shore').length

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm === '' || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesRole = selectedRole === '' || user.role === selectedRole
      
      return matchesSearch && matchesRole
    })
  }, [searchTerm, users, selectedRole])

  const sortedData = useMemo(() => {
    let sortedRecords = [...filteredUsers]

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
  }, [filteredUsers, sortConfig])

  const handleSort = (key: any) => {
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

  const handleAddUserSuccess = () => {
    // In a real app, you might refetch users here
    console.log('User added, refresh list...')
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between align-items-center bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>User Management</h3>
                <p className='text-muted mb-0'>Manage user accounts, roles, and permissions</p>
              </div>
              <div className='card-toolbar'>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setIsModalVisible(true)}
                >
                  <span className='me-2'>+</span>
                  Add User
                </button>
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              {/* Summary Cards */}
              <div className="row mb-4">
                {[
                  { title: "Total Users", value: totalUsers.toString(), path: "/media/icons/duotune/communication/com006.svg", color: "#3B82F6" },
                  { title: "Active Users", value: activeUsers.toString(), path: "/media/icons/duotune/general/gen043.svg", color: "#10B981" },
                  { title: "Vessel Users", value: vesselUsers.toString(), path: "/media/icons/duotune/communication/com006.svg", color: "#0EA5E9" },
                  { title: "Shore Users", value: shoreUsers.toString(), path: "/media/icons/duotune/communication/com006.svg", color: "#8B5CF6" },
                ].map((card, index) => (
                  <div key={index} className="col-md-3 mb-3">
                    <div className="custom-card p-3">
                      <div className='d-flex justify-content-between'>
                        <div>
                          <h2 className="fw-bold mb-1">{card.value}</h2>
                          <h6 className="card-title">{card.title}</h6>
                        </div>
                        <span style={{ color: card.color }}>
                          <KTSVG path={card.path} className='svg-icon svg-icon-2x' />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search and Filters Row */}
              <div className='row gx-3 gy-3 mb-4'>
                <div className='col-md-10'>
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
                      placeholder='Search users...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className='col-md-2'>
                  <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                    All Roles
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
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                  >
                    <option value=''>All Roles</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* User Table */}
              <div className='mb-8'>
                <h4 className='fw-bold text-primary mb-4'>Users ({sortedData.length})</h4>
                
                <div className='report-table table-responsive'>
                  <div style={{ overflowX: 'auto' }}>
                    {/* --- TABLE STYLING UPDATED --- */}
                    <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                      <thead className='table-header text-start'>
                        <tr>
                          {/* --- HEADER STYLES UPDATED --- */}
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>USER</th>
                          <th onClick={() => handleSort('role')} className='cursor-pointer align-middle' style={{ padding: '12px 16px' }}>
                            <div className='d-flex align-items-center'>
                              <span style={{ color: '#3F4254', fontWeight: 600 }}>ROLE</span>
                              <div style={{ transform: 'translateY(-2px)' }}>
                                <KTSVG 
                                  path={`/media/map/sort-col-${sortConfig.key === 'role' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`} 
                                  className='svg-icon ms-2 custom-sort-icon'
                                />
                              </div>
                            </div>
                          </th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>CONTACT</th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>VESSEL</th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>PERMISSIONS</th>
                          <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>LAST LOGIN</th>
                          <th className='align-middle text-center' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600 }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className='table-body text-start'>
                        {currentRecords.length === 0 ? (
                          <tr>
                            <td colSpan={7} className='text-center text-muted py-5'>
                              No users found for the selected criteria.
                            </td>
                          </tr>
                        ) : (
                          currentRecords.map((user) => (
                            <tr key={user.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                              {/* --- TD STYLE UPDATED --- */}
                              <td style={{ padding: '12px 16px' }}>
                                {/* --- CIRCLE DIV REMOVED --- */}
                                <div className='d-flex align-items-center'>
                                  <div>
                                    <div className='text-dark fw-semibold fs-6'>{user.name}</div>
                                    <div className='d-flex gap-2 mt-1'>
                                      <span className={`badge ${user.status === 'Active' ? 'submitted' : 'rejected'} text-white`} style={{ fontSize: '11px' }}>
                                        {user.status}
                                      </span>
                                      <span 
                                        className='badge text-white' 
                                        style={{ 
                                          fontSize: '11px',
                                          backgroundColor: user.userType === 'Vessel' ? '#0EA5E9' : '#8B5CF6'
                                        }}
                                      >
                                        {user.userType}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {/* --- TD STYLES UPDATED --- */}
                              <td style={{ padding: '12px 16px' }}>
                                <div className='text-dark fw-semibold fs-6'>{user.role}</div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div className='text-dark fs-6 mb-1'>
                                  <KTSVG path='/media/icons/duotune/communication/com011.svg' className='svg-icon-5 me-1' />
                                  {user.email}
                                </div>
                                <div className='text-muted fs-7'>
                                  <KTSVG path='/media/icons/duotune/electronics/elc003.svg' className='svg-icon-5 me-1' />
                                  {user.phone}
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div className='text-dark fs-6'>{user.vessel || '-'}</div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div className='d-flex flex-wrap gap-1'>
                                  {user.permissions.map((permission, idx) => (
                                    <span 
                                      key={idx}
                                      className='badge'
                                      style={{ 
                                        fontSize: '11px',
                                        backgroundColor: '#F3F4F6',
                                        color: '#6B7280',
                                        fontWeight: 'normal'
                                      }}
                                    >
                                      {permission}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <div className='text-muted fs-7'>{user.lastLogin}</div>
                              </td>
                              
                              <td className='text-center' style={{ padding: '12px 16px' }}>
                                <button className='btn btn-sm px-0' title='Edit'>
                                  <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                </button>
                                <button className='btn btn-sm px-0' title='Delete'>
                                  <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
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
                                    {1}
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
                                <li key={i} className={`page-item ${i === currentPage ? 'active' : ''}`}>
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

      {/* Add User Modal */}
      <AddUserModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSubmit={handleAddUserSuccess}
      />
    </div>
  )
}

export default UserManagement