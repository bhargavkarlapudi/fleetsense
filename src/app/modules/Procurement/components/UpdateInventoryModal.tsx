
import { FC, useState, useEffect } from 'react'
import { useAuth } from '../../auth'
import { toast } from 'react-toastify'
import {
  getVesselsByCompany,
  getCompanyGroupAdmins,
  getSubCompanyAdmins,
  getInventoryCategoriesByVesselType,
  createInventory,
  getSubComponents,
  getInventoryItemHeads,
  getInventoryItemSubHeads,
} from '../core/_requests'
import {
  CompanyGroupAdmin,
  SubCompanyAdmin,
  Vessel,
  InventoryCategory,
  Part,
  CreateInventoryRequest,
  SubcatalogueType,
  UnitOfMeasure,
  SubComponent,
  InventoryItemHead,
  InventoryItemSubHead,
} from '../core/_models'

interface UpdateInventoryModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  vesselId: number
  categories: SubcatalogueType[]
  parts: Part[]
}


const UpdateInventoryModal: FC<UpdateInventoryModalProps> = ({ visible, onClose, onSubmit, vesselId, categories, parts }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    subCompany: '',
    vesselType: '',
    vessel: '', // Add vessel field
    category: '',
    head: '',
    subHead: '',
    part: '',
    subComponent: '',
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
    location: '',
    expiryDate: '',
    serialNumber: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // API data states
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([])
  const [heads, setHeads] = useState<InventoryItemHead[]>([])
  const [subHeads, setSubHeads] = useState<InventoryItemSubHead[]>([])
  const [filteredParts, setFilteredParts] = useState<Part[]>([])
  const [subComponents, setSubComponents] = useState<SubComponent[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  // New state for dropdown data
  const [companies, setCompanies] = useState<CompanyGroupAdmin[]>([])
  const [subCompanies, setSubCompanies] = useState<SubCompanyAdmin[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselTypes, setVesselTypes] = useState<string[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasure[]>([])

  // Load initial data when modal opens
  useEffect(() => {
    if (visible) {
      console.log('UpdateInventoryModal - Modal opened, user role:', currentUser?.role?.id)
      loadInitialModalData()
      // Load companies for superadmin
      if (currentUser?.role?.id === 1) {
        console.log('UpdateInventoryModal - Loading companies for superadmin')
        loadCompanies()
      } else {
        // For non-superadmin users, load their company's vessels to get vessel types
        loadVesselsForCurrentUser()
      }
    }
  }, [visible, currentUser])

  // Load vessels for current user (non-superadmin)
  const loadVesselsForCurrentUser = async () => {
    try {
      // Get the current user's company username
      const companyUsername = (currentUser as any)?.companyGroupAdmin?.username || (currentUser as any)?.username
      if (companyUsername) {
        console.log('UpdateInventoryModal - Loading vessels for current user:', companyUsername)
        const vesselsData = await getVesselsByCompany(companyUsername)
        console.log('UpdateInventoryModal - Vessels loaded for current user:', vesselsData)
        setVessels(vesselsData)
      }
    } catch (error) {
      console.error('UpdateInventoryModal - Error loading vessels for current user:', error)
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
      console.log('UpdateInventoryModal - Company selected:', formData.company)
      console.log('UpdateInventoryModal - Available companies:', companies)
      const selectedCompany = companies.find(c => c.id === parseInt(formData.company))
      console.log('UpdateInventoryModal - Found company:', selectedCompany)
      if (selectedCompany) {
        console.log('UpdateInventoryModal - Loading vessels for username:', selectedCompany.username)
        loadVessels(selectedCompany.username)
      } else {
        console.log('UpdateInventoryModal - Company not found in companies array')
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
      console.log('UpdateInventoryModal - Extracting vessel types in useEffect:', uniqueVesselTypes)
      setVesselTypes(uniqueVesselTypes)
    } else if (vessels.length === 0) {
      console.log('UpdateInventoryModal - No vessels loaded, clearing vessel types')
      setVesselTypes([])
    }
  }, [vessels])

  // Load categories when company and vessel type are selected
  useEffect(() => {
    if (formData.company && formData.vesselType) {
      loadInventoryCategoriesForUpdate(parseInt(formData.company), formData.vesselType)
    } else if (!currentUser?.role?.id || currentUser?.role?.id !== 1) {
      // For non-superadmin, load categories when vessel type is selected
      if (formData.vesselType) {
        const roleId = currentUser?.role?.id
        const roleEntityId = currentUser?.roleEntityId
        const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null

        const isOperator = roleId === 6
        const isSuperadminOperator = isOperator && companyGroupAdminId == null
        const isCompanyOperator = isOperator && companyGroupAdminId != null

        const actsAsCga = roleId === 5 || isCompanyOperator

        const effectiveCgaId = actsAsCga
          ? (roleId === 5 ? Number(roleEntityId || companyGroupAdminId) : Number(companyGroupAdminId))
          : 13

        const cgaIdToUse = actsAsCga ? effectiveCgaId : 13
        loadInventoryCategoriesForUpdate(cgaIdToUse, formData.vesselType)
      }
    } else {
      setInventoryCategories([])
    }
  }, [formData.company, formData.vesselType, currentUser])

  // Handle cascading dropdowns
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
    if (formData.subHead) {
      loadPartsBySubHead(parseInt(formData.subHead))
    } else {
      setFilteredParts([])
    }
  }, [formData.subHead])

  useEffect(() => {
    if (formData.part) {
      loadSubComponentsByPart(parseInt(formData.part))
    } else {
      setSubComponents([])
    }
  }, [formData.part])

  const loadInitialModalData = async () => {
    setIsLoadingData(true)
    try {
      // Use role-based CGA ID (same logic as CategoryModal)
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
        : 13 // Default fallback for superadmin

      const cgaIdToUse = actsAsCga ? effectiveCgaId : 13

      const categoriesData = await getInventoryCategoriesByVesselType(cgaIdToUse, 'OIL_TANKER')
      setInventoryCategories(categoriesData)
    } catch (error) {
      console.error('Error loading modal data:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const loadInventoryCategoriesForUpdate = async (cgaId: number, vesselType: string) => {
    setIsLoadingData(true)
    try {
      const categoriesData = await getInventoryCategoriesByVesselType(cgaId, vesselType)
      setInventoryCategories(categoriesData)
    } catch (error) {
      console.error('Error loading inventory categories:', error)
      setInventoryCategories([])
    } finally {
      setIsLoadingData(false)
    }
  }



  const loadHeads = async () => {
    try {
      const headsData = await getInventoryItemHeads()
      setHeads(Array.isArray(headsData) ? headsData : [headsData])
    } catch (error) {
      console.error('Error loading heads:', error)
      setHeads([])
    }
  }

  const loadSubHeads = async () => {
    try {
      const subHeadsData = await getInventoryItemSubHeads()
      setSubHeads(Array.isArray(subHeadsData) ? subHeadsData : [subHeadsData])
    } catch (error) {
      console.error('Error loading sub heads:', error)
      setSubHeads([])
    }
  }

  const loadPartsBySubHead = async (subHeadId: number) => {
    try {
      // For now, load all parts since there's no direct relationship
      // In a real implementation, you would filter parts by sub head
      setFilteredParts(parts)
    } catch (error) {
      console.error('Error loading parts by sub head:', error)
      setFilteredParts([])
    }
  }

  const loadSubComponentsByPart = async (partId: number) => {
    try {
      const allSubComponents = await getSubComponents()
      const filteredSubComponents = allSubComponents.filter(sc => sc.part.id === partId)
      setSubComponents(filteredSubComponents)
    } catch (error) {
      console.error('Error loading sub components by part:', error)
      setSubComponents([])
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
    setIsLoadingDropdowns(true)
    try {
      console.log('UpdateInventoryModal - Loading vessels for company:', companyUsername)
      const vesselsData = await getVesselsByCompany(companyUsername)
      console.log('UpdateInventoryModal - Vessels loaded:', vesselsData)
      setVessels(vesselsData)
    } catch (error) {
      console.error('UpdateInventoryModal - Error loading vessels:', error)
      setVessels([])
    } finally {
      setIsLoadingDropdowns(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Auto-fill fields when part is selected
    if (name === 'part' && value) {
      const selectedPart = filteredParts.find(part => part.id === parseInt(value))
      if (selectedPart) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          code: selectedPart.code,
          itemName: selectedPart.name,
          partNumber: selectedPart.partNo,
          unit: selectedPart.uom?.id?.toString() || '',
          serialNumber: selectedPart.serialNumber || '',
          description: `${selectedPart.manufacturer} - ${selectedPart.name}`
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }

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
    if (!formData.vessel) newErrors.vessel = 'Vessel is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.head) newErrors.head = 'Head is required'
    if (!formData.subHead) newErrors.subHead = 'Sub Head is required'
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
      // Prepare the inventory creation payload
      const selectedVesselId = formData.vessel ? parseInt(formData.vessel) : vesselId
      const inventoryPayload: CreateInventoryRequest = {
        vesselId: selectedVesselId,
        partId: parseInt(formData.part),
        subcatId: parseInt(formData.subHead),
        subcomponentId: formData.subComponent ? parseInt(formData.subComponent) : null,
        serialNumber: formData.serialNumber || null,
        currentQty: parseInt(formData.currentQuantity),
        reorderLevel: parseInt(formData.reorderLevel),
        minThreshold: parseInt(formData.minThreshold),
        maxThreshold: parseInt(formData.maxThreshold),
        unitCost: parseFloat(formData.unitCost),
        location: formData.location || 'Main Store',
        expiryDate: formData.expiryDate || null
      }

      console.log('Creating inventory with payload:', inventoryPayload)
      console.log('Using vesselId:', selectedVesselId)

      // Call the create inventory API
      const createdItem = await createInventory(inventoryPayload)
      console.log('Inventory created successfully:', createdItem)

      toast.success('Inventory updated successfully!')
      onSubmit() // This will refresh the table
      handleClose()
    } catch (error: any) {
      console.error('Error updating inventory:', error)
      toast.error(error.message || 'Failed to update inventory')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      company: '',
      subCompany: '',
      vesselType: '',
      vessel: '',
      category: '',
      head: '',
      subHead: '',
      part: '',
      subComponent: '',
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
      location: '',
      expiryDate: '',
      serialNumber: ''
    })
    setErrors({})
    // Reset API data states
    setInventoryCategories([])
    setHeads([])
    setSubHeads([])
    setFilteredParts([])
    setSubComponents([])
    // Reset dropdown data
    setCompanies([])
    setSubCompanies([])
    setVessels([])
    setVesselTypes([])
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
      <div className='modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Update Inventory</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <div className='modal-body' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
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
                    disabled={isLoadingDropdowns || isLoadingData}
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
                    disabled={isLoadingData}
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
                  disabled={isLoadingData || isLoadingDropdowns}
                >
                  <option value=''>
                    {currentUser?.role?.id === 1 && formData.company && vesselTypes.length === 0 && !isLoadingDropdowns
                      ? 'No vessel types available'
                      : 'Select Vessel Type'
                    }
                  </option>
                  {currentUser?.role?.id === 1 ? (
                    // For superadmin, show vessel types from selected company's vessels 
                    formData.company ? (
                      vesselTypes.length > 0 ? (
                        vesselTypes.map(vesselType => (
                          <option key={vesselType} value={vesselType}>
                            {vesselType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ))
                      ) : (
                        !isLoadingDropdowns && <option value='' disabled>No vessel types found for this company</option>
                      )
                    ) : (
                      <option value='' disabled>Please select a company first</option>
                    )
                  ) : (
                    // For other roles, show vessel types from their company's vessels
                    vesselTypes.length > 0 ? (
                      vesselTypes.map(vesselType => (
                        <option key={vesselType} value={vesselType}>
                          {vesselType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
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

              {/* Vessel dropdown - filter by selected vessel type */}
              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Vessel</label>
                <select
                  className={`form-select ${errors.vessel ? 'is-invalid' : ''}`}
                  name='vessel'
                  value={formData.vessel}
                  onChange={handleInputChange}
                  disabled={!formData.vesselType || isLoadingDropdowns}
                >
                  <option value=''>Select Vessel</option>
                  {vessels
                    .filter(vessel => !formData.vesselType || vessel.vesselType === formData.vesselType)
                    .map(vessel => (
                      <option key={vessel.id} value={vessel.id}>
                        {vessel.fleet_name}
                      </option>
                    ))}
                </select>
                {errors.vessel && <div className='invalid-feedback'>{errors.vessel}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Category</label>
                <select
                  className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                  name='category'
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={isLoadingData}
                >
                  <option value=''>Select Category</option>
                  {inventoryCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category && <div className='invalid-feedback'>{errors.category}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Head</label>
                <select
                  className={`form-select ${errors.head ? 'is-invalid' : ''}`}
                  name='head'
                  value={formData.head}
                  onChange={handleInputChange}
                  disabled={!formData.category || isLoadingData}
                >
                  <option value=''>Select Head</option>
                  {heads.map(head => (
                    <option key={head.id} value={head.id}>{head.name}</option>
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
                  disabled={!formData.head || isLoadingData}
                >
                  <option value=''>Select Sub Head</option>
                  {subHeads.map(subHead => (
                    <option key={subHead.id} value={subHead.id}>{subHead.name}</option>
                  ))}
                </select>
                {errors.subHead && <div className='invalid-feedback'>{errors.subHead}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Part</label>
                <select
                  className={`form-select ${errors.part ? 'is-invalid' : ''}`}
                  name='part'
                  value={formData.part}
                  onChange={handleInputChange}
                  disabled={!formData.subHead || isLoadingData}
                >
                  <option value=''>Select Part</option>
                  {filteredParts.map(part => (
                    <option key={part.id} value={part.id}>{part.name}</option>
                  ))}
                </select>
                {errors.part && <div className='invalid-feedback'>{errors.part}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Sub Component</label>
                <select
                  className='form-select'
                  name='subComponent'
                  value={formData.subComponent}
                  onChange={handleInputChange}
                  disabled={!formData.part || isLoadingData}
                >
                  <option value=''>Select Sub Component (Optional)</option>
                  {subComponents.map(subComp => (
                    <option key={subComp.id} value={subComp.id}>{subComp.name}</option>
                  ))}
                </select>
              </div>

              {/* Rest of the fields from Add Item Modal (excluding category and location) */}
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
                  placeholder='e.g., FLT-1245'
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
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Location</label>
                <input
                  type='text'
                  className='form-control'
                  name='location'
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder='e.g., ER RACK A2'
                  style={{ color: '#000' }}
                />
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
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Serial Number</label>
                <input
                  type='text'
                  className='form-control'
                  name='serialNumber'
                  value={formData.serialNumber}
                  onChange={handleInputChange}
                  placeholder='e.g., SN001'
                  style={{ color: '#000' }}
                />
              </div>
            </div>
          </div>

          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type='button'
              className='btn btn_primary'
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Inventory'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UpdateInventoryModal;