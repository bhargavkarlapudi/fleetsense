import { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { useAuth } from '../../auth'
import { toast } from 'react-toastify'
import {
  getCompanyGroupAdmins,
  getSubCompanyAdmins,
  getVesselsByCompany,
  getUnitsOfMeasure,
  getAccountingAccountsWithParams,
  getSubAccounts,
  getSubCatalogues,
  getPartsBySubCatalogue,
  getInventoryItemHeads,
  getInventoryItemSubHeads,
  createPart,
  createInventory,
} from '../core/_requests'
import {
  SubcatalogueType,
  Part,
  CompanyGroupAdmin,
  SubCompanyAdmin,
  Vessel,
  AccountingAccount,
  SubAccount,
  SubCatalogue,
  UnitOfMeasure,
  CreateInventoryRequest,
  InventoryItemHead,
  InventoryItemSubHead,
} from '../core/_models'

interface AddItemModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  vesselId: number
  categories: SubcatalogueType[]
  parts: Part[]
  refreshTrigger?: number
}

const AddItemModal: FC<AddItemModalProps> = ({ visible, onClose, onSubmit, vesselId, categories, parts, refreshTrigger }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    subCompany: '',
    vesselType: '',
    category: '',
    accountingCode: '',
    subAccounting: '',
    head: '',
    subHead: '',
    subCatalogue: '',
    part: '',
    itemName: '',
    partNumber: '',
    code: '',
    description: '',
    unit: '',
    currentQuantity: '',
    reorderLevel: '',
    minThreshold: '',
    maxThreshold: '',
    unitCost: '',
    expiryDate: '',
    serialNumber: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New state for dropdown data
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [subCompanies, setSubCompanies] = useState<SubCompanyAdmin[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselTypes, setVesselTypes] = useState<string[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)

  // API data states for new dropdowns
  const [accountingAccounts, setAccountingAccounts] = useState<AccountingAccount[]>([])
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [heads, setHeads] = useState<InventoryItemHead[]>([])
  const [subHeads, setSubHeads] = useState<InventoryItemSubHead[]>([])
  const [subCatalogues, setSubCatalogues] = useState<SubCatalogue[]>([])
  const [filteredParts, setFilteredParts] = useState<Part[]>([])
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasure[]>([])
  const [isLoadingApiData, setIsLoadingApiData] = useState(false)

  // Load companies when modal opens (only for superadmin)
  useEffect(() => {
    if (visible && currentUser?.role?.id === 1) {
      loadCompanies()
    } else if (visible) {
      // For non-superadmin users, load their company's vessels to get vessel types
      loadVesselsForCurrentUser()
    }
  }, [visible, currentUser])

  // Load vessels for current user (non-superadmin)
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

  // Load units of measure
  const loadUnitsOfMeasure = async () => {
    try {
      const uomData = await getUnitsOfMeasure()
      setUnitsOfMeasure(uomData)
    } catch (error) {
      console.error('Error loading units of measure:', error)
      setUnitsOfMeasure([])
    }
  }

  // Load accounting accounts with company and vessel type
  const loadAccountingAccounts = async (cgaId: number, vesselType: string) => {
    setIsLoadingApiData(true)
    try {
      const accountsData = await getAccountingAccountsWithParams(cgaId, vesselType)
      setAccountingAccounts(accountsData)
    } catch (error) {
      console.error('Error loading accounting accounts:', error)
      setAccountingAccounts([])
    } finally {
      setIsLoadingApiData(false)
    }
  }

  // Load sub accounts by account ID
  const loadSubAccounts = async (accountId: number) => {
    try {
      // Get the company ID based on user role
      let cgaId: number | undefined
      if (currentUser?.role?.id === 1) {
        // For superadmin, use selected company
        cgaId = formData.company ? parseInt(formData.company) : undefined
      } else {
        // For other roles, use their company ID
        cgaId = (currentUser as any)?.companyGroupAdmin?.id || (currentUser as any)?.cgaid?.id
      }

      const subAccountData = await getSubAccounts(accountId, cgaId, formData.vesselType)
      setSubAccounts(subAccountData) // API returns array
    } catch (error) {
      console.error('Error loading sub accounts:', error)
      setSubAccounts([])
    }
  }

  // Load heads based on category
  const loadHeads = async () => {
    try {
      const headsData = await getInventoryItemHeads()
      setHeads(headsData)
    } catch (error) {
      console.error('Error loading heads:', error)
      setHeads([])
    }
  }

  // Load sub heads based on selected head
  const loadSubHeads = async () => {
    try {
      const subHeadsData = await getInventoryItemSubHeads()
      setSubHeads(subHeadsData)
    } catch (error) {
      console.error('Error loading sub heads:', error)
      setSubHeads([])
    }
  }

  // Load sub catalogues by vessel type and sub account ID
  const loadSubCatalogues = async (vesselType: string, subaccountId: number) => {
    try {
      const subCatalogueData = await getSubCatalogues(vesselType, subaccountId)
      setSubCatalogues(subCatalogueData) // API returns array
    } catch (error) {
      console.error('Error loading sub catalogues:', error)
      setSubCatalogues([])
    }
  }

  // Load parts by sub catalogue
  const loadPartsBySubCatalogue = async (subcatalogueId: number) => {
    try {
      const partsData = await getPartsBySubCatalogue(subcatalogueId)
      setFilteredParts(partsData)
    } catch (error) {
      console.error('Error loading parts by sub catalogue:', error)
      setFilteredParts([])
    }
  }

  // Additional useEffect hooks for new dropdown functionality
  useEffect(() => {
    if (visible) {
      loadUnitsOfMeasure()
    }
  }, [visible])

  useEffect(() => {
    if (formData.company && formData.vesselType) {
      loadAccountingAccounts(parseInt(formData.company), formData.vesselType)
    } else {
      setAccountingAccounts([])
    }
  }, [formData.company, formData.vesselType])

  useEffect(() => {
    if (formData.accountingCode && (formData.company || currentUser?.role?.id !== 1)) {
      loadSubAccounts(parseInt(formData.accountingCode))
    } else {
      setSubAccounts([])
    }
  }, [formData.accountingCode, formData.company, formData.vesselType, currentUser])

  useEffect(() => {
    if (formData.category) {
      loadHeads()
    } else {
      setHeads([])
    }
  }, [formData.category])

  useEffect(() => {
    if (formData.head) {
      loadSubHeads()
    } else {
      setSubHeads([])
    }
  }, [formData.head])

  useEffect(() => {
    if (formData.vesselType && formData.subAccounting) {
      loadSubCatalogues(formData.vesselType, parseInt(formData.subAccounting))
    } else {
      setSubCatalogues([])
    }
  }, [formData.vesselType, formData.subAccounting])

  useEffect(() => {
    if (formData.subCatalogue) {
      loadPartsBySubCatalogue(parseInt(formData.subCatalogue))
    } else {
      setFilteredParts([])
    }
  }, [formData.subCatalogue])

  // Refresh sub catalogues when refreshTrigger changes (when new sub catalogue is added)
  useEffect(() => {
    if (refreshTrigger && formData.vesselType && formData.subAccounting) {
      console.log('AddItemModal - Refreshing sub catalogues due to refreshTrigger:', refreshTrigger)
      loadSubCatalogues(formData.vesselType, parseInt(formData.subAccounting))
    }
  }, [refreshTrigger, formData.vesselType, formData.subAccounting])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    if (!formData.vesselType) newErrors.vesselType = 'Vessel Type is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.accountingCode) newErrors.accountingCode = 'Accounting Code is required'
    if (!formData.subAccounting) newErrors.subAccounting = 'Sub Accounting is required'
    if (!formData.head) newErrors.head = 'Head is required'
    if (!formData.subHead) newErrors.subHead = 'Sub Head is required'
    if (!formData.subCatalogue) newErrors.subCatalogue = 'Sub Catalogue is required'
    if (!formData.part) newErrors.part = 'Part is required'
    if (!formData.itemName.trim()) newErrors.itemName = 'Item Name is required'
    if (!formData.partNumber.trim()) newErrors.partNumber = 'Part Number is required'
    if (!formData.code.trim()) newErrors.code = 'Code is required'
    if (!formData.unit) newErrors.unit = 'Unit of Measure is required'
    if (!formData.currentQuantity) newErrors.currentQuantity = 'Current Quantity is required'
    if (!formData.reorderLevel) newErrors.reorderLevel = 'Reorder Level is required'
    if (!formData.minThreshold) newErrors.minThreshold = 'Min Threshold is required'
    if (!formData.maxThreshold) newErrors.maxThreshold = 'Max Threshold is required'
    if (!formData.unitCost) newErrors.unitCost = 'Unit Cost is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Step 1: Create part if needed
      let partId = formData.part
      if (!partId) {
        const partPayload = {
          code: formData.code,
          name: formData.itemName,
          uom: { id: parseInt(formData.unit) },
          inventoryItemSubHead: { id: parseInt(formData.subCatalogue) },
          manufacturer: 'Unknown', // You may want to add manufacturer field
          partNo: formData.partNumber,
          serialNumber: formData.serialNumber
        }
        const createdPart = await createPart(partPayload)
        partId = createdPart.id.toString()
      }

      // Step 2: Create inventory item
      const inventoryPayload: CreateInventoryRequest = {
        vesselId: vesselId,
        partId: parseInt(partId),
        subcatId: parseInt(formData.subCatalogue),
        serialNumber: formData.serialNumber || null,
        currentQty: parseInt(formData.currentQuantity),
        reorderLevel: parseInt(formData.reorderLevel),
        minThreshold: parseInt(formData.minThreshold),
        maxThreshold: parseInt(formData.maxThreshold),
        unitCost: parseFloat(formData.unitCost),
        location: 'Main Store', // You may want to add location field
        expiryDate: formData.expiryDate || null
      }

      await createInventory(inventoryPayload)
      toast.success('Item added successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error adding item:', error)
      toast.error(error.message || 'Failed to add item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      company: '',
      subCompany: '',
      vesselType: '',
      category: '',
      accountingCode: '',
      subAccounting: '',
      head: '',
      subHead: '',
      subCatalogue: '',
      part: '',
      itemName: '',
      partNumber: '',
      code: '',
      description: '',
      unit: '',
      currentQuantity: '',
      reorderLevel: '',
      minThreshold: '',
      maxThreshold: '',
      unitCost: '',
      expiryDate: '',
      serialNumber: ''
    })
    setErrors({})
    // Reset dropdown data
    setCompanies([])
    setSubCompanies([])
    setVessels([])
    setVesselTypes([])
    setAccountingAccounts([])
    setSubAccounts([])
    setHeads([])
    setSubHeads([])
    setSubCatalogues([])
    setFilteredParts([])
    setUnitsOfMeasure([])
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
      <div className='modal-dialog modal-xl modal-dialog-centered' role='document' style={{ maxHeight: '95vh', margin: '1.75rem auto' }}>
        <div className='modal-content bg-white' style={{ color: '#181C32', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
          <div className='modal-header' style={{ flexShrink: 0 }}>
            <h5 className='modal-title'>Add Item</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <div className='modal-body' style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
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
                >
                  <option value=''>Select Vessel Type</option>
                  {currentUser?.role?.id === 1 ? (
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
                    )
                  )}
                </select>
                {errors.vesselType && <div className='invalid-feedback'>{errors.vesselType}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Category</label>
                <select
                  className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                  name='category'
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category && <div className='invalid-feedback'>{errors.category}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Accounting Code</label>
                <select
                  className={`form-select ${errors.accountingCode ? 'is-invalid' : ''}`}
                  name='accountingCode'
                  value={formData.accountingCode}
                  onChange={handleInputChange}
                  disabled={isLoadingApiData || !formData.company || !formData.vesselType}
                >
                  <option value=''>Select Accounting Code</option>
                  {accountingAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.accountCodes}
                    </option>
                  ))}
                </select>
                {errors.accountingCode && <div className='invalid-feedback'>{errors.accountingCode}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Accounting</label>
                <select
                  className={`form-select ${errors.subAccounting ? 'is-invalid' : ''}`}
                  name='subAccounting'
                  value={formData.subAccounting}
                  onChange={handleInputChange}
                  disabled={!formData.accountingCode}
                >
                  <option value=''>Select Sub Accounting</option>
                  {subAccounts.map(subAccount => (
                    <option key={subAccount.id} value={subAccount.id}>
                      {subAccount.subaccountCodes}
                    </option>
                  ))}
                </select>
                {errors.subAccounting && <div className='invalid-feedback'>{errors.subAccounting}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Head</label>
                <select
                  className={`form-select ${errors.head ? 'is-invalid' : ''}`}
                  name='head'
                  value={formData.head}
                  onChange={handleInputChange}
                  disabled={!formData.category}
                >
                  <option value=''>Select Head</option>
                  {heads.map(head => (
                    <option key={head.id} value={head.id}>
                      {head.name}
                    </option>
                  ))}
                </select>
                {errors.head && <div className='invalid-feedback'>{errors.head}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Head</label>
                <select
                  className={`form-select ${errors.subHead ? 'is-invalid' : ''}`}
                  name='subHead'
                  value={formData.subHead}
                  onChange={handleInputChange}
                  disabled={!formData.head}
                >
                  <option value=''>Select Sub Head</option>
                  {subHeads.map(subHead => (
                    <option key={subHead.id} value={subHead.id}>
                      {subHead.name}
                    </option>
                  ))}
                </select>
                {errors.subHead && <div className='invalid-feedback'>{errors.subHead}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Catalogue</label>
                <select
                  className={`form-select ${errors.subCatalogue ? 'is-invalid' : ''}`}
                  name='subCatalogue'
                  value={formData.subCatalogue}
                  onChange={handleInputChange}
                  disabled={!formData.vesselType || !formData.subAccounting}
                >
                  <option value=''>Select Sub Catalogue</option>
                  {subCatalogues.map(subCatalogue => (
                    <option key={subCatalogue.id} value={subCatalogue.id}>
                      {subCatalogue.name}
                    </option>
                  ))}
                </select>
                {errors.subCatalogue && <div className='invalid-feedback'>{errors.subCatalogue}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Part</label>
                <select
                  className={`form-select ${errors.part ? 'is-invalid' : ''}`}
                  name='part'
                  value={formData.part}
                  onChange={handleInputChange}
                  disabled={!formData.subCatalogue}
                >
                  <option value=''>Select Part</option>
                  {filteredParts.map(part => (
                    <option key={part.id} value={part.id}>{part.name}</option>
                  ))}
                </select>
                {errors.part && <div className='invalid-feedback'>{errors.part}</div>}
              </div>

              {/* Rest of the fields */}
              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Item Code</label>
                <input
                  type='text'
                  className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                  name='code'
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder='e.g., FLT-1001'
                  style={{ color: '#000' }}
                />
                {errors.code && <div className='invalid-feedback'>{errors.code}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Item Name</label>
                <input
                  type='text'
                  className={`form-control ${errors.itemName ? 'is-invalid' : ''}`}
                  name='itemName'
                  value={formData.itemName}
                  onChange={handleInputChange}
                  placeholder='e.g., Fuel Filter'
                  style={{ color: '#000' }}
                />
                {errors.itemName && <div className='invalid-feedback'>{errors.itemName}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Part Number</label>
                <input
                  type='text'
                  className={`form-control ${errors.partNumber ? 'is-invalid' : ''}`}
                  name='partNumber'
                  value={formData.partNumber}
                  onChange={handleInputChange}
                  placeholder='e.g., FLT-12345'
                  style={{ color: '#000' }}
                />
                {errors.partNumber && <div className='invalid-feedback'>{errors.partNumber}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Description</label>
                <input
                  type='text'
                  className='form-control'
                  name='description'
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder='Brief description of the item'
                  style={{ color: '#000' }}
                />
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Unit of Measure</label>
                <select
                  className={`form-select ${errors.unit ? 'is-invalid' : ''}`}
                  name='unit'
                  value={formData.unit}
                  onChange={handleInputChange}
                >
                  <option value=''>Select Unit</option>
                  <option value='1'>Pieces</option>
                  <option value='2'>Sets</option>
                  <option value='3'>Liters</option>
                  <option value='4'>Kilograms</option>
                  <option value='5'>Meters</option>
                </select>
                {errors.unit && <div className='invalid-feedback'>{errors.unit}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Current Quantity</label>
                <input
                  type='number'
                  className={`form-control ${errors.currentQuantity ? 'is-invalid' : ''}`}
                  name='currentQuantity'
                  value={formData.currentQuantity}
                  onChange={handleInputChange}
                  placeholder='0'
                  style={{ color: '#000' }}
                />
                {errors.currentQuantity && <div className='invalid-feedback'>{errors.currentQuantity}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Reorder Level</label>
                <input
                  type='number'
                  className={`form-control ${errors.reorderLevel ? 'is-invalid' : ''}`}
                  name='reorderLevel'
                  value={formData.reorderLevel}
                  onChange={handleInputChange}
                  placeholder='0'
                  style={{ color: '#000' }}
                />
                {errors.reorderLevel && <div className='invalid-feedback'>{errors.reorderLevel}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Min Threshold</label>
                <input
                  type='number'
                  className={`form-control ${errors.minThreshold ? 'is-invalid' : ''}`}
                  name='minThreshold'
                  value={formData.minThreshold}
                  onChange={handleInputChange}
                  placeholder='0'
                  style={{ color: '#000' }}
                />
                {errors.minThreshold && <div className='invalid-feedback'>{errors.minThreshold}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Max Threshold</label>
                <input
                  type='number'
                  className={`form-control ${errors.maxThreshold ? 'is-invalid' : ''}`}
                  name='maxThreshold'
                  value={formData.maxThreshold}
                  onChange={handleInputChange}
                  placeholder='0'
                  style={{ color: '#000' }}
                />
                {errors.maxThreshold && <div className='invalid-feedback'>{errors.maxThreshold}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Unit Cost ($)</label>
                <input
                  type='number'
                  step='0.01'
                  className={`form-control ${errors.unitCost ? 'is-invalid' : ''}`}
                  name='unitCost'
                  value={formData.unitCost}
                  onChange={handleInputChange}
                  placeholder='0.00'
                  style={{ color: '#000' }}
                />
                {errors.unitCost && <div className='invalid-feedback'>{errors.unitCost}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Expiry Date</label>
                <input
                  type='date'
                  className='form-control'
                  name='expiryDate'
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                  style={{ color: '#000' }}
                />
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Serial Numbers (comma separated)</label>
                <input
                  type='text'
                  className='form-control'
                  name='serialNumber'
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  placeholder='e.g., SN001, SN002, SN003'
                  style={{ color: '#000' }}
                />
                <small className='text-muted'>Enter multiple serial numbers separated by commas</small>
              </div>
            </div>
          </div>

          <div className='modal-footer' style={{ flexShrink: 0, borderTop: '1px solid #E4E6EF', padding: '1rem' }}>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type='button'
              className='btn btn_primary'
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddItemModal