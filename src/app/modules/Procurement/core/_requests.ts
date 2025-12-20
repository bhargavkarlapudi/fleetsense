import axios from 'axios'
import {
  SubcatalogueType,
  Part,
  CreatePartRequest,
  InventoryItem,
  CreateInventoryRequest,
  UpdateInventoryRequest,
  InventoryPageResponse,
  UnitOfMeasure,
  Requisition,
  CreateRequisitionRequest,
  UpdateRequisitionRequest,
  RequisitionPageResponse,
  NextCodeResponse,
  Port,
  CreatePortRequest,
  ApproveVesselRequest,
  ApproveShoreRequest,
  FileRefDto,
  RFQ,
  CreateRFQFromRequisitionRequest,
  UpdateRFQStatusRequest,
  Vendor,
  CreateVendorRequest,
  UpdateVendorRequest,
  VendorPageResponse,
  InventoryCategory,
  InventoryItemHead,
  CreateInventoryItemHeadRequest,
  InventoryItemSubHead,
  CreateInventoryItemSubHeadRequest,
  AccountingAccount,
  SubAccount,
  SubCatalogue,
  SubComponent,
  CreateSubComponentRequest,
  CompanyAdmin,
  CompanyGroupAdmin,
  SubCompanyAdmin,
  Vessel,
  PurchaseOrder,
  GoodsReceipt,
  CreateGoodsReceiptRequest,
  Invoice,
  CreateInvoiceRequest,
  Delivery
} from './_models'

const API_URL = process.env.REACT_APP_API_URL || '/api'

const SUBCATALOGUE_TYPES_URL = `${API_URL}/subcatalogue-types`
const PARTS_URL = `${API_URL}/parts`
const INVENTORY_URL = `${API_URL}/inventory`
const UOM_URL = `${API_URL}/uom`
const REQUISITIONS_URL = `${API_URL}/requisitions`
const PORTS_URL = `${API_URL}/ports`
const RFQS_URL = `${API_URL}/rfqs`
const QUOTATIONS_URL = `${API_URL}/quotations`
const VENDORS_URL = `${API_URL}/vendors`
const INVENTORY_CATEGORIES_URL = `${API_URL}/inventory-item-categories/inventory-item-categories`
const INVENTORY_CATEGORIES_CREATE_URL = `${API_URL}/inventory-item-categories`
const INVENTORY_ITEM_HEADS_URL = `${API_URL}/inventory/item-heads`
const INVENTORY_ITEM_SUBHEADS_URL = `${API_URL}/inventory/item-subheads`
const ACCOUNTING_URL = `${API_URL}/accounting/accounts`
const SUBACCOUNTS_URL = `${API_URL}/accounting/subaccounts`
const SUBCATALOGUES_URL = `${API_URL}/master-asset/subcatalogues`
const SUBCOMPONENTS_URL = `${API_URL}/subcomponents`
const GOODS_RECEIPTS_URL = `${API_URL}/grns`
const INVOICES_URL = `${API_URL}/invoices`
const DELIVERIES_URL = `${API_URL}/deliveries`

// ——— SUBCATALOGUE TYPES (Categories) ——————————————————————————————————————

export const getSubcatalogueTypes = async (): Promise<SubcatalogueType[]> => {
  try {
    const response = await axios.get<SubcatalogueType[]>(SUBCATALOGUE_TYPES_URL)
    return response.data
  } catch (error: any) {
    console.error('Error fetching subcatalogue types:', error)
    throw new Error(error.response?.data?.message || 'Error fetching subcatalogue types')
  }
}

// ——— PARTS ——————————————————————————————————————————————————————————————————

export const getParts = async (): Promise<Part[]> => {
  try {
    const response = await axios.get<any>(PARTS_URL)
    return response.data.content || response.data
  } catch (error: any) {
    console.error('Error fetching parts:', error)
    throw new Error(error.response?.data?.message || 'Error fetching parts')
  }
}

export const getPartById = async (partId: number): Promise<Part> => {
  try {
    const response = await axios.get<Part>(`${PARTS_URL}/${partId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching part:', error)
    throw new Error(error.response?.data?.message || 'Error fetching part')
  }
}

export const createPart = async (payload: CreatePartRequest): Promise<Part> => {
  try {
    const response = await axios.post<Part>(PARTS_URL, payload)
    return response.data
  } catch (error: any) {
    console.error('Error creating part:', error)
    throw new Error(error.response?.data?.message || 'Error creating part')
  }
}

export const updatePart = async (partId: number, payload: CreatePartRequest): Promise<Part> => {
  try {
    const response = await axios.put<Part>(`${PARTS_URL}/${partId}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating part:', error)
    throw new Error(error.response?.data?.message || 'Error updating part')
  }
}

export const deletePart = async (partId: number): Promise<void> => {
  try {
    await axios.delete(`${PARTS_URL}/${partId}`)
  } catch (error: any) {
    console.error('Error deleting part:', error)
    throw new Error(error.response?.data?.message || 'Error deleting part')
  }
}

// ——— INVENTORY ——————————————————————————————————————————————————————————————

export const getInventory = async (
  vesselId: number | null,
  page: number = 0,
  size: number = 20,
  cgaId?: number
): Promise<InventoryPageResponse> => {
  try {
    const params: any = {
      page,
      size
    }
    // Only add vesselId if it's provided (for non-superadmin users)
    if (vesselId !== null && vesselId !== undefined) {
      params.vesselId = vesselId
    }
    if (cgaId !== undefined) {
      params.cgaId = cgaId
    }
    const response = await axios.get(INVENTORY_URL, {
      params
    })
    console.log('secondinventory raw API response:', response.data)

    let pageResponse: InventoryPageResponse

    if (Array.isArray(response.data)) {
      // Backend returned raw array → wrap it into a valid Page object
      const content = response.data as InventoryItem[]
      pageResponse = {
        content,
        pageable: {
          pageNumber: page,
          pageSize: size,
          sort: { sorted: false, unsorted: true, empty: false },
          offset: page * size,
          paged: true,
          unpaged: false
        },
        last: true,
        totalPages: content.length > 0 ? Math.ceil(content.length / size) : 1,
        totalElements: content.length,
        size,
        number: page,
        sort: { sorted: false, unsorted: true, empty: false },
        first: page === 0,
        numberOfElements: content.length,
        empty: content.length === 0
      }
    } else {
      // Proper Page object (or fallback)
      pageResponse = response.data as InventoryPageResponse
      if (!Array.isArray(pageResponse.content)) {
        pageResponse.content = []
      }
    }

    console.log('secondinventory normalized Page object:', pageResponse)
    return pageResponse
  } catch (error: any) {
    console.error('Error fetching inventory:', error)
    throw new Error(error.response?.data?.message || 'Error fetching inventory')
  }
}

export const getInventoryById = async (inventoryId: number): Promise<InventoryItem> => {
  try {
    const response = await axios.get<InventoryItem>(`${INVENTORY_URL}/${inventoryId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching inventory item:', error)
    throw new Error(error.response?.data?.message || 'Error fetching inventory item')
  }
}

export const createInventory = async (payload: CreateInventoryRequest): Promise<InventoryItem> => {
  try {
    const response = await axios.post<InventoryItem>(INVENTORY_URL, payload)
    return response.data
  } catch (error: any) {
    console.error('Error creating inventory item:', error)
    throw new Error(error.response?.data?.message || 'Error creating inventory item')
  }
}

export const updateInventory = async (
  inventoryId: number,
  payload: UpdateInventoryRequest
): Promise<InventoryItem> => {
  try {
    const response = await axios.put<InventoryItem>(`${INVENTORY_URL}/${inventoryId}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating inventory item:', error)
    throw new Error(error.response?.data?.message || 'Error updating inventory item')
  }
}

export const deleteInventory = async (inventoryId: number): Promise<void> => {
  try {
    await axios.delete(`${INVENTORY_URL}/${inventoryId}`)
  } catch (error: any) {
    console.error('Error deleting inventory item:', error)
    throw new Error(error.response?.data?.message || 'Error deleting inventory item')
  }
}

// ——— UNIT OF MEASURE ————————————————————————————————————————————————————————

export const getUnitsOfMeasure = async (): Promise<UnitOfMeasure[]> => {
  try {
    const response = await axios.get<UnitOfMeasure[]>(UOM_URL)
    return response.data
  } catch (error: any) {
    console.error('Error fetching units of measure:', error)
    throw new Error(error.response?.data?.message || 'Error fetching units of measure')
  }
}

// ——— REQUISITIONS ———————————————————————————————————————————————————————————

// Test API connectivity
export const testRequisitionAPI = async (): Promise<boolean> => {
  try {
    console.log('Testing API connectivity to:', REQUISITIONS_URL)
    console.log('Full API URL:', API_URL)
    console.log('Environment REACT_APP_API_URL:', process.env.REACT_APP_API_URL)

    // First test with a simple GET request
    const response = await axios.get(REQUISITIONS_URL, {
      timeout: 5000,
      headers: {
        'Accept': 'application/json'
      }
    })
    console.log('GET API test successful:', response.status, response.data)

    // Test if POST is supported by sending an OPTIONS request
    try {
      const optionsResponse = await axios.options(REQUISITIONS_URL)
      console.log('OPTIONS response:', optionsResponse.headers)
    } catch (optionsError) {
      console.log('OPTIONS request failed (this is normal for some APIs)')
    }

    return true
  } catch (error: any) {
    console.error('API test failed:', error.message)
    console.error('Error status:', error.response?.status)
    console.error('Error details:', error.response?.data)
    console.error('Error headers:', error.response?.headers)
    return false
  }
}

// Test function to verify API integration with sample data
export const testCreateRequisitionWithFormData = async (): Promise<void> => {
  try {
    console.log('Testing requisition creation with FormData...')

    const testPayload: CreateRequisitionRequest = {
      title: "Test Starter spares for main engine",
      requisition_code: "REQ-TEST-001",
      description: "Test requisition for API integration",
      type: "MEDIUM",
      category: { id: 2 },
      vesselId: 2,
      requestedPortId: 5,
      requiredDeliveryDate: "2025-11-20",
      partId: 45,
      isCompletePartRequired: false,
      quantity: 10,
      uom: "PCS",
      estimatedUnitPrice: 1200.50,
      equipmentLink: null,
      justification: "API integration test",
      status: "DRAFT"
    }

    const result = await createRequisition(testPayload)
    console.log('Test requisition created successfully:', result)

    // Clean up - try to delete the test requisition
    try {
      await deleteRequisition(result.id)
      console.log('Test requisition cleaned up successfully')
    } catch (cleanupError) {
      console.warn('Could not clean up test requisition:', cleanupError)
    }

  } catch (error: any) {
    console.error('Test failed:', error)
    throw error
  }
}

export const getNextRequisitionCode = async (): Promise<string> => {
  try {
    const response = await axios.get<NextCodeResponse>(`${REQUISITIONS_URL}/next-code`)
    return response.data.nextCode
  } catch (error: any) {
    console.error('Error fetching next requisition code:', error)
    // Return a fallback code if the API doesn't support this endpoint
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `REQ-${timestamp}-${randomNum}`
  }
}

export const getRequisitions = async (
  page?: number,
  size?: number,
  vesselId?: number | null
): Promise<RequisitionPageResponse> => {
  try {
    console.log('Fetching requisitions from:', REQUISITIONS_URL)

    const params: any = {}
    // Only add pagination params if they are provided
    if (page !== undefined && page !== null) {
      params.page = page
    }
    if (size !== undefined && size !== null) {
      params.size = size
    }
    // Only add vesselId if it's provided and not null (for non-superadmin users)
    if (vesselId !== null && vesselId !== undefined) {
      params.vesselId = vesselId
    }

    const response = await axios.get<any>(REQUISITIONS_URL, {
      params,
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log('Raw requisitions response:', response.data)
    
    // Use defaults for pagination metadata when not provided
    const pageNum = page ?? 0
    const pageSize = size ?? (Array.isArray(response.data) ? response.data.length : response.data?.content?.length ?? 0)

    // Handle both paginated and direct array responses
    if (Array.isArray(response.data)) {
      // Direct array response - convert to paginated format
      return {
        content: response.data,
        pageable: {
          pageNumber: pageNum,
          pageSize: pageSize,
          sort: { sorted: false, empty: true, unsorted: true },
          offset: pageNum * pageSize,
          paged: true,
          unpaged: false
        },
        last: true,
        totalPages: 1,
        totalElements: response.data.length,
        size: response.data.length,
        number: pageNum,
        sort: { sorted: false, empty: true, unsorted: true },
        first: true,
        numberOfElements: response.data.length,
        empty: response.data.length === 0
      }
    } else if (response.data && response.data.content) {
      // Paginated response
      return response.data
    } else {
      // Single object response - wrap in array
      const singleItem = response.data
      return {
        content: singleItem ? [singleItem] : [],
        pageable: {
          pageNumber: pageNum,
          pageSize: pageSize,
          sort: { sorted: false, empty: true, unsorted: true },
          offset: pageNum * pageSize,
          paged: true,
          unpaged: false
        },
        last: true,
        totalPages: 1,
        totalElements: singleItem ? 1 : 0,
        size: singleItem ? 1 : 0,
        number: pageNum,
        sort: { sorted: false, empty: true, unsorted: true },
        first: true,
        numberOfElements: singleItem ? 1 : 0,
        empty: !singleItem
      }
    }
  } catch (error: any) {
    console.error('Error fetching requisitions:', error)
    throw new Error(error.response?.data?.message || 'Error fetching requisitions')
  }
}

export const getRequisitionById = async (requisitionId: number): Promise<Requisition> => {
  try {
    const GET_URL = `${REQUISITIONS_URL}/${requisitionId}`
    console.log('Fetching requisition by ID:', requisitionId, 'from URL:', GET_URL)

    const response = await axios.get<Requisition>(GET_URL, {
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log('Requisition fetched successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error fetching requisition:', error)
    throw new Error(error.response?.data?.message || 'Error fetching requisition')
  }
}

export const createRequisition = async (
  payload: CreateRequisitionRequest,
  files?: File[]
): Promise<Requisition> => {
  try {
    const CREATE_REQUISITION_URL = `${API_URL}/requisitions/create`

    console.log('Creating requisition with payload:', JSON.stringify(payload, null, 2))
    console.log('Sending to URL:', CREATE_REQUISITION_URL)
    console.log('Files to upload:', files?.length || 0)

    // Create FormData
    const formData = new FormData()

    // Add required fields to FormData
    formData.append('title', payload.title)
    formData.append('requisition_code', payload.requisition_code)
    formData.append('description', payload.description)
    formData.append('type', payload.type)
    formData.append('category.id', payload.category.id.toString())
    formData.append('vesselId', payload.vesselId.toString())
    if (payload.requestedPortId) {
      formData.append('requestedPortId', payload.requestedPortId.toString())
    }
    if (payload.customPortName) {
      formData.append('customPortName', payload.customPortName)
    }
    formData.append('requiredDeliveryDate', payload.requiredDeliveryDate)
    formData.append('justification', payload.justification)

    // Add optional inventory item head and sub head
    if (payload.inventoryItemHeadId) {
      formData.append('inventoryItemHeadId', payload.inventoryItemHeadId.toString())
    }
    if (payload.inventoryItemSubHeadId) {
      formData.append('inventoryItemSubHeadId', payload.inventoryItemSubHeadId.toString())
    }

    // Add optional item detail fields
    if (payload.make) {
      formData.append('make', payload.make)
    }
    if (payload.model) {
      formData.append('model', payload.model)
    }
    if (payload.serialNumber) {
      formData.append('serialNumber', payload.serialNumber)
    }

    // Add optional part and subcomponent fields
    if (payload.partId) {
      formData.append('partId', payload.partId.toString())
    }
    if (payload.subcomponent && payload.subcomponent.id) {
      formData.append('subcomponent.id', payload.subcomponent.id.toString())
    }

    // Add optional quantity and pricing fields
    if (payload.isCompletePartRequired !== undefined) {
      formData.append('isCompletePartRequired', payload.isCompletePartRequired.toString())
    }
    if (payload.quantity) {
      formData.append('quantity', payload.quantity.toString())
    }
    if (payload.uom) {
      formData.append('uom', payload.uom)
    }
    if (payload.estimatedUnitPrice) {
      formData.append('estimatedUnitPrice', payload.estimatedUnitPrice.toString())
    }
    if (payload.equipmentLink) {
      formData.append('equipmentLink', payload.equipmentLink)
    }

    // Add files if provided
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('files', file)
      })
      console.log('Added', files.length, 'files to FormData')
    }

    console.log('FormData entries:')
    formData.forEach((value, key) => {
      console.log(`${key}: ${value}`)
    })

    const response = await axios.post<Requisition>(CREATE_REQUISITION_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
      timeout: 10000
    })

    console.log('Requisition created successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error creating requisition:', error)
    console.error('Error message:', error.message)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)
    console.error('Request URL:', error.config?.url)

    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to API server. Please check if the server is running.')
    } else if (error.response?.status === 405) {
      throw new Error('Method not allowed. The API endpoint may not support POST requests.')
    } else if (error.response?.status === 404) {
      throw new Error('API endpoint not found. Please check the URL.')
    } else if (error.response?.status === 400) {
      const validationErrors = error.response?.data?.errors || error.response?.data?.message
      throw new Error(`Validation error: ${JSON.stringify(validationErrors)}`)
    } else if (error.response?.status === 500) {
      throw new Error(`Server error: ${error.response?.data?.message || 'Internal server error'}`)
    } else {
      throw new Error(error.response?.data?.message || error.message || 'Error creating requisition')
    }
  }
}

export const updateRequisition = async (
  requisitionId: number,
  payload: UpdateRequisitionRequest,
  files?: File[]
): Promise<Requisition> => {
  try {
    // Use the correct update endpoint format
    const UPDATE_URL = `${API_URL}/requisitions/update/${requisitionId}`

    console.log('=== UPDATE REQUISITION DEBUG ===')
    console.log('Updating requisition with payload:', JSON.stringify(payload, null, 2))
    console.log('Update URL:', UPDATE_URL)
    console.log('Full API_URL:', API_URL)
    console.log('Payload inventoryItemHeadId:', payload.inventoryItemHeadId)
    console.log('Payload inventoryItemSubHeadId:', payload.inventoryItemSubHeadId)
    console.log('Payload make:', payload.make)
    console.log('Payload model:', payload.model)
    console.log('Payload serialNumber:', payload.serialNumber)

    // Create FormData for the update request
    const formData = new FormData()

    // Add required fields
    formData.append('title', payload.title)

    // Add optional fields only if they exist
    if (payload.requisition_code) formData.append('requisition_code', payload.requisition_code)
    if (payload.description) formData.append('description', payload.description)
    if (payload.type) formData.append('type', payload.type)
    if (payload.category?.id) formData.append('category.id', payload.category.id.toString())

    // Add inventory item head and sub head IDs
    if (payload.inventoryItemHeadId !== null && payload.inventoryItemHeadId !== undefined) {
      formData.append('inventoryItemHeadId', payload.inventoryItemHeadId.toString())
      console.log('Adding inventoryItemHeadId to FormData:', payload.inventoryItemHeadId)
    }
    if (payload.inventoryItemSubHeadId !== null && payload.inventoryItemSubHeadId !== undefined) {
      formData.append('inventoryItemSubHeadId', payload.inventoryItemSubHeadId.toString())
      console.log('Adding inventoryItemSubHeadId to FormData:', payload.inventoryItemSubHeadId)
    }

    if (payload.accountCode) formData.append('accountCode', payload.accountCode)
    if (payload.subAccountingCode) formData.append('subAccountingCode', payload.subAccountingCode)
    if (payload.make) formData.append('make', payload.make)
    if (payload.model) formData.append('model', payload.model)
    if (payload.serialNumber) formData.append('serialNumber', payload.serialNumber)

    if (payload.vesselId) formData.append('vesselId', payload.vesselId.toString())
    if (payload.requestedPortId) formData.append('requestedPortId', payload.requestedPortId.toString())
    if (payload.requiredDeliveryDate) formData.append('requiredDeliveryDate', payload.requiredDeliveryDate)

    // API requires exactly one of: equipment/subcomponent/part/manualItemName
    // Only send the fields that are not null
    if (payload.equipmentId !== null && payload.equipmentId !== undefined) {
      formData.append('equipmentId', payload.equipmentId.toString())
    }
    if (payload.subcomponent?.id !== null && payload.subcomponent?.id !== undefined) {
      formData.append('subcomponent.id', payload.subcomponent.id.toString())
    }
    if (payload.partId !== null && payload.partId !== undefined) {
      formData.append('partId', payload.partId.toString())
    }

    if (payload.isCompletePartRequired !== undefined) {
      formData.append('isCompletePartRequired', payload.isCompletePartRequired.toString())
    }

    // Always send manualItemName if it exists (this is what we're updating)
    if (payload.manualItemName !== null && payload.manualItemName !== undefined && payload.manualItemName.trim() !== '') {
      formData.append('manualItemName', payload.manualItemName)
    }

    if (payload.quantity !== undefined) formData.append('quantity', payload.quantity.toString())
    if (payload.uom) formData.append('uom', payload.uom)
    if (payload.estimatedUnitPrice !== undefined) formData.append('estimatedUnitPrice', payload.estimatedUnitPrice.toString())

    if (payload.equipmentLink) formData.append('equipmentLink', payload.equipmentLink)

    if (payload.justification) formData.append('justification', payload.justification)
    if (payload.status) formData.append('status', payload.status)

    // Add lines array if present
    if (payload.lines && payload.lines.length > 0) {
      payload.lines.forEach((line, index) => {
        formData.append(`lines[${index}].partId`, line.partId.toString())
        if (line.subcomponentId !== null && line.subcomponentId !== undefined) {
          formData.append(`lines[${index}].subcomponentId`, line.subcomponentId.toString())
        }
        formData.append(`lines[${index}].quantity`, line.quantity.toString())
        if (line.estimatedUnitPrice !== null && line.estimatedUnitPrice !== undefined) {
          formData.append(`lines[${index}].estimatedUnitPrice`, line.estimatedUnitPrice.toString())
        }
        if (line.unitOfMeasurement) {
          formData.append(`lines[${index}].unitOfMeasurement`, line.unitOfMeasurement)
        }
        if (line.remarks) {
          formData.append(`lines[${index}].remarks`, line.remarks)
        }
      })
    }

    // Add files if provided
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('files', file)
      })
      console.log('Added', files.length, 'files to update FormData')
    }

    console.log('FormData entries for update:')
    const entries = Array.from(formData.entries())
    entries.forEach(([key, value]) => {
      console.log(`${key}: ${value}`)
    })

    // Debug: Check which item-related fields are being sent
    const itemFields = ['equipmentId', 'subcomponent.id', 'partId', 'manualItemName']
    const sentItemFields = entries.filter(([key]) => itemFields.includes(key))
    console.log('Item-related fields being sent:', sentItemFields)
    console.log('Number of item fields:', sentItemFields.length)

    // Debug: Check if HEAD, SUB HEAD, MAKE, MODEL, SERIAL NO are in FormData
    const preservedFields = ['inventoryItemHeadId', 'inventoryItemSubHeadId', 'make', 'model', 'serialNumber']
    const sentPreservedFields = entries.filter(([key]) => preservedFields.includes(key))
    console.log('🔍 Preserved fields being sent:', sentPreservedFields)
    console.log('🔍 Number of preserved fields:', sentPreservedFields.length)
    console.log('=== END UPDATE DEBUG ===')

    // Create a fresh axios instance for the update
    const freshAxios = axios.create({
      baseURL: '',
      timeout: 10000,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
      transformRequest: [(data) => data]
    })

    // Add auth header if available
    const auth = localStorage.getItem('kt-auth-react-v')
    if (auth) {
      try {
        const authData = JSON.parse(auth)
        if (authData?.auth?.jwt) {
          freshAxios.defaults.headers.common['Authorization'] = `Bearer ${authData.auth.jwt}`
        }
      } catch (e) {
        console.warn('Could not parse auth data:', e)
      }
    }

    const response = await freshAxios.put<Requisition>(UPDATE_URL, formData)

    console.log('Requisition updated successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error updating requisition:', error)
    console.error('Error message:', error.message)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)
    console.error('Request URL:', error.config?.url)

    if (error.response?.status === 400) {
      const validationErrors = error.response?.data?.errors || error.response?.data?.message
      throw new Error(`Validation error: ${JSON.stringify(validationErrors)}`)
    } else if (error.response?.status === 404) {
      throw new Error('Requisition not found')
    } else if (error.response?.status === 500) {
      throw new Error(`Server error: ${error.response?.data?.message || 'Internal server error'}`)
    } else {
      throw new Error(error.response?.data?.message || error.message || 'Error updating requisition')
    }
  }
}

export const deleteRequisition = async (requisitionId: number): Promise<void> => {
  try {
    await axios.delete(`${REQUISITIONS_URL}/${requisitionId}`)
  } catch (error: any) {
    console.error('Error deleting requisition:', error)
    throw new Error(error.response?.data?.message || 'Error deleting requisition')
  }
}

export const submitRequisition = async (requisitionId: number): Promise<Requisition> => {
  try {
    const response = await axios.post<Requisition>(`${REQUISITIONS_URL}/${requisitionId}/submit`)
    return response.data
  } catch (error: any) {
    console.error('Error submitting requisition:', error)
    throw new Error(error.response?.data?.message || 'Error submitting requisition')
  }
}

export const approveVesselRequisition = async (
  requisitionId: number,
  payload: ApproveVesselRequest
): Promise<Requisition> => {
  try {
    const response = await axios.post<Requisition>(
      `${REQUISITIONS_URL}/${requisitionId}/approve-vessel`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error approving vessel requisition:', error)
    throw new Error(error.response?.data?.message || 'Error approving vessel requisition')
  }
}

export const approveShoreRequisition = async (
  requisitionId: number,
  payload: ApproveShoreRequest
): Promise<Requisition> => {
  try {
    const response = await axios.post<Requisition>(
      `${REQUISITIONS_URL}/${requisitionId}/approve-shore`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error approving shore requisition:', error)
    throw new Error(error.response?.data?.message || 'Error approving shore requisition')
  }
}

export const getRequisitionAttachments = async (requisitionId: number): Promise<FileRefDto[]> => {
  try {
    const response = await axios.get<FileRefDto[]>(`${REQUISITIONS_URL}/${requisitionId}/attachments`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching requisition attachments:', error)
    throw new Error(error.response?.data?.message || 'Error fetching requisition attachments')
  }
}

export const uploadRequisitionAttachments = async (
  requisitionId: number,
  files: File[]
): Promise<FileRefDto[]> => {
  try {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    const response = await axios.post<FileRefDto[]>(
      `${REQUISITIONS_URL}/${requisitionId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data
  } catch (error: any) {
    console.error('Error uploading requisition attachments:', error)
    throw new Error(error.response?.data?.message || 'Error uploading requisition attachments')
  }
}

// ——— PORTS ——————————————————————————————————————————————————————————————————

export const getPorts = async (): Promise<Port[]> => {
  try {
    const response = await axios.get<any>(PORTS_URL)
    console.log('Raw ports response:', response.data)

    let portsData: any[] = []

    if (response.data.content && Array.isArray(response.data.content)) {
      console.log('Ports are paginated, extracting content')
      portsData = response.data.content
    } else if (Array.isArray(response.data)) {
      console.log('Ports returned as direct array')
      portsData = response.data
    } else {
      console.warn('Unexpected ports response format:', response.data)
      return []
    }

    const mappedPorts: Port[] = portsData.map(port => ({
      id: port.id,
      name: port.main_port || port.name || 'Unknown Port',
      code: port.code || '',
      country: port.country || '',
      latitude: port.latitude,
      longitude: port.longitude,
      main_port: port.main_port
    }))

    console.log('Mapped ports:', mappedPorts.length, mappedPorts.slice(0, 5))
    return mappedPorts
  } catch (error: any) {
    console.error('Error fetching ports:', error)
    throw new Error(error.response?.data?.message || 'Error fetching ports')
  }
}

export const getPortById = async (portId: number): Promise<Port> => {
  try {
    const response = await axios.get<Port>(`${PORTS_URL}/${portId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching port:', error)
    throw new Error(error.response?.data?.message || 'Error fetching port')
  }
}

export const createPort = async (portData: CreatePortRequest): Promise<Port> => {
  try {
    console.log('Creating port with data:', portData)
    const response = await axios.post<Port>(PORTS_URL, portData)
    console.log('Port created successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error creating port:', error)
    throw new Error(error.response?.data?.message || 'Error creating port')
  }
}

// ——— GOODS RECEIPTS ————————————————————————————————————————————————————————

export const getGoodsReceipts = async (): Promise<GoodsReceipt[]> => {
  try {
    console.log('Fetching goods receipts from:', GOODS_RECEIPTS_URL)
    const response = await axios.get<GoodsReceipt[]>(GOODS_RECEIPTS_URL, {
      headers: {
        'Accept': 'application/json'
      }
    })
    console.log('Goods receipts fetched successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error fetching goods receipts:', error)
    throw new Error(error.response?.data?.message || 'Error fetching goods receipts')
  }
}

export const getGoodsReceiptById = async (id: number): Promise<GoodsReceipt> => {
  try {
    const response = await axios.get<GoodsReceipt>(`${GOODS_RECEIPTS_URL}/${id}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching goods receipt:', error)
    throw new Error(error.response?.data?.message || 'Error fetching goods receipt')
  }
}

export const createGoodsReceipt = async (
  payload: CreateGoodsReceiptRequest,
  photoFiles?: File[]
): Promise<GoodsReceipt> => {
  try {
    console.log('Creating goods receipt with payload:', JSON.stringify(payload, null, 2))
    console.log('Photo files to upload:', photoFiles?.length || 0)

    // Create FormData for multipart request
    const formData = new FormData()

    // Add basic fields
    formData.append('purchaseOrderId', payload.purchaseOrderId.toString())
    formData.append('receivedDate', payload.receivedDate)
    formData.append('receivedBy', payload.receivedBy)
    formData.append('generalNotes', payload.generalNotes)

    // Add line items
    payload.lines.forEach((line, index) => {
      formData.append(`lines[${index}].inventoryItemId`, line.inventoryItemId.toString())
      formData.append(`lines[${index}].itemDescription`, line.itemDescription)
      formData.append(`lines[${index}].partNumber`, line.partNumber)
      formData.append(`lines[${index}].expectedQty`, line.expectedQty.toString())
      formData.append(`lines[${index}].receivedQty`, line.receivedQty.toString())
      formData.append(`lines[${index}].condition`, line.condition)
      if (line.notes) {
        formData.append(`lines[${index}].notes`, line.notes)
      }
    })

    // Add photo files
    if (photoFiles && photoFiles.length > 0) {
      photoFiles.forEach((file) => {
        formData.append('photoFiles', file)
      })
      console.log('Added', photoFiles.length, 'photo files to FormData')
    }

    console.log('FormData entries:')
    formData.forEach((value, key) => {
      console.log(`${key}: ${value}`)
    })

    const response = await axios.post<GoodsReceipt>(GOODS_RECEIPTS_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Accept': 'application/json'
      },
      timeout: 30000
    })

    console.log('Goods receipt created successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error creating goods receipt:', error)
    console.error('Error message:', error.message)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)

    if (error.response?.status === 400) {
      const validationErrors = error.response?.data?.errors || error.response?.data?.message
      throw new Error(`Validation error: ${JSON.stringify(validationErrors)}`)
    } else if (error.response?.status === 404) {
      throw new Error('API endpoint not found. Please check the URL.')
    } else if (error.response?.status === 500) {
      throw new Error(`Server error: ${error.response?.data?.message || 'Internal server error'}`)
    } else {
      throw new Error(error.response?.data?.message || error.message || 'Error creating goods receipt')
    }
  }
}

// ——— RFQ ————————————————————————————————————————————————————————————————————



export const getRFQById = async (rfqId: number): Promise<RFQ> => {
  try {
    const response = await axios.get<RFQ>(`${RFQS_URL}/${rfqId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching RFQ:', error)
    throw new Error(error.response?.data?.message || 'Error fetching RFQ')
  }
}

export const createRFQFromRequisition = async (
  requisitionId: number,
  payload: CreateRFQFromRequisitionRequest
): Promise<RFQ> => {
  try {
    console.log('Creating RFQ from requisition:', requisitionId, 'with payload:', payload)
    const response = await axios.post<RFQ>(
      `${RFQS_URL}/from-requisition/${requisitionId}`,
      payload
    )
    console.log('RFQ created successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error creating RFQ from requisition:', error)
    console.error('Error response:', error.response?.data)
    throw new Error(error.response?.data?.message || 'Error creating RFQ from requisition')
  }
}

export const inviteVendorsToRFQ = async (
  rfqId: number,
  vendorIds: number[],
  requisitionLineId?: number
): Promise<RFQ> => {
  try {
    console.log('Inviting vendors to RFQ:', rfqId, 'vendors:', vendorIds, 'lineId:', requisitionLineId)
    // API expects array of objects with vendorIds property
    // If requisitionLineId is provided, include it in the payload
    const payload = requisitionLineId
      ? [{ vendorIds, requisitionLineId }]
      : [{ vendorIds }]

    console.log('Invite payload:', payload)
    const response = await axios.post<RFQ>(`${RFQS_URL}/${rfqId}/invite`, payload)
    console.log('Vendors invited successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error inviting vendors:', error)
    console.error('Error response:', error.response?.data)
    throw new Error(error.response?.data?.message || 'Error inviting vendors to RFQ')
  }
}

// New function to invite vendors for multiple lines
export const inviteVendorsToRFQLines = async (
  rfqId: number,
  lineInvitations: Array<{ requisitionLineId: number; vendorIds: number[] }>
): Promise<RFQ> => {
  try {
    console.log('Inviting vendors to RFQ lines:', rfqId, 'invitations:', lineInvitations)

    // Send all line invitations in a single request
    const payload = lineInvitations.map(inv => ({
      vendorIds: inv.vendorIds,
      requisitionLineId: inv.requisitionLineId
    }))

    console.log('Invite lines payload:', payload)
    const response = await axios.post<RFQ>(`${RFQS_URL}/${rfqId}/invite`, payload)
    console.log('Vendors invited to lines successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error inviting vendors to lines:', error)
    console.error('Error response:', error.response?.data)
    throw new Error(error.response?.data?.message || 'Error inviting vendors to RFQ lines')
  }
}

export const getRFQs = async (cgaid?: number): Promise<RFQ[]> => {
  try {
    const params: any = {}
    if (cgaid) params.cgaid = cgaid

    console.log('Fetching RFQs from:', RFQS_URL, 'with params:', params)
    const response = await axios.get<any>(RFQS_URL, { params })
    console.log('RFQs response:', response.data)

    // Handle both array and paginated responses
    if (Array.isArray(response.data)) {
      console.log('RFQs loaded (array):', response.data.length, 'items')
      return response.data
    } else if (response.data.content && Array.isArray(response.data.content)) {
      console.log('RFQs loaded (paginated):', response.data.content.length, 'items')
      return response.data.content
    } else {
      console.warn('Unexpected RFQ response format:', response.data)
      return []
    }
  } catch (error: any) {
    console.error('Error fetching RFQs:', error)
    throw new Error(error.response?.data?.message || 'Error fetching RFQs')
  }
}

export const getNextRFQCode = async (): Promise<string> => {
  try {
    const response = await axios.get<NextCodeResponse>(`${RFQS_URL}/next-code`)
    return response.data.nextCode
  } catch (error: any) {
    console.error('Error fetching next RFQ code:', error)
    // Return a fallback code if the API doesn't support this endpoint
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `RFQ-${timestamp}-${randomNum}`
  }
}

export const getRFQVendors = async (rfqId: number): Promise<number[]> => {
  try {
    const rfq = await getRFQById(rfqId)
    return rfq.invitedVendorIds || []
  } catch (error: any) {
    console.error('Error fetching RFQ vendors:', error)
    return []
  }
}

export const sendRFQ = async (rfqId: number, payload: UpdateRFQStatusRequest): Promise<RFQ> => {
  try {
    const response = await axios.post<RFQ>(`${RFQS_URL}/${rfqId}/send`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error sending RFQ:', error)
    throw new Error(error.response?.data?.message || 'Error sending RFQ')
  }
}

export const deleteRFQ = async (rfqId: number): Promise<void> => {
  try {
    await axios.delete(`${RFQS_URL}/${rfqId}`)
  } catch (error: any) {
    console.error('Error deleting RFQ:', error)
    throw new Error(error.response?.data?.message || 'Error deleting RFQ')
  }
}

// ——— QUOTATIONS ————————————————————————————————————————————————————————————

export const getQuotationsByRFQ = async (rfqId: number): Promise<any[]> => {
  try {
    const response = await axios.get(`${QUOTATIONS_URL}/rfq/${rfqId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching quotations:', error)
    throw new Error(error.response?.data?.message || 'Error fetching quotations')
  }
}

export const selectQuotation = async (quotationId: number, actualQuantityAssignedToVendor?: number): Promise<any> => {
  try {
    const payload: any = {
      status: 'SELECTED'
    }

    if (actualQuantityAssignedToVendor !== undefined) {
      payload.actualQuantityAssignedToVendor = actualQuantityAssignedToVendor
    }

    const response = await axios.post(`${QUOTATIONS_URL}/${quotationId}/select`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error selecting quotation:', error)
    throw new Error(error.response?.data?.message || 'Error selecting quotation')
  }
}

export const closeQuotation = async (quotationId: number): Promise<any> => {
  try {
    const response = await axios.post(`${QUOTATIONS_URL}/${quotationId}/close`)
    return response.data
  } catch (error: any) {
    console.error('Error closing quotation:', error)
    throw new Error(error.response?.data?.message || 'Error closing quotation')
  }
}

// ——— VENDORS ————————————————————————————————————————————————————————————————

const VENDOR_CATEGORIES_URL = `${API_URL}/vendor-categories`

export const getVendorCategories = async (): Promise<Array<{ id: number, name: string }>> => {
  try {
    const response = await axios.get<Array<{ id: number, name: string }>>(VENDOR_CATEGORIES_URL)
    return response.data
  } catch (error: any) {
    console.error('Error fetching vendor categories:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vendor categories')
  }
}

export const getVendors = async (
  page: number = 0,
  size: number = 20
): Promise<VendorPageResponse> => {
  try {
    const response = await axios.get<any>(VENDORS_URL, {
      params: { page, size }
    })

    // Handle both array and paginated responses
    if (Array.isArray(response.data)) {
      return {
        content: response.data,
        pageable: {
          pageNumber: page,
          pageSize: size,
          sort: { sorted: false, empty: true, unsorted: true },
          offset: page * size,
          paged: true,
          unpaged: false
        },
        last: true,
        totalPages: 1,
        totalElements: response.data.length,
        size: response.data.length,
        number: page,
        sort: { sorted: false, empty: true, unsorted: true },
        first: true,
        numberOfElements: response.data.length,
        empty: response.data.length === 0
      }
    } else if (response.data.content) {
      return response.data
    } else {
      return {
        content: [],
        pageable: {
          pageNumber: page,
          pageSize: size,
          sort: { sorted: false, empty: true, unsorted: true },
          offset: 0,
          paged: true,
          unpaged: false
        },
        last: true,
        totalPages: 0,
        totalElements: 0,
        size: 0,
        number: page,
        sort: { sorted: false, empty: true, unsorted: true },
        first: true,
        numberOfElements: 0,
        empty: true
      }
    }
  } catch (error: any) {
    console.error('Error fetching vendors:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vendors')
  }
}

export const getVendorById = async (vendorId: number): Promise<Vendor> => {
  try {
    const response = await axios.get<Vendor>(`${VENDORS_URL}/${vendorId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching vendor:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vendor')
  }
}

export const createVendor = async (payload: CreateVendorRequest): Promise<Vendor> => {
  try {
    const response = await axios.post<Vendor>(VENDORS_URL, payload)
    return response.data
  } catch (error: any) {
    console.error('Error creating vendor:', error)
    throw new Error(error.response?.data?.message || 'Error creating vendor')
  }
}

export const updateVendor = async (
  vendorId: number,
  payload: UpdateVendorRequest
): Promise<Vendor> => {
  try {
    const response = await axios.put<Vendor>(`${VENDORS_URL}/${vendorId}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating vendor:', error)
    throw new Error(error.response?.data?.message || 'Error updating vendor')
  }
}

export const deleteVendor = async (vendorId: number): Promise<void> => {
  try {
    await axios.delete(`${VENDORS_URL}/${vendorId}`)
  } catch (error: any) {
    console.error('Error deleting vendor:', error)
    throw new Error(error.response?.data?.message || 'Error deleting vendor')
  }
}


export const addItemsToRequisition = async (
  requisitionId: number,
  payload: {
    itemName: string
    quantity: number
    uom: string
    estimatedUnitPrice: number
  }
): Promise<Requisition> => {
  try {
    const response = await axios.put<Requisition>(
      `${REQUISITIONS_URL}/${requisitionId}/add-items`,
      payload
    )
    return response.data
  } catch (error: any) {
    console.error('Error adding items to requisition:', error)
    throw new Error(error.response?.data?.message || 'Error adding items to requisition')
  }
}


// ——— INVENTORY CATEGORIES ——————————————————————————————————————————————————

export const getInventoryCategories = async (cgaId: number, vesselId: number, vesselType?: string): Promise<InventoryCategory[]> => {
  try {
    // If vesselType is provided, use it instead of vesselId (for SuperAdmin users)
    const params = vesselType
      ? `cgaId=${cgaId}&vesselType=${vesselType}`
      : `cgaId=${cgaId}&vesselId=${vesselId}`

    const response = await axios.get<InventoryCategory[]>(`${INVENTORY_CATEGORIES_URL}?${params}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching inventory categories:', error)
    throw new Error(error.response?.data?.message || 'Error fetching inventory categories')
  }
}

export const getInventoryCategoriesByVesselType = async (cgaId: number, vesselType: string): Promise<InventoryCategory[]> => {
  try {
    const response = await axios.get<InventoryCategory[]>(`${INVENTORY_CATEGORIES_URL}?cgaId=${cgaId}&vesselType=${vesselType}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching inventory categories by vessel type:', error)
    throw new Error(error.response?.data?.message || 'Error fetching inventory categories by vessel type')
  }
}

export const getAllInventoryCategoriesForCompany = async (cgaId: number, vesselType?: string): Promise<InventoryCategory[]> => {
  try {
    // If vesselType is provided, fetch for that specific vessel type
    if (vesselType) {
      const response = await axios.get<InventoryCategory[]>(`${INVENTORY_CATEGORIES_URL}?cgaId=${cgaId}&vesselType=${vesselType}`)
      console.log(`Fetching categories for cgaId=${cgaId}, vesselType=${vesselType}`)
      return response.data || []
    }

    // If no vesselType, fetch for all common vessel types and combine results
    const vesselTypes = [
      'OIL_TANKER', 'TANKER', 'GAS_CARRIER', 'CHEMICAL_TANKER', 'PRODUCT_TANKER',
      'LNG_CARRIER', 'LPG_CARRIER', 'CRUDE_OIL_TANKER', 'BUNKER_TANKER',
      'CONTAINER_SHIP', 'BULK_CARRIER', 'GENERAL_CARGO_SHIP', 'RORO_CARGO_SHIP',
      'HEAVY_LIFT_VESSEL', 'REEFER_SHIP', 'MULTI_PURPOSE_VESSEL', 'HIGH_SPEED_CRAFT'
    ]

    console.log(`Fetching categories for cgaId=${cgaId} across all vessel types`)

    // Fetch categories for all vessel types in parallel
    const promises = vesselTypes.map(vType =>
      axios.get<InventoryCategory[]>(`${INVENTORY_CATEGORIES_URL}?cgaId=${cgaId}&vesselType=${vType}`)
        .then(res => res.data || [])
        .catch(err => {
          console.warn(`Failed to fetch categories for vesselType=${vType}:`, err.message)
          return []
        })
    )

    const results = await Promise.all(promises)

    // Flatten and deduplicate by category ID
    const allCategories = results.flat()
    const uniqueCategories = Array.from(
      new Map(allCategories.map(cat => [cat.id, cat])).values()
    )

    console.log(`Fetched ${uniqueCategories.length} unique categories for cgaId=${cgaId}`)
    return uniqueCategories
  } catch (error: any) {
    console.error('Error fetching inventory categories for company:', error)
    throw new Error(error.response?.data?.message || 'Error fetching inventory categories')
  }
}

// Function to load categories for all companies (for superadmin)
export const getAllInventoryCategoriesForAllCompanies = async (): Promise<InventoryCategory[]> => {
  try {
    // Use the new API endpoint that returns all categories for all companies
    const response = await axios.get<InventoryCategory[]>(INVENTORY_CATEGORIES_URL)
    return response.data
  } catch (error: any) {
    console.error('Error loading categories for all companies:', error)
    throw new Error('Error fetching inventory categories for all companies')
  }
}

export const createInventoryCategory = async (payload: {
  name: string
  cgaid: { id: number }
  vesselType: string
}): Promise<InventoryCategory> => {
  try {
    const response = await axios.post<InventoryCategory>(INVENTORY_CATEGORIES_CREATE_URL, payload)
    return response.data
  } catch (error: any) {
    console.error('Error creating inventory category:', error)
    throw new Error(error.response?.data?.message || 'Error creating inventory category')
  }
}

export const updateInventoryCategory = async (id: number, payload: {
  name: string
  cgaid: { id: number }
  caid: { id: number | null }
  vesselType: string
}): Promise<InventoryCategory> => {
  try {
    const response = await axios.put<InventoryCategory>(`${INVENTORY_CATEGORIES_CREATE_URL}/${id}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating inventory category:', error)
    throw new Error(error.response?.data?.message || 'Error updating inventory category')
  }
}

export const deleteInventoryCategory = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${INVENTORY_CATEGORIES_CREATE_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting inventory category:', error)
    throw new Error(error.response?.data?.message || 'Error deleting inventory category')
  }
}

// ——— INVENTORY ITEM HEADS ——————————————————————————————————————————————————

export const getInventoryItemHeads = async (): Promise<InventoryItemHead[]> => {
  try {
    const response = await axios.get<InventoryItemHead[]>(INVENTORY_ITEM_HEADS_URL)
    return response.data
  } catch (error: any) {
    console.error('Error fetching inventory item heads:', error)
    throw new Error(error.response?.data?.message || 'Error fetching inventory item heads')
  }
}

export const createInventoryItemHead = async (payload: CreateInventoryItemHeadRequest): Promise<InventoryItemHead> => {
  try {
    const response = await axios.post<InventoryItemHead>(INVENTORY_ITEM_HEADS_URL, payload)
    return response.data
  } catch (error: any) {
    console.error('Error creating inventory item head:', error)
    throw new Error(error.response?.data?.message || 'Error creating inventory item head')
  }
}

export const updateInventoryItemHead = async (id: number, payload: CreateInventoryItemHeadRequest): Promise<InventoryItemHead> => {
  try {
    const response = await axios.put<InventoryItemHead>(`${INVENTORY_ITEM_HEADS_URL}/${id}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating inventory item head:', error)
    throw new Error(error.response?.data?.message || 'Error updating inventory item head')
  }
}

export const deleteInventoryItemHead = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${INVENTORY_ITEM_HEADS_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting inventory item head:', error)
    throw new Error(error.response?.data?.message || 'Error deleting inventory item head')
  }
}

// ——— INVENTORY ITEM SUB HEADS ——————————————————————————————————————————————————

export const getInventoryItemSubHeads = async (): Promise<InventoryItemSubHead[]> => {
  try {
    const response = await axios.get<InventoryItemSubHead[]>(INVENTORY_ITEM_SUBHEADS_URL)
    return response.data
  } catch (error: any) {
    console.error('Error fetching inventory item sub heads:', error)
    throw new Error(error.response?.data?.message || 'Error fetching inventory item sub heads')
  }
}

export const createInventoryItemSubHead = async (payload: CreateInventoryItemSubHeadRequest): Promise<InventoryItemSubHead> => {
  try {
    const response = await axios.post<InventoryItemSubHead>(INVENTORY_ITEM_SUBHEADS_URL, payload)
    return response.data
  } catch (error: any) {
    console.error('Error creating inventory item sub head:', error)
    throw new Error(error.response?.data?.message || 'Error creating inventory item sub head')
  }
}

export const updateInventoryItemSubHead = async (id: number, payload: CreateInventoryItemSubHeadRequest): Promise<InventoryItemSubHead> => {
  try {
    const response = await axios.put<InventoryItemSubHead>(`${INVENTORY_ITEM_SUBHEADS_URL}/${id}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating inventory item sub head:', error)
    throw new Error(error.response?.data?.message || 'Error updating inventory item sub head')
  }
}

export const deleteInventoryItemSubHead = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${INVENTORY_ITEM_SUBHEADS_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting inventory item sub head:', error)
    throw new Error(error.response?.data?.message || 'Error deleting inventory item sub head')
  }
}

// ——— ACCOUNTING ACCOUNTS ——————————————————————————————————————————————————

export const getAccountingAccounts = async (cgaId?: number, vesselType?: string): Promise<AccountingAccount[]> => {
  try {
    // Build query parameters if provided
    const params = new URLSearchParams()
    if (cgaId) params.append('cgaId', cgaId.toString())
    if (vesselType) params.append('vesselType', vesselType)

    const url = params.toString() ? `${ACCOUNTING_URL}?${params.toString()}` : ACCOUNTING_URL
    const response = await axios.get<AccountingAccount[]>(url)
    return Array.isArray(response.data) ? response.data : [response.data]
  } catch (error: any) {
    console.error('Error fetching accounting accounts:', error)
    throw new Error(error.response?.data?.message || 'Error fetching accounting accounts')
  }
}

// Function to get all accounting accounts without filtering
export const getAllAccountingAccounts = async (): Promise<AccountingAccount[]> => {
  try {
    const response = await axios.get<AccountingAccount[]>(ACCOUNTING_URL)
    return Array.isArray(response.data) ? response.data : [response.data]
  } catch (error: any) {
    console.error('Error fetching all accounting accounts:', error)
    throw new Error(error.response?.data?.message || 'Error fetching all accounting accounts')
  }
}

export const createAccountingAccount = async (payload: {
  accountCodes: string
  cgaid: { id: number }
  vesselType: string
  category?: { id: number }
}): Promise<AccountingAccount> => {
  try {
    // Try different payload formats based on the API specification
    // First attempt: exactly as specified in the original API doc
    const apiPayload = {
      accountCodes: payload.accountCodes,
      cgaid: payload.cgaid,
      vesselType: payload.vesselType,
      ...(payload.category && { category: payload.category })
    }

    console.log('Creating accounting account with payload (attempt 1 - string vesselType):', apiPayload)
    const response = await axios.post<AccountingAccount>(ACCOUNTING_URL, apiPayload)
    console.log('Accounting account created:', response.data)
    return response.data
  } catch (error: any) {
    console.error('First attempt failed, trying with object vesselType format')

    try {
      // Second attempt: with vesselType as object
      const apiPayload2 = {
        accountCodes: payload.accountCodes,
        cgaid: payload.cgaid,
        vesselType: { vesselType: payload.vesselType },
        ...(payload.category && { category: payload.category })
      }

      console.log('Creating accounting account with payload (attempt 2 - object vesselType):', apiPayload2)
      const response = await axios.post<AccountingAccount>(ACCOUNTING_URL, apiPayload2)
      console.log('Accounting account created:', response.data)
      return response.data
    } catch (error2: any) {
      console.error('Both attempts failed')
      console.error('Error creating accounting account:', error2)
      console.error('Full error response:', error2.response)
      throw new Error(error2.response?.data?.message || 'Error creating accounting account')
    }
  }
}

export const updateAccountingAccount = async (id: number, payload: {
  accountCodes: string
  vesselType: string
}): Promise<AccountingAccount> => {
  try {
    const response = await axios.put<AccountingAccount>(`${ACCOUNTING_URL}/${id}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating accounting account:', error)
    throw new Error(error.response?.data?.message || 'Error updating accounting account')
  }
}

// ——— SUB ACCOUNTS ——————————————————————————————————————————————————————————

export const getSubAccounts = async (accountId: number, cgaId?: number, vesselType?: string): Promise<SubAccount[]> => {
  try {
    // Build query parameters
    const params = new URLSearchParams()
    params.append('accountId', accountId.toString())
    if (cgaId) params.append('cgaId', cgaId.toString())
    if (vesselType) params.append('vesselType', vesselType)

    const response = await axios.get<SubAccount[]>(`${SUBACCOUNTS_URL}?${params.toString()}`)
    return Array.isArray(response.data) ? response.data : [response.data]
  } catch (error: any) {
    console.error('Error fetching sub accounts:', error)
    throw new Error(error.response?.data?.message || 'Error fetching sub accounts')
  }
}

export const createSubAccount = async (payload: {
  subaccountCodes: string
  accountCodeId: number
  cgaid: { id: number }
  vesselType: string
}): Promise<SubAccount[]> => {
  try {
    const response = await axios.post<SubAccount[]>(SUBACCOUNTS_URL, payload)
    return response.data
  } catch (error: any) {
    console.error('Error creating sub account:', error)
    throw new Error(error.response?.data?.message || 'Error creating sub account')
  }
}

export const updateSubAccount = async (id: number, payload: {
  subaccountCodes: string
  accountCodeId: number
  vesselType: string
}): Promise<SubAccount> => {
  try {
    const response = await axios.put<SubAccount>(`${SUBACCOUNTS_URL}/${id}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating sub account:', error)
    throw new Error(error.response?.data?.message || 'Error updating sub account')
  }
}

export const getAllSubAccounts = async (cgaId?: number): Promise<SubAccount[]> => {
  try {
    // First try to get all sub accounts without accountId parameter
    const params = new URLSearchParams()
    if (cgaId) params.append('cgaId', cgaId.toString())

    try {
      const response = await axios.get<SubAccount[]>(`${SUBACCOUNTS_URL}${params.toString() ? '?' + params.toString() : ''}`)
      return Array.isArray(response.data) ? response.data : [response.data]
    } catch (error: any) {
      // If the API doesn't support fetching all sub accounts, try with common account IDs
      console.log('API does not support fetching all sub accounts, trying with specific account IDs')

      const allSubAccounts: SubAccount[] = []
      const accountIds = Array.from({ length: 50 }, (_, i) => i + 1) // Try account IDs 1-50

      for (const accountId of accountIds) {
        try {
          const data: SubAccount[] = await getSubAccounts(accountId, cgaId)
          if (Array.isArray(data) && data.length > 0) {
            // Filter out duplicates based on ID
            const newSubAccounts = data.filter((newItem: SubAccount) =>
              !allSubAccounts.some((existing: SubAccount) => existing.id === newItem.id)
            )
            allSubAccounts.push(...newSubAccounts)
          }
        } catch (accountError) {
          // Continue with next account ID if this one fails
          console.log(`No sub accounts found for account ID ${accountId}`)
        }
      }

      return allSubAccounts
    }
  } catch (error: any) {
    console.error('Error fetching all sub accounts:', error)
    throw new Error(error.response?.data?.message || 'Error fetching all sub accounts')
  }
}

// ——— SUB CATALOGUES ——————————————————————————————————————————————————————————

export const getSubCatalogues = async (vesselType: string, subaccountId: number): Promise<SubCatalogue[]> => {
  try {

    const response = await axios.get(`${API_URL}/master-asset/subcats?vesselType=${vesselType}&subaccountId=${subaccountId}`)

    const data = response.data
    if (!data) {
      return []
    }
    return Array.isArray(data) ? data : [data]
  } catch (error: any) {
    console.error('Error fetching sub catalogues:', error)
    // Return empty array instead of throwing error if no data found
    if (error.response?.status === 404) {
      return []
    }
    throw new Error(error.response?.data?.message || 'Error fetching sub catalogues')
  }
}

export const getSubCataloguesBySubAccount = async (subaccountId: number, vesselType?: string): Promise<SubCatalogue[]> => {
  try {
    const params = new URLSearchParams()
    params.append('subaccountId', subaccountId.toString())
    if (vesselType) {
      params.append('vesselType', vesselType)
    }

    const response = await axios.get(`${API_URL}/master-asset/subcats?${params.toString()}`)
    const data = response.data
    if (!data) {
      return []
    }
    return Array.isArray(data) ? data : [data]
  } catch (error: any) {
    console.error('Error fetching sub catalogues by sub account:', error)
    if (error.response?.status === 404) {
      return []
    }
    throw new Error(error.response?.data?.message || 'Error fetching sub catalogues')
  }
}

// Cache for sub catalogues - stores data for 5 minutes
let subCataloguesCache: { data: SubCatalogue[]; timestamp: number } | null = null
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

// Clear cache when sub catalogues are modified
const clearSubCataloguesCache = () => {
  subCataloguesCache = null
  console.log('🗑️ Sub catalogues cache cleared')
}

export const createSubCatalogue = async (payload: {
  name: string
  vesselType: string
  cgaid: { id: number }
  subaccounts: Array<{ id: number }>
}): Promise<SubCatalogue> => {
  try {
    console.log('createSubCatalogue - Sending payload:', payload)
    const response = await axios.post<SubCatalogue>(SUBCATALOGUES_URL, payload)
    console.log('createSubCatalogue - Response:', response.data)

    // Clear cache so next fetch gets fresh data
    clearSubCataloguesCache()

    return response.data
  } catch (error: any) {
    console.error('Error creating sub catalogue:', error)
    throw new Error(error.response?.data?.message || 'Error creating sub catalogue')
  }
}

export const updateSubCatalogue = async (id: number, payload: {
  name: string
  vesselType: string
  cgaid: { id: number }
  subaccounts: Array<{ id: number }>
}): Promise<SubCatalogue> => {
  try {
    console.log('updateSubCatalogue - Sending payload:', payload)
    const response = await axios.put<SubCatalogue>(`${SUBCATALOGUES_URL}/${id}`, payload)
    console.log('updateSubCatalogue - Response:', response.data)

    // Clear cache so next fetch gets fresh data
    clearSubCataloguesCache()

    return response.data
  } catch (error: any) {
    console.error('Error updating sub catalogue:', error)
    throw new Error(error.response?.data?.message || 'Error updating sub catalogue')
  }
}

// Simple function to get all sub catalogues without parameters (for superadmin)
export const getAllSubCatalogues = async (): Promise<SubCatalogue[]> => {
  try {
    console.log('getAllSubCatalogues - Fetching from /subcats without parameters...')
    const response = await axios.get(`${API_URL}/master-asset/subcats`)
    console.log('getAllSubCatalogues - Response:', response.data)

    const data = response.data
    if (!data) {
      return []
    }
    return Array.isArray(data) ? data : [data]
  } catch (error: any) {
    console.error('Error fetching all sub catalogues:', error)
    if (error.response?.status === 404) {
      return []
    }
    throw new Error(error.response?.data?.message || 'Error fetching all sub catalogues')
  }
}

// ——— PARTS BY SUB CATALOGUE ——————————————————————————————————————————————————

export const getPartsBySubCatalogue = async (subcatalogueId: number): Promise<Part[]> => {
  try {
    const response = await axios.get<Part[]>(`${PARTS_URL}/by-subcat/${subcatalogueId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching parts by sub catalogue:', error)
    throw new Error(error.response?.data?.message || 'Error fetching parts by sub catalogue')
  }
}

// ——— SUB COMPONENTS ——————————————————————————————————————————————————————————

export const getSubComponents = async (): Promise<SubComponent[]> => {
  try {
    const response = await axios.get<SubComponent[]>(SUBCOMPONENTS_URL)
    return Array.isArray(response.data) ? response.data : [response.data]
  } catch (error: any) {
    console.error('Error fetching sub components:', error)
    throw new Error(error.response?.data?.message || 'Error fetching sub components')
  }
}

export const getSubComponentsByPartId = async (partId: number): Promise<SubComponent[]> => {
  try {
    const url = `${SUBCOMPONENTS_URL}?partId=${partId}`
    console.log('Fetching subcomponents from URL:', url)
    const response = await axios.get<SubComponent[]>(url)
    console.log('Raw API response:', response)
    console.log('Response data:', response.data)
    console.log('Is array?', Array.isArray(response.data))

    const result = Array.isArray(response.data) ? response.data : [response.data]
    console.log('Returning subcomponents:', result)
    return result
  } catch (error: any) {
    console.error('Error fetching sub components by part:', error)
    console.error('Error details:', error.response?.data)
    throw new Error(error.response?.data?.message || 'Error fetching sub components by part')
  }
}

export const createSubComponent = async (payload: CreateSubComponentRequest): Promise<SubComponent> => {
  try {
    const response = await axios.post<SubComponent>(SUBCOMPONENTS_URL, payload)
    return response.data
  } catch (error: any) {
    console.error('Error creating sub component:', error)
    throw new Error(error.response?.data?.message || 'Error creating sub component')
  }
}

export const updateSubComponent = async (id: number, payload: CreateSubComponentRequest): Promise<SubComponent> => {
  try {
    const response = await axios.put<SubComponent>(`${SUBCOMPONENTS_URL}/${id}`, payload)
    return response.data
  } catch (error: any) {
    console.error('Error updating sub component:', error)
    throw new Error(error.response?.data?.message || 'Error updating sub component')
  }
}

export const deleteSubComponent = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${SUBCOMPONENTS_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting sub component:', error)
    throw new Error(error.response?.data?.message || 'Error deleting sub component')
  }
}

// ——— DELETE FUNCTIONS ——————————————————————————————————————————————————————————

export const deleteAccountingAccount = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${ACCOUNTING_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting accounting account:', error)
    throw new Error(error.response?.data?.message || 'Error deleting accounting account')
  }
}

export const deleteSubAccount = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${SUBACCOUNTS_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting sub account:', error)
    throw new Error(error.response?.data?.message || 'Error deleting sub account')
  }
}

export const deleteSubCatalogue = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${SUBCATALOGUES_URL}/${id}`)
  } catch (error: any) {
    console.error('Error deleting sub catalogue:', error)
    throw new Error(error.response?.data?.message || 'Error deleting sub catalogue')
  }
}

// ——— COMPANY ADMINS ——————————————————————————————————————————————————————————

export const getCompanyAdminList = async (): Promise<CompanyAdmin[]> => {
  try {
    const response = await axios.get<CompanyAdmin[]>(`${API_URL}/company-group-admins`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching company admin list:', error)
    throw new Error(error.response?.data?.message || 'Error fetching company admin list')
  }
}

// ——— COMPANY GROUP ADMINS (for superadmin dropdowns) ——————————————————————————

export const getCompanyGroupAdmins = async (): Promise<CompanyGroupAdmin[]> => {
  try {
    const response = await axios.get<CompanyGroupAdmin[]>(`${API_URL}/company-group-admins`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching company group admins:', error)
    throw new Error(error.response?.data?.message || 'Error fetching company group admins')
  }
}

// ——— SUB COMPANY ADMINS (for subcompany dropdowns) ——————————————————————————

export const getSubCompanyAdmins = async (companyGroupAdminId: number): Promise<SubCompanyAdmin[]> => {
  try {
    const response = await axios.get<SubCompanyAdmin[]>(`${API_URL}/company-admins`, {
      params: { companyGroupAdminId }
    })
    return response.data
  } catch (error: any) {
    console.error('Error fetching sub company admins:', error)
    throw new Error(error.response?.data?.message || 'Error fetching sub company admins')
  }
}

// ——— VESSELS BY COMPANY (for vessel type dropdowns) ——————————————————————————

export const getVesselsByCompany = async (companyUsername: string): Promise<Vessel[]> => {
  try {
    const response = await axios.get<Vessel[]>(`${API_URL}/vessels/vessels-by-cga`, {
      params: { companyUsername }
    })
    return response.data
  } catch (error: any) {
    console.error('Error fetching vessels by company:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vessels by company')
  }
}

export const getVesselById = async (vesselId: number): Promise<Vessel> => {
  try {
    const response = await axios.get<Vessel>(`${API_URL}/vessels/${vesselId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching vessel by ID:', error)
    throw new Error(error.response?.data?.message || 'Error fetching vessel by ID')
  }
}

export const getAllVessels = async (): Promise<Vessel[]> => {
  try {
    const response = await axios.get<Vessel[]>(`${API_URL}/vessels`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching all vessels:', error)
    throw new Error(error.response?.data?.message || 'Error fetching all vessels')
  }
}

// ——— NEW INVENTORY MANAGEMENT APIs ——————————————————————————————————————————

// Updated Accounting Accounts API with cgaId and vesselType parameters
export const getAccountingAccountsWithParams = async (cgaId: number, vesselType: string): Promise<AccountingAccount[]> => {
  try {
    const response = await axios.get<AccountingAccount[]>(`${ACCOUNTING_URL}?cgaId=${cgaId}&vesselType=${vesselType}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching accounting accounts with params:', error)
    throw new Error(error.response?.data?.message || 'Error fetching accounting accounts')
  }
}

// ——— PURCHASE ORDERS ————————————————————————————————————————————————————————

const PURCHASE_ORDERS_URL = `${API_URL}/pos`

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  try {
    const response = await axios.get<PurchaseOrder[]>(PURCHASE_ORDERS_URL)
    return response.data
  } catch (error: any) {
    console.error('Error fetching purchase orders:', error)
    throw new Error(error.response?.data?.message || 'Error fetching purchase orders')
  }
}

export const sendPurchaseOrder = async (poId: number): Promise<any> => {
  try {
    const response = await axios.post<any>(`${PURCHASE_ORDERS_URL}/${poId}/send`)
    return response.data
  } catch (error: any) {
    console.error('Error sending purchase order:', error)
    throw new Error(error.response?.data?.message || 'Error sending purchase order')
  }
}




// ——— INVOICES ———————————————————————————————————————————————————————————————

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    console.log('Fetching invoices from:', INVOICES_URL)
    const response = await axios.get<Invoice[]>(INVOICES_URL, {
      headers: {
        'Accept': 'application/json'
      }
    })
    console.log('Invoices fetched successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    throw new Error(error.response?.data?.message || 'Error fetching invoices')
  }
}

export const getInvoiceById = async (invoiceId: number): Promise<Invoice> => {
  try {
    const response = await axios.get<Invoice>(`${INVOICES_URL}/${invoiceId}`)
    return response.data
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    throw new Error(error.response?.data?.message || 'Error fetching invoice')
  }
}

export const createInvoice = async (payload: CreateInvoiceRequest): Promise<Invoice> => {
  try {
    console.log('Creating invoice with payload:', payload)
    const response = await axios.post<Invoice>(INVOICES_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    console.log('Invoice created successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    throw new Error(error.response?.data?.message || 'Error creating invoice')
  }
}

export const deleteInvoice = async (invoiceId: number): Promise<void> => {
  try {
    await axios.delete(`${INVOICES_URL}/${invoiceId}`)
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    throw new Error(error.response?.data?.message || 'Error deleting invoice')
  }
}

export const markInvoiceAsPaid = async (invoiceId: number): Promise<Invoice> => {
  try {
    console.log('Marking invoice as paid:', invoiceId)
    const response = await axios.post<Invoice>(`${INVOICES_URL}/${invoiceId}/paid`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    console.log('Invoice marked as paid successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error marking invoice as paid:', error)
    throw new Error(error.response?.data?.message || 'Error marking invoice as paid')
  }
}


// ——— DELIVERIES ————————————————————————————————————————————————————————————

export const getDeliveries = async (): Promise<Delivery[]> => {
  try {
    console.log('Fetching deliveries from:', DELIVERIES_URL)
    const response = await axios.get<Delivery[]>(DELIVERIES_URL, {
      headers: {
        'Accept': 'application/json'
      }
    })
    console.log('Deliveries fetched successfully:', response.data)
    return response.data
  } catch (error: any) {
    console.error('Error fetching deliveries:', error)
    throw new Error(error.response?.data?.message || 'Error fetching deliveries')
  }
}

export const getDeliveryById = async (deliveryId: number): Promise<Delivery> => {
  try {
    const response = await axios.get<Delivery>(`${DELIVERIES_URL}/${deliveryId}`, {
      headers: {
        'Accept': 'application/json'
      }
    })
    return response.data
  } catch (error: any) {
    console.error('Error fetching delivery:', error)
    throw new Error(error.response?.data?.message || 'Error fetching delivery')
  }
}
