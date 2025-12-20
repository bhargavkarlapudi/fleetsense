import { FC, useState, useEffect } from "react"
import { useAuth } from "../../auth"
import { toast } from 'react-toastify'
import { 
  Part, 
  CreateSubComponentRequest, 
  CompanyGroupAdmin, 
  SubCompanyAdmin, 
  AccountingAccount, 
  SubAccount, 
  InventoryItemSubHead,
  Vessel 
} from "../core/_models"
import { 
  createSubComponent,
  getCompanyGroupAdmins,
  getSubCompanyAdmins,
  getAccountingAccountsWithParams,
  getSubAccounts,
  getInventoryItemSubHeads,
  getParts,
  getVesselsByCompany
} from "../core/_requests"

interface SubComponentModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
}

const SubComponentModal: FC<SubComponentModalProps> = ({ visible, onClose, onSubmit }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    subCompany: '',
    vesselType: '',
    accountingCode: '',
    subAccountingCode: '',
    subHeadId: '',
    partId: '',
    name: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Dropdown data states
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [subCompanies, setSubCompanies] = useState<SubCompanyAdmin[]>([])
  const [accountingAccounts, setAccountingAccounts] = useState<AccountingAccount[]>([])
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [subHeads, setSubHeads] = useState<InventoryItemSubHead[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [allParts, setAllParts] = useState<Part[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [availableVesselTypes, setAvailableVesselTypes] = useState<string[]>([])
  
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)
  const [isLoadingParts, setIsLoadingParts] = useState(false)
  const [isLoadingSubHeads, setIsLoadingSubHeads] = useState(false)

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
    if (visible) {
      loadSubHeads()
      loadAllParts()
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
    }
  }, [formData.company])

  // Load accounting accounts when vessel type is selected
  useEffect(() => {
    if (formData.vesselType) {
      if (currentUser?.role?.id === 1 && formData.company) {
        // For superadmin, use selected company
        loadAccountingAccounts(parseInt(formData.company), formData.vesselType)
      } else if (actsAsCga && effectiveCgaId) {
        // For company role, use their company ID
        loadAccountingAccounts(effectiveCgaId, formData.vesselType)
      }
    } else {
      setAccountingAccounts([])
    }
  }, [formData.company, formData.vesselType, effectiveCgaId, actsAsCga])

  // Load sub accounts when accounting code is selected
  useEffect(() => {
    const shouldLoadSubAccounts = formData.accountingCode &&
      (currentUser?.role?.id === 1 ? formData.company : true)

    if (shouldLoadSubAccounts) {
      loadSubAccounts(parseInt(formData.accountingCode))
    } else {
      setSubAccounts([])
    }
  }, [formData.accountingCode, formData.company, currentUser])

  // Filter parts when sub head is selected
  useEffect(() => {
    if (formData.subHeadId && allParts.length > 0) {
      const filtered = allParts.filter(part => 
        part.inventoryItemSubHead?.id === parseInt(formData.subHeadId)
      )
      setParts(filtered)
    } else {
      setParts([])
    }
  }, [formData.subHeadId, allParts])

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

    setIsLoadingDropdowns(true)
    try {
      // Get company username from current user (no need to call getCompanyGroupAdmins)
      const companyUsername = (currentUser as any)?.companyGroupAdmin?.username || (currentUser as any)?.username
      
      if (!companyUsername) {
        console.error('Company username not found in current user')
        return
      }

      console.log('SubComponentModal - Loading vessels for company username:', companyUsername)
      const vesselsData = await getVesselsByCompany(companyUsername)
      setVessels(vesselsData)

      // Extract unique vessel types from the vessels
      const uniqueVesselTypes = Array.from(new Set(vesselsData.map(v => v.vesselType)))
      setAvailableVesselTypes(uniqueVesselTypes)
      
      console.log('SubComponentModal - Loaded vessels:', vesselsData.length)
      console.log('SubComponentModal - Available vessel types:', uniqueVesselTypes)
    } catch (error) {
      console.error('SubComponentModal - Error loading vessels for company:', error)
      setVessels([])
      setAvailableVesselTypes([])
    } finally {
      setIsLoadingDropdowns(false)
    }
  }

  const loadVesselsByCompany = async () => {
    if (!formData.company) return
    
    setIsLoadingDropdowns(true)
    try {
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
      setIsLoadingDropdowns(false)
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
    try {
      // Determine which company ID to use
      let cgaId: number | undefined
      
      if (currentUser?.role?.id === 1) {
        // For superadmin, use selected company
        cgaId = formData.company ? parseInt(formData.company) : undefined
      } else if (actsAsCga) {
        // For company role, use their company ID
        cgaId = effectiveCgaId
      }
      
      const vesselType = formData.vesselType || undefined

      console.log('SubComponentModal - Loading sub accounts with cgaId:', cgaId, 'vesselType:', vesselType)
      const subAccountData = await getSubAccounts(accountId, cgaId, vesselType)
      setSubAccounts(subAccountData)
    } catch (error) {
      console.error('Error loading sub accounts:', error)
      setSubAccounts([])
    }
  }

  const loadSubHeads = async () => {
    setIsLoadingSubHeads(true)
    try {
      const subHeadData = await getInventoryItemSubHeads()
      setSubHeads(subHeadData)
    } catch (error) {
      console.error('Error loading sub heads:', error)
      setSubHeads([])
    } finally {
      setIsLoadingSubHeads(false)
    }
  }

  const loadAllParts = async () => {
    setIsLoadingParts(true)
    try {
      const partsData = await getParts()
      setAllParts(partsData)
    } catch (error) {
      console.error('Error loading parts:', error)
      setAllParts([])
    } finally {
      setIsLoadingParts(false)
    }
  }

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
    const newErrors: { [key: string]: string } = {}

    // Company validation for superadmin
    if (currentUser?.role?.id === 1 && !formData.company) {
      newErrors.company = 'Company is required'
    }

    if (!formData.vesselType) newErrors.vesselType = 'Vessel Type is required'
    if (!formData.accountingCode) newErrors.accountingCode = 'Accounting Code is required'
    if (!formData.subAccountingCode) newErrors.subAccountingCode = 'Sub Accounting Code is required'
    if (!formData.subHeadId) newErrors.subHeadId = 'Sub Head is required'
    if (!formData.partId) newErrors.partId = 'Part is required'
    if (!formData.name.trim()) newErrors.name = 'Sub Component Name is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const payload: CreateSubComponentRequest = {
        part: { id: parseInt(formData.partId) },
        name: formData.name
      }
      await createSubComponent(payload)
      toast.success('Sub Component added successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error adding sub component:', error)
      toast.error(error.message || 'Failed to add sub component')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      company: '',
      subCompany: '',
      vesselType: '',
      accountingCode: '',
      subAccountingCode: '',
      subHeadId: '',
      partId: '',
      name: ''
    })
    setErrors({})
    setCompanies([])
    setSubCompanies([])
    setAccountingAccounts([])
    setSubAccounts([])
    setSubHeads([])
    setParts([])
    setAllParts([])
    setVessels([])
    setAvailableVesselTypes([])
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
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Add Sub Component</h5>
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

              {/* Vessel Type dropdown */}
              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vessel Type</label>
                <select
                  className={`form-select ${errors.vesselType ? 'is-invalid' : ''}`}
                  name='vesselType'
                  value={formData.vesselType}
                  onChange={handleInputChange}
                  disabled={isLoadingDropdowns || (currentUser?.role?.id === 1 && !formData.company)}
                >
                  <option value=''>
                    {isLoadingDropdowns ? 'Loading vessel types...' :
                      (currentUser?.role?.id === 1 && !formData.company) ? 'Please select a company first' :
                        'Select Vessel Type'}
                  </option>
                  {availableVesselTypes.map(vesselType => (
                    <option key={vesselType} value={vesselType}>
                      {vesselType.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
                    </option>
                  ))}
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
                  disabled={isLoadingDropdowns || !formData.vesselType}
                >
                  <option value=''>
                    {isLoadingDropdowns ? 'Loading accounting codes...' :
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
                  className={`form-select ${errors.subAccountingCode ? 'is-invalid' : ''}`}
                  name='subAccountingCode'
                  value={formData.subAccountingCode}
                  onChange={handleInputChange}
                  disabled={!formData.accountingCode}
                >
                  <option value=''>
                    {!formData.accountingCode ? 'Please select an accounting code first' : 'Select Sub Accounting Code'}
                  </option>
                  {subAccounts.map(subAccount => (
                    <option key={subAccount.id} value={subAccount.id}>
                      {subAccount.subaccountCodes}
                    </option>
                  ))}
                </select>
                {errors.subAccountingCode && <div className='invalid-feedback'>{errors.subAccountingCode}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Head</label>
                <select
                  className={`form-select ${errors.subHeadId ? 'is-invalid' : ''}`}
                  name='subHeadId'
                  value={formData.subHeadId}
                  onChange={handleInputChange}
                  disabled={isLoadingSubHeads}
                >
                  <option value=''>
                    {isLoadingSubHeads ? 'Loading sub heads...' : 'Select Sub Head'}
                  </option>
                  {subHeads.map(subHead => (
                    <option key={subHead.id} value={subHead.id}>
                      {subHead.name}
                    </option>
                  ))}
                </select>
                {errors.subHeadId && <div className='invalid-feedback'>{errors.subHeadId}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Part</label>
                <select
                  className={`form-select ${errors.partId ? 'is-invalid' : ''}`}
                  name='partId'
                  value={formData.partId}
                  onChange={handleInputChange}
                  disabled={isLoadingParts || !formData.subHeadId}
                >
                  <option value=''>
                    {isLoadingParts ? 'Loading parts...' :
                      !formData.subHeadId ? 'Please select sub head first' :
                        'Select Part'}
                  </option>
                  {parts.map(part => (
                    <option key={part.id} value={part.id}>{part.name} ({part.code})</option>
                  ))}
                </select>
                {errors.partId && <div className='invalid-feedback'>{errors.partId}</div>}
              </div>

              <div className='col-12'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Component Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder='e.g., Fuel Pump Assembly'
                  style={{ color: '#000' }}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Sub Component'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SubComponentModal