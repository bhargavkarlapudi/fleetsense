import { FC, useState, useEffect } from 'react'
import { useAuth } from '../../auth'
import { toast } from 'react-toastify'
import {
  updateSubAccount,
  getCompanyGroupAdmins,
  getAccountingAccountsWithParams,
  getVesselsByCompany,
} from '../core/_requests'
import {
  AccountingAccount,
  CompanyGroupAdmin,
  Vessel,
  SubAccount,
} from '../core/_models'

interface EditSubAccountingModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  subAccount: SubAccount | null
}

const EditSubAccountingModal: FC<EditSubAccountingModalProps> = ({ visible, onClose, onSubmit, subAccount }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    subaccountCodes: '',
    accountCodeId: '',
    vesselType: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accountingCodes, setAccountingCodes] = useState<AccountingAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)

  // New state for company dropdown
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)

  // State for vessels and vessel types
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [availableVesselTypes, setAvailableVesselTypes] = useState<string[]>([])
  const [isLoadingVessels, setIsLoadingVessels] = useState(false)

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

  // Load sub account data when modal opens
  useEffect(() => {
    if (visible && subAccount) {
      setFormData({
        company: subAccount.cgaid?.id?.toString() || '',
        subaccountCodes: subAccount.subaccountCodes || '',
        accountCodeId: subAccount.accountCodeId?.toString() || '',
        vesselType: subAccount.vesselType || ''
      })
    }
  }, [visible, subAccount])

  // Load companies when modal opens (only for superadmin)
  useEffect(() => {
    if (visible && actsAsSuperadmin) {
      loadCompanies()
    } else if (visible && actsAsCga) {
      loadVesselsForCompany()
    }
  }, [visible, actsAsSuperadmin, actsAsCga])

  // Load vessels when company is selected (for superadmin)
  useEffect(() => {
    if (formData.company) {
      loadVesselsByCompany()
    } else {
      setVessels([])
      setAvailableVesselTypes([])
    }
  }, [formData.company])

  // Load accounting codes when company/vessel type changes
  useEffect(() => {
    if (visible) {
      loadAccountingCodes()
    }
  }, [visible, formData.company, formData.vesselType])

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

  const loadVesselsForCompany = async () => {
    if (!effectiveCgaId) return

    setIsLoadingVessels(true)
    try {
      const companyUsername = (currentUser as any)?.companyGroupAdmin?.username || (currentUser as any)?.username
      
      if (!companyUsername) {
        console.error('Company username not found in current user')
        return
      }

      const vesselsData = await getVesselsByCompany(companyUsername)
      setVessels(vesselsData)

      const uniqueVesselTypes = Array.from(new Set(vesselsData.map(v => v.vesselType)))
      setAvailableVesselTypes(uniqueVesselTypes)
    } catch (error) {
      console.error('Error loading vessels for company:', error)
      setVessels([])
      setAvailableVesselTypes([])
    } finally {
      setIsLoadingVessels(false)
    }
  }

  const loadVesselsByCompany = async () => {
    if (!formData.company) return

    setIsLoadingVessels(true)
    try {
      const selectedCompany = companies.find(c => c.id === parseInt(formData.company))
      if (!selectedCompany) {
        console.error('Selected company not found')
        return
      }

      const vesselsData = await getVesselsByCompany(selectedCompany.username)
      setVessels(vesselsData)

      const uniqueVesselTypes = Array.from(new Set(vesselsData.map(v => v.vesselType)))
      setAvailableVesselTypes(uniqueVesselTypes)
    } catch (error) {
      console.error('Error loading vessels by company:', error)
      setVessels([])
      setAvailableVesselTypes([])
    } finally {
      setIsLoadingVessels(false)
    }
  }

  const loadAccountingCodes = async () => {
    setIsLoadingAccounts(true)
    try {
      // For superadmin, require both company and vessel type
      if (actsAsSuperadmin) {
        if (!formData.company || !formData.vesselType) {
          setAccountingCodes([])
          setIsLoadingAccounts(false)
          return
        }
      } else {
        // For non-superadmin, only require vessel type
        if (!formData.vesselType) {
          setAccountingCodes([])
          setIsLoadingAccounts(false)
          return
        }
      }

      // Determine which company ID to use
      let cgaIdToUse = effectiveCgaId || 13

      // If superadmin and company is selected, use selected company
      if (actsAsSuperadmin && formData.company) {
        cgaIdToUse = parseInt(formData.company)
      }

      const data = await getAccountingAccountsWithParams(cgaIdToUse, formData.vesselType)
      setAccountingCodes(data)
    } catch (error) {
      console.error('Error loading accounting codes:', error)
      setAccountingCodes([])
    } finally {
      setIsLoadingAccounts(false)
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

    // Company validation for superadmin
    if (actsAsSuperadmin && !formData.company) {
      newErrors.company = 'Company is required'
    }

    if (!formData.subaccountCodes.trim()) newErrors.subaccountCodes = 'Sub Account Code is required'
    if (!formData.accountCodeId) newErrors.accountCodeId = 'Account Code is required'
    if (!formData.vesselType) newErrors.vesselType = 'Vessel Type is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !subAccount) return
    setIsSubmitting(true)
    try {
      await updateSubAccount(subAccount.id, {
        subaccountCodes: formData.subaccountCodes,
        accountCodeId: parseInt(formData.accountCodeId),
        vesselType: formData.vesselType
      })
      toast.success('Sub Accounting updated successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error updating sub accounting:', error)
      toast.error(error.message || 'Failed to update sub accounting')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      company: '',
      subaccountCodes: '',
      accountCodeId: '',
      vesselType: ''
    })
    setErrors({})
    setAccountingCodes([])
    setCompanies([])
    setVessels([])
    setAvailableVesselTypes([])
    onClose()
  }

  if (!visible || !subAccount) return null

  return (
    <div className="modal fade show d-flex align-items-center justify-content-center" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050 }}>
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Edit Sub Accounting</h5>
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
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Account Code</label>
                <input
                  type='text'
                  className={`form-control ${errors.subaccountCodes ? 'is-invalid' : ''}`}
                  name='subaccountCodes'
                  value={formData.subaccountCodes}
                  onChange={handleInputChange}
                  placeholder='e.g., 6000-EXP-01-01'
                  style={{ color: '#000' }}
                />
                {errors.subaccountCodes && <div className='invalid-feedback'>{errors.subaccountCodes}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vessel Type</label>
                <select
                  className={`form-select ${errors.vesselType ? 'is-invalid' : ''}`}
                  name='vesselType'
                  value={formData.vesselType}
                  onChange={handleInputChange}
                  disabled={isLoadingVessels || (actsAsSuperadmin && !formData.company)}
                >
                  <option value=''>
                    {isLoadingVessels ? 'Loading vessel types...' :
                      (actsAsSuperadmin && !formData.company) ? 'Please select a company first' :
                        'Select Vessel Type'}
                  </option>
                  {(actsAsSuperadmin || actsAsCga) ? (
                    availableVesselTypes.map(vesselType => (
                      <option key={vesselType} value={vesselType}>
                        {vesselType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value='OIL_TANKER'>Oil Tanker</option>
                      <option value='GAS_CARRIER'>Gas Carrier</option>
                      <option value='CONTAINER_SHIP'>Container Ship</option>
                      <option value='BULK_CARRIER'>Bulk Carrier</option>
                      <option value='PRODUCT_TANKER'>Product Tanker</option>
                      <option value='BUNKER_TANKER'>Bunker Tanker</option>
                    </>
                  )}
                </select>
                {errors.vesselType && <div className='invalid-feedback'>{errors.vesselType}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Account Code</label>
                <select
                  className={`form-select ${errors.accountCodeId ? 'is-invalid' : ''}`}
                  name='accountCodeId'
                  value={formData.accountCodeId}
                  onChange={handleInputChange}
                  disabled={isLoadingAccounts || (actsAsSuperadmin && (!formData.company || !formData.vesselType)) || (!actsAsSuperadmin && !formData.vesselType)}
                >
                  <option value=''>
                    {isLoadingAccounts ? 'Loading account codes...' :
                      (actsAsSuperadmin && !formData.company) ? 'Please select a company and vessel type first' :
                        (actsAsSuperadmin && !formData.vesselType) ? 'Please select a vessel type first' :
                          (!formData.vesselType) ? 'Please select a vessel type first' :
                            'Select Account Code'}
                  </option>
                  {accountingCodes.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountCodes}
                    </option>
                  ))}
                </select>
                {errors.accountCodeId && <div className='invalid-feedback'>{errors.accountCodeId}</div>}
              </div>

              {/* Show current CGA info for Company Group Admin users */}
              {actsAsCga && effectiveCgaId && (
                <div className='col-12'>
                  <div className='alert alert-info'>
                    <i className='fas fa-info-circle me-2'></i>
                    Sub accounting will be updated under your Company Group Admin (ID: {effectiveCgaId})
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Sub Accounting'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditSubAccountingModal
