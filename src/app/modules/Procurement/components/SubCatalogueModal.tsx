import { FC, useState, useEffect } from "react"
import { useAuth } from "../../auth"
import { toast } from 'react-toastify'
import { CompanyGroupAdmin, SubCompanyAdmin, AccountingAccount, SubAccount, Vessel } from "../core/_models"
import { getCompanyGroupAdmins, getSubCompanyAdmins, getAccountingAccountsWithParams, getSubAccounts, createSubCatalogue, getVesselsByCompany } from "../core/_requests"

interface SubCatalogueModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
}

const SubCatalogueModal: FC<SubCatalogueModalProps> = ({ visible, onClose, onSubmit }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    subCompany: '',
    accountingCode: '',
    subaccountId: '',
    name: '',
    vesselType: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State for all dropdowns
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [subCompanies, setSubCompanies] = useState<SubCompanyAdmin[]>([])
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

  // Load companies when modal opens (only for superadmin)
  useEffect(() => {
    if (visible && currentUser?.role?.id === 1) {
      loadCompanies()
    }
  }, [visible, currentUser])

  // Load vessels when modal opens for role 5 (Company)
  useEffect(() => {
    if (visible && actsAsCga && effectiveCgaId) {
      loadVesselsForCompany()
    }
  }, [visible, actsAsCga, effectiveCgaId])

  // Load subcompanies and vessels when company is selected (for superadmin)
  useEffect(() => {
    if (formData.company) {
      loadSubCompanies(parseInt(formData.company))
      loadVesselsByCompany()
    } else {
      setSubCompanies([])
      setVessels([])
      setAvailableVesselTypes([])
      // Reset vessel type when company changes
      setFormData(prev => ({ ...prev, vesselType: '' }))
    }
  }, [formData.company])

  // Load accounting accounts when company and vessel type are selected
  useEffect(() => {
    if (formData.company && formData.vesselType) {
      loadAccountingAccounts(parseInt(formData.company), formData.vesselType)
    } else if (formData.vesselType && currentUser?.role?.id !== 1) {
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
    if (currentUser?.role?.id === 1) {
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
  }, [formData.accountingCode, formData.company, formData.vesselType, currentUser])

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

  const loadVesselsForCompany = async () => {
    if (!effectiveCgaId) return

    setIsLoadingVessels(true)
    try {
      // Get company username from current user (no need to call getCompanyGroupAdmins)
      const companyUsername = (currentUser as any)?.companyGroupAdmin?.username || (currentUser as any)?.username
      
      if (!companyUsername) {
        console.error('Company username not found in current user')
        return
      }

      console.log('Loading vessels for company username:', companyUsername)
      const vesselsData = await getVesselsByCompany(companyUsername)
      setVessels(vesselsData)

      // Extract unique vessel types from the vessels
      const uniqueVesselTypes = Array.from(new Set(vesselsData.map(v => v.vesselType)))
      setAvailableVesselTypes(uniqueVesselTypes)
      
      console.log('Loaded vessels:', vesselsData.length)
      console.log('Available vessel types:', uniqueVesselTypes)
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
      // Find the selected company to get its username
      const selectedCompany = companies.find(c => c.id === parseInt(formData.company))
      if (!selectedCompany) {
        console.error('Selected company not found')
        return
      }

      const vesselsData = await getVesselsByCompany(selectedCompany.username)
      setVessels(vesselsData)
      
      // Extract unique vessel types from the vessels
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
      // Determine which company ID to use
      let cgaIdToUse: number | undefined

      if (currentUser?.role?.id === 1) {
        // For superadmin, use selected company
        cgaIdToUse = formData.company ? parseInt(formData.company) : undefined
      } else {
        // For non-superadmin, use their company ID
        cgaIdToUse = effectiveCgaId
      }

      const vesselType = formData.vesselType || undefined

      const subAccountData = await getSubAccounts(accountId, cgaIdToUse, vesselType)
      setSubAccounts(subAccountData) // API returns array
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
    if (currentUser?.role?.id === 1 && !formData.company) {
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
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      // Determine the correct CGA ID to use
      let cgaIdToUse: number

      if (currentUser?.role?.id === 1) {
        // For superadmin, use selected company
        if (formData.company) {
          cgaIdToUse = parseInt(formData.company)
        } else {
          toast.error('Please select a company')
          setIsSubmitting(false)
          return
        }
      } else {
        // For other roles, use their company ID
        const roleId = currentUser?.role?.id
        const roleEntityId = currentUser?.roleEntityId
        const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null

        const isOperator = roleId === 6
        const isSuperadminOperator = isOperator && companyGroupAdminId == null
        const isCompanyOperator = isOperator && companyGroupAdminId != null

        const actsAsCga = roleId === 5 || isCompanyOperator

        cgaIdToUse = actsAsCga
          ? (roleId === 5 ? Number(roleEntityId || companyGroupAdminId) : Number(companyGroupAdminId))
          : 13 // Default fallback
      }

      const result = await createSubCatalogue({
        name: formData.name,
        vesselType: formData.vesselType,
        cgaid: { id: cgaIdToUse },
        subaccounts: [{ id: parseInt(formData.subaccountId) }]
      })
      console.log('SubCatalogueModal - Created subcatalogue:', result)
      toast.success('Sub Catalogue added successfully!')
      await onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error adding sub catalogue:', error)
      toast.error(error.message || 'Failed to add sub catalogue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      company: '',
      subCompany: '',
      accountingCode: '',
      subaccountId: '',
      name: '',
      vesselType: ''
    })
    setErrors({})
    setCompanies([])
    setSubCompanies([])
    setAccountingAccounts([])
    setSubAccounts([])
    setVessels([])
    setAvailableVesselTypes([])
    onClose()
  }

  if (!visible) return null

  return (
    <div className="modal fade show d-flex align-items-center justify-content-center" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050 }}>
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Add Sub Catalogue</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>
          <div className='modal-body'>
            <div className='row g-3'>

              {/* Company dropdown - only for superadmin */}
              {currentUser?.role?.id === 1 && (
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
              {currentUser?.role?.id === 1 && formData.company && (
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

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vessel Type</label>
                <select
                  className={`form-select ${errors.vesselType ? 'is-invalid' : ''}`}
                  name='vesselType'
                  value={formData.vesselType}
                  onChange={handleInputChange}
                  disabled={currentUser?.role?.id === 1 && (!formData.company || isLoadingVessels)}
                >
                  <option value=''>
                    {isLoadingVessels ? 'Loading vessel types...' :
                      (currentUser?.role?.id === 1 && !formData.company) ? 'Please select a company first' :
                        'Select Vessel Type'}
                  </option>
                  {(currentUser?.role?.id === 1 || actsAsCga) ? (
                    // For superadmin and company role, show only vessel types from company's vessels
                    availableVesselTypes.map(vesselType => (
                      <option key={vesselType} value={vesselType}>
                        {vesselType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                      </option>
                    ))
                  ) : (
                    // For other roles, show all vessel types (fallback)
                    <>
                      <option value='OIL_TANKER'>Oil Tanker</option>
                      <option value='TANKER'>Tanker</option>
                      <option value='GAS_CARRIER'>Gas Carrier</option>
                      <option value='CHEMICAL_TANKER'>Chemical Tanker</option>
                      <option value='PRODUCT_TANKER'>Product Tanker</option>
                      <option value='LNG_CARRIER'>LNG Carrier</option>
                      <option value='LPG_CARRIER'>LPG Carrier</option>
                      <option value='CRUDE_OIL_TANKER'>Crude Oil Tanker</option>
                      <option value='BUNKER_TANKER'>Bunker Tanker</option>
                      <option value='CONTAINER_SHIP'>Container Ship</option>
                      <option value='BULK_CARRIER'>Bulk Carrier</option>
                      <option value='GENERAL_CARGO_SHIP'>General Cargo Ship</option>
                      <option value='RORO_CARGO_SHIP'>RoRo Cargo Ship</option>
                      <option value='HEAVY_LIFT_VESSEL'>Heavy Lift Vessel</option>
                      <option value='REEFER_SHIP'>Reefer Ship</option>
                      <option value='MULTI_PURPOSE_VESSEL'>Multi Purpose Vessel</option>
                      <option value='CRUISE_SHIP'>Cruise Ship</option>
                      <option value='FERRY'>Ferry</option>
                      <option value='ROPAX_VESSEL'>RoPax Vessel</option>
                      <option value='HIGH_SPEED_CRAFT'>High Speed Craft</option>
                      <option value='OFFSHORE_SUPPLY_VESSEL'>Offshore Supply Vessel</option>
                      <option value='AHTS'>AHTS</option>
                      <option value='PSV'>PSV</option>
                      <option value='SEISMIC_SURVEY_VESSEL'>Seismic Survey Vessel</option>
                      <option value='CABLE_LAYER'>Cable Layer</option>
                      <option value='RESEARCH_VESSEL'>Research Vessel</option>
                      <option value='DSV'>DSV</option>
                      <option value='FIREFIGHTING_VESSEL'>Firefighting Vessel</option>
                      <option value='PIPE_LAYING_VESSEL'>Pipe Laying Vessel</option>
                      <option value='HARBOR_TUG'>Harbor Tug</option>
                      <option value='OCEAN_TUG'>Ocean Tug</option>
                      <option value='WORK_BOAT'>Work Boat</option>
                      <option value='PILOT_BOAT'>Pilot Boat</option>
                      <option value='BARGE'>Barge</option>
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
                  disabled={isLoadingDropdowns || (currentUser?.role?.id === 1 && (!formData.company || !formData.vesselType))}
                >
                  <option value=''>
                    {isLoadingDropdowns ? 'Loading accounting codes...' :
                      (currentUser?.role?.id === 1 && !formData.company) ? 'Please select a company first' :
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
                  disabled={isLoadingSubAccounts || !formData.accountingCode || !formData.vesselType || (currentUser?.role?.id === 1 && !formData.company)}
                >
                  <option value=''>
                    {isLoadingSubAccounts ? 'Loading sub accounting codes...' :
                      (currentUser?.role?.id === 1 && !formData.company) ? 'Please select a company first' :
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
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Sub Catalogue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubCatalogueModal;