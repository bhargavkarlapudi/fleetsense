import { FC, useState, useEffect } from 'react'
import { useAuth } from '../../auth'
import { createVendor, getCompanyAdminList, getVendorCategories } from '../core/_requests'
import type { CompanyAdmin, VendorCategory } from '../core/_models'

interface AddVendorModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
}

const AddVendorModal: FC<AddVendorModalProps> = ({ visible, onClose, onSubmit }) => {
  const { currentUser } = useAuth()

  const roleId = (currentUser as any)?.uid?.role?.id ?? (currentUser as any)?.role?.id ?? 0
  const myCompanyGroupAdminId = (currentUser as any)?.companyGroupAdminId ??
    (currentUser as any)?.companyGroupAdmin?.id ?? null

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    password: '',
    contactNo: '',
    altContactNo: '',
    tag: 'NORMAL',
    categoryIds: [] as number[],
    company: '',
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  useEffect(() => {
    if (visible) {
      if (roleId === 1) {
        loadCompanies()
      }
      loadVendorCategories()
    }
  }, [visible, roleId])

  const loadCompanies = async () => {
    setIsLoadingCompanies(true)
    try {
      const companies = await getCompanyAdminList()
      setCompanyAdmins(companies)
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setIsLoadingCompanies(false)
    }
  }

  const loadVendorCategories = async () => {
    setIsLoadingCategories(true)
    try {
      const categories = await getVendorCategories()
      setVendorCategories(categories)
    } catch (error) {
      console.error('Error loading vendor categories:', error)
    } finally {
      setIsLoadingCategories(false)
    }
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const toggleCategory = (categoryId: number) => {
    setFormData(prev => {
      const isSelected = prev.categoryIds.includes(categoryId)
      const newCategoryIds = isSelected
        ? prev.categoryIds.filter(id => id !== categoryId)
        : [...prev.categoryIds, categoryId]
      return { ...prev, categoryIds: newCategoryIds }
    })
    if (errors.categoryIds) {
      setErrors(prev => ({ ...prev, categoryIds: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.code.trim()) newErrors.code = 'Vendor Code is required'
    if (!formData.name.trim()) newErrors.name = 'Vendor Name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.password.trim()) newErrors.password = 'Password is required'
    if (!formData.contactNo.trim()) newErrors.contactNo = 'Contact Number is required'
    if (roleId === 1 && !formData.company) newErrors.company = 'Company is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      let cgaid: number
      let caId: number | null = null

      if (roleId === 1) {
        cgaid = Number(formData.company)
      } else if (roleId === 5) {
        if (myCompanyGroupAdminId == null) {
          throw new Error('Missing company group admin id')
        }
        cgaid = Number(myCompanyGroupAdminId)
      } else {
        throw new Error('This role cannot create vendors')
      }

      await createVendor({
        code: formData.code,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        contactNo: formData.contactNo,
        altContactNo: formData.altContactNo,
        tag: formData.tag,
        categoryIds: formData.categoryIds,
        totalOrders: 0,
        avgDeliveryDays: 0,
        issueCount: 0,
        cgaid,
        caId,
      })

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
      code: '',
      name: '',
      email: '',
      password: '',
      contactNo: '',
      altContactNo: '',
      tag: 'NORMAL',
      categoryIds: [],
      company: '',
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
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document' style={{ maxHeight: '95vh', margin: '1.75rem auto' }}>
        <div className='modal-content bg-white' style={{ color: '#181C32', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
          <form autoComplete='off' onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div className='modal-header' style={{ flexShrink: 0 }}>
              <h5 className='modal-title'>Add New Vendor</h5>
              <button type='button' className='btn-close' onClick={handleClose}></button>
            </div>

            <div className='modal-body' style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
              <div className='row g-3'>


                <div className='col-md-6'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Vendor Code
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                    name='code'
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder='e.g., VEND-001'
                    autoComplete='off'
                  />
                  {errors.code && <div className='invalid-feedback'>{errors.code}</div>}
                </div>

                <div className='col-md-6'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Vendor Name
                  </label>
                  <input
                    type='text'
                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                    name='name'
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder='Enter vendor name'
                    autoComplete='off'
                  />
                  {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
                </div>

                <div className='col-12'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Email
                  </label>
                  <input
                    type='email'
                    className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                    name='email'
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder='Enter email address'
                    autoComplete='off'
                    data-lpignore='true'
                    data-form-type='other'
                  />
                  {errors.email && <div className='invalid-feedback'>{errors.email}</div>}
                </div>

                <div className='col-md-6'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Password
                  </label>
                  <input
                    type='password'
                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                    name='password'
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder='Enter password'
                    autoComplete='new-password'
                    data-lpignore='true'
                    data-form-type='other'
                  />
                  {errors.password && <div className='invalid-feedback'>{errors.password}</div>}
                </div>

                <div className='col-md-6'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Contact Number
                  </label>
                  <input
                    type='tel'
                    className={`form-control ${errors.contactNo ? 'is-invalid' : ''}`}
                    name='contactNo'
                    value={formData.contactNo}
                    onChange={handleInputChange}
                    placeholder='Enter contact number'
                    autoComplete='off'
                  />
                  {errors.contactNo && <div className='invalid-feedback'>{errors.contactNo}</div>}
                </div>

                <div className='col-md-6'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Alternate Contact
                  </label>
                  <input
                    type='tel'
                    className='form-control'
                    name='altContactNo'
                    value={formData.altContactNo}
                    onChange={handleInputChange}
                    placeholder='Enter alternate contact'
                    autoComplete='off'
                  />
                </div>

                <div className='col-md-6'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Tag
                  </label>
                  <select
                    className='form-select'
                    name='tag'
                    value={formData.tag}
                    onChange={handleInputChange}
                  >
                    <option value='NORMAL'>NORMAL</option>
                    <option value='PREMIUM'>PREMIUM</option>
                  </select>
                </div>

                <div className='col-12'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Category IDs
                  </label>
                  <div
                    className={`border rounded p-3 ${errors.categoryIds ? 'border-danger' : ''}`}
                    style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      backgroundColor: isLoadingCategories ? '#f5f5f5' : 'white'
                    }}
                  >
                    {isLoadingCategories ? (
                      <div className='text-center text-muted'>Loading categories...</div>
                    ) : vendorCategories.length === 0 ? (
                      <div className='text-center text-muted'>No categories available</div>
                    ) : (
                      vendorCategories.map((category) => (
                        <div key={category.id} className='form-check mb-2'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            id={`category-${category.id}`}
                            checked={formData.categoryIds.includes(category.id)}
                            onChange={() => toggleCategory(category.id)}
                          />
                          <label
                            className='form-check-label'
                            htmlFor={`category-${category.id}`}
                            style={{ cursor: 'pointer' }}
                          >
                            {category.name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  <small className='form-text text-muted'>
                    Select one or more categories
                  </small>
                  {errors.categoryIds && <div className='text-danger small mt-1'>{errors.categoryIds}</div>}
                </div>

                {roleId === 1 && (
                  <div className='col-12'>
                    <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                      Company
                    </label>
                    <select
                      className={`form-select ${errors.company ? 'is-invalid' : ''}`}
                      name='company'
                      value={formData.company}
                      onChange={handleInputChange}
                      disabled={isLoadingCompanies}
                    >
                      <option value=''>Select Company</option>
                      {companyAdmins.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    {errors.company && <div className='invalid-feedback'>{errors.company}</div>}
                  </div>
                )}

              </div>
            </div>

            <div className='modal-footer' style={{ flexShrink: 0, borderTop: '1px solid #E4E6EF', padding: '1rem' }}>
              <button
                type='button'
                className='btn btn-light'
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type='button'
                className='btn btn_primary'
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Vendor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddVendorModal
