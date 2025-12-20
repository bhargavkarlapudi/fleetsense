import { FC, useState, useEffect } from "react"
import { useAuth } from "../../auth"
import { toast } from 'react-toastify'
import { Part, CompanyGroupAdmin, SubCompanyAdmin, AccountingAccount, SubAccount, SubCatalogue, Vessel } from "../core/_models"
import { getCompanyGroupAdmins, getSubCompanyAdmins, getAccountingAccountsWithParams, getSubAccounts, getSubCatalogues, updatePart, getVesselsByCompany } from "../core/_requests"

interface EditPartModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  part: Part | null
}

const EditPartModal: FC<EditPartModalProps> = ({ visible, onClose, onSubmit, part }) => {
  const { currentUser } = useAuth()
  const [formData, setFormData] = useState({
    company: '',
    subCompany: '',
    vesselType: '',
    accountingCode: '',
    subAccountingCode: '',
    subcatalogueId: '',
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
  const [subCatalogues, setSubCatalogues] = useState<SubCatalogue[]>([])
  const [unitOfMeasures, setUnitOfMeasures] = useState<any[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)
  const [isLoadingSubCatalogues, setIsLoadingSubCatalogues] = useState(false)
  
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

  // Populate form when part changes
  useEffect(() => {
    if (visible && part) {
      setFormData({
        company: '',
        subCompany: '',
        vesselType: '',
        accountingCode: '',
        subAccountingCode: '',
        subcatalogueId: part.subcatalogue?.id?.toString() || '',
        code: part.code || '',
        name: part.name || '',
        uomId: part.uom?.id?.toString() || '',
        manufacturer: (part as any).manufacturer || '',
        partNo: (part as any).partNo || '',
        serialNumber: (part as any).serialNumber || ''
      })
    }
  }, [visible, part])

  // Load companies when modal opens (only for superadmin)
  useEffect(() => {
    if (visible && currentUser?.role?.id === 1) {
      loadCompanies()
    }
    if (visible) {
      loadUnitOfMeasures()
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
      setFormData(prev => ({ ...prev, vesselType: '' }))
    }
  }, [formData.company])

  // Load accounting accounts when company and vessel type are selected
  useEffect(() => {
    if (formData.company && formData.vesselType) {
      loadAccountingAccounts(parseInt(formData.company), formData.vesselType)
    } else if (formData.vesselType && currentUser?.role?.id !== 1) {
      const cgaIdToUse = effectiveCgaId || 13
      loadAccountingAccounts(cgaIdToUse, formData.vesselType)
    } else {
      setAccountingAccounts([])
    }
  }, [formData.company, formData.vesselType, effectiveCgaId])

  // Load sub accounts when accounting code is selected
  useEffect(() => {
    const shouldLoadSubAccounts = formData.accountingCode && formData.vesselType &&
      (currentUser?.role?.id === 1 ? formData.company : true)

    if (shouldLoadSubAccounts) {
      loadSubAccounts(parseInt(formData.accountingCode))
    } else {
      setSubAccounts([])
    }
  }, [formData.accountingCode, formData.company, formData.vesselType, currentUser])

  // Load sub catalogues when vessel type and sub accounting code are selected
  useEffect(() => {
    if (formData.vesselType && formData.subAccountingCode) {
      loadSubCatalogues(formData.vesselType, parseInt(formData.subAccountingCode))
    } else {
      setSubCatalogues([])
    }
  }, [formData.vesselType, formData.subAccountingCode])

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
    try {
      const cgaId = formData.company ? parseInt(formData.company) : undefined
      const vesselType = formData.vesselType || undefined

      const subAccountData = await getSubAccounts(accountId, cgaId, vesselType)
      setSubAccounts(subAccountData)
    } catch (error) {
      console.error('Error loading sub accounts:', error)
      setSubAccounts([])
    }
  }

  const loadSubCatalogues = async (vesselType: string, subaccountId: number) => {
    setIsLoadingSubCatalogues(true)
    try {
      const subCatalogueData = await getSubCatalogues(vesselType, subaccountId)
      setSubCatalogues(subCatalogueData)
    } catch (error) {
      console.error('Error loading sub catalogues:', error)
      setSubCatalogues([])
    } finally {
      setIsLoadingSubCatalogues(false)
    }
  }

  const loadUnitOfMeasures = async () => {
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

    if (!formData.code.trim()) newErrors.code = 'Part Code is required'
    if (!formData.name.trim()) newErrors.name = 'Part Name is required'
    if (!formData.uomId) newErrors.uomId = 'Unit of Measure is required'
    if (!formData.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required'
    if (!formData.partNo.trim()) newErrors.partNo = 'Part Number is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !part) return
    
    // Ensure we have a valid subcatalogue
    const subcatalogueId = formData.subcatalogueId 
      ? parseInt(formData.subcatalogueId) 
      : part.subcatalogue?.id
    
    if (!subcatalogueId) {
      toast.error('Subcatalogue is required. Please contact support.')
      return
    }
    
    setIsSubmitting(true)
    try {
      await updatePart(part.id, {
        code: formData.code,
        name: formData.name,
        uom: { id: parseInt(formData.uomId) },
        inventoryItemSubHead: { id: subcatalogueId },
        manufacturer: formData.manufacturer,
        partNo: formData.partNo,
        serialNumber: formData.serialNumber || undefined
      })
      toast.success('Part updated successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error updating part:', error)
      toast.error(error.message || 'Failed to update part')
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
      subcatalogueId: '',
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
    setSubCatalogues([])
    setUnitOfMeasures([])
    setVessels([])
    setAvailableVesselTypes([])
    onClose()
  }

  if (!visible || !part) return null

  return (
    <div className="modal fade show d-flex align-items-center justify-content-center" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1050 }}>
      <div className='modal-dialog modal-lg modal-dialog-centered' role='document'>
        <div className='modal-content bg-white' style={{ color: '#181C32' }}>
          <div className='modal-header'>
            <h5 className='modal-title'>Edit Part</h5>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>
          <div className='modal-body'>
            <div className='row g-3'>

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
              {isSubmitting ? 'Updating...' : 'Update Part'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditPartModal
