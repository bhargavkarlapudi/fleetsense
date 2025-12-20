import { FC, useState, useEffect } from 'react'
import { useAuth } from '../../auth'
import { toast } from 'react-toastify'
import {
  getCompanyGroupAdmins,
  getVesselsByCompany,
  updateAccountingAccount
} from '../core/_requests'
import {
  CompanyGroupAdmin,
  Vessel,
  AccountingAccount
} from '../core/_models'

interface EditAccountingCodeModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  accountingCode: AccountingAccount | null
}

const EditAccountingCodeModal: FC<EditAccountingCodeModalProps> = ({ visible, onClose, onSubmit, accountingCode }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    accountCodes: '',
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

  // Role-based logic
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

  // Load accounting code data when modal opens
  useEffect(() => {
    if (visible && accountingCode) {
      setFormData({
        accountCodes: accountingCode.accountCodes || '',
        company: typeof accountingCode.cgaid === 'object' ? accountingCode.cgaid?.id?.toString() || '' : accountingCode.cgaid?.toString() || '',
        vesselType: accountingCode.vesselType || ''
      })
    }
  }, [visible, accountingCode])

  // Load companies when modal opens (only for superadmin)
  useEffect(() => {
    if (visible && actsAsSuperadmin) {
      loadCompanies()
    } else if (visible && actsAsCga) {
      loadVesselsForCurrentUser()
    }
  }, [visible, actsAsSuperadmin, actsAsCga])

  // Load vessels for current user (CGA)
  const loadVesselsForCurrentUser = async () => {
    try {
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
      const vesselsData = await getVesselsByCompany(companyUsername)
      if (vesselsData && vesselsData.length > 0) {
        setVessels(vesselsData)
        const uniqueVesselTypes = Array.from(new Set(vesselsData.map((v: any) => v.vesselType).filter(Boolean)))
        setVesselTypes(uniqueVesselTypes)
      } else {
        setVessels([])
        setVesselTypes([])
      }
    } catch (error) {
      console.error('Error loading vessels:', error)
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
    if (!formData.accountCodes.trim()) newErrors.accountCodes = 'Account Code is required'
    if (!formData.vesselType) newErrors.vesselType = 'Vessel Type is required'

    // Only validate company selection if user is superadmin
    if (actsAsSuperadmin && !formData.company) {
      newErrors.company = 'Company is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !accountingCode) return
    setIsSubmitting(true)
    try {
      await updateAccountingAccount(accountingCode.id, {
        accountCodes: formData.accountCodes,
        vesselType: formData.vesselType
      })
      toast.success('Accounting Code updated successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error updating accounting code:', error)
      toast.error(error.message || 'Failed to update accounting code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ accountCodes: '', company: '', vesselType: '' })
    setErrors({})
    setCompanies([])
    setVessels([])
    setVesselTypes([])
    onClose()
  }

  if (!visible || !accountingCode) return null

  return (
    <div className="modal fade show d-flex align-items-center justify-content-center" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050 }}>
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Edit Accounting Code</h5>
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
                    Accounting code will be updated under your Company Group Admin (ID: {effectiveCgaId})
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Accounting Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditAccountingCodeModal
