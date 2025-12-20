import { FC, useState, useEffect } from 'react'
import { useAuth } from '../../auth'
import { toast } from 'react-toastify'
import {
  getCompanyGroupAdmins,
  getSubCompanyAdmins,
  getVesselsByCompany,
  getAllInventoryCategoriesForCompany,
  createAccountingAccount,
} from '../core/_requests'
import {
  CompanyGroupAdmin,
  SubCompanyAdmin,
  Vessel,
  InventoryCategory,
} from '../core/_models'

interface AccountingCodeModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (cgaId: number, vesselType: string) => void
  vesselId: number
}

const AccountingCodeModal: FC<AccountingCodeModalProps> = ({ visible, onClose, onSubmit, vesselId }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    subCompany: '',
    accountCodes: '',
    vesselType: '',
    categoryId: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  // New state for dropdown data
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [subCompanies, setSubCompanies] = useState<SubCompanyAdmin[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselTypes, setVesselTypes] = useState<string[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)

  // Role-based logic (same as CategoryModal)
  const roleId = currentUser?.role?.id
  const roleEntityId = currentUser?.roleEntityId
  const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null

  const isOperator = roleId === 6
  const isSuperadminOperator = isOperator && companyGroupAdminId == null
  const isCompanyOperator = isOperator && companyGroupAdminId != null

  const actsAsSuperadmin = roleId === 1 || isSuperadminOperator
  const actsAsCga = roleId === 5 || isCompanyOperator

  const effectiveCgaId = actsAsCga
    ? (roleId === 5 ? Number(roleEntityId || companyGroupAdminId) : Number(companyGroupAdminId))
    : undefined

  // Load categories when modal opens, company changes, or vessel type changes
  useEffect(() => {
    if (visible) {
      loadCategories()
      // Load companies for superadmin
      if (actsAsSuperadmin) {
        loadCompanies()
      } else {
        // For non-superadmin users, load their company's vessels to get vessel types
        loadVesselsForCurrentUser()
      }
    }
  }, [visible, formData.company, formData.vesselType])

  // Load vessels for current user (non-superadmin)
  const loadVesselsForCurrentUser = async () => {
    try {
      // Get the current user's company username
      const companyUsername = (currentUser as any)?.companyGroupAdmin?.username || (currentUser as any)?.username
      console.log('AccountingCodeModal - Loading vessels for current user:', companyUsername)
      if (companyUsername) {
        const vesselsData = await getVesselsByCompany(companyUsername)
        console.log('AccountingCodeModal - Vessels loaded for current user:', vesselsData)
        setVessels(vesselsData)
      }
    } catch (error) {
      console.error('AccountingCodeModal - Error loading vessels for current user:', error)
      setVessels([])
    }
  }

  // Load subcompanies when company is selected
  useEffect(() => {
    if (formData.company) {
      loadSubCompanies(parseInt(formData.company))
    } else {
      setSubCompanies([])
    }
  }, [formData.company])

  // Load vessels when company is selected
  useEffect(() => {
    if (formData.company) {
      const selectedCompany = companies.find(c => c.id === parseInt(formData.company))
      if (selectedCompany) {
        loadVessels(selectedCompany.username)
      }
    } else {
      setVessels([])
      setVesselTypes([])
    }
  }, [formData.company, companies])

  // Extract vessel types when vessels are loaded
  useEffect(() => {
    if (vessels.length > 0) {
      const uniqueVesselTypes = Array.from(new Set(vessels.map(v => v.vesselType)))
      setVesselTypes(uniqueVesselTypes)
    }
  }, [vessels])

  const loadCategories = async () => {
    setIsLoadingCategories(true)
    try {
      // Determine the correct CGA ID to use
      let cgaIdToUse: number = effectiveCgaId || 13

      if (actsAsSuperadmin) {
        if (formData.company) {
          // Use the selected company ID
          cgaIdToUse = parseInt(formData.company)
        } else {
          // For superadmin without company selection, use default
          cgaIdToUse = 13
        }
      }

      console.log('AccountingCodeModal - Loading categories with cgaId:', cgaIdToUse)

      // Load categories from all vessel types to show all available categories
      const data = await getAllInventoryCategoriesForCompany(cgaIdToUse)
      console.log('AccountingCodeModal - Categories loaded:', data)
      setCategories(data || [])

      // Reset category selection if current selection is not valid
      if (formData.categoryId && !data?.find(cat => cat.id.toString() === formData.categoryId)) {
        setFormData(prev => ({ ...prev, categoryId: '' }))
      }
    } catch (error) {
      console.error('AccountingCodeModal - Error loading categories:', error)
      setCategories([])
      // Show user-friendly error message
      toast.error('Failed to load categories. Please check your connection and try again.')
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const loadCompanies = async () => {
    setIsLoadingDropdowns(true)
    try {
      const companiesData = await getCompanyGroupAdmins()
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error loading companies:', error)
    } finally {
      setIsLoadingDropdowns(false)
    }
  }

  const loadSubCompanies = async (companyId: number) => {
    try {
      const subCompaniesData = await getSubCompanyAdmins(companyId)
      setSubCompanies(subCompaniesData)
    } catch (error) {
      console.error('Error loading sub companies:', error)
      setSubCompanies([])
    }
  }

  const loadVessels = async (companyUsername: string) => {
    try {
      const vesselsData = await getVesselsByCompany(companyUsername)
      setVessels(vesselsData)
    } catch (error) {
      console.error('Error loading vessels:', error)
      setVessels([])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // If vessel type changed, reset category selection and reload categories
    if (name === 'vesselType' && value !== formData.vesselType) {
      setFormData(prev => ({ ...prev, categoryId: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    if (!formData.accountCodes.trim()) newErrors.accountCodes = 'Account Code is required'
    if (!formData.vesselType) newErrors.vesselType = 'Vessel Type is required'
    // COMMENTED OUT FOR TESTING - Category validation
    // if (!formData.categoryId) newErrors.categoryId = 'Category is required'

    // Only validate company selection if user is superadmin
    if (actsAsSuperadmin && !formData.company) {
      newErrors.company = 'Company is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      // Determine the correct CGA ID to use
      let cgaIdToUse: number = effectiveCgaId || 13

      if (actsAsSuperadmin) {
        if (formData.company) {
          // Use the selected company ID
          cgaIdToUse = parseInt(formData.company)
        } else {
          // For superadmin without company selection, use default
          cgaIdToUse = 13
        }
      }

      const payload = {
        accountCodes: formData.accountCodes,
        cgaid: { id: cgaIdToUse },
        vesselType: formData.vesselType,  // Changed back to string based on error
        // COMMENTED OUT FOR TESTING - Category field
        // category: { id: parseInt(formData.categoryId) }
      }

      console.log('AccountingCodeModal - Submitting accounting account with payload:', payload)
      // Type assertion to bypass TypeScript error for testing without category
      const result = await createAccountingAccount(payload as any)
      console.log('AccountingCodeModal - Accounting account created successfully:', result)

      toast.success('Accounting Code added successfully!')
      onSubmit(cgaIdToUse, formData.vesselType)
      handleClose()
    } catch (error: any) {
      console.error('AccountingCodeModal - Error adding accounting code:', error)
      console.error('AccountingCodeModal - Error details:', error.response?.data)
      toast.error(error.message || 'Failed to add accounting code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ company: '', subCompany: '', accountCodes: '', vesselType: '', categoryId: '' })
    setErrors({})
    setCategories([])
    // Reset dropdown data
    setCompanies([])
    setSubCompanies([])
    setVessels([])
    setVesselTypes([])
    onClose()
  }

  if (!visible) return null

  return (
    <div className="modal fade show d-flex align-items-center justify-content-center" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050 }}>
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Add Accounting Code</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>
          <div className='modal-body'>
            <div className='row g-3'>
              {/* Company dropdown - only for superadmin */}
              {actsAsSuperadmin && (
                <div className='col-md-6'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Company</label>
                  <select
                    className={`form-select ${errors.company ? 'is-invalid' : ''}`}
                    name='company'
                    value={formData.company}
                    onChange={handleInputChange}
                    disabled={isLoadingDropdowns}
                  >
                    <option value=''>Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                  {errors.company && <div className='invalid-feedback'>{errors.company}</div>}
                </div>
              )}

              {/* Subcompany dropdown - only for superadmin when company is selected */}
              {actsAsSuperadmin && formData.company && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Company</label>
                  <select
                    className='form-select'
                    name='subCompany'
                    value={formData.subCompany}
                    onChange={handleInputChange}
                  >
                    <option value=''>Select Sub Company (Optional)</option>
                    {subCompanies.map(subCompany => (
                      <option key={subCompany.id} value={subCompany.id}>{subCompany.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Account Code</label>
                <input
                  type='text'
                  className={`form-control ${errors.accountCodes ? 'is-invalid' : ''}`}
                  name='accountCodes'
                  value={formData.accountCodes}
                  onChange={handleInputChange}
                  placeholder='e.g., 6000-EXP-01'
                  style={{ color: '#000' }}
                />
                {errors.accountCodes && <div className='invalid-feedback'>{errors.accountCodes}</div>}
              </div>
              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vessel Type</label>
                <select
                  className={`form-select ${errors.vesselType ? 'is-invalid' : ''}`}
                  name='vesselType'
                  value={formData.vesselType}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Vessel Type</option>
                  {actsAsSuperadmin ? (
                    // For superadmin, show vessel types from selected company's vessels
                    formData.company ? (
                      vesselTypes.map(vesselType => (
                        <option key={vesselType} value={vesselType}>{vesselType.replace(/_/g, ' ')}</option>
                      ))
                    ) : (
                      <option disabled>Please select a company first</option>
                    )
                  ) : (
                    // For other roles, show vessel types from their company's vessels
                    vesselTypes.length > 0 ? (
                      vesselTypes.map(vesselType => (
                        <option key={vesselType} value={vesselType}>{vesselType.replace(/_/g, ' ')}</option>
                      ))
                    ) : (
                      // Fallback to static options if no vessels loaded
                      <>
                        <option value='OIL_TANKER'>Oil Tanker</option>
                        <option value='GAS_CARRIER'>Gas Carrier</option>
                        <option value='CONTAINER_SHIP'>Container Ship</option>
                        <option value='BULK_CARRIER'>Bulk Carrier</option>
                        <option value='PRODUCT_TANKER'>Product Tanker</option>
                        <option value='BUNKER_TANKER'>Bunker Tanker</option>
                      </>
                    )
                  )}
                </select>
                {errors.vesselType && <div className='invalid-feedback'>{errors.vesselType}</div>}
              </div>
              {/* COMMENTED OUT FOR TESTING - Category dropdown */}
              {/* 
              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Category</label>
                <select
                  className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                  name='categoryId'
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  disabled={isLoadingCategories}
                >
                  <option value=''>
                    {isLoadingCategories ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {categories.length === 0 && !isLoadingCategories && (
                    <option value='' disabled>No categories found - Create a category first</option>
                  )}
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <div className='invalid-feedback'>{errors.categoryId}</div>}
                {categories.length === 0 && !isLoadingCategories && (
                  <small className='text-warning'>
                    <i className='fas fa-exclamation-triangle me-1'></i>
                    No categories found. Please create a category first in the Category tab.
                  </small>
                )}
              </div>
              */}
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Accounting Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountingCodeModal;