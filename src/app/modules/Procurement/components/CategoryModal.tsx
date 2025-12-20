import { FC, useState, useEffect } from 'react'
import { useAuth } from '../../auth'
import { toast } from 'react-toastify'
import {
  getCompanyGroupAdmins,
  getVesselsByCompany,
  createInventoryCategory
} from '../core/_requests'
import {
  CompanyGroupAdmin,
  Vessel
} from '../core/_models'

interface CategoryModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  vesselId: number
}

const CategoryModal: FC<CategoryModalProps> = ({ visible, onClose, onSubmit, vesselId }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    vesselType: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New state for dropdown data
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselTypes, setVesselTypes] = useState<string[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)

  // Role-based logic (following the pattern from AddVesselModal)
  const roleId = currentUser?.role?.id
  const roleEntityId = currentUser?.roleEntityId
  const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null

  const isOperator = roleId === 6
  const isSuperadminOperator = isOperator && companyGroupAdminId == null
  const isCompanyOperator = isOperator && companyGroupAdminId != null

  // Normalized effective roles
  const actsAsSuperadmin = roleId === 1 || isSuperadminOperator
  const actsAsCga = roleId === 5 || isCompanyOperator

  // Effective CGA id when acting as CGA
  const effectiveCgaId = actsAsCga
    ? (roleId === 5 ? Number(roleEntityId || companyGroupAdminId) : Number(companyGroupAdminId))
    : undefined

  // Load companies when modal opens (only for superadmin)
  useEffect(() => {
    if (visible && actsAsSuperadmin) {
      loadCompanies()
    } else if (visible && actsAsCga) {
      // For CGA users, load their company's vessels to get vessel types
      loadVesselsForCurrentUser()
    }
  }, [visible, actsAsSuperadmin, actsAsCga])

  // Load vessels for current user (CGA)
  const loadVesselsForCurrentUser = async () => {
    try {
      // Get the current user's company username
      const companyUsername = (currentUser as any)?.companyGroupAdmin?.username || (currentUser as any)?.username
      if (companyUsername) {
        const vesselsData = await getVesselsByCompany(companyUsername)
        setVessels(vesselsData)
      }
    } catch (error) {
      console.error('Error loading vessels for current user:', error)
      setVessels([])
    }
  }

  // Load vessels when company is selected
  useEffect(() => {
    if (formData.company) {
      console.log('CategoryModal - Company selected:', formData.company)
      console.log('CategoryModal - Available companies:', companies)
      const selectedCompany = companies.find(c => c.id === parseInt(formData.company))
      console.log('CategoryModal - Found company:', selectedCompany)
      if (selectedCompany) {
        console.log('CategoryModal - Loading vessels for username:', selectedCompany.username)
        loadVessels(selectedCompany.username)
      } else {
        console.log('CategoryModal - Company not found in companies array')
      }
    } else {
      setVessels([])
      setVesselTypes([])
    }
  }, [formData.company, companies])

  // Extract vessel types when vessels are loaded (backup in case immediate extraction fails)
  useEffect(() => {
    if (vessels.length > 0 && vesselTypes.length === 0) {
      const uniqueVesselTypes = Array.from(new Set(vessels.map(v => v.vesselType)))
      console.log('CategoryModal - Extracting vessel types in useEffect:', uniqueVesselTypes)
      setVesselTypes(uniqueVesselTypes)
    }
  }, [vessels])

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

  const loadVessels = async (companyUsername: string) => {
    setIsLoadingDropdowns(true)
    try {
      console.log('CategoryModal - Loading vessels for company:', companyUsername)
      const vesselsData = await getVesselsByCompany(companyUsername)
      console.log('CategoryModal - Vessels loaded:', vesselsData)
      console.log('CategoryModal - Number of vessels:', vesselsData?.length || 0)

      if (vesselsData && vesselsData.length > 0) {
        setVessels(vesselsData)
        // Immediately extract vessel types
        const uniqueVesselTypes = Array.from(new Set(vesselsData.map((v: any) => v.vesselType).filter(Boolean)))
        console.log('CategoryModal - Extracted vessel types immediately:', uniqueVesselTypes)
        setVesselTypes(uniqueVesselTypes)
      } else {
        console.log('CategoryModal - No vessels returned from API')
        setVessels([])
        setVesselTypes([])
      }
    } catch (error) {
      console.error('CategoryModal - Error loading vessels:', error)
      setVessels([])
      setVesselTypes([])
    } finally {
      setIsLoadingDropdowns(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}
    if (!formData.name.trim()) newErrors.name = 'Category Name is required'
    if (!formData.vesselType) newErrors.vesselType = 'Vessel Type is required'

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
      const cgaIdToUse = actsAsCga && effectiveCgaId
        ? effectiveCgaId
        : parseInt(formData.company) // Use selected company ID for superadmin

      await createInventoryCategory({
        name: formData.name,
        cgaid: { id: cgaIdToUse },
        vesselType: formData.vesselType
      })
      toast.success('Category added successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error adding category:', error)
      toast.error(error.message || 'Failed to add category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ name: '', company: '', vesselType: '' })
    setErrors({})
    // Reset dropdown data
    setCompanies([])
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
            <h5 className='modal-title'>Add Category</h5>
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

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Category Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder='Enter category name'
                  style={{ color: '#000' }}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>

              <div className='col-12'>
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
                    // For other roles, load vessel types from their company's vessels
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

              {/* Show current CGA info for Company Group Admin users */}
              {actsAsCga && effectiveCgaId && (
                <div className='col-12'>
                  <div className='alert alert-info'>
                    <i className='fas fa-info-circle me-2'></i>
                    Category will be created under your Company Group Admin (ID: {effectiveCgaId})
                  </div>
                </div>
              )}

              <div className='col-12'>
                <small className='text-muted'>Note: Vessel information will be automatically associated based on the current vessel context.</small>
              </div>
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Category'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryModal;
