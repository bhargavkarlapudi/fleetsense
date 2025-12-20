import { FC, useState, useEffect } from "react"
import { useAuth } from "../../auth"
import { toast } from 'react-toastify'
import { CompanyGroupAdmin, SubCompanyAdmin, AccountingAccount, SubAccount, Vessel, SubCatalogue } from "../core/_models"
import { getCompanyGroupAdmins, getSubCompanyAdmins, getAccountingAccountsWithParams, getSubAccounts, updateSubCatalogue, getVesselsByCompany } from "../core/_requests"

interface EditSubCatalogueModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  subCatalogue: SubCatalogue | null
}

const EditSubCatalogueModal: FC<EditSubCatalogueModalProps> = ({ visible, onClose, onSubmit, subCatalogue }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    accountingCode: '',
    subaccountId: '',
    name: '',
    vesselType: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State for all dropdowns
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [accountingAccounts, setAccountingAccounts] = useState<AccountingAccount[]>([])
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)
  const [isLoadingSubAccounts, setIsLoadingSubAccounts] = useState(false)
  
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

  // Load sub catalogue data when modal opens
  useEffect(() => {
    if (visible && subCatalogue) {
      const subaccountId = subCatalogue.subaccounts && Array.isArray(subCatalogue.subaccounts) && subCatalogue.subaccounts.length > 0
        ? subCatalogue.subaccounts[0].id?.toString() || ''
        : ''
      
      setFormData({
        company: subCatalogue.cgaid?.id?.toString() || '',
        accountingCode: '', // Will be loaded based on company and vessel type
        subaccountId: subaccountId,
        name: subCatalogue.name || '',
        vesselType: subCatalogue.vesselType || ''
      })
    }
  }, [visible, subCatalogue])

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

  // Load accounting accounts when company and vessel type are selected
  useEffect(() => {
    if (formData.company && formData.vesselType) {
      loadAccountingAccounts(parseInt(formData.company), formData.vesselType)
    } else if (formData.vesselType && !actsAsSuperadmin) {
      // For non-superadmin users, load with their company
      const cgaIdToUse = effectiveCgaId || 13
      loadAccountingAccounts(cgaIdToUse, formData.vesselType)
    } else {
      setAccountingAccounts([])
    }
  }, [formData.company, formData.vesselType, effectiveCgaId])

  // Load sub accounts when accounting code is selected
  useEffect(() => {
    // For superadmin, require company, accounting code, and vessel type
    if (actsAsSuperadmin) {
      if (formData.accountingCode && formData.company && formData.vesselType) {
        loadSubAccounts(parseInt(formData.accountingCode))
      } else {
        setSubAccounts([])
      }
    } else {
      // For non-superadmin, only require accounting code and vessel type
      if (formData.accountingCode && formData.vesselType) {
        loadSubAccounts(parseInt(formData.accountingCode))
      } else {
        setSubAccounts([])
      }
    }
  }, [formData.accountingCode, formData.company, formData.vesselType])

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

  const loadAccountingAccounts = async (cgaId: number, vesselType: string) => {
    setIsLoadingDropdowns(true)
    try {
      const accountsData = await getAccountingAccountsWithParams(cgaId, vesselType)
      setAccountingAccounts(accountsData)
    } catch (error) {
      console.error('Error loading accounting accounts:', error)
      setAccountingAccounts([])
    } finally {
      setIsLoadingDropdowns(false)
    }
  }

  const loadSubAccounts = async (accountId: number) => {
    setIsLoadingSubAccounts(true)
    try {
      let cgaIdToUse: number | undefined

      if (actsAsSuperadmin) {
        cgaIdToUse = formData.company ? parseInt(formData.company) : undefined
      } else {
        cgaIdToUse = effectiveCgaId
      }

      const vesselType = formData.vesselType || undefined

      const subAccountData = await getSubAccounts(accountId, cgaIdToUse, vesselType)
      setSubAccounts(subAccountData)
    } catch (error) {
      console.error('Error loading sub accounts:', error)
      setSubAccounts([])
    } finally {
      setIsLoadingSubAccounts(false)
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

    if (!formData.accountingCode) newErrors.accountingCode = 'Accounting Code is required'
    if (!formData.subaccountId) newErrors.subaccountId = 'Sub Accounting Code is required'
    if (!formData.name.trim()) newErrors.name = 'Sub Catalogue Name is required'
    if (!formData.vesselType) newErrors.vesselType = 'Vessel Type is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !subCatalogue) return
    setIsSubmitting(true)
    try {
      let cgaIdToUse: number

      if (actsAsSuperadmin) {
        if (formData.company) {
          cgaIdToUse = parseInt(formData.company)
        } else {
          toast.error('Please select a company')
          setIsSubmitting(false)
          return
        }
      } else {
        cgaIdToUse = effectiveCgaId || 13
      }

      await updateSubCatalogue(subCatalogue.id, {
        name: formData.name,
        vesselType: formData.vesselType,
        cgaid: { id: cgaIdToUse },
        subaccounts: [{ id: parseInt(formData.subaccountId) }]
      })
      toast.success('Sub Catalogue updated successfully!')
      await onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error updating sub catalogue:', error)
      toast.error(error.message || 'Failed to update sub catalogue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      company: '',
      accountingCode: '',
      subaccountId: '',
      name: '',
      vesselType: ''
    })
    setErrors({})
    setCompanies([])
    setAccountingAccounts([])
    setSubAccounts([])
    setVessels([])
    setAvailableVesselTypes([])
    onClose()
  }

  if (!visible || !subCatalogue) return null

  return (
    <div className="modal fade show d-flex align-items-center justify-content-center" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050 }}>
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Edit Sub Catalogue</h5>
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

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vessel Type</label>
                <select
                  className={`form-select ${errors.vesselType ? 'is-invalid' : ''}`}
                  name='vesselType'
                  value={formData.vesselType}
                  onChange={handleInputChange}
                  disabled={actsAsSuperadmin && (!formData.company || isLoadingVessels)}
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
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Accounting Code</label>
                <select
                  className={`form-select ${errors.accountingCode ? 'is-invalid' : ''}`}
                  name='accountingCode'
                  value={formData.accountingCode}
                  onChange={handleInputChange}
                  disabled={isLoadingDropdowns || (actsAsSuperadmin && (!formData.company || !formData.vesselType))}
                >
                  <option value=''>
                    {isLoadingDropdowns ? 'Loading accounting codes...' :
                      (actsAsSuperadmin && !formData.company) ? 'Please select a company first' :
                        !formData.vesselType ? 'Please select a vessel type first' :
                          'Select Accounting Code'}
                  </option>
                  {accountingAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountCodes}
                    </option>
                  ))}
                </select>
                {errors.accountingCode && <div className='invalid-feedback'>{errors.accountingCode}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Accounting Code</label>
                <select
                  className={`form-select ${errors.subaccountId ? 'is-invalid' : ''}`}
                  name='subaccountId'
                  value={formData.subaccountId}
                  onChange={handleInputChange}
                  disabled={isLoadingSubAccounts || !formData.accountingCode || !formData.vesselType || (actsAsSuperadmin && !formData.company)}
                >
                  <option value=''>
                    {isLoadingSubAccounts ? 'Loading sub accounting codes...' :
                      (actsAsSuperadmin && !formData.company) ? 'Please select a company first' :
                        !formData.vesselType ? 'Please select a vessel type first' :
                          !formData.accountingCode ? 'Please select an accounting code first' :
                            'Select Sub Accounting Code'}
                  </option>
                  {subAccounts.map(subAccount => (
                    <option key={subAccount.id} value={subAccount.id}>
                      {subAccount.subaccountCodes}
                    </option>
                  ))}
                </select>
                {errors.subaccountId && <div className='invalid-feedback'>{errors.subaccountId}</div>}
              </div>

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Catalogue Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder='e.g., Electrical Spares Master'
                  style={{ color: '#000' }}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>

              {/* Show current CGA info for Company Group Admin users */}
              {actsAsCga && effectiveCgaId && (
                <div className='col-12'>
                  <div className='alert alert-info'>
                    <i className='fas fa-info-circle me-2'></i>
                    Sub catalogue will be updated under your Company Group Admin (ID: {effectiveCgaId})
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Sub Catalogue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditSubCatalogueModal
