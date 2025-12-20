import { FC, useState, useEffect } from "react"
import { useAuth } from "../../auth"
import { toast } from 'react-toastify'
import { CompanyGroupAdmin, SubCompanyAdmin, AccountingAccount, SubAccount, InventoryItemSubHead, InventoryItemHead, InventoryCategory, Vessel } from "../core/_models"
import { getCompanyGroupAdmins, getSubCompanyAdmins, getAccountingAccountsWithParams, getSubAccounts, getInventoryItemSubHeads, getInventoryItemHeads, getAllInventoryCategoriesForCompany, getAllInventoryCategoriesForAllCompanies, createPart, getVesselsByCompany } from "../core/_requests"

interface PartModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  refreshTrigger?: number
}

const PartModal: FC<PartModalProps> = ({ visible, onClose, onSubmit, refreshTrigger }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    subCompany: '',
    vesselType: '',
    accountingCode: '',
    subAccountingCode: '',
    categoryId: '',
    headId: '',
    subHeadId: '',
    code: '',
    name: '',
    uomId: '',
    manufacturer: '',
    partNo: '',
    serialNumber: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State for all dropdowns
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [subCompanies, setSubCompanies] = useState<SubCompanyAdmin[]>([])
  const [accountingAccounts, setAccountingAccounts] = useState<AccountingAccount[]>([])
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [heads, setHeads] = useState<InventoryItemHead[]>([])
  const [allSubHeads, setAllSubHeads] = useState<InventoryItemSubHead[]>([])
  const [filteredSubHeads, setFilteredSubHeads] = useState<InventoryItemSubHead[]>([])
  const [unitOfMeasures, setUnitOfMeasures] = useState<any[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isLoadingHeads, setIsLoadingHeads] = useState(false)
  const [isLoadingSubHeads, setIsLoadingSubHeads] = useState(false)

  // State for vessels and vessel types
  const [availableVesselTypes, setAvailableVesselTypes] = useState<string[]>([])
  const [isLoadingVessels, setIsLoadingVessels] = useState(false)

  // Role-based logic
  const roleId = currentUser?.role?.id
  const roleEntityId = currentUser?.roleEntityId
  const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null

  const isOperator = roleId === 6
  const isSuperadminOperator = isOperator && companyGroupAdminId == null
  const isCompanyOperator = isOperator && companyGroupAdminId != null


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
      loadUnitOfMeasures()
      loadAllSubHeads()
      loadHeads()
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
      setAvailableVesselTypes([])
      // Reset vessel type when company changes
      setFormData(prev => ({ ...prev, vesselType: '' }))
    }
  }, [formData.company])

  // Load categories when company and vessel type are selected
  useEffect(() => {
    if (formData.company && formData.vesselType) {
      loadCategories(parseInt(formData.company), formData.vesselType)
    } else if (formData.vesselType && currentUser?.role?.id !== 1) {
      // For non-superadmin users, load with their company
      const cgaIdToUse = effectiveCgaId || 13
      loadCategories(cgaIdToUse, formData.vesselType)
    } else {
      setCategories([])
    }
  }, [formData.company, formData.vesselType, effectiveCgaId])

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
    // For superadmin, require company selection; for others, just need accounting code and vessel type
    const shouldLoadSubAccounts = formData.accountingCode && formData.vesselType &&
      (currentUser?.role?.id === 1 ? formData.company : true)

    if (shouldLoadSubAccounts) {
      loadSubAccounts(parseInt(formData.accountingCode))
    } else {
      setSubAccounts([])
    }
  }, [formData.accountingCode, formData.company, formData.vesselType, currentUser])

  // Reset head and sub head when category changes
  useEffect(() => {
    if (formData.categoryId) {
      // Reset head and sub head when category changes
      setFormData(prev => ({ ...prev, headId: '', subHeadId: '' }))
    }
  }, [formData.categoryId])

  // Filter sub heads when head is selected
  useEffect(() => {
    if (formData.headId) {
      const filtered = allSubHeads.filter(subHead => subHead.inventoryItemHeadId === parseInt(formData.headId))
      setFilteredSubHeads(filtered)
      // Reset sub head when head changes
      setFormData(prev => ({ ...prev, subHeadId: '' }))
    } else {
      setFilteredSubHeads([])
    }
  }, [formData.headId, allSubHeads])

  // Refresh sub heads when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && visible) {
      console.log('PartModal - Refreshing sub heads due to refreshTrigger:', refreshTrigger)
      loadAllSubHeads()
      loadHeads()
    }
  }, [refreshTrigger, visible])

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

      // Extract unique vessel types from the vessels
      const uniqueVesselTypes = Array.from(new Set(vesselsData.map(v => v.vesselType)))
      setAvailableVesselTypes(uniqueVesselTypes)

      console.log('Loaded vessels:', vesselsData.length)
      console.log('Available vessel types:', uniqueVesselTypes)
    } catch (error) {
      console.error('Error loading vessels for company:', error)
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

      // Extract unique vessel types from the vessels
      const uniqueVesselTypes = Array.from(new Set(vesselsData.map(v => v.vesselType)))
      setAvailableVesselTypes(uniqueVesselTypes)
    } catch (error) {
      console.error('Error loading vessels by company:', error)
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
    try {
      // Get the company ID and vessel type from form data
      const cgaId = formData.company ? parseInt(formData.company) : undefined
      const vesselType = formData.vesselType || undefined

      const subAccountData = await getSubAccounts(accountId, cgaId, vesselType)
      setSubAccounts(subAccountData) // API returns array
    } catch (error) {
      console.error('Error loading sub accounts:', error)
      setSubAccounts([])
    }
  }

  const loadCategories = async (cgaId: number, vesselType: string) => {
    setIsLoadingCategories(true)
    try {
      let categoriesData: InventoryCategory[]
      if (currentUser?.role?.id === 1) {
        // For superadmin, get all categories for all companies
        categoriesData = await getAllInventoryCategoriesForAllCompanies()
      } else {
        // For other roles, get categories for specific company and vessel type
        categoriesData = await getAllInventoryCategoriesForCompany(cgaId, vesselType)
      }
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading categories:', error)
      setCategories([])
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const loadHeads = async () => {
    setIsLoadingHeads(true)
    try {
      const headsData = await getInventoryItemHeads()
      setHeads(headsData)
    } catch (error) {
      console.error('Error loading heads:', error)
      setHeads([])
    } finally {
      setIsLoadingHeads(false)
    }
  }

  const loadAllSubHeads = async () => {
    console.log('PartModal - Loading all sub heads')
    setIsLoadingSubHeads(true)
    try {
      const subHeadData = await getInventoryItemSubHeads()
      console.log('PartModal - Sub heads loaded:', subHeadData)
      setAllSubHeads(subHeadData)
    } catch (error) {
      console.error('PartModal - Error loading sub heads:', error)
      setAllSubHeads([])
    } finally {
      setIsLoadingSubHeads(false)
    }
  }

  const loadUnitOfMeasures = async () => {
    // Use hardcoded UOM values - these should match your backend data
    setUnitOfMeasures([
      { id: 1, code: 'KG', name: 'kg', symbol: null },
      { id: 2, code: 'PCS', name: 'Pieces', symbol: null },
      { id: 3, code: 'SET', name: 'Sets', symbol: null },
      { id: 4, code: 'LTR', name: 'Liters', symbol: null },
      { id: 5, code: 'MTR', name: 'Meters', symbol: null }
    ])
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

    if (!formData.vesselType) newErrors.vesselType = 'Vessel Type is required'
    if (!formData.accountingCode) newErrors.accountingCode = 'Accounting Code is required'
    if (!formData.subAccountingCode) newErrors.subAccountingCode = 'Sub Accounting Code is required'
    if (!formData.categoryId) newErrors.categoryId = 'Category is required'
    if (!formData.headId) newErrors.headId = 'Head is required'
    if (!formData.subHeadId) newErrors.subHeadId = 'Sub Head is required'
    if (!formData.code.trim()) newErrors.code = 'Part Code is required'
    if (!formData.name.trim()) newErrors.name = 'Part Name is required'
    if (!formData.uomId) newErrors.uomId = 'Unit of Measure is required'
    if (!formData.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required'
    if (!formData.partNo.trim()) newErrors.partNo = 'Part Number is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await createPart({
        code: formData.code,
        name: formData.name,
        uom: { id: parseInt(formData.uomId) },
        inventoryItemSubHead: { id: parseInt(formData.subHeadId) },
        manufacturer: formData.manufacturer,
        partNo: formData.partNo,
        serialNumber: formData.serialNumber || undefined
      })
      toast.success('Part added successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error adding part:', error)
      toast.error(error.message || 'Failed to add part')
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
      categoryId: '',
      headId: '',
      subHeadId: '',
      code: '',
      name: '',
      uomId: '',
      manufacturer: '',
      partNo: '',
      serialNumber: ''
    })
    setErrors({})
    setCompanies([])
    setSubCompanies([])
    setAccountingAccounts([])
    setSubAccounts([])
    setCategories([])
    setHeads([])
    setAllSubHeads([])
    setFilteredSubHeads([])
    setUnitOfMeasures([])
    setAvailableVesselTypes([])
    onClose()
  }

  if (!visible) return null

  return (
    <div className="modal fade show d-flex align-items-center justify-content-center" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050 }}>
      <div className='modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable' role='document' style={{ maxHeight: '90vh' }}>
        <div className='modal-content bg-white' style={{ color: '#181C32', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Add Part</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>
          <div className='modal-body' style={{ overflowY: 'auto', flex: 1 }}>
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
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Category</label>
                <select
                  className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                  name='categoryId'
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  disabled={isLoadingCategories || (currentUser?.role?.id === 1 && (!formData.company || !formData.vesselType))}
                >
                  <option value=''>
                    {isLoadingCategories ? 'Loading categories...' :
                      (currentUser?.role?.id === 1 && !formData.company) ? 'Please select a company first' :
                        !formData.vesselType ? 'Please select a vessel type first' :
                          'Select Category'}
                  </option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <div className='invalid-feedback'>{errors.categoryId}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Head</label>
                <select
                  className={`form-select ${errors.headId ? 'is-invalid' : ''}`}
                  name='headId'
                  value={formData.headId}
                  onChange={handleInputChange}
                  disabled={isLoadingHeads || !formData.categoryId}
                >
                  <option value=''>
                    {isLoadingHeads ? 'Loading heads...' :
                      !formData.categoryId ? 'Please select a category first' :
                        'Select Head'}
                  </option>
                  {heads.filter(head => head.inventoryItemCategoryId === parseInt(formData.categoryId || '0')).map(head => (
                    <option key={head.id} value={head.id}>
                      {head.name}
                    </option>
                  ))}
                </select>
                {errors.headId && <div className='invalid-feedback'>{errors.headId}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Head</label>
                <select
                  className={`form-select ${errors.subHeadId ? 'is-invalid' : ''}`}
                  name='subHeadId'
                  value={formData.subHeadId}
                  onChange={handleInputChange}
                  disabled={isLoadingSubHeads || !formData.headId}
                >
                  <option value=''>
                    {isLoadingSubHeads ? 'Loading sub heads...' :
                      !formData.headId ? 'Please select a head first' :
                        'Select Sub Head'}
                  </option>
                  {filteredSubHeads.map(subHead => (
                    <option key={subHead.id} value={subHead.id}>
                      {subHead.name}
                    </option>
                  ))}
                </select>
                {errors.subHeadId && <div className='invalid-feedback'>{errors.subHeadId}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Part Code</label>
                <input
                  type='text'
                  className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                  name='code'
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder='e.g., P-EL-0001'
                  style={{ color: '#000' }}
                />
                {errors.code && <div className='invalid-feedback'>{errors.code}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Part Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  name='name'
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder='e.g., Starter Motor'
                  style={{ color: '#000' }}
                />
                {errors.name && <div className='invalid-feedback'>{errors.name}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Unit of Measure</label>
                <select
                  className={`form-select ${errors.uomId ? 'is-invalid' : ''}`}
                  name='uomId'
                  value={formData.uomId}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Unit</option>
                  {unitOfMeasures.map(uom => (
                    <option key={uom.id} value={uom.id}>
                      {uom.name} ({uom.code})
                    </option>
                  ))}
                </select>
                {errors.uomId && <div className='invalid-feedback'>{errors.uomId}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Manufacturer</label>
                <input
                  type='text'
                  className={`form-control ${errors.manufacturer ? 'is-invalid' : ''}`}
                  name='manufacturer'
                  value={formData.manufacturer}
                  onChange={handleInputChange}
                  placeholder='e.g., Bosch'
                  style={{ color: '#000' }}
                />
                {errors.manufacturer && <div className='invalid-feedback'>{errors.manufacturer}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Part Number</label>
                <input
                  type='text'
                  className={`form-control ${errors.partNo ? 'is-invalid' : ''}`}
                  name='partNo'
                  value={formData.partNo}
                  onChange={handleInputChange}
                  placeholder='e.g., SM-12345'
                  style={{ color: '#000' }}
                />
                {errors.partNo && <div className='invalid-feedback'>{errors.partNo}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Serial Number</label>
                <input
                  type='text'
                  className='form-control'
                  name='serialNumber'
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  placeholder='e.g., SN-00098765'
                  style={{ color: '#000' }}
                />
              </div>
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>Cancel</button>
            <button type='button' className='btn btn_primary' onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Part'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default PartModal;