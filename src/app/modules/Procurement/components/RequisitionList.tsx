import React, { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import {
  getRequisitions,
  getNextRequisitionCode,
  createRequisition,
  deleteRequisition,
  submitRequisition,
  approveVesselRequisition,
  approveShoreRequisition,
  getRequisitionAttachments,
  getParts,
  getPorts,
  getSubcatalogueTypes,
  testRequisitionAPI,
  testCreateRequisitionWithFormData,
  getRequisitionById,
  updateRequisition,
  getInventory,
  getAccountingAccounts,
  getAllAccountingAccounts,
  getAllSubAccounts,
  getAllInventoryCategoriesForAllCompanies,
  getAllInventoryCategoriesForCompany,
  getInventoryCategoriesByVesselType,
  getSubCataloguesBySubAccount,
  getAllSubCatalogues,
  getSubComponents,
  getSubComponentsByPartId,
  getAllVessels,
  getInventoryItemHeads,
  getInventoryItemSubHeads,
  createPort,
  createPart,
  createSubComponent
} from '../core/_requests'
import {
  RequisitionDisplay,
  Part,
  Port,
  SubcatalogueType,
  CreateRequisitionRequest,
  UpdateRequisitionRequest,
  RequisitionUrgency,
  RequisitionType,
  FileRefDto,
  Requisition,
  RequisitionPageResponse,
  InventoryItem,
  InventoryCategory,
  InventoryItemHead,
  InventoryItemSubHead,
  AccountingAccount,
  SubAccount,
  SubCatalogue,
  SubComponent,
  Vessel,
  CreatePortRequest,
  CreatePartRequest,
  CreateSubComponentRequest
} from '../core/_models'
import { RequisitionAttachmentViewer } from './RequisitionAttachmentViewer'
import { useAuth } from '../../auth'

// ===== Demo-only "extra" fields we won't send to backend =====
type ReqExtraMeta = {
  make?: string
  model?: string
  serialNumber?: string
}


interface AddItemsModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  requisitionId: number
  parts: Part[]
  ports: Port[]
  categories: SubcatalogueType[]
  userRole?: number
  companyGroupAdminId?: number
}

// Line item interface for the form
interface LineItemForm {
  id: string // unique ID for React key
  subcomponentId: string
  quantity: string
  unitOfMeasurement: string
  remarks: string
  make?: string
  model?: string
  serialNumber?: string
  customSubcomponentName?: string // Custom subcomponent name when "Other" is selected
}

const AddItemsModal: FC<AddItemsModalProps> = ({
  visible,
  onClose,
  onSubmit,
  requisitionId,
  parts,
  ports,
  categories,
  userRole = 4,
  companyGroupAdminId,
}) => {
  // Debug logging
  console.log('AddItemsModal props:', {
    visible,
    requisitionId,
    partsCount: parts?.length || 0,
    portsCount: ports?.length || 0,
    categoriesCount: categories?.length || 0,
    userRole,
    companyGroupAdminId
  })

  const [formData, setFormData] = useState({
    title: '',
    justification: '',
    equipmentLink: '',
  })
  const [customPartName, setCustomPartName] = useState('') // Custom part name when "Other" is selected
  const [isCreatingPart, setIsCreatingPart] = useState(false)
  const [createdPartId, setCreatedPartId] = useState<number | null>(null)
  const [isCreatingSubComponent, setIsCreatingSubComponent] = useState(false)
  const [createdSubComponentIds, setCreatedSubComponentIds] = useState<{ [lineItemId: string]: number }>({})
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    {
      id: Date.now().toString(),
      subcomponentId: '',
      quantity: '',
      unitOfMeasurement: 'PCS',
      remarks: '',
      customSubcomponentName: ''
    }
  ])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableSubComponents, setAvailableSubComponents] = useState<SubComponent[]>([])
  const [isLoadingSubComponents, setIsLoadingSubComponents] = useState(false)
  const [currentRequisition, setCurrentRequisition] = useState<Requisition | null>(null)
  const [isLoadingRequisition, setIsLoadingRequisition] = useState(false)
  const [requisitionPartId, setRequisitionPartId] = useState<number | null>(null)
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null)
  const [filteredParts, setFilteredParts] = useState<Part[]>([])
  const [allSubComponents, setAllSubComponents] = useState<SubComponent[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  useEffect(() => {
    if (visible && requisitionId) {
      loadRequisitionData()
      loadAllSubComponents()
    }
  }, [visible, requisitionId])

  useEffect(() => {
    if (visible && parts && parts.length > 0) {
      filterPartsByCompany()
    }
  }, [visible, parts, userRole, companyGroupAdminId, currentRequisition])

  useEffect(() => {
    if (selectedPartId) {
      loadSubComponentsByPart(selectedPartId)
    }
  }, [selectedPartId])

  const loadAllSubComponents = async () => {
    try {
      console.log('Loading all sub components...')
      const subComponents = await getSubComponents()
      console.log('All sub components loaded:', subComponents)
      setAllSubComponents(subComponents)
    } catch (error) {
      console.error('Error loading all sub components:', error)
      setAllSubComponents([])
    }
  }

  const filterPartsByCompany = async () => {
    console.log('Filtering parts. Total parts:', parts.length)
    console.log('User role:', userRole)
    console.log('Company Group Admin ID:', companyGroupAdminId)
    console.log('Current Requisition:', currentRequisition)

    // Get the company ID from the requisition's vessel or category
    let requisitionCompanyId = companyGroupAdminId

    if (currentRequisition) {
      // Try to get cgaid from the requisition's category
      if (currentRequisition.category && (currentRequisition.category as any).cgaid) {
        requisitionCompanyId = (currentRequisition.category as any).cgaid.id || (currentRequisition.category as any).cgaid
        console.log('Using company ID from requisition category:', requisitionCompanyId)
      }
    }

    console.log('Filtering by company ID:', requisitionCompanyId)

    // Filter parts based on company
    if (requisitionCompanyId) {
      try {
        // Get all subcatalogues for the company
        const allSubCatalogues = await getAllSubCatalogues()
        console.log('All subcatalogues:', allSubCatalogues)

        // Filter subcatalogues by company
        const companySubCatalogues = allSubCatalogues.filter(sc => {
          const scCgaId = sc.cgaid?.id || sc.cgaid
          console.log('Subcatalogue:', sc.name, 'cgaid:', scCgaId, 'matches:', scCgaId === requisitionCompanyId)
          return scCgaId === requisitionCompanyId
        })
        console.log('Company subcatalogues:', companySubCatalogues.length, companySubCatalogues)

        // Get subcatalogue IDs
        const companySubCatalogueIds = companySubCatalogues.map(sc => sc.id)
        console.log('Company subcatalogue IDs:', companySubCatalogueIds)

        // Filter parts that belong to company subcatalogues
        const companyParts = parts.filter(part => {
          if (part.subcatalogue) {
            const belongsToCompany = companySubCatalogueIds.includes(part.subcatalogue.id)
            console.log('Part:', part.name, 'subcatalogue:', part.subcatalogue.id, 'belongs to company:', belongsToCompany)
            return belongsToCompany
          }
          return false
        })

        console.log('Filtered parts for company:', companyParts.length, companyParts)
        setFilteredParts(companyParts)
      } catch (error) {
        console.error('Error filtering parts by company:', error)
        // Fallback to showing all parts
        console.log('Fallback: showing all parts')
        setFilteredParts(parts)
      }
    } else {
      // For other roles or if no company ID, show all parts
      console.log('No company ID, showing all parts:', parts.length)
      setFilteredParts(parts)
    }
  }

  const loadRequisitionData = async () => {
    setIsLoadingRequisition(true)
    try {
      console.log('Loading requisition data for ID:', requisitionId)
      const requisition = await getRequisitionById(requisitionId)
      console.log('Requisition loaded:', requisition)
      setCurrentRequisition(requisition)

      setFormData({
        title: requisition.title || '',
        justification: requisition.justification || '',
        equipmentLink: requisition.equipmentLink || ''
      })

      // Get partId from requisition (top-level or from first line item)
      const partId = requisition.partId || (requisition.lines && requisition.lines.length > 0 ? requisition.lines[0].partId : null)
      console.log('Part ID from requisition:', partId)
      console.log('Top-level partId:', requisition.partId)
      console.log('Lines array partId:', requisition.lines?.[0]?.partId)

      if (partId) {
        setRequisitionPartId(partId)
        setSelectedPartId(partId)
        await loadSubComponentsByPart(partId)

        // Pre-fill quantity from requisition if available
        if (requisition.quantity) {
          setLineItems([
            {
              id: Date.now().toString(),
              subcomponentId: '',
              quantity: requisition.quantity?.toString() || '',
              unitOfMeasurement: 'PCS',
              remarks: ''
            }
          ])
        }
      } else {
        console.warn('No part ID found in requisition')
        console.warn('Requisition data:', requisition)
        // Don't close the modal - allow user to select a part
        setSelectedPartId(null)
      }
    } catch (error: any) {
      console.error('Error loading requisition:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load requisition data'
      toast.error(errorMessage)
      onClose()
    } finally {
      setIsLoadingRequisition(false)
    }
  }

  const loadSubComponentsByPart = async (partId: number) => {
    setIsLoadingSubComponents(true)
    try {
      console.log('Loading sub components for part ID:', partId)

      // Use already loaded subcomponents if available
      let subComponentsToFilter = allSubComponents
      if (allSubComponents.length === 0) {
        subComponentsToFilter = await getSubComponents()
        setAllSubComponents(subComponentsToFilter)
      }

      console.log('All sub components received:', subComponentsToFilter)

      // Filter by partId client-side
      const filtered = subComponentsToFilter.filter(sc => sc.part.id === partId)
      console.log('Filtered sub components for part', partId, ':', filtered)

      // Get already added subcomponent IDs from the requisition's lines array
      const addedSubComponentIds = currentRequisition?.lines?.map(line => line.subcomponentId) || []
      console.log('Already added subcomponent IDs:', addedSubComponentIds)

      // Filter out subcomponents that are already added
      const availableForAdding = filtered.filter(sc => !addedSubComponentIds.includes(sc.id))
      console.log('Available subcomponents (excluding already added):', availableForAdding.length)

      setAvailableSubComponents(availableForAdding)
    } catch (error) {
      console.error('Error loading sub components:', error)
      setAvailableSubComponents([])
    } finally {
      setIsLoadingSubComponents(false)
    }
  }

  const handlePartChange = (partId: string) => {
    // Handle "Other" option for custom part
    if (partId === 'other') {
      setSelectedPartId(null)
      setRequisitionPartId(null)
      setAvailableSubComponents([])
      // Clear part-related errors when selecting "Other"
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.partId
        return newErrors
      })
      // Clear auto-filled fields when selecting "Other"
      setLineItems(prev => prev.map(item => ({
        ...item,
        subcomponentId: '',
        customSubcomponentName: '',
        make: '',
        model: '',
        serialNumber: ''
      })))
      return
    }

    const partIdNum = parseInt(partId)
    setSelectedPartId(partIdNum)
    setRequisitionPartId(partIdNum)
    setCustomPartName('') // Clear custom part name when selecting a regular part

    // Find the selected part to get its details
    const selectedPart = parts.find(p => p.id === partIdNum)
    console.log('Selected part:', selectedPart)

    // Auto-fill Make, Model, and Serial Number from the selected part
    if (selectedPart) {
      setLineItems(prev => prev.map(item => ({
        ...item,
        subcomponentId: '', // Clear subcomponent selection
        customSubcomponentName: '', // Clear custom subcomponent name
        make: selectedPart.manufacturer || '', // Use manufacturer as Make
        model: selectedPart.partNo || '', // Use partNo as Model
        serialNumber: selectedPart.serialNumber || '', // Use serialNumber
        unitOfMeasurement: 'PCS' // Reset to default UOM
      })))
      console.log('Auto-filled fields:', {
        make: selectedPart.manufacturer,
        model: selectedPart.partNo,
        serialNumber: selectedPart.serialNumber
      })
    } else {
      // Clear subcomponent selections when part changes
      setLineItems(prev => prev.map(item => ({
        ...item,
        subcomponentId: '',
        customSubcomponentName: '',
        unitOfMeasurement: 'PCS' // Reset to default UOM
      })))
    }

    // Load subcomponents for the new part
    if (partIdNum) {
      loadSubComponentsByPart(partIdNum)
    } else {
      setAvailableSubComponents([])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...filesArray])
      console.log('Files added:', filesArray.length, 'Total files:', selectedFiles.length + filesArray.length)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

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

  const handleLineItemChange = (lineItemId: string, field: keyof LineItemForm, value: string) => {
    setLineItems(prev => prev.map(item =>
      item.id === lineItemId ? { ...item, [field]: value } : item
    ))

    // Clear error for this field
    const errorKey = `${lineItemId}_${field}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const addLineItem = () => {
    // Get the selected part to auto-fill make, model, serialNumber
    const selectedPart = parts.find(p => p.id === selectedPartId)

    setLineItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        subcomponentId: '',
        quantity: '',
        unitOfMeasurement: 'PCS',
        remarks: '',
        customSubcomponentName: '',
        make: selectedPart?.manufacturer || '',
        model: selectedPart?.partNo || '',
        serialNumber: selectedPart?.serialNumber || ''
      }
    ])
  }

  const removeLineItem = (lineItemId: string) => {
    if (lineItems.length === 1) {
      toast.error('At least one line item is required')
      return
    }
    setLineItems(prev => prev.filter(item => item.id !== lineItemId))
  }

  const handleAddPart = async () => {
    if (!customPartName.trim()) {
      toast.error('Please enter a part name')
      return
    }

    setIsCreatingPart(true)
    try {
      console.log('Creating part:', customPartName)

      // For creating a part, we need some required fields
      // Using default values for required fields
      const newPart = await createPart({
        code: `CUSTOM-${Date.now()}`, // Generate a unique code
        name: customPartName.trim(),
        uom: { id: 1 }, // Default UOM (you might want to make this configurable)
        inventoryItemSubHead: { id: 1 }, // Default sub head (you might want to make this configurable)
        manufacturer: 'Custom',
        partNo: `PART-${Date.now()}`,
        serialNumber: undefined
      })

      console.log('Part created successfully:', newPart)
      setCreatedPartId(newPart.id)

      // Update the selected part
      setSelectedPartId(newPart.id)
      setRequisitionPartId(newPart.id)
      setCustomPartName('') // Clear the custom name since we now have a real part

      // Refresh parts list to include the new part
      // Note: You might need to pass a refreshParts function as prop

      toast.success(`Part "${newPart.name}" created successfully!`)
    } catch (error: any) {
      console.error('Error creating part:', error)
      toast.error(`Failed to create part: ${error.message}`)
    } finally {
      setIsCreatingPart(false)
    }
  }

  const handleAddSubComponent = async (lineItemId: string, customSubComponentName: string) => {
    if (!customSubComponentName.trim()) {
      toast.error('Please enter a subcomponent name')
      return
    }

    const finalPartId = selectedPartId || createdPartId
    if (!finalPartId) {
      toast.error('Please select or create a part first')
      return
    }

    setIsCreatingSubComponent(true)
    try {
      console.log('Creating subcomponent:', customSubComponentName, 'for part:', finalPartId)

      const newSubComponent = await createSubComponent({
        part: { id: finalPartId },
        name: customSubComponentName.trim()
      })

      console.log('Subcomponent created successfully:', newSubComponent)

      // Update the line item to use the new subcomponent
      setLineItems(prev => prev.map(item =>
        item.id === lineItemId
          ? { ...item, subcomponentId: newSubComponent.id.toString(), customSubcomponentName: '' }
          : item
      ))

      // Store the created subcomponent ID
      setCreatedSubComponentIds(prev => ({
        ...prev,
        [lineItemId]: newSubComponent.id
      }))

      // Refresh subcomponents list
      if (finalPartId) {
        loadSubComponentsByPart(finalPartId)
      }

      toast.success(`Subcomponent "${newSubComponent.name}" created successfully!`)
    } catch (error: any) {
      console.error('Error creating subcomponent:', error)
      toast.error(`Failed to create subcomponent: ${error.message}`)
    } finally {
      setIsCreatingSubComponent(false)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Validate part selection
    if (selectedPartId === null) {
      // "Other" is selected, validate custom part name or created part
      if (!createdPartId && !customPartName.trim()) {
        newErrors.customPartName = 'Please enter a part name and click "Add Part"'
      } else if (!createdPartId && customPartName.trim()) {
        newErrors.customPartName = 'Please click "Add Part" to create the part before submitting'
      }
    } else if (!selectedPartId) {
      // No part selected at all
      newErrors.partId = 'Part is required'
    }

    // Validate each line item
    lineItems.forEach((item, index) => {
      // Subcomponent is now optional - only validate if "other" is selected
      if (item.subcomponentId === 'other') {
        if (!createdSubComponentIds[item.id] && !item.customSubcomponentName?.trim()) {
          newErrors[`${item.id}_customSubcomponentName`] = 'Please enter a subcomponent name and click "Add Subcomponent"'
        } else if (!createdSubComponentIds[item.id] && item.customSubcomponentName?.trim()) {
          newErrors[`${item.id}_customSubcomponentName`] = 'Please click "Add Subcomponent" to create the subcomponent before submitting'
        }
      }
      if (!item.quantity) newErrors[`${item.id}_quantity`] = 'Quantity is required'
      if (!item.unitOfMeasurement) newErrors[`${item.id}_unitOfMeasurement`] = 'Unit of measurement is required'
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    if (!currentRequisition) {
      toast.error('Requisition data not loaded')
      return
    }

    setIsSubmitting(true)
    try {
      if (!selectedPartId && !createdPartId) {
        toast.error('Please select or create a part')
        return
      }

      // Build new lines array from line items - use created IDs
      const finalPartId = selectedPartId || createdPartId || 0
      const newLines = lineItems.map(item => ({
        partId: finalPartId,
        subcomponentId: item.subcomponentId === 'other'
          ? (createdSubComponentIds[item.id] || 0)
          : item.subcomponentId ? parseInt(item.subcomponentId) : null,
        quantity: parseFloat(item.quantity),
        unitOfMeasurement: item.unitOfMeasurement,
        remarks: item.remarks || undefined
      }))

      // Merge existing lines with new lines to preserve existing subcomponents
      const existingLines = currentRequisition.lines || []
      const mergedLines = [...existingLines, ...newLines]

      // Update the requisition with merged lines
      // IMPORTANT: Preserve all existing fields to prevent data loss
      console.log('=== ADD ITEMS DEBUG ===')
      console.log('Current requisition inventoryItemHeadId:', currentRequisition.inventoryItemHeadId)
      console.log('Current requisition inventoryItemSubHeadId:', currentRequisition.inventoryItemSubHeadId)
      console.log('Current requisition make:', currentRequisition.make)
      console.log('Current requisition model:', currentRequisition.model)
      console.log('Current requisition serialNumber:', currentRequisition.serialNumber)

      const updatePayload: UpdateRequisitionRequest = {
        title: formData.title || currentRequisition.title,
        requisition_code: currentRequisition.requisition_code,
        description: currentRequisition.description,
        type: currentRequisition.type,
        category: currentRequisition.category ? { id: currentRequisition.category.id } : undefined,
        // Explicitly preserve HEAD and SUB HEAD IDs - don't convert to undefined if they exist
        inventoryItemHeadId: currentRequisition.inventoryItemHeadId !== null && currentRequisition.inventoryItemHeadId !== undefined
          ? currentRequisition.inventoryItemHeadId
          : undefined,
        inventoryItemSubHeadId: currentRequisition.inventoryItemSubHeadId !== null && currentRequisition.inventoryItemSubHeadId !== undefined
          ? currentRequisition.inventoryItemSubHeadId
          : undefined,
        make: currentRequisition.make || lineItems[0]?.make || undefined,
        model: currentRequisition.model || lineItems[0]?.model || undefined,
        serialNumber: currentRequisition.serialNumber || lineItems[0]?.serialNumber || undefined,
        vesselId: currentRequisition.vesselId,
        requestedPortId: currentRequisition.requestedPortId,
        customPortName: currentRequisition.customPortName,
        requiredDeliveryDate: currentRequisition.requiredDeliveryDate,
        equipmentId: currentRequisition.equipmentId !== null && currentRequisition.equipmentId !== undefined
          ? currentRequisition.equipmentId
          : undefined,
        subcomponent: currentRequisition.subcomponent || undefined,
        partId: selectedPartId || createdPartId || 0, // Use created part ID if available
        isCompletePartRequired: currentRequisition.isCompletePartRequired || undefined,
        manualItemName: currentRequisition.manualItemName || undefined, // No longer needed since we create real parts
        quantity: currentRequisition.quantity || undefined,
        uom: currentRequisition.uom || undefined,
        estimatedUnitPrice: currentRequisition.estimatedUnitPrice || undefined,
        equipmentLink: formData.equipmentLink || currentRequisition.equipmentLink || undefined,
        justification: formData.justification,
        status: currentRequisition.status,
        lines: mergedLines
      }

      console.log('Update payload inventoryItemHeadId:', updatePayload.inventoryItemHeadId)
      console.log('Update payload inventoryItemSubHeadId:', updatePayload.inventoryItemSubHeadId)
      console.log('Update payload with preserved fields:', updatePayload)
      console.log('Selected files to upload:', selectedFiles.length)
      console.log('=== END DEBUG ===')

      // Pass files to updateRequisition
      await updateRequisition(requisitionId, updatePayload, selectedFiles)

      // Show success message
      const filesMessage = selectedFiles.length > 0 ? ` with ${selectedFiles.length} attachment(s)` : ''
      toast.success(`Items added successfully! ${lineItems.length} line item(s) added to requisition${filesMessage}.`)

      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error adding items:', error)
      toast.error(error.message || 'Failed to add items')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      justification: '',
      equipmentLink: '',
    })
    setLineItems([
      {
        id: Date.now().toString(),
        subcomponentId: '',
        quantity: '',
        unitOfMeasurement: 'PCS',
        remarks: '',
        customSubcomponentName: ''
      }
    ])
    setErrors({})
    setAvailableSubComponents([])
    setRequisitionPartId(null)
    setSelectedPartId(null)
    setFilteredParts([])
    setAllSubComponents([])
    setSelectedFiles([])
    setCustomPartName('')
    setIsCreatingPart(false)
    setCreatedPartId(null)
    setIsCreatingSubComponent(false)
    setCreatedSubComponentIds({})
  }

  const handleClose = () => {
    resetForm()
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
      <div className='modal-dialog modal-dialog-centered modal-lg' role='document' style={{ maxHeight: '95vh', margin: '1.75rem auto' }}>
        <div className='modal-content bg-white' style={{ color: '#181C32', display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
          <div className='modal-header' style={{ flexShrink: 0 }}>
            <div>
              <h5 className='modal-title'>Add Items to Requisition</h5>
              <p className='text-muted mb-0 fs-7'>
                Requisition ID: <strong>{requisitionId}</strong>
                <span className='ms-3'>Status: <span className='badge badge-light-info'>Shore Approved</span></span>
              </p>
            </div>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>



          <div className='modal-body' style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
            <div className='alert alert-info d-flex align-items-center mb-4'>
              <i className='fas fa-info-circle me-2'></i>
              <div>
                <strong>Add Items:</strong> Update this requisition with additional item details.
                You can add multiple subcomponents to this requisition.
              </div>
            </div>

            {isLoadingRequisition ? (
              <div className='text-center py-4'>
                <div className='spinner-border text-primary' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
                <p className='text-muted mt-2'>Loading requisition data...</p>
              </div>
            ) : (
              <>
                {/* Line Items */}
                {lineItems.map((lineItem, index) => (
                  <div key={lineItem.id} className='border rounded p-3 mb-3' style={{ backgroundColor: '#f8f9fa' }}>
                    <div className='d-flex justify-content-between align-items-center mb-3'>
                      <h6 className='fw-bold mb-0' style={{ color: '#181C32' }}>
                        Subcomponent #{index + 1}
                      </h6>
                      {lineItems.length > 1 && (
                        <button
                          type='button'
                          className='btn btn-sm btn-light-danger'
                          onClick={() => removeLineItem(lineItem.id)}
                        >
                          <i className='fas fa-trash'></i> Remove
                        </button>
                      )}
                    </div>

                    <div className='row g-3'>
                      {/* Part Selection Dropdown */}
                      {index === 0 && (
                        <div className='col-md-12'>
                          <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                            Part
                          </label>
                          <select
                            className={`form-select ${errors.partId ? 'is-invalid' : ''}`}
                            value={selectedPartId === null ? 'other' : (selectedPartId || '')}
                            onChange={(e) => handlePartChange(e.target.value)}
                            style={{ color: '#000' }}
                          >
                            <option value=''>Select a part</option>
                            {filteredParts.length > 0 ? (
                              filteredParts.map((part) => (
                                <option key={part.id} value={part.id}>
                                  {part.name} - {part.code} ({part.manufacturer})
                                </option>
                              ))
                            ) : (
                              <option disabled>No parts available</option>
                            )}
                            <option value='other'>Other (Enter custom part name)</option>
                          </select>
                          {errors.partId && <div className='invalid-feedback'>{errors.partId}</div>}

                          {/* Custom Part Name Field - Show when "Other" is selected */}
                          {selectedPartId === null && (
                            <div className='mt-3'>
                              <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                                Custom Part Name
                              </label>
                              <div className='d-flex gap-2'>
                                <input
                                  type='text'
                                  className={`form-control ${errors.customPartName ? 'is-invalid' : ''}`}
                                  value={customPartName}
                                  onChange={(e) => {
                                    setCustomPartName(e.target.value)
                                    // Clear part-related errors when typing custom part name
                                    if (errors.partId || errors.customPartName) {
                                      setErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors.partId
                                        delete newErrors.customPartName
                                        return newErrors
                                      })
                                    }
                                  }}
                                  placeholder='Enter part name'
                                  disabled={isCreatingPart}
                                  style={{ color: '#000' }}
                                />
                                <button
                                  type='button'
                                  className='btn btn-primary'
                                  onClick={handleAddPart}
                                  disabled={isCreatingPart || !customPartName.trim()}
                                  style={{
                                    minWidth: '100px',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {isCreatingPart ? (
                                    <>
                                      <span className='spinner-border spinner-border-sm me-2' role='status'></span>
                                      Adding...
                                    </>
                                  ) : (
                                    'Add Part'
                                  )}
                                </button>
                              </div>
                              {errors.customPartName && <div className='invalid-feedback d-block'>{errors.customPartName}</div>}
                              {createdPartId && (
                                <div className='alert alert-success mt-2 mb-0'>
                                  <i className='fas fa-check-circle me-2'></i>
                                  Part created successfully! You can now add subcomponents.
                                </div>
                              )}
                            </div>
                          )}

                          {filteredParts.length === 0 && (
                            <small className='text-muted mt-1 d-block'>
                              Loading parts... (Total parts: {parts.length}, Filtered: {filteredParts.length})
                            </small>
                          )}
                          {selectedPartId && (() => {
                            const selectedPart = parts.find(p => p.id === selectedPartId)
                            return selectedPart ? (
                              <div className='alert alert-light border d-flex align-items-center mt-2 mb-0'>
                                <i className='fas fa-info-circle me-2 text-info'></i>
                                <small className='text-muted mb-0'>
                                  Code: {selectedPart.code} | Manufacturer: {selectedPart.manufacturer} | Part No: {selectedPart.partNo}
                                </small>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}

                      {/* Subcomponent Selection */}
                      <div className='col-md-12'>
                        <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                          Subcomponent
                        </label>
                        <select
                          className={`form-select ${errors[`${lineItem.id}_subcomponentId`] ? 'is-invalid' : ''}`}
                          value={lineItem.subcomponentId}
                          onChange={(e) => handleLineItemChange(lineItem.id, 'subcomponentId', e.target.value)}
                          disabled={isLoadingSubComponents}
                          style={{ color: '#000' }}
                        >
                          <option value=''>
                            {isLoadingSubComponents ? 'Loading subcomponents...' : 'Select a subcomponent'}
                          </option>
                          {availableSubComponents.map((subComp) => (
                            <option key={subComp.id} value={subComp.id}>
                              {subComp.name}
                            </option>
                          ))}
                          <option value='other'>Other (Enter custom subcomponent name)</option>
                        </select>
                        {errors[`${lineItem.id}_subcomponentId`] && (
                          <div className='invalid-feedback'>{errors[`${lineItem.id}_subcomponentId`]}</div>
                        )}

                        {/* Custom Subcomponent Name Field - Show when "Other" is selected */}
                        {lineItem.subcomponentId === 'other' && (
                          <div className='mt-3'>
                            <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                              Custom Subcomponent Name
                            </label>
                            <div className='d-flex gap-2'>
                              <input
                                type='text'
                                className={`form-control ${errors[`${lineItem.id}_customSubcomponentName`] ? 'is-invalid' : ''}`}
                                value={lineItem.customSubcomponentName || ''}
                                onChange={(e) => handleLineItemChange(lineItem.id, 'customSubcomponentName', e.target.value)}
                                placeholder='Enter subcomponent name'
                                disabled={isCreatingSubComponent}
                                style={{ color: '#000' }}
                              />
                              <button
                                type='button'
                                className='btn btn-primary'
                                onClick={() => handleAddSubComponent(lineItem.id, lineItem.customSubcomponentName || '')}
                                disabled={isCreatingSubComponent || !lineItem.customSubcomponentName?.trim()}
                                style={{
                                  minWidth: '140px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {isCreatingSubComponent ? (
                                  <>
                                    <span className='spinner-border spinner-border-sm me-2' role='status'></span>
                                    Adding...
                                  </>
                                ) : (
                                  'Add Subcomponent'
                                )}
                              </button>
                            </div>
                            {errors[`${lineItem.id}_customSubcomponentName`] && (
                              <div className='invalid-feedback d-block'>{errors[`${lineItem.id}_customSubcomponentName`]}</div>
                            )}
                            {createdSubComponentIds[lineItem.id] && (
                              <div className='alert alert-success mt-2 mb-0'>
                                <i className='fas fa-check-circle me-2'></i>
                                Subcomponent created successfully!
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className='col-md-6'>
                        <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                          Quantity
                        </label>
                        <input
                          type='number'
                          className={`form-control ${errors[`${lineItem.id}_quantity`] ? 'is-invalid' : ''}`}
                          value={lineItem.quantity}
                          onChange={(e) => handleLineItemChange(lineItem.id, 'quantity', e.target.value)}
                          placeholder='e.g., 10'
                          style={{ color: '#000' }}
                        />
                        {errors[`${lineItem.id}_quantity`] && (
                          <div className='invalid-feedback'>{errors[`${lineItem.id}_quantity`]}</div>
                        )}
                      </div>

                      {/* Unit of Measurement */}
                      <div className='col-md-6'>
                        <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                          Unit of Measurement
                        </label>
                        <select
                          className={`form-select ${errors[`${lineItem.id}_unitOfMeasurement`] ? 'is-invalid' : ''}`}
                          value={lineItem.unitOfMeasurement}
                          onChange={(e) => handleLineItemChange(lineItem.id, 'unitOfMeasurement', e.target.value)}
                          style={{ color: '#000' }}
                        >
                          <option value='PCS'>PCS (Pieces)</option>
                          <option value='KG'>KG (Kilograms)</option>
                          <option value='LTR'>LTR (Liters)</option>
                          <option value='MTR'>MTR (Meters)</option>
                          <option value='SET'>SET (Sets)</option>
                          <option value='BOX'>BOX (Boxes)</option>
                          <option value='PKT'>PKT (Packets)</option>
                          <option value='ROLL'>ROLL (Rolls)</option>
                          <option value='PAIR'>PAIR (Pairs)</option>
                          <option value='BOTTLE'>BOTTLE (Bottles)</option>
                        </select>
                        {errors[`${lineItem.id}_unitOfMeasurement`] && (
                          <div className='invalid-feedback'>{errors[`${lineItem.id}_unitOfMeasurement`]}</div>
                        )}
                      </div>

                      {/* Make */}
                      <div className='col-md-4'>
                        <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                          Make
                        </label>
                        <input
                          type='text'
                          className='form-control'
                          value={lineItem.make || ''}
                          onChange={(e) => handleLineItemChange(lineItem.id, 'make' as any, e.target.value)}
                          placeholder='e.g., MAN, Wartsila'
                          style={{ color: '#000' }}
                        />
                      </div>

                      {/* Model */}
                      <div className='col-md-4'>
                        <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                          Model
                        </label>
                        <input
                          type='text'
                          className='form-control'
                          value={lineItem.model || ''}
                          onChange={(e) => handleLineItemChange(lineItem.id, 'model' as any, e.target.value)}
                          placeholder='e.g., 6L20'
                          style={{ color: '#000' }}
                        />
                      </div>

                      {/* Serial Number */}
                      <div className='col-md-4'>
                        <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                          Serial Number
                        </label>
                        <input
                          type='text'
                          className='form-control'
                          value={lineItem.serialNumber || ''}
                          onChange={(e) => handleLineItemChange(lineItem.id, 'serialNumber' as any, e.target.value)}
                          placeholder='e.g., SN-12345'
                          style={{ color: '#000' }}
                        />
                      </div>

                      {/* Remarks */}
                      <div className='col-md-12'>
                        <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                          Remarks
                        </label>
                        <input
                          type='text'
                          className='form-control'
                          value={lineItem.remarks}
                          onChange={(e) => handleLineItemChange(lineItem.id, 'remarks', e.target.value)}
                          placeholder='e.g., Qty increased as per tech'
                          style={{ color: '#000' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add More Buttons */}
                <div className='mb-3'>
                  <div className='row g-2'>
                    <div className='col-md-6'>
                      <button
                        type='button'
                        className='btn btn-light-primary w-100'
                        onClick={addLineItem}
                      >
                        <i className='fas fa-plus me-2'></i>
                        Add More Subcomponents
                      </button>
                    </div>
                    <div className='col-md-6'>
                      <button
                        type='button'
                        className='btn btn-light-success w-100'
                        onClick={addLineItem}
                        title='Add another line item for the same part'
                      >
                        <i className='fas fa-plus me-2'></i>
                        Add More Parts
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className='border-top pt-3 mt-3'>
                  <h6 className='fw-bold mb-3' style={{ color: '#181C32' }}>Additional Information</h6>

                  <div className='row g-3'>
                    <div className='col-md-12'>
                      <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                        Equipment Link/Reference
                      </label>
                      <input
                        type='text'
                        className='form-control'
                        name='equipmentLink'
                        value={formData.equipmentLink}
                        onChange={handleInputChange}
                        placeholder='Link to related equipment or system'
                        style={{ color: '#000' }}
                      />
                    </div>

                    <div className='col-md-12'>
                      <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                        Justification
                      </label>
                      <textarea
                        className={`form-control ${errors.justification ? 'is-invalid' : ''}`}
                        name='justification'
                        value={formData.justification}
                        onChange={handleInputChange}
                        placeholder='e.g., Adjusted based on superintendent review'
                        rows={3}
                        style={{ color: '#000' }}
                      />
                      {errors.justification && <div className='invalid-feedback'>{errors.justification}</div>}
                    </div>

                    <div className='col-12'>
                      <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Attachments</label>
                      <div
                        className='border rounded p-5 text-center'
                        style={{
                          borderStyle: 'dashed',
                          borderColor: '#E4E6EF',
                          backgroundColor: '#F9F9F9',
                          cursor: 'pointer'
                        }}
                        onClick={() => document.getElementById('addItemsFileInput')?.click()}
                      >
                        <input
                          type='file'
                          id='addItemsFileInput'
                          multiple
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                          accept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
                        />
                        <div className='mb-2'>
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A1A5B7" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </div>
                        <p className='text-muted mb-1'>Drag and drop files here, or click to browse</p>
                        <p className='text-muted fs-7 mb-0'>Support for images, PDF, and documents</p>
                      </div>

                      {/* Display selected files */}
                      {selectedFiles.length > 0 && (
                        <div className='mt-3'>
                          <p className='fw-semibold mb-2' style={{ color: '#181C32' }}>Selected Files ({selectedFiles.length}):</p>
                          <div className='list-group'>
                            {selectedFiles.map((file, index) => (
                              <div key={index} className='list-group-item d-flex justify-content-between align-items-center'>
                                <div className='d-flex align-items-center'>
                                  <i className='fas fa-file me-2 text-primary'></i>
                                  <div>
                                    <div className='fw-semibold'>{file.name}</div>
                                    <small className='text-muted'>{(file.size / 1024).toFixed(2)} KB</small>
                                  </div>
                                </div>
                                <button
                                  type='button'
                                  className='btn btn-sm btn-light-danger'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeFile(index)
                                  }}
                                >
                                  <i className='fas fa-times'></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
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
              {isSubmitting ? 'Adding...' : 'Add Items'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
// END OF AddItemsModal COMPONENT

interface CreateRequisitionModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: () => void
  vesselId: number | null
  parts: Part[]
  ports: Port[]
  setPorts: (ports: Port[]) => void
  categories: SubcatalogueType[]
  /** NEW: let parent store demo-only fields by requisition code */
  onSaveExtras?: (code: string, extras: ReqExtraMeta) => void
  inventoryItems?: InventoryItem[]
}

const CreateRequisitionModal: FC<CreateRequisitionModalProps> = ({
  visible,
  onClose,
  onSubmit,
  vesselId: propVesselId,
  parts,
  ports,
  setPorts,
  categories,
  onSaveExtras, // NEW
  inventoryItems = [],
}) => {
  const { currentUser } = useAuth()
  const userRoleId = currentUser?.role?.id || 4
  const isSuperadmin = userRoleId === 1

  // For superadmin, allow vessel selection; otherwise use the prop
  const [selectedVesselId, setSelectedVesselId] = useState<number>(propVesselId || 1)
  const [availableVessels, setAvailableVessels] = useState<Vessel[]>([])

  const [formData, setFormData] = useState({
    // NOTE: title will be auto-filled with requisitionCode and disabled
    title: '',
    description: '',
    // "Category" dropdown will now drive 'type' (Stores/Spare parts/Services)
    type: 'STORES' as any, // Will be mapped to urgency
    // "Type (Urgency)" dropdown will set urgency via days mapping
    urgency: 'MEDIUM' as RequisitionUrgency,
    requestedPortId: '',
    customPortName: '', // NEW: Custom port name when "Other" is selected
    requiredDeliveryDate: '',
    // categoryId is the actual inventory category from API
    categoryId: '',
    headId: '', // NEW: Head dropdown
    subHeadId: '', // NEW: Sub Head dropdown
    partId: '', // Add partId field for part selection
    subComponentId: '',
    itemName: '',
    quantity: '',
    uom: 'PCS',
    estimatedUnitPrice: '',
    equipmentLink: '',
    justification: '',

    // NEW demo-only fields not sent to API:
    make: '',
    model: '',
    serialNumber: '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requisitionCode, setRequisitionCode] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isCreatingPort, setIsCreatingPort] = useState(false)
  const [createdPortId, setCreatedPortId] = useState<number | null>(null)

  // State for inventory-related data from API
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([])
  const [inventoryItemHeads, setInventoryItemHeads] = useState<InventoryItemHead[]>([])
  const [inventoryItemSubHeads, setInventoryItemSubHeads] = useState<InventoryItemSubHead[]>([])
  const [filteredHeads, setFilteredHeads] = useState<InventoryItemHead[]>([])
  const [filteredSubHeads, setFilteredSubHeads] = useState<InventoryItemSubHead[]>([])
  const [accountingAccounts, setAccountingAccounts] = useState<AccountingAccount[]>([])
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([])
  const [subCatalogues, setSubCatalogues] = useState<SubCatalogue[]>([])
  const [filteredAccountingCodes, setFilteredAccountingCodes] = useState<AccountingAccount[]>([])
  const [filteredSubAccounts, setFilteredSubAccounts] = useState<SubAccount[]>([])
  const [filteredSubCatalogues, setFilteredSubCatalogues] = useState<SubCatalogue[]>([])
  const [filteredParts, setFilteredParts] = useState<Part[]>([])
  const [filteredSubComponents, setFilteredSubComponents] = useState<SubComponent[]>([])
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isLoadingSubCatalogues, setIsLoadingSubCatalogues] = useState(false)

  useEffect(() => {
    if (visible) {
      loadNextCode()
      resetForm()
      loadInventoryData()
      // Load all vessels for superadmin
      if (isSuperadmin) {
        loadAllVessels()
      }
    }
  }, [visible])

  // Reload categories when vessel selection changes (for superadmin)
  useEffect(() => {
    if (visible && isSuperadmin && selectedVesselId) {
      console.log('Vessel selection changed, reloading categories for vessel ID:', selectedVesselId)
      loadInventoryDataForVessel(selectedVesselId)
    }
  }, [selectedVesselId, visible, isSuperadmin])

  const loadAllVessels = async () => {
    try {
      const vessels = await getAllVessels()
      setAvailableVessels(vessels)
      // Set first vessel as default if no vessel is selected
      if (vessels.length > 0 && !selectedVesselId) {
        setSelectedVesselId(vessels[0].id)
      }
    } catch (error) {
      console.error('Error loading vessels:', error)
      toast.error('Failed to load vessels. Please try again.')
    }
  }

  useEffect(() => {
    console.log('inventoryCategories state changed:', inventoryCategories)
    console.log('inventoryCategories length:', inventoryCategories.length)
  }, [inventoryCategories])

  useEffect(() => {
    console.log('ðŸ” filteredAccountingCodes state changed:', filteredAccountingCodes)
    console.log('ðŸ” filteredAccountingCodes length:', filteredAccountingCodes.length)
  }, [filteredAccountingCodes])

  useEffect(() => {
    console.log('ðŸ” filteredParts state changed:', filteredParts)
    console.log('ðŸ” filteredParts length:', filteredParts.length)
  }, [filteredParts])

  const loadInventoryData = async () => {
    setIsLoadingCategories(true)
    try {
      // Calculate cgaId EXACTLY like Inventory List Category tab
      const roleId = currentUser?.role?.id
      const roleEntityId = currentUser?.roleEntityId
      const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null
      const vesselType = (currentUser as any)?.vessel?.vesselType ?? null

      const isOperator = roleId === 6
      const isCompanyOperator = isOperator && companyGroupAdminId != null
      const actsAsCga = roleId === 5 || isCompanyOperator
      const actsAsSuperadmin = roleId === 1

      const effectiveCgaId = actsAsCga
        ? companyGroupAdminId
        : roleId === 2
          ? roleEntityId
          : roleId === 3
            ? (currentUser as any)?.companyAdmin?.cgaid?.id ?? null
            : roleId === 4
              ? (currentUser as any)?.vessel?.companyGroupAdminId ?? null
              : null

      const cgaId = effectiveCgaId || 1

      console.log('=== Loading Categories ===')
      console.log('Current User:', currentUser)
      console.log('Role ID:', roleId)
      console.log('Effective CGA ID:', effectiveCgaId)
      console.log('Final cgaId:', cgaId)
      console.log('Vessel Type:', vesselType)
      console.log('Acts as Superadmin:', actsAsSuperadmin)

      // Load categories based on role
      let categoriesData: InventoryCategory[] = []

      if (actsAsSuperadmin) {
        console.log('Loading categories for all companies (superadmin)')
        categoriesData = await getAllInventoryCategoriesForAllCompanies()
      } else if (roleId === 4) {
        // For role 4 (Chief Officer/Master), load categories filtered by vessel type
        if (!effectiveCgaId) {
          console.error('âŒ Role 4 user has no company group admin assigned to their vessel')
          toast.error('Your vessel is not assigned to a company. Please contact your administrator.')
          setInventoryCategories([])
          setIsLoadingCategories(false)
          return
        }
        if (vesselType) {
          console.log('Loading categories for role 4 with cgaId:', effectiveCgaId, 'and vesselType:', vesselType)
          categoriesData = await getInventoryCategoriesByVesselType(effectiveCgaId, vesselType)
        } else {
          console.log('Loading categories for role 4 with cgaId (no vessel type filter):', effectiveCgaId)
          categoriesData = await getAllInventoryCategoriesForCompany(effectiveCgaId)
        }
      } else {
        console.log('Loading categories for company with cgaId:', cgaId)
        categoriesData = await getAllInventoryCategoriesForCompany(cgaId)
      }

      console.log('âœ“ Categories loaded:', categoriesData.length, 'categories')
      console.log('Categories data:', categoriesData)
      console.log('Setting inventoryCategories state with:', categoriesData)
      setInventoryCategories(categoriesData)
      console.log('inventoryCategories state should now be updated')

      // Load accounting codes and sub accounts from API
      console.log('Loading accounting accounts and sub accounts...')
      // Load ALL accounting accounts (we'll filter them client-side when category is selected)
      const accountingData = await getAllAccountingAccounts()
      const subAccountsData = await getAllSubAccounts()

      console.log('âœ“ Loaded accounting accounts:', accountingData.length)
      console.log('Accounting accounts data:', accountingData)
      console.log('âœ“ Loaded sub accounts:', subAccountsData.length)

      setAccountingAccounts(accountingData)
      setSubAccounts(subAccountsData)

      // Load heads and sub heads
      console.log('Loading inventory item heads and sub heads...')
      const headsData = await getInventoryItemHeads()
      const subHeadsData = await getInventoryItemSubHeads()
      console.log('âœ“ Loaded heads:', headsData.length)
      console.log('âœ“ Loaded sub heads:', subHeadsData.length)
      setInventoryItemHeads(headsData)
      setInventoryItemSubHeads(subHeadsData)

      console.log('=== Inventory Data Loading Complete ===')
    } catch (error) {
      console.error('âŒ Error loading inventory data:', error)
      console.error('Error details:', error)
      setInventoryCategories([])
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const loadInventoryDataForVessel = async (vesselId: number) => {
    setIsLoadingCategories(true)
    try {
      // Find the selected vessel to get its type and company
      const selectedVessel = availableVessels.find(v => v.id === vesselId)
      if (!selectedVessel) {
        console.error('Selected vessel not found:', vesselId)
        setInventoryCategories([])
        setIsLoadingCategories(false)
        return
      }

      const vesselType = selectedVessel.vesselType
      const cgaId = selectedVessel.companyGroupAdmin?.id || selectedVessel.companyGroupAdminId || 1

      console.log('=== Loading Categories for Selected Vessel ===')
      console.log('Selected Vessel:', selectedVessel)
      console.log('Vessel Type:', vesselType)
      console.log('Company Group Admin ID:', cgaId)

      // Load categories filtered by vessel type
      let categoriesData: InventoryCategory[] = []

      if (vesselType && cgaId) {
        console.log('Loading categories with vesselType filter:', vesselType, 'for cgaId:', cgaId)
        categoriesData = await getInventoryCategoriesByVesselType(cgaId, vesselType)
      } else {
        console.log('Loading all categories for cgaId:', cgaId)
        categoriesData = await getAllInventoryCategoriesForCompany(cgaId)
      }

      console.log('✓ Categories loaded for vessel:', categoriesData.length, 'categories')
      setInventoryCategories(categoriesData)

      // Reset form fields that depend on categories
      setFormData(prev => ({
        ...prev,
        categoryId: '',
        headId: '',
        subHeadId: ''
      }))

      console.log('=== Vessel-specific Category Loading Complete ===')
    } catch (error) {
      console.error('⚠ Error loading categories for vessel:', error)
      setInventoryCategories([])
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const loadSubCatalogues = async (subAccountId: number) => {
    setIsLoadingSubCatalogues(true)
    try {
      console.log('Loading sub catalogues for sub account ID:', subAccountId)
      const selectedCategory = inventoryCategories.find(cat => cat.id === parseInt(formData.categoryId))
      const vesselTypeString = typeof selectedCategory?.vesselType === 'string'
        ? selectedCategory.vesselType
        : selectedCategory?.vesselType?.fleet_name

      const subCataloguesData = await getSubCataloguesBySubAccount(subAccountId, vesselTypeString)
      console.log('âœ“ Loaded sub catalogues:', subCataloguesData.length)
      setFilteredSubCatalogues(subCataloguesData)
    } catch (error) {
      console.error('âŒ Error loading sub catalogues:', error)
      setFilteredSubCatalogues([])
    } finally {
      setIsLoadingSubCatalogues(false)
    }
  }

  const loadSubComponentsByPart = async (partId: number) => {
    try {
      console.log('Loading sub components for part ID:', partId)
      const allSubComponents = await getSubComponents()
      const filteredSubComponents = allSubComponents.filter(sc => sc.part.id === partId)
      console.log('âœ“ Loaded sub components:', filteredSubComponents.length)
      setFilteredSubComponents(filteredSubComponents)
    } catch (error) {
      console.error('âŒ Error loading sub components:', error)
      setFilteredSubComponents([])
    }
  }

  const loadNextCode = async () => {
    try {
      // Test API connectivity first
      const isAPIReachable = await testRequisitionAPI()
      if (!isAPIReachable) {
        console.warn('API not reachable, using fallback code generation')
      }

      const nextCode = await getNextRequisitionCode()
      setRequisitionCode(nextCode)
      // keep Title locked to code for demo
      setFormData(prev => ({ ...prev, title: nextCode }))
    } catch (error) {
      console.error('Error loading next code:', error)
      // Fallback code generation
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
      const fallbackCode = `REQ-${timestamp}-${randomNum}`
      setRequisitionCode(fallbackCode)
      setFormData(prev => ({ ...prev, title: fallbackCode }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Cascading dropdown logic: Category -> Head -> Sub Head -> Accounting Code -> Sub Accounting Code -> Part
    if (name === 'categoryId') {
      // When inventory category changes, filter heads that belong to this category
      console.log('=== Category Changed ===')
      console.log('Selected Category ID:', value)

      const selectedCategory = inventoryCategories.find(cat => cat.id === parseInt(value))
      console.log('Selected Category:', selectedCategory)

      // Filter heads that belong to this category
      const headsForCategory = inventoryItemHeads.filter(head =>
        head.inventoryItemCategoryId === parseInt(value)
      )
      console.log('ðŸ“Š Filtered Heads for Category:', headsForCategory.length)
      setFilteredHeads(headsForCategory)

      // Reset dependent fields
      setFormData(prev => ({
        ...prev,
        [name]: value,
        headId: '',
        subHeadId: '',
        partId: '',
        subComponentId: ''
      }))
      setFilteredSubHeads([])
      setFilteredParts([])
      setFilteredSubComponents([])
      return
    }

    if (name === 'headId') {
      // When head changes, filter sub heads that belong to this head
      console.log('=== Head Changed ===')
      console.log('Selected Head ID:', value)

      const subHeadsForHead = inventoryItemSubHeads.filter(subHead =>
        subHead.inventoryItemHeadId === parseInt(value)
      )
      console.log('ðŸ“Š Filtered Sub Heads for Head:', subHeadsForHead.length)
      setFilteredSubHeads(subHeadsForHead)

      // Reset dependent fields
      setFormData(prev => ({
        ...prev,
        [name]: value,
        subHeadId: '',
        partId: '',
        subComponentId: ''
      }))
      setFilteredParts([])
      setFilteredSubComponents([])
      return
    }

    if (name === 'subHeadId') {
      // When sub head changes, just update the form
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    } else if (name === 'subCatalogueId') {
      // When sub catalogue changes, filter parts by sub catalogue ID
      console.log('=== Sub Catalogue Changed ===')
      console.log('Selected Sub Catalogue ID:', value)

      if (value) {
        // Filter parts that belong to this sub catalogue
        const subCatalogueId = parseInt(value)
        const partsForSubCatalogue = parts.filter(part =>
          part.subcatalogue?.id === subCatalogueId
        )
        console.log('ðŸ“Š Filtered parts for sub catalogue:', partsForSubCatalogue.length)
        setFilteredParts(partsForSubCatalogue)
      } else {
        // Reset to category-filtered parts
        const selectedCategory = inventoryCategories.find(cat => cat.id === parseInt(formData.categoryId))
        const selectedCategoryVesselType = selectedCategory?.vesselType
        const vesselTypeString = typeof selectedCategoryVesselType === 'string'
          ? selectedCategoryVesselType
          : selectedCategoryVesselType?.fleet_name

        const partsForCategory = parts.filter(part => {
          const partCategoryId = part.subcatalogue?.subCatalogueType?.id
          const matchesByCategoryId = partCategoryId === parseInt(formData.categoryId)
          const partVesselType = part.subcatalogue?.vesselType
          const matchesByVesselType = partVesselType === vesselTypeString
          return matchesByCategoryId || matchesByVesselType
        })
        setFilteredParts(partsForCategory)
      }

      setFormData(prev => ({
        ...prev,
        [name]: value,
        partId: '',
        itemName: ''
      }))

    } else if (name === 'partId' && value) {
      // When part is selected, auto-fill remaining fields and load sub components
      const selectedPart = filteredParts.find(part => part.id === parseInt(value)) ||
        parts.find(part => part.id === parseInt(value))
      const inventoryItem = inventoryItems.find(item => item.partId === parseInt(value))

      console.log('ðŸ” Part selected:', selectedPart)
      console.log('ðŸ” Part UOM object:', selectedPart?.uom)

      // Load sub components for this part
      loadSubComponentsByPart(parseInt(value))

      if (selectedPart) {
        // Auto-fill fields from Part data
        // Priority: Part data > Inventory data > defaults
        // Check multiple possible UOM formats from API
        const autoFilledUom = selectedPart.uom?.code ||
          selectedPart.uom?.symbol ||
          selectedPart.uom?.name ||
          (typeof selectedPart.uom === 'string' ? selectedPart.uom : null) ||
          'PCS'
        const autoFilledSerialNumber = selectedPart.serialNumber || inventoryItem?.serialNumber || ''
        const autoFilledMake = selectedPart.manufacturer || ''

        console.log('âœ“ Auto-filled UOM:', autoFilledUom)
        console.log('âœ“ Auto-filled Make:', autoFilledMake)
        console.log('âœ“ Auto-filled Serial Number:', autoFilledSerialNumber)

        setFormData(prev => ({
          ...prev,
          [name]: value,
          itemName: selectedPart.name,
          uom: autoFilledUom,
          make: autoFilledMake,
          model: selectedPart.partNo || '',
          serialNumber: autoFilledSerialNumber,
          subComponentId: ''
        }))

        setSelectedInventoryItem(inventoryItem || null)
      } else {
        console.warn('âš ï¸ Part not found for ID:', value)
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setSelectedFiles(prev => [...prev, ...filesArray])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddPort = async () => {
    if (!formData.customPortName.trim()) {
      toast.error('Please enter a port name')
      return
    }

    setIsCreatingPort(true)
    try {
      console.log('Creating port:', formData.customPortName)
      const newPort = await createPort({
        name: formData.customPortName.trim(),
        main_port: formData.customPortName.trim()
      })

      console.log('Port created successfully:', newPort)
      setCreatedPortId(newPort.id)

      // Update the form to use the new port
      setFormData(prev => ({
        ...prev,
        requestedPortId: newPort.id.toString(),
        customPortName: '' // Clear the custom name since we now have a real port
      }))

      // Refresh ports list to include the new port
      const updatedPorts = await getPorts()
      setPorts(updatedPorts)

      toast.success(`Port "${newPort.name}" created successfully!`)
    } catch (error: any) {
      console.error('Error creating port:', error)
      toast.error(`Failed to create port: ${error.message}`)
    } finally {
      setIsCreatingPort(false)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Validate required fields
    if (!formData.categoryId) newErrors.categoryId = 'Category is required'
    if (!formData.headId) newErrors.headId = 'Head is required'
    if (!formData.subHeadId) newErrors.subHeadId = 'Sub Head is required'

    // Port validation: either select a port or create a custom port
    if (!formData.requestedPortId) {
      newErrors.requestedPortId = 'Requested Port is required'
    } else if (formData.requestedPortId === 'other') {
      if (!createdPortId && !formData.customPortName.trim()) {
        newErrors.customPortName = 'Please enter a port name and click "Add Port"'
      } else if (!createdPortId && formData.customPortName.trim()) {
        newErrors.customPortName = 'Please click "Add Port" to create the port before submitting'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      console.log('Available parts:', parts.length, parts.map(p => ({ id: p.id, name: p.name })))
      const selectedPartId = formData.partId ? parseInt(formData.partId) : (parts.length > 0 ? parts[0].id : 1)
      const selectedCategoryId = formData.categoryId ? parseInt(formData.categoryId) : 2

      console.log('Selected partId:', selectedPartId)
      console.log('Selected categoryId:', selectedCategoryId)

      const payload: CreateRequisitionRequest = {
        title: formData.title || requisitionCode,
        requisition_code: requisitionCode,
        description: formData.description || 'N/A',
        type: formData.urgency, // API expects urgency level in type field
        category: { id: selectedCategoryId }, // Use selected category ID as object
        inventoryItemHeadId: formData.headId ? parseInt(formData.headId) : null,
        inventoryItemSubHeadId: formData.subHeadId ? parseInt(formData.subHeadId) : null,
        make: formData.make || undefined,
        model: formData.model || undefined,
        serialNumber: formData.serialNumber || undefined,
        vesselId: selectedVesselId,
        requestedPortId: formData.requestedPortId === 'other' ? (createdPortId || 0) : parseInt(formData.requestedPortId),
        customPortName: undefined, // No longer needed since we create real ports
        requiredDeliveryDate: formData.requiredDeliveryDate || new Date().toISOString().split('T')[0],
        partId: formData.partId ? selectedPartId : null,
        subcomponent: formData.subComponentId ? { id: parseInt(formData.subComponentId) } : null,
        isCompletePartRequired: false,
        quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        uom: formData.uom || undefined,
        estimatedUnitPrice: formData.estimatedUnitPrice ? parseFloat(formData.estimatedUnitPrice) : null,
        equipmentLink: formData.equipmentLink || null,
        justification: formData.justification || 'N/A',
        status: 'DRAFT'
      }

      console.log('ðŸš€ Creating requisition with payload:', JSON.stringify(payload, null, 2))
      console.log('ðŸš€ Selected Vessel ID:', selectedVesselId)
      console.log('ðŸš€ Is Superadmin:', isSuperadmin)
      console.log('ðŸš€ Selected Files:', selectedFiles.length)

      // Pass files directly to createRequisition
      const result = await createRequisition(payload, selectedFiles)
      console.log('âœ… Requisition created successfully:', result)
      console.log('âœ… Created requisition ID:', result.id)
      console.log('âœ… Created requisition vesselId:', result.vesselId)

      // Update the requisition with lines array so subcomponent appears in table
      if (formData.subComponentId) {
        console.log('Adding subcomponent to lines array...')
        const updatePayload: UpdateRequisitionRequest = {
          title: formData.title || requisitionCode,
          partId: selectedPartId,
          lines: [
            {
              partId: selectedPartId,
              subcomponentId: parseInt(formData.subComponentId),
              quantity: formData.quantity ? parseFloat(formData.quantity) : 1,
              estimatedUnitPrice: formData.estimatedUnitPrice ? parseFloat(formData.estimatedUnitPrice) : 0,
              remarks: formData.justification || undefined
            }
          ]
        }

        console.log('Update payload with lines:', JSON.stringify(updatePayload, null, 2))
        await updateRequisition(result.id, updatePayload)
        console.log('âœ“ Subcomponent added to lines array successfully')
      }

      // Also save to extras for backward compatibility
      onSaveExtras?.(requisitionCode, {
        make: formData.make || '',
        model: formData.model || '',
        serialNumber: formData.serialNumber || '',
      })

      toast.success('Requisition created successfully!')
      onSubmit()
      handleClose()
    } catch (error: any) {
      console.error('Error creating requisition:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))

      let errorMessage = 'Failed to create requisition'

      if (error.message.includes('Cannot connect to API server')) {
        errorMessage = 'Cannot connect to API server. Please check your internet connection and try again.'
      } else if (error.message.includes('Method not allowed')) {
        errorMessage = 'The API does not support creating requisitions. Please contact your administrator.'
      } else if (error.message.includes('API endpoint not found')) {
        errorMessage = 'API endpoint not found. Please check the server configuration.'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }

      toast.error(`Error: ${errorMessage}. Please check the browser console for more details.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: requisitionCode || '',
      description: '',
      type: 'STORES' as any,
      urgency: 'MEDIUM',
      requestedPortId: '',
      customPortName: '', // Reset custom port name
      requiredDeliveryDate: '',
      categoryId: '',
      headId: '',
      subHeadId: '',
      partId: '', // Reset partId
      subComponentId: '',
      itemName: '',
      quantity: '',
      uom: 'PCS',
      estimatedUnitPrice: '',
      equipmentLink: '',
      justification: '',
      make: '',
      model: '',
      serialNumber: '',
    })
    setErrors({})
    setSelectedFiles([])
    setFilteredHeads([])
    setFilteredSubHeads([])
    setFilteredSubCatalogues([])
    setFilteredSubComponents([])
    setIsCreatingPort(false)
    setCreatedPortId(null)
  }


  const handleClose = () => {
    resetForm()
    onClose()
  }

  const mapDaysToUrgency = (days: string): RequisitionUrgency => {
    // "90 days (Normal)" â†’ LOW, "15 days (Medium)" â†’ MEDIUM, "0 Days (Urgent)" â†’ HIGH
    if (days === '0') return 'HIGH'
    if (days === '15') return 'MEDIUM'
    return 'LOW' // default 90
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
            <div>
              <h5 className='modal-title'>Create New Requisition</h5>
              <p className='text-muted mb-0 fs-7'>Requisition Code: <strong>{requisitionCode}</strong></p>
            </div>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <div className='modal-body' style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
            <div className='row g-3'>
              <div className='col-md-12'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                  Title
                </label>
                <input
                  type='text'
                  className='form-control'
                  name='title'
                  value={requisitionCode || formData.title}
                  onChange={() => { }}
                  placeholder='Will use Requisition Code'
                  style={{ color: '#000' }}
                  disabled
                />
              </div>

              {isSuperadmin && (
                <div className='col-md-12'>
                  <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                    Company / Vessel
                  </label>
                  <select
                    className='form-select'
                    value={selectedVesselId}
                    onChange={(e) => {
                      const newVesselId = parseInt(e.target.value)
                      console.log('Vessel selection changed to:', newVesselId)
                      setSelectedVesselId(newVesselId)
                    }}
                    style={{ color: '#000' }}
                  >
                    <option value=''>Select a vessel</option>
                    {availableVessels.map((vessel) => (
                      <option key={vessel.id} value={vessel.id}>
                        {vessel.fleet_name} ({vessel.vesselType})
                      </option>
                    ))}
                  </select>
                  <div className='form-text'>Select the company/vessel for this requisition</div>
                </div>
              )}

              <div className='col-md-12'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Description</label>
                <textarea
                  className='form-control'
                  name='description'
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder='Describe the item or service needed'
                  style={{ color: '#000' }}
                />
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                  Category
                </label>
                <select
                  className={`form-select ${errors.categoryId ? 'is-invalid' : ''}`}
                  name='categoryId'
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  disabled={isLoadingCategories}
                >
                  <option value=''>
                    {isLoadingCategories ? 'Loading categories...' : 'Select Category'}
                  </option>
                  {!isLoadingCategories && inventoryCategories.length > 0 && (
                    inventoryCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  )}
                  {!isLoadingCategories && inventoryCategories.length === 0 && (
                    <option value='' disabled>No categories available</option>
                  )}
                </select>
                {errors.categoryId && <div className='invalid-feedback'>{errors.categoryId}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                  Head
                </label>
                <select
                  className={`form-select ${errors.headId ? 'is-invalid' : ''}`}
                  name='headId'
                  value={formData.headId}
                  onChange={handleInputChange}
                  disabled={!formData.categoryId}
                  style={{ color: '#000' }}
                >
                  <option value=''>Select Head</option>
                  {filteredHeads.length > 0 ? (
                    filteredHeads.map((head) => (
                      <option key={head.id} value={head.id}>
                        {head.name}
                      </option>
                    ))
                  ) : formData.categoryId ? (
                    <option value='' disabled>No heads available for this category</option>
                  ) : null}
                </select>
                {errors.headId && <div className='invalid-feedback'>{errors.headId}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                  Sub Head
                </label>
                <select
                  className={`form-select ${errors.subHeadId ? 'is-invalid' : ''}`}
                  name='subHeadId'
                  value={formData.subHeadId}
                  onChange={handleInputChange}
                  disabled={!formData.headId}
                  style={{ color: '#000' }}
                >
                  <option value=''>Select Sub Head</option>
                  {filteredSubHeads.length > 0 ? (
                    filteredSubHeads.map((subHead) => (
                      <option key={subHead.id} value={subHead.id}>
                        {subHead.name}
                      </option>
                    ))
                  ) : formData.headId ? (
                    <option value='' disabled>No sub heads available for this head</option>
                  ) : null}
                </select>
                {errors.subHeadId && <div className='invalid-feedback'>{errors.subHeadId}</div>}
              </div>

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                  Type (Urgency)
                </label>
                <select
                  className='form-select'
                  value={
                    formData.urgency === 'HIGH' ? '0' :
                      formData.urgency === 'MEDIUM' ? '15' : '90'
                  }
                  onChange={(e) => {
                    const mapped = mapDaysToUrgency(e.target.value)
                    setFormData(prev => ({ ...prev, urgency: mapped }))
                  }}
                >
                  <option value='90'>90 days (Normal)</option>
                  <option value='15'>15 days (Medium)</option>
                  <option value='0'>0 Days (Urgent)</option>
                </select>
              </div>


              {/* Serial Number - REMOVED */}

              <div className='col-md-6'>
                <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Requested Port</label>
                <select
                  className={`form-select form-select-solid ${errors.requestedPortId ? 'is-invalid' : ''}`}
                  name='requestedPortId'
                  value={formData.requestedPortId}
                  onChange={handleInputChange}
                  disabled={ports.length === 0}
                  style={{
                    backgroundColor: '#F5F8FA',
                    border: '1px solid #E4E6EF',
                    color: '#181C32',
                    fontSize: '14px'
                  }}
                >
                  <option value='' disabled hidden>
                    {ports.length === 0 ? 'Loading ports...' : 'Select Port'}
                  </option>
                  {ports.map((port) => (
                    <option
                      key={port.id}
                      value={port.id}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#181C32',
                        padding: '10px'
                      }}
                    >
                      {port.name || port.main_port}{port.code ? ` (${port.code})` : ''}{port.country ? ` - ${port.country}` : ''}
                    </option>
                  ))}
                  <option
                    value='other'
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#181C32',
                      padding: '10px'
                    }}
                  >
                    Other
                  </option>
                </select>
                {errors.requestedPortId && <div className='invalid-feedback d-block'>{errors.requestedPortId}</div>}

                {/* Custom Port Name Field - Show when "Other" is selected */}
                {formData.requestedPortId === 'other' && (
                  <div className='mt-3'>
                    <label className='form-label required fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                      Port Name
                    </label>
                    <div className='d-flex gap-2'>
                      <input
                        type='text'
                        className={`form-control ${errors.customPortName ? 'is-invalid' : ''}`}
                        name='customPortName'
                        value={formData.customPortName}
                        onChange={handleInputChange}
                        placeholder='Enter port name'
                        disabled={isCreatingPort}
                        style={{
                          backgroundColor: '#F5F8FA',
                          border: '1px solid #E4E6EF',
                          color: '#181C32',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        type='button'
                        className='btn btn-primary'
                        onClick={handleAddPort}
                        disabled={isCreatingPort || !formData.customPortName.trim()}
                        style={{
                          minWidth: '100px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {isCreatingPort ? (
                          <>
                            <span className='spinner-border spinner-border-sm me-2' role='status'></span>
                            Adding...
                          </>
                        ) : (
                          'Add Port'
                        )}
                      </button>
                    </div>
                    {errors.customPortName && <div className='invalid-feedback d-block'>{errors.customPortName}</div>}
                    {createdPortId && (
                      <div className='alert alert-success mt-2 mb-0'>
                        <i className='fas fa-check-circle me-2'></i>
                        Port created successfully! You can now create the requisition.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className='col-md-6'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>Required Delivery Date</label>
                <input
                  type='date'
                  className='form-control'
                  name='requiredDeliveryDate'
                  value={formData.requiredDeliveryDate}
                  onChange={handleInputChange}
                  style={{ color: '#000' }}
                />
              </div>

              <div className='col-md-12'>
                <label className='form-label fw-semibold fs-6 mb-2' style={{ color: '#181C32' }}>
                  Justification
                </label>
                <textarea
                  className={`form-control ${errors.justification ? 'is-invalid' : ''}`}
                  name='justification'
                  value={formData.justification}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder='Reason for this requisition (e.g., Stock below minimum level, Equipment maintenance)'
                  style={{ color: '#000' }}
                />
                {errors.justification && <div className='invalid-feedback'>{errors.justification}</div>}
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
              {isSubmitting ? 'Creating...' : 'Create Requisition'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
// END OF CreateRequisitionModal COMPONENT


interface ViewRequisitionModalProps {
  visible: boolean
  onClose: () => void
  requisition: RequisitionDisplay | null
  attachments?: FileRefDto[]
  onAttachmentClick?: (attachment: FileRefDto) => void
}

const ViewRequisitionModal: FC<ViewRequisitionModalProps> = ({ visible, onClose, requisition, attachments, onAttachmentClick }) => {
  if (!visible || !requisition) return null

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      'Draft': { bg: 'bg-secondary', text: 'Draft' },
      'Submitted': { bg: 'bg-info', text: 'Submitted' },
      'Vessel Approved': { bg: 'bg-primary', text: 'Vessel Approved' },
      'Shore Approved': { bg: 'bg-success', text: 'Shore Approved' },
      'Rejected': { bg: 'bg-danger', text: 'Rejected' }
    }
    const statusInfo = statusMap[status] || { bg: 'bg-secondary', text: status }
    return <span className={`badge ${statusInfo.bg} text-white`}>{statusInfo.text}</span>
  }

  const getUrgencyBadge = (urgency: string) => {
    const urgencyMap: { [key: string]: { bg: string; text: string } } = {
      'High': { bg: 'bg-danger', text: 'High' },
      'Medium': { bg: 'bg-warning', text: 'Medium' },
      'Low': { bg: 'bg-info', text: 'Low' }
    }
    const urgencyInfo = urgencyMap[urgency] || { bg: 'bg-secondary', text: urgency }
    return <span className={`badge ${urgencyInfo.bg} text-white`}>{urgencyInfo.text}</span>
  }

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
        <div className='modal-content bg-white' style={{ display: 'flex', flexDirection: 'column', maxHeight: '95vh' }}>
          <div className='modal-header border-bottom' style={{ flexShrink: 0 }}>
            <div>
              <h3 className='modal-title fw-bold text-dark mb-1'>Requisition Details</h3>
              <p className='text-muted mb-0 fs-7'>{requisition.reqNumber}</p>
            </div>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>

          <div className='modal-body' style={{ overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
            {/* Status and Basic Info */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <div className='d-flex justify-content-between align-items-center mb-3'>
                  <h5 className='fw-bold text-primary mb-0'>General Information</h5>
                  <div className='d-flex gap-2'>
                    {getStatusBadge(requisition.status)}
                    {getUrgencyBadge(requisition.urgency)}
                  </div>
                </div>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Requisition Number</label>
                <p className='fs-6 text-dark fw-bold'>{requisition.reqNumber}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Title</label>
                <p className='fs-6 text-dark'>{requisition.title}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Item Name</label>
                <p className='fs-6 text-dark'>{requisition.itemName}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Category</label>
                <p className='fs-6 text-dark'>{requisition.category}</p>
              </div>
              {requisition.vesselName && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Vessel</label>
                  <p className='fs-6 text-dark'>{requisition.vesselName}</p>
                </div>
              )}
              <div className='col-md-12'>
                <label className='form-label fw-semibold text-muted fs-7'>Item Description</label>
                <p className='fs-6 text-dark'>{requisition.itemDescription}</p>
              </div>
            </div>

            {/* Delivery & Quantity Information */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <h5 className='fw-bold text-primary mb-3'>Delivery & Quantity</h5>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Requested Port</label>
                <p className='fs-6 text-dark'>{requisition.requestedPort}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Required Date</label>
                <p className='fs-6 text-dark'>{requisition.requiredDate}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Quantity</label>
                <p className='fs-6 text-dark fw-bold'>{requisition.quantity}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Estimated Value</label>
                <p className='fs-6 text-dark fw-bold text-success'>${requisition.estimatedValue}</p>
              </div>
            </div>

            {/* Additional Information */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <h5 className='fw-bold text-primary mb-3'>Additional Information</h5>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              {/* @ts-ignore */}
              {requisition.inventoryItemHead && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Head</label>
                  {/* @ts-ignore */}
                  <p className='fs-6 text-dark'>{requisition.inventoryItemHead}</p>
                </div>
              )}
              {/* @ts-ignore */}
              {requisition.inventoryItemSubHead && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Sub Head</label>
                  {/* @ts-ignore */}
                  <p className='fs-6 text-dark'>{requisition.inventoryItemSubHead}</p>
                </div>
              )}
              {/* @ts-ignore */}
              {requisition.part && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Part</label>
                  {/* @ts-ignore */}
                  <p className='fs-6 text-dark'>{requisition.part}</p>
                </div>
              )}
              {requisition.subComponents && requisition.subComponents.length > 0 ? (
                <div className='col-md-12'>
                  <label className='form-label fw-semibold text-muted fs-7'>Sub Components</label>
                  <div className='d-flex flex-wrap gap-2'>
                    {requisition.subComponents.map((comp, index) => (
                      <span key={index} className='badge bg-light text-dark border'>{comp}</span>
                    ))}
                  </div>
                </div>
              ) : requisition.subComponent && requisition.subComponent !== '-' && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Sub Component</label>
                  <p className='fs-6 text-dark'>{requisition.subComponent}</p>
                </div>
              )}
              {/* @ts-ignore */}
              {requisition.make && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Make</label>
                  {/* @ts-ignore */}
                  <p className='fs-6 text-dark'>{requisition.make}</p>
                </div>
              )}
              {/* @ts-ignore */}
              {requisition.model && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Model</label>
                  {/* @ts-ignore */}
                  <p className='fs-6 text-dark'>{requisition.model}</p>
                </div>
              )}
              {/* @ts-ignore */}
              {requisition.serialNumber && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Serial Number</label>
                  {/* @ts-ignore */}
                  <p className='fs-6 text-dark'>{requisition.serialNumber}</p>
                </div>
              )}
              {requisition.equipmentLink && requisition.equipmentLink !== 'N/A' && (
                <div className='col-md-12'>
                  <label className='form-label fw-semibold text-muted fs-7'>Equipment Link</label>
                  <p className='fs-6 text-dark'>{requisition.equipmentLink}</p>
                </div>
              )}
              <div className='col-md-12'>
                <label className='form-label fw-semibold text-muted fs-7'>Justification</label>
                <p className='fs-6 text-dark'>{requisition.justification}</p>
              </div>
            </div>

            {/* Approval Status */}
            {(requisition.vesselStatus || requisition.shoreStatus) && (
              <>
                <div className='row mb-4'>
                  <div className='col-md-12'>
                    <h5 className='fw-bold text-primary mb-3'>Approval Status</h5>
                  </div>
                </div>

                <div className='row g-4 mb-4'>
                  {requisition.vesselStatus && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Vessel Status</label>
                      <p className='fs-6 text-dark'>{requisition.vesselStatus}</p>
                    </div>
                  )}
                  {requisition.shoreStatus && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Shore Status</label>
                      <p className='fs-6 text-dark'>{requisition.shoreStatus}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Attachments */}
            {attachments && attachments.length > 0 && (
              <>
                <div className='row mb-4'>
                  <div className='col-md-12'>
                    <h5 className='fw-bold text-primary mb-3'>Attachments</h5>
                  </div>
                </div>

                <div className='row g-3'>
                  <div className='col-md-12'>
                    <div className='d-flex flex-wrap gap-2'>
                      {attachments.map((attachment, index) => (
                        <button
                          key={index}
                          className='btn btn-light btn-sm d-flex align-items-center gap-2'
                          onClick={() => onAttachmentClick && onAttachmentClick(attachment)}
                          style={{
                            border: '1px solid #E4E6EF',
                            borderRadius: '6px',
                            padding: '8px 12px'
                          }}
                        >
                          <KTSVG path='/media/icons/duotune/files/fil003.svg' className='svg-icon-4' />
                          <span className='text-dark'>{attachment.fileName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className='modal-footer border-top' style={{ flexShrink: 0, padding: '1rem' }}>
            <button type='button' className='btn btn-light' onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const RequisitionList: FC = () => {
  const { currentUser, auth } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [requisitionData, setRequisitionData] = useState<RequisitionDisplay[]>([])
  const [requisitionAttachments, setRequisitionAttachments] = useState<{ [key: number]: FileRefDto[] }>({})
  const [sortConfig, setSortConfig] = useState<{
    key: keyof RequisitionDisplay | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isViewModalVisible, setIsViewModalVisible] = useState(false)
  const [selectedRequisition, setSelectedRequisition] = useState<RequisitionDisplay | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [vesselFilter, setVesselFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [headFilter, setHeadFilter] = useState('')
  const [subHeadFilter, setSubHeadFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [totalElements, setTotalElements] = useState(0)
  // For superadmin (role 1), vesselId should be null to fetch all requisitions
  const userRoleId = currentUser?.role?.id || auth?.role?.id || 4
  const [vesselId] = useState(userRoleId === 1 ? null : (currentUser?.vessel?.id || 1))
  const [selectedAttachment, setSelectedAttachment] = useState<FileRefDto | null>(null)
  // Store demo-only extra fields per requisition_code
  const [extraMetaByCode, setExtraMetaByCode] = useState<Record<string, ReqExtraMeta>>({})


  const [addItemsModalVisible, setAddItemsModalVisible] = useState(false)
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<number | null>(null)

  const upsertExtras = React.useCallback(
    (code: string, extras: ReqExtraMeta) => {
      setExtraMetaByCode((prev: Record<string, ReqExtraMeta>) => ({
        ...prev,
        [code]: { ...prev[code], ...extras },
      }))
    },
    []
  )


  // Get user role from auth context
  const userRole = currentUser?.role?.id || auth?.role?.id || 4

  // Debug logging
  useEffect(() => {
    console.log('Current User:', currentUser)
    console.log('Auth:', auth)
    console.log('Detected User Role:', userRole)

    // Decode JWT token to see what's inside
    if (auth?.auth?.jwt) {
      try {
        const base64Url = auth.auth.jwt.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        console.log('JWT Payload:', JSON.parse(jsonPayload))
      } catch (e) {
        console.error('Error decoding JWT:', e)
      }
    }
  }, [currentUser, auth, userRole])

  const [parts, setParts] = useState<Part[]>([])
  const [ports, setPorts] = useState<Port[]>([])
  const [categories, setCategories] = useState<SubcatalogueType[]>([])
  const [inventoryCategories, setInventoryCategories] = useState<InventoryCategory[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadRequisitions()
  }, [vesselId, userRole])

  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      // Calculate cgaId for loading inventory categories
      const roleId = currentUser?.role?.id
      const roleEntityId = currentUser?.roleEntityId
      const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null
      const vesselType = (currentUser as any)?.vessel?.vesselType ?? null

      const isOperator = roleId === 6
      const isCompanyOperator = isOperator && companyGroupAdminId != null
      const actsAsCga = roleId === 5 || isCompanyOperator
      const actsAsSuperadmin = roleId === 1

      const effectiveCgaId = actsAsCga
        ? companyGroupAdminId
        : roleId === 2
          ? roleEntityId
          : roleId === 3
            ? (currentUser as any)?.companyAdmin?.cgaid?.id ?? null
            : roleId === 4
              ? (currentUser as any)?.vessel?.companyGroupAdminId ?? null
              : null

      const cgaId = effectiveCgaId || 1

      const [partsData, portsData, categoriesData, inventoryData, inventoryCategoriesData] = await Promise.all([
        getParts(),
        getPorts(),
        getSubcatalogueTypes(),
        getInventory(vesselId, 0, 1000), // Fetch all inventory items for the vessel
        actsAsSuperadmin
          ? getAllInventoryCategoriesForAllCompanies()
          : roleId === 4 && vesselType
            ? getInventoryCategoriesByVesselType(cgaId, vesselType)
            : getAllInventoryCategoriesForCompany(cgaId)
      ])

      setParts(partsData)
      setPorts(portsData)
      setCategories(categoriesData)
      setInventoryItems(inventoryData.content || [])
      setInventoryCategories(inventoryCategoriesData)
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load initial data. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRequisitions = async () => {
    setIsLoading(true)
    try {
      let currentPorts = ports
      let currentParts = parts
      let currentCategories = categories
      let currentInventoryCategories = inventoryCategories

      // Reload data if not available
      if (ports.length === 0 || parts.length === 0 || categories.length === 0 || inventoryCategories.length === 0) {
        // Calculate cgaId for loading inventory categories
        const roleId = currentUser?.role?.id
        const roleEntityId = currentUser?.roleEntityId
        const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null
        const vesselType = (currentUser as any)?.vessel?.vesselType ?? null

        const isOperator = roleId === 6
        const isCompanyOperator = isOperator && companyGroupAdminId != null
        const actsAsCga = roleId === 5 || isCompanyOperator
        const actsAsSuperadmin = roleId === 1

        const effectiveCgaId = actsAsCga
          ? companyGroupAdminId
          : roleId === 2
            ? roleEntityId
            : roleId === 3
              ? (currentUser as any)?.companyAdmin?.cgaid?.id ?? null
              : roleId === 4
                ? (currentUser as any)?.vessel?.companyGroupAdminId ?? null
                : null

        const cgaId = effectiveCgaId || 1

        const [partsData, portsData, categoriesData, inventoryCategoriesData] = await Promise.all([
          parts.length === 0 ? getParts() : Promise.resolve(parts),
          ports.length === 0 ? getPorts() : Promise.resolve(ports),
          categories.length === 0 ? getSubcatalogueTypes() : Promise.resolve(categories),
          inventoryCategories.length === 0
            ? (actsAsSuperadmin
              ? getAllInventoryCategoriesForAllCompanies()
              : roleId === 4 && vesselType
                ? getInventoryCategoriesByVesselType(cgaId, vesselType)
                : getAllInventoryCategoriesForCompany(cgaId))
            : Promise.resolve(inventoryCategories)
        ])
        currentPorts = portsData
        currentParts = partsData
        currentCategories = categoriesData
        currentInventoryCategories = inventoryCategoriesData

        setPorts(portsData)
        setParts(partsData)
        setCategories(categoriesData)
        setInventoryCategories(inventoryCategoriesData)
      }

      // Load ALL requisitions for client-side pagination without limits
      // For superadmin (role 1), pass null to get all requisitions across all companies
      console.log('ðŸ” Loading requisitions with vesselId:', vesselId, 'for userRole:', userRole)
      const response = await getRequisitions(undefined, undefined, vesselId)
      console.log('âœ“ Received requisitions response:', response)
      console.log('âœ“ Total requisitions received:', Array.isArray(response) ? response.length : response.content?.length || 0)

      // Log each requisition's vesselId for debugging
      const reqArray = Array.isArray(response) ? response : response.content || []
      console.log('âœ“ Requisitions vesselIds:', reqArray.map((r: any) => ({ code: r.requisition_code, vesselId: r.vesselId })))

      // Handle both paginated and direct array responses
      const requisitionsArray = Array.isArray(response) ? response : response.content || []
      const totalFromAPI = Array.isArray(response) ? response.length : (response.totalElements || response.content?.length || 0)

      let filteredRequisitions = requisitionsArray

      // Filter based on user role
      if (userRole === 5) {
        // Company sees vessel approved requisitions (to approve for shore) and shore approved requisitions (to create RFQs)
        filteredRequisitions = filteredRequisitions.filter((req: Requisition) =>
          req.status === 'VESSEL_APPROVED' || req.status === 'SHORE_APPROVED'
        )
      }
      // Role 1 (Superadmin) sees ALL requisitions from ALL companies
      // Role 4 (Chief Officer/Master) sees all requisitions for their vessel

      // Create a category lookup map for better performance
      const categoryMap = new Map(currentInventoryCategories.map(cat => [cat.id, cat.name]))

      // Load all sub catalogues and create a lookup map
      let subCatalogueMap = new Map<number, string>()
      try {
        const allSubCatalogues = await getAllSubCatalogues()
        subCatalogueMap = new Map(allSubCatalogues.map(sc => [sc.id, sc.name]))
        console.log('âœ“ Loaded sub catalogues for lookup:', allSubCatalogues.length)
      } catch (error) {
        console.error('âŒ Error loading sub catalogues for lookup:', error)
      }

      // Load all sub components and create a lookup map
      let subComponentMap = new Map<number, string>()
      try {
        const allSubComponents = await getSubComponents()
        subComponentMap = new Map(allSubComponents.map(sc => [sc.id, sc.name]))
        console.log('âœ“ Loaded sub components for lookup:', allSubComponents.length)
      } catch (error) {
        console.error('âŒ Error loading sub components for lookup:', error)
      }

      // Load all inventory item heads and create a lookup map
      let inventoryItemHeadsMap = new Map<number, string>()
      try {
        const allHeads = await getInventoryItemHeads()
        inventoryItemHeadsMap = new Map(allHeads.map(h => [h.id, h.name]))
        console.log('Loaded inventory item heads for lookup:', allHeads.length)
      } catch (error) {
        console.error('Error loading inventory item heads for lookup:', error)
      }

      // Load all inventory item sub heads and create a lookup map
      let inventoryItemSubHeadsMap = new Map<number, string>()
      try {
        const allSubHeads = await getInventoryItemSubHeads()
        inventoryItemSubHeadsMap = new Map(allSubHeads.map(sh => [sh.id, sh.name]))
        console.log('Loaded inventory item sub heads for lookup:', allSubHeads.length)
      } catch (error) {
        console.error('Error loading inventory item sub heads for lookup:', error)
      }

      // Load all vessels to show vessel names
      let vesselsMap = new Map<number, Vessel>()
      try {
        console.log('ðŸš¢ Loading all vessels...')
        const allVessels = await getAllVessels()
        vesselsMap = new Map(allVessels.map(v => [v.id, v]))
        console.log('âœ“ Loaded vessels for lookup:', allVessels.length, allVessels)
      } catch (error) {
        console.error('âŒ Error loading vessels for lookup:', error)
      }

      const displayItems: RequisitionDisplay[] = filteredRequisitions.map((req: Requisition) => {
        // Try to get partId from top-level or from first line item
        const partId = req.partId || (req.lines && req.lines.length > 0 ? req.lines[0].partId : null)
        const part = partId ? currentParts.find(p => p.id === partId) : null

        // DEBUG: Log part lookup
        if (!part && partId) {
          console.log(`âš ï¸ Part not found for requisition ${req.requisition_code}:`, {
            partId: partId,
            reqPartId: req.partId,
            linesPartId: req.lines?.[0]?.partId,
            availablePartIds: currentParts.map(p => p.id),
            totalParts: currentParts.length
          })
        }

        const port = currentPorts.find(p => p.id === req.requestedPortId)

        // Get vessel information for superadmin
        const vessel = vesselsMap.get(req.vesselId)

        // Get category name from the inventory categories using the map for faster lookup
        const categoryId = req.category?.id || req.categoryId
        const categoryName = categoryId ? (categoryMap.get(categoryId) || 'N/A') : 'N/A'

        // DEBUG: Log requisition data for SUB CATALOGUE and SUB COMPONENT
        console.log(`Requisition ${req.requisition_code}:`, {
          subCatalogueId: req.subCatalogueId,
          subcomponent: req.subcomponent,
          subCatalogueMapSize: subCatalogueMap.size,
          subComponentMapSize: subComponentMap.size,
          subCatalogueMapHas: req.subCatalogueId ? subCatalogueMap.has(req.subCatalogueId) : false,
          subComponentMapHas: req.subcomponent?.id ? subComponentMap.has(req.subcomponent.id) : false
        })

        // Get sub catalogue name from the lookup map
        const subCatalogueName = req.subCatalogueId ? (subCatalogueMap.get(req.subCatalogueId) || `-(ID:${req.subCatalogueId})`) : '-'

        // Get sub component name from the lookup map
        const subComponentName = req.subcomponent?.id ? (subComponentMap.get(req.subcomponent.id) || `-(ID:${req.subcomponent.id})`) : '-'

        // Get subcomponents from lines array if available
        const subComponentsFromLines = req.lines && req.lines.length > 0
          ? req.lines.map((line: any) => subComponentMap.get(line.subcomponentId) || `ID:${line.subcomponentId}`).filter(Boolean)
          : []

        let status = 'Draft'
        if (req.status === 'SUBMITTED') status = 'Submitted'
        else if (req.status === 'PENDING_VESSEL_APPROVAL') status = 'Pending Vessel Approval'
        else if (req.status === 'VESSEL_APPROVED') status = 'Vessel Approved'
        else if (req.status === 'PENDING_SHORE_APPROVAL') status = 'Pending Shore Approval'
        else if (req.status === 'SHORE_APPROVED') status = 'Shore Approved'
        else if (req.status === 'REJECTED') status = 'Rejected'
        else if (req.status === 'COMPLETED') status = 'Completed'

        const urgency = req.type === 'HIGH' ? 'High' :
          req.type === 'MEDIUM' ? 'Medium' : 'Low'

        // Pull demo-only fields by requisition code, if any:
        const extras = extraMetaByCode[req.requisition_code] || {}


        // Calculate quantity and estimated value from lines if available, otherwise use top-level fields
        let totalQuantity = 0
        let totalEstimatedValue = 0

        if (req.lines && req.lines.length > 0) {
          // Sum up quantities and values from all lines
          req.lines.forEach(line => {
            totalQuantity += line.quantity || 0
            totalEstimatedValue += (line.quantity || 0) * (line.estimatedUnitPrice || 0)
          })
        } else {
          // Use top-level fields
          totalQuantity = req.quantity || 0
          totalEstimatedValue = (req.quantity || 0) * (req.estimatedUnitPrice || 0)
        }

        return {
          id: req.id,
          reqNumber: req.requisition_code,
          title: req.title,
          itemName: req.manualItemName || part?.name || 'N/A',
          itemDescription: req.description,
          category: categoryName,
          urgency: urgency as 'High' | 'Medium' | 'Low',
          requestedPort: req.customPortName || port?.name || port?.main_port || 'N/A',
          requiredDate: req.requiredDeliveryDate,
          quantity: totalQuantity > 0 ? `${totalQuantity} ${req.uom || 'PCS'}`.trim() : 'N/A',
          estimatedValue: totalEstimatedValue > 0 ? totalEstimatedValue.toLocaleString() : '0',
          equipmentLink: req.equipmentLink || 'N/A',
          justification: req.justification,
          status: status,
          vesselStatus: req.vesselApproved ? 'Approved' : 'Pending',
          shoreStatus: req.shoreApproved ? 'Approved' : 'Pending',
          type: req.type,
          // Get values from API response using lookup maps
          // @ts-ignore (table will read these keys)
          inventoryItemHead: req.inventoryItemHead?.name ||
            (req.inventoryItemHeadId ? (inventoryItemHeadsMap.get(req.inventoryItemHeadId) || '-') : '-'),
          // @ts-ignore
          inventoryItemSubHead: req.inventoryItemSubHead?.name ||
            (req.inventoryItemSubHeadId ? (inventoryItemSubHeadsMap.get(req.inventoryItemSubHeadId) || '-') : '-'),
          // @ts-ignore
          part: part?.name || '-',
          // @ts-ignore - Show subcomponents from lines array if available, otherwise show single subcomponent
          subComponent: subComponentName,
          // @ts-ignore
          subComponents: subComponentsFromLines.length > 0 ? subComponentsFromLines : null,
          // @ts-ignore
          make: req.make || extras.make || '-',
          // @ts-ignore
          model: req.model || extras.model || '-',
          // @ts-ignore
          serialNumber: req.serialNumber || extras.serialNumber || '-',
          // Add vessel information for superadmin
          vesselName: vessel?.fleet_name || 'N/A',
          vesselId: req.vesselId,
        }
      })

      console.log('ðŸ“Š Display items created:', displayItems.length, 'items')
      console.log('ðŸ“Š Sample display items:', displayItems.slice(0, 3))
      setRequisitionData(displayItems)
      // Set total elements from API response, not just current page items
      setTotalElements(totalFromAPI)
      // Reset to first page when data is reloaded
      setCurrentPage(1)
      console.log('âœ“ Requisition data loaded successfully. Total:', totalFromAPI)

      // Use attachments from requisition response directly
      const attachmentsMap: { [key: number]: FileRefDto[] } = {}
      filteredRequisitions.forEach((req) => {
        attachmentsMap[req.id] = req.attachments || []
        console.log(`Attachments for requisition ${req.id}:`, attachmentsMap[req.id])
      })
      setRequisitionAttachments(attachmentsMap)

    } catch (error) {
      console.error('Error loading requisitions:', error)
      toast.error('Failed to load requisitions. Please check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewRequisition = (record: RequisitionDisplay) => {
    setSelectedRequisition(record)
    setIsViewModalVisible(true)
  }

  const handleDeleteRequisition = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this requisition?')) return

    try {
      await deleteRequisition(id)
      await loadRequisitions()
      toast.success('Requisition deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting requisition:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete requisition'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this requisition because it has associated records. Please check dependencies first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleSubmitRequisition = async (id: number) => {
    if (!window.confirm('Submit this requisition to master?')) return

    try {
      await submitRequisition(id)
      toast.success('Requisition submitted successfully!')
      await loadRequisitions()
    } catch (error: any) {
      console.error('Error submitting requisition:', error)
      toast.error(error.message || 'Failed to submit requisition')
    }
  }

  const handleVesselApproval = async (id: number) => {
    if (!window.confirm('Approve this requisition for vessel?')) return

    try {
      console.log('Attempting vessel approval with user:', currentUser)
      console.log('User role ID:', currentUser?.role?.id)
      console.log('User role type:', currentUser?.role?.roleType)
      console.log('User rank:', currentUser?.rank)
      console.log('Auth role ID:', auth?.role?.id)
      console.log('Auth role name:', auth?.role?.roleName)
      console.log('Detected userRole:', userRole)

      await approveVesselRequisition(id, {
        status: 'VESSEL_APPROVED',
        vesselApproved: true
      })
      toast.success('Requisition approved for vessel successfully!')
      await loadRequisitions()
    } catch (error: any) {
      console.error('Error with vessel approval:', error)
      console.error('Full error response:', error.response)
      toast.error(error.message || 'Failed to approve for vessel')
    }
  }

  const handleShoreApprovalFromRole5 = async (id: number) => {
    if (!window.confirm('Approve this requisition for shore?')) return

    try {
      await approveShoreRequisition(id, {
        status: 'SHORE_APPROVED',
        shoreApproved: true
      })
      toast.success('Requisition approved for shore successfully!')
      await loadRequisitions()
    } catch (error: any) {
      console.error('Error with shore approval:', error)
      toast.error(error.message || 'Failed to approve for shore')
    }
  }

  const handleCompanyApproval = async (id: number, approve: boolean) => {
    const action = approve ? 'approve' : 'reject'
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this requisition?`)) return

    try {
      await approveShoreRequisition(id, {
        status: approve ? 'SHORE_APPROVED' : 'REJECTED',
        shoreApproved: approve
      })
      toast.success(`Requisition ${action}d successfully!`)
      await loadRequisitions()
    } catch (error: any) {
      console.error('Error with company approval:', error)
      toast.error(error.message || 'Failed to process approval')
    }
  }

  const filteredData = useMemo(() => {
    const filtered = requisitionData.filter(record => {
      const matchesSearch = searchTerm === '' ||
        record.reqNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.category.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === '' || record.status.includes(statusFilter)

      // Vessel filter
      const matchesVessel = vesselFilter === '' ||
        (record as any).vesselName?.toLowerCase().includes(vesselFilter.toLowerCase())

      // Category filter
      const matchesCategory = categoryFilter === '' ||
        record.category.toLowerCase().includes(categoryFilter.toLowerCase())

      // Head filter
      const matchesHead = headFilter === '' ||
        ((record as any).inventoryItemHead && (record as any).inventoryItemHead.toLowerCase().trim().includes(headFilter.toLowerCase().trim()))

      // Sub Head filter
      const matchesSubHead = subHeadFilter === '' ||
        ((record as any).inventoryItemSubHead && (record as any).inventoryItemSubHead.toLowerCase().trim().includes(subHeadFilter.toLowerCase().trim()))

      return matchesSearch && matchesStatus && matchesVessel && matchesCategory && matchesHead && matchesSubHead
    })

    console.log('FilteredData - filters applied:', { statusFilter, vesselFilter, categoryFilter, headFilter, subHeadFilter })
    return filtered
  }, [searchTerm, requisitionData, statusFilter, vesselFilter, categoryFilter, headFilter, subHeadFilter])

  const sortedData = useMemo(() => {
    let sortedRecords = [...filteredData]

    if (sortConfig.key !== null) {
      sortedRecords.sort((a, b) => {
        const aVal = String(a[sortConfig.key!] || '').toLowerCase()
        const bVal = String(b[sortConfig.key!] || '').toLowerCase()

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [filteredData, sortConfig])

  const handleSort = (key: keyof RequisitionDisplay) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const indexOfLastRecord = currentPage * rowsPerPage
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage
  const currentRecords = sortedData.slice(indexOfFirstRecord, indexOfLastRecord)
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Export requisitions to PDF
  const exportRequisitionsToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a3' })

      // Title
      doc.setFontSize(16)
      doc.text('Requisition List', 14, 15)

      // Subtitle with date
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
      doc.text(`Total Requisitions: ${sortedData.length}`, 14, 28)

      // Prepare table data based on user role
      const tableData = sortedData.map(record => {
        const baseData = [
          record.title || '',
          record.itemName || '',
          record.itemDescription || '',
          record.category || '',
          record.urgency || '',
          // record.inventoryItemHead || '',
          // record.inventoryItemSubHead || '',
          // record.part || '',
          // record.subComponent || '',
          // record.requestedPort || '',
          record.requiredDate || '',
          // record.quantity?.toString() || '',
          // `$${record.estimatedValue || '0.00'}`,
          // record.justification || '',
          record.status || ''
        ]

        // Add vessel name for superadmin (role 1)
        if (userRole === 1) {
          return [record.vesselName || '', ...baseData]
        }
        return baseData
      })

      // Define table headers based on user role
      const headers = userRole === 1
        ? [['Vessel', 'Title', 'Item Name', 'Description', 'Category', 'Urgency', 'Due Date', 'Status']]
        : [['Title', 'Item Name', 'Description', 'Category', 'Urgency', 'Due Date', 'Status']]

        // Generate table
        ; (doc as any).autoTable({
          head: headers,
          body: tableData,
          startY: 35,
          styles: {
            fontSize: 7,
            cellPadding: 2,
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            fontSize: 8,
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          columnStyles: userRole === 1 ? {
            0: { cellWidth: 35 },  // Vessel
            1: { cellWidth: 40 },  // Title
            2: { cellWidth: 40 },  // Item Name
            3: { cellWidth: 50 },  // Description
            4: { cellWidth: 30 },  // Category
            5: { cellWidth: 25 },  // Urgency
            6: { cellWidth: 30 },  // Due Date
            7: { cellWidth: 30 },  // Status
          } : {
            0: { cellWidth: 45 },  // Title
            1: { cellWidth: 45 },  // Item Name
            2: { cellWidth: 55 },  // Description
            3: { cellWidth: 35 },  // Category
            4: { cellWidth: 30 },  // Urgency
            5: { cellWidth: 35 },  // Due Date
            6: { cellWidth: 35 },  // Status
          },
          margin: { top: 35, left: 10, right: 10 },
          pageBreak: 'auto',
          tableLineWidth: 0.1,
          tableLineColor: [200, 200, 200],
        })

      // Save the PDF
      doc.save(`Requisition_List_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF exported successfully!')
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('Failed to export PDF')
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1)
  }

  const handleAddRequisitionSuccess = () => {
    console.log('ðŸ”„ Reloading requisitions after creation...')
    console.log('ðŸ”„ Current vesselId:', vesselId)
    console.log('ðŸ”„ Current userRole:', userRole)
    loadRequisitions()
  }

  const handleAttachmentClick = (attachment: FileRefDto) => {
    setSelectedAttachment(attachment)
  }

  const handleDownloadAttachment = async (attachment: FileRefDto) => {
    try {
      console.log('Downloading attachment:', attachment.fileName, 'from URL:', attachment.url)

      // Fetch the file as a blob
      const response = await fetch(attachment.url)
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`)
      }

      const blob = await response.blob()

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob)

      // Create a temporary anchor element and trigger download
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = attachment.fileName
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)

      console.log('âœ… File downloaded successfully:', attachment.fileName)
    } catch (error) {
      console.error('âŒ Error downloading attachment:', error)
      toast.error(`Failed to download file: ${attachment.fileName}`)
    }
  }

  const handleAddItems = (requisitionId: number) => {
    setSelectedRequisitionId(requisitionId)
    setAddItemsModalVisible(true)
  }

  const handleAddItemsSuccess = () => {
    setAddItemsModalVisible(false)
    setSelectedRequisitionId(null)
    loadRequisitions()
  }



  const getStatusBadge = (status: string) => {
    if (status.includes('Pending') || status === 'Submitted') {
      return <span className='badge bg-warning text-white'>{status}</span>
    }
    if (status.includes('Approved') || status.includes('Completed')) {
      return <span className='badge bg-success text-white'>{status}</span>
    }
    if (status.includes('Rejected')) {
      return <span className='badge bg-danger text-white'>{status}</span>
    }
    return <span className='badge bg-secondary text-white'>{status}</span>
  }

  const getUrgencyBadge = (urgency: string) => {
    const colors: Record<string, string> = {
      'High': 'bg-danger',
      'Medium': 'bg-warning',
      'Low': 'bg-success'
    }
    return <span className={`badge ${colors[urgency]} text-white`}>{urgency}</span>
  }

  const renderActions = (record: RequisitionDisplay) => {
    if (userRole === 1) {
      // Superadmin (Role 1) - Full access to all actions
      return (
        <div className='d-flex justify-content-center align-items-center gap-1'>
          <button
            className='btn btn-sm p-1'
            title='View'
            style={{ width: '28px', height: '28px' }}
            onClick={() => handleViewRequisition(record)}
          >
            <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-5' />
          </button>

          {record.status === 'Draft' && (
            <>
              <button
                className='btn btn-sm btn-primary px-2'
                title='Submit to Master'
                onClick={() => handleSubmitRequisition(record.id)}
                style={{ minWidth: '70px', height: '28px', fontSize: '12px' }}
              >
                Submit
              </button>
              <button
                className='btn btn-sm p-1'
                title='Delete'
                onClick={() => handleDeleteRequisition(record.id)}
                style={{ width: '28px', height: '28px' }}
              >
                <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
              </button>
            </>
          )}

          {record.status === 'Submitted' && (
            <>
              <button
                className='btn btn-sm btn-success px-2'
                title='Approve for Vessel'
                onClick={() => handleVesselApproval(record.id)}
                style={{ minWidth: '80px', height: '28px', fontSize: '12px' }}
              >
                Approve
              </button>
            </>
          )}

          {record.status === 'Vessel Approved' && (
            <>
              <button
                className='btn btn-sm btn-success px-2'
                title='Approve for Shore'
                onClick={() => handleShoreApprovalFromRole5(record.id)}
                style={{ minWidth: '90px', height: '28px', fontSize: '12px' }}
              >
                Shore Approve
              </button>
            </>
          )}

          {record.status === 'Shore Approved' && (
            <>
              <button
                className='btn btn-sm btn-info px-2'
                title='Add Items'
                onClick={() => handleAddItems(record.id)}
                style={{ minWidth: '80px', height: '28px', fontSize: '12px' }}
              >
                Add Items
              </button>
            </>
          )}
        </div>
      )
    } else if (userRole === 4) {
      // Chief Officer and Master (Role 4)
      return (
        <div className='d-flex justify-content-center align-items-center' style={{ gap: '4px' }}>
          <button
            className='btn btn-sm p-1'
            title='View'
            style={{ width: '28px', height: '28px' }}
            onClick={() => handleViewRequisition(record)}
          >
            <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-5' />
          </button>

          {/* Chief Officer can add items and submit draft requisitions */}
          {record.status === 'Draft' && (
            <>
              <button
                className='btn btn-sm btn-info px-2 me-1'
                title='Add Items'
                onClick={() => handleAddItems(record.id)}
                style={{ minWidth: '75px', height: '28px', fontSize: '11px' }}
              >
                Add Items
              </button>
              <button
                className='btn btn-sm btn-primary px-2 me-1'
                title='Submit to Master'
                onClick={() => handleSubmitRequisition(record.id)}
                style={{ minWidth: '65px', height: '28px', fontSize: '11px' }}
              >
                Submit
              </button>
            </>
          )}

          {/* Master can approve submitted requisitions for vessel */}
          {record.status === 'Submitted' && (
            <button
              className='btn btn-sm btn-success px-2'
              title='Approve for Vessel'
              onClick={() => handleVesselApproval(record.id)}
              style={{ minWidth: '80px', height: '28px', fontSize: '12px' }}
            >
              Approve
            </button>
          )}

          {/* Master has completed their part after vessel approval */}
        </div>
      )
    } else if (userRole === 5) {
      // Company (Role 5)
      return (
        <div className='d-flex justify-content-center align-items-center gap-1'>
          <button
            className='btn btn-sm p-1'
            title='View'
            style={{ width: '28px', height: '28px' }}
            onClick={() => handleViewRequisition(record)}
          >
            <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-5' />
          </button>

          {/* Company can create RFQ for shore approved requisitions */}
          {/* Company can approve vessel-approved requisitions for shore */}
          {record.status === 'Vessel Approved' && (
            <button
              className='btn btn-sm btn-success px-2'
              title='Approve for Shore'
              onClick={() => handleShoreApprovalFromRole5(record.id)}
              style={{ minWidth: '90px', height: '28px', fontSize: '12px' }}
            >
              Shore Approve
            </button>
          )}

          {/* Company can create RFQ for shore approved requisitions */}
          {record.status === 'Shore Approved' && (
            <button
              className='btn btn-sm btn-info px-2'
              title='Add Items'  // CHANGE: was 'Create RFQ'
              onClick={() => handleAddItems(record.id)}  // CHANGE: was onClick={() => { window.location.href = `/procurement/rfq-management?requisitionId=${record.id}` }}
              style={{ minWidth: '80px', height: '28px', fontSize: '12px' }}
            >
              Add Items  {/* CHANGE: was 'Create RFQ' */}
            </button>
          )}
        </div>
      )
    }

    return (
      <div className='d-flex justify-content-center align-items-center gap-1'>
        <button
          className='btn btn-sm p-1'
          title='View'
          style={{ width: '28px', height: '28px' }}
          onClick={() => handleViewRequisition(record)}
        >
          <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-5' />
        </button>
      </div>
    )
  }



  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between align-items-center bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Requisition Management</h3>
                <p className='text-muted mb-0'>
                  {userRole === 1 && 'Full access to create, manage, and approve all requisitions'}
                  {userRole === 4 && 'Submit draft requisitions to master, approve submitted requisitions, and submit to shore'}
                  {userRole === 5 && 'Approve vessel-approved requisitions for shore and create RFQs from shore-approved requisitions'}
                </p>
              </div>
              <div className='card-toolbar d-flex gap-2'>
                <button
                  type='button'
                  className='btn btn_primary'
                  style={{
                    backgroundColor: '',
                    color: 'white',
                    border: 'none'
                  }}
                  onClick={exportRequisitionsToPDF}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr078.svg' className='svg-icon-2' />
                  Export
                </button>
                {(userRole === 1 || userRole === 4) && (
                  <button
                    type='button'
                    className='btn btn_primary'
                    onClick={() => setIsModalVisible(true)}
                  >
                    <span className='me-2'>+</span>
                    New Requisition
                  </button>
                )}
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              <div className='d-flex gap-3 mb-4'>
                <div style={{ width: '200px' }}>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Search</label>
                  <div className='position-relative'>
                    <div
                      className='position-absolute ms-3'
                      style={{ top: '50%', transform: 'translateY(-50%)' }}
                    >
                      <KTSVG
                        path='/media/icons/duotune/general/gen021.svg'
                        className='svg-icon-2'
                      />
                    </div>
                    <input
                      type='text'
                      className='form-control form-control-sm ps-10'
                      placeholder='Search...'
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1)
                      }}
                    />
                  </div>
                </div>

                {/* Vessel Filter - Show all for superadmin (role 1), filter by company for others */}
                {userRole === 1 && (
                  <div style={{ width: '160px' }}>
                    <label className='form-label text-muted fw-semibold fs-7 mb-2'>Vessel</label>
                    <select
                      className='form-select form-select-sm'
                      value={vesselFilter}
                      onChange={(e) => {
                        setVesselFilter(e.target.value)
                        setCurrentPage(1)
                      }}
                      style={{
                        border: '1px solid #E4E6EF',
                        borderRadius: '6px',
                        padding: '8px 12px'
                      }}
                    >
                      <option value=''>All Vessels</option>
                      {Array.from(new Set(requisitionData.map(r => (r as any).vesselName).filter(Boolean)))
                        .sort()
                        .map(vesselName => (
                          <option key={vesselName} value={vesselName}>
                            {vesselName}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Category Filter */}
                <div style={{ width: '160px' }}>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Category</label>
                  <select
                    className='form-select form-select-sm'
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      padding: '8px 12px'
                    }}
                  >
                    <option value=''>All Categories</option>
                    {Array.from(new Set(requisitionData.map(r => r.category).filter(c => c && c !== 'N/A')))
                      .sort()
                      .map(category => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Head Filter */}
                <div style={{ width: '160px' }}>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Head</label>
                  <select
                    className='form-select form-select-sm'
                    value={headFilter}
                    onChange={(e) => {
                      setHeadFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      padding: '8px 12px'
                    }}
                  >
                    <option value=''>All Heads</option>
                    {Array.from(new Set(requisitionData.map(r => (r as any).inventoryItemHead).filter(h => h && h !== '-')))
                      .sort()
                      .map(head => (
                        <option key={head} value={head}>
                          {head}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Sub Head Filter */}
                <div style={{ width: '160px' }}>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Sub Head</label>
                  <select
                    className='form-select form-select-sm'
                    value={subHeadFilter}
                    onChange={(e) => {
                      setSubHeadFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      padding: '8px 12px'
                    }}
                  >
                    <option value=''>All Sub Heads</option>
                    {Array.from(new Set(requisitionData.map(r => (r as any).inventoryItemSubHead).filter(sh => sh && sh !== '-')))
                      .sort()
                      .map(subHead => (
                        <option key={subHead} value={subHead}>
                          {subHead}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div style={{ width: '160px' }}>
                  <label className='form-label text-muted fw-semibold fs-7 mb-2'>Status</label>
                  <select
                    className='form-select form-select-sm'
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    style={{
                      border: '1px solid #E4E6EF',
                      borderRadius: '6px',
                      padding: '8px 12px'
                    }}
                  >
                    <option value=''>All Status</option>
                    {userRole === 1 || userRole === 4 ? (
                      <>
                        <option value='Draft'>Draft</option>
                        <option value='Submitted'>Submitted</option>
                        <option value='Vessel Approved'>Vessel Approved</option>
                        <option value='Shore Approved'>Shore Approved</option>
                        <option value='Rejected'>Rejected</option>
                      </>
                    ) : userRole === 5 ? (
                      <>
                        <option value='Vessel Approved'>Vessel Approved</option>
                        <option value='Shore Approved'>Shore Approved</option>
                      </>
                    ) : (
                      <>
                        <option value='Draft'>Draft</option>
                        <option value='Submitted'>Submitted</option>
                        <option value='Vessel Approved'>Vessel Approved</option>
                        <option value='Shore Approved'>Shore Approved</option>
                        <option value='Rejected'>Rejected</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className='mb-8'>
                <h4 className='fw-bold text-primary mb-4'>Requisitions ({sortedData.length})</h4>

                {isLoading ? (
                  <div className='text-center py-5'>
                    <div className='spinner-border text-primary' role='status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className='report-table table-responsive'>
                    <div style={{ overflowX: 'auto' }}>
                      <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%', minWidth: '1000px' }}>
                        <thead className='table-header text-start'>
                          <tr>
                            <th onClick={() => handleSort('title')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '160px', minWidth: '160px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>TITLE</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'title' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            {userRole === 1 && (
                              <th className='align-middle text-nowrap' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '150px' }}>VESSEL</th>
                            )}
                            <th className='align-middle text-nowrap' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '140px' }}>ITEM NAME</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '200px' }}>DESCRIPTION</th>
                            <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '120px' }}>CATEGORY</th>
                            <th className='align-middle text-nowrap' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '120px' }}>URGENCY</th>
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '110px' }}>HEAD</th> */}
                            {/* <th className='align-middle text-nowrap' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '135px' }}>SUB HEAD</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '150px' }}>PART</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '180px' }}>SUBCOMPONENTS</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '110px' }}>MAKE</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '110px' }}>MODEL</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '120px' }}>SERIAL NO.</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '120px' }}>PORT</th> */}
                            <th onClick={() => handleSort('requiredDate')} className='cursor-pointer align-middle' style={{ padding: '12px 8px', width: '110px' }}>
                              <div className='d-flex align-items-center'>
                                <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap' }}>DUE DATE</span>
                                <div style={{ transform: 'translateY(-2px)' }}>
                                  <KTSVG
                                    path={`/media/map/sort-col-${sortConfig.key === 'requiredDate' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                    className='svg-icon ms-2 custom-sort-icon'
                                  />
                                </div>
                              </div>
                            </th>
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '80px' }}>QTY</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '100px' }}>EST. VALUE</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '150px' }}>EQUIPMENT</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '180px' }}>JUSTIFICATION</th> */}
                            {/* <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '120px' }}>ATTACHMENTS</th> */}
                            <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '120px' }}>STATUS</th>
                            <th className='align-middle text-center' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '200px', minWidth: '200px' }}>ACTIONS</th>
                          </tr>
                        </thead>

                        <tbody className='table-body text-start'>
                          {currentRecords.length === 0 ? (
                            <tr>
                              <td colSpan={userRole === 1 ? 9 : 8} className='text-center text-muted py-5'>
                                {userRole === 5
                                  ? 'No shore-approved requisitions found.'
                                  : 'No requisitions found for the selected criteria.'}
                              </td>
                            </tr>
                          ) : (
                            currentRecords.map((record) => (
                              <tr key={record.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', width: '160px', minWidth: '160px', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.title}
                                </td>
                                {userRole === 1 && (
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {record.vesselName}
                                  </td>
                                )}
                                <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.itemName}
                                </td>
                                <td className='text-dark fs-6 text-nowrap' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.itemDescription}
                                </td>
                                <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                  {record.category}
                                </td>
                                <td style={{ padding: '12px 8px' }}>
                                  {/* Show urgency badge + friendly SLA text */}
                                  {getUrgencyBadge(record.urgency)} <small className='ms-1 text-muted'>
                                    {record.urgency === 'Low' ? '90d' : record.urgency === 'Medium' ? '15d' : '0d'}
                                  </small>
                                </td>
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.inventoryItemHead || '-'}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.inventoryItemSubHead || '-'}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.part}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                  {(record as any).subComponents && (record as any).subComponents.length > 0 ? (
                                    <div style={{ maxHeight: '60px', overflowY: 'auto' }}>
                                      {(record as any).subComponents.map((sc: string, idx: number) => (
                                        <div key={idx} className='badge badge-light-primary me-1 mb-1' style={{ fontSize: '11px' }}>
                                          {sc}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    record.subComponent || '-'
                                  )}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.make}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.model}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.serialNumber}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.requestedPort}
                                </td> */}

                                <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                  {record.requiredDate}
                                </td>
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                  {record.quantity}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                  ${record.estimatedValue}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.equipmentLink !== 'N/A' ? (
                                    <a href={record.equipmentLink} target='_blank' rel='noopener noreferrer'
                                      className='text-primary text-hover-primary text-decoration-underline'>
                                      Link
                                    </a>
                                  ) : 'N/A'}
                                </td> */}
                                {/* <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                  <div style={{
                                    maxHeight: '40px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    lineHeight: '20px'
                                  }}>
                                    {record.justification}
                                  </div>
                                </td> */}
                                {/* <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                                  {requisitionAttachments[record.id]?.length > 0 ? (
                                    <div>
                                      <button
                                        className='btn btn-link p-0 text-primary text-hover-primary d-flex align-items-center'
                                        style={{ fontSize: '13px' }}
                                        onClick={() => handleAttachmentClick(requisitionAttachments[record.id][0])}
                                      >
                                        <KTSVG path='/media/icons/duotune/files/fil003.svg' className='svg-icon-4 me-1' />
                                        {requisitionAttachments[record.id][0].fileName.length > 12
                                          ? requisitionAttachments[record.id][0].fileName.substring(0, 12) + '...'
                                          : requisitionAttachments[record.id][0].fileName}
                                      </button>
                                      {requisitionAttachments[record.id].length > 1 && (
                                        <small className='text-muted d-block mt-1'>+{requisitionAttachments[record.id].length - 1} more</small>
                                      )}
                                    </div>
                                  ) : (
                                    <span className='text-muted'>-</span>
                                  )}
                                </td> */}
                                <td style={{ padding: '12px 8px' }}>
                                  {getStatusBadge(record.status)}
                                </td>
                                <td className='text-center' style={{ padding: '12px 8px', width: '200px', minWidth: '200px', maxWidth: '200px' }}>
                                  {renderActions(record)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div
                      className='pagination-wrapper d-flex justify-content-between align-items-center py-3'
                      style={{
                        position: 'static',
                        bottom: 0,
                        backgroundColor: '#fff',
                        zIndex: 10,
                        borderTop: '1px solid #dee2e6',
                        marginTop: 'auto'
                      }}
                    >
                      <div className='d-flex align-items-center'>
                        <span className='text-muted me-2'>Rows per page</span>
                        <select
                          className='form-select'
                          style={{
                            borderRadius: '20px',
                            width: '70px',
                            border: '1px solid #dee2e6',
                            fontSize: '14px',
                            padding: '4px 8px'
                          }}
                          value={rowsPerPage}
                          onChange={handleRowsPerPageChange}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                      <div className='d-flex align-items-center'>
                        <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                          Showing <strong>{currentRecords.length > 0 ? ((currentPage - 1) * rowsPerPage) + 1 : 0}-{Math.min(currentPage * rowsPerPage, sortedData.length)}</strong> of <strong>{sortedData.length}</strong>
                        </span>

                        <nav>
                          <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button
                                className='page-link text-muted'
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '6px'
                                }}
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                              >
                                ‹
                              </button>
                            </li>

                            {(() => {
                              const pages = []
                              const showPages = 5
                              let startPage = Math.max(1, currentPage - 2)
                              let endPage = Math.min(totalPages, startPage + showPages - 1)

                              if (endPage - startPage < showPages - 1) {
                                startPage = Math.max(1, endPage - showPages + 1)
                              }

                              if (startPage > 1) {
                                pages.push(
                                  <li key={1} className='page-item'>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handlePageChange(1)}
                                    >
                                      1
                                    </button>
                                  </li>
                                )

                                if (startPage > 2) {
                                  pages.push(
                                    <li key='ellipsis1' className='page-item disabled'>
                                      <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                    </li>
                                  )
                                }
                              }

                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: currentPage === i ? '#F4F9FF' : 'transparent',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                        outline: 'none',
                                        boxShadow: 'none'
                                      }}
                                      onClick={() => handlePageChange(i)}
                                    >
                                      {i}
                                    </button>
                                  </li>
                                )
                              }

                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                  pages.push(
                                    <li key='ellipsis2' className='page-item disabled'>
                                      <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>...</span>
                                    </li>
                                  )
                                }

                                pages.push(
                                  <li key={totalPages} className='page-item'>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handlePageChange(totalPages)}
                                    >
                                      {totalPages}
                                    </button>
                                  </li>
                                )
                              }

                              return pages
                            })()}

                            <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                              <button
                                className='page-link text-muted'
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '6px'
                                }}
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages || totalPages === 0}
                              >
                                ›
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(userRole === 1 || userRole === 4) && (
        <CreateRequisitionModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          onSubmit={handleAddRequisitionSuccess}
          vesselId={vesselId}
          parts={parts}
          ports={ports}
          setPorts={setPorts}
          categories={categories}
          onSaveExtras={upsertExtras}
        />
      )}

      <ViewRequisitionModal
        visible={isViewModalVisible}
        onClose={() => {
          setIsViewModalVisible(false)
          setSelectedRequisition(null)
        }}
        requisition={selectedRequisition}
        attachments={selectedRequisition ? requisitionAttachments[selectedRequisition.id] : []}
        onAttachmentClick={handleAttachmentClick}
      />

      {selectedAttachment && (
        <RequisitionAttachmentViewer
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
          onDownload={handleDownloadAttachment}
        />
      )}


      {selectedRequisitionId && (
        <AddItemsModal
          visible={addItemsModalVisible}
          onClose={() => setAddItemsModalVisible(false)}
          onSubmit={handleAddItemsSuccess}
          requisitionId={selectedRequisitionId}
          parts={parts}
          ports={ports}
          categories={categories}
          userRole={userRole}
          companyGroupAdminId={(currentUser as any)?.vessel?.companyGroupAdminId || (currentUser as any)?.companyGroupAdminId}
        />
      )}



      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ top: "5rem" }}
      />
    </div>
  )
}

export { RequisitionList }


