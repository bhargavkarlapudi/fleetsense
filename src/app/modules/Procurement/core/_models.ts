// Inventory Models
// Unit of Measure
export interface UnitOfMeasure {
  id: number
  code: string
  name: string
  symbol?: string | null
}

// Subcatalogue Type (Category)
export interface SubcatalogueType {
  id: number
  name: string
}

// Part
export interface Part {
  id: number
  code: string
  name: string
  uom: UnitOfMeasure
  inventoryItemSubHead?: {
    id: number
    name: string
  }
  subcatalogue?: {
    id: number
    name: string
    vesselType: string
    subCatalogueType?: {
      id: number
      name: string
    }
  }
  manufacturer: string
  partNo: string
  serialNumber?: string
}

export interface CreatePartRequest {
  code: string
  name: string
  uom: { id: number }
  inventoryItemSubHead: { id: number }
  manufacturer: string
  partNo: string
  serialNumber?: string
}

// Inventory Item
// REPLACE the InventoryItem interface with this one
export interface InventoryItem {
  id: number
  vesselId: number
  partId: number
  subcatId: number

  // NEW: backend now returns expanded objects too (optional)
  vessel?: Vessel
  part?: Part
  subcat?: SubCatalogue

  serialNumber?: string | null
  currentQty: number
  reorderLevel: number
  minThreshold: number
  maxThreshold: number
  unitCost: number
  location: string
  expiryDate?: string | null
}

export interface CreateInventoryRequest {
  vesselId: number
  partId: number
  subcatId: number
  subcomponentId?: number | null
  serialNumber?: string | null
  currentQty: number
  reorderLevel: number
  minThreshold: number
  maxThreshold: number
  unitCost: number
  location: string
  expiryDate?: string | null
}

export interface UpdateInventoryRequest {
  vesselId?: number
  partId?: number
  subcatId?: number
  serialNumber?: string | null
  currentQty?: number
  reorderLevel?: number
  minThreshold?: number
  maxThreshold?: number
  unitCost?: number
  location?: string
  expiryDate?: string | null
}

// Paginated Response
export interface PageableSort {
  sorted: boolean
  empty: boolean
  unsorted: boolean
}

export interface Pageable {
  pageNumber: number
  pageSize: number
  sort: PageableSort
  offset: number
  paged: boolean
  unpaged: boolean
}

export interface InventoryPageResponse {
  content: InventoryItem[]
  pageable: Pageable
  last: boolean
  totalPages: number
  totalElements: number
  size: number
  number: number
  sort: PageableSort
  first: boolean
  numberOfElements: number
  empty: boolean
}

// Combined view model for display (joining inventory + part + category)
export interface InventoryItemDisplay {
  id: number
  itemId: string
  itemName: string
  partNumber: string
  category: string
  subAccounting?: string
  subComponent?: string
  quantity: string
  location: string
  status: 'Active' | 'Obsolete' | 'Reserved'
  stockStatus: 'Low Stock' | 'Critical' | ''
  currentQty: number
  reorderLevel: number
  minThreshold: number
  maxThreshold: number
  unitCost: number
  manufacturer: string
  uom: string
  expiryDate?: string | null
  serialNumber?: string | null
  vesselId: number
  partId: number
  subcatId: number
  subcomponentId?: number | null
  description?: string
  equipmentHierarchy?: string
  supplier?: string
  serialNumbers?: string
  company?: string
  vesselType?: string
}

// Stock Alert
export interface StockAlert {
  id: string
  itemName: string
  partNumber: string
  currentStock: string
  reorderLevel: string
  location: string
  alertLevel: 'Critical' | 'Low Stock'
}

// Stock Movement
export interface StockMovement {
  id: string
  date: string
  itemName: string
  partNumber: string
  type: 'In' | 'Out' | 'Transfer'
  quantity: string
  from: string
  to: string
  performedBy: string
}

// ============= REQUISITION MODELS =============

export type RequisitionType = 'STORES' | 'SPARE_PARTS' | 'SERVICES' | 'REPAIRS'
export type RequisitionUrgency = 'HIGH' | 'MEDIUM' | 'LOW'
export type RequisitionStatus = 'DRAFT' | 'SUBMITTED' | 'PENDING_VESSEL_APPROVAL' | 'VESSEL_APPROVED' | 'PENDING_SHORE_APPROVAL' | 'SHORE_APPROVED' | 'REJECTED' | 'COMPLETED'

// File Reference DTO
export interface FileRefDto {
  fileName: string
  url: string
  sizeBytes: number
}

// Requisition API Response Model (updated to match new API)
export interface Requisition {
  id: number
  title: string
  requisition_code: string
  description: string
  type: RequisitionUrgency // Using urgency levels from API
  category?: { id: number }
  inventoryItemHeadId?: number | null
  inventoryItemSubHeadId?: number | null
  inventoryItemHead?: { id: number; name: string } | null
  inventoryItemSubHead?: { id: number; name: string } | null
  accountCode?: string
  subAccountingCode?: string
  subCatalogueId?: number | null
  make?: string
  model?: string
  serialNumber?: string
  vesselId: number
  requestedPortId: number | null
  customPortName?: string
  requiredDeliveryDate: string
  equipmentId?: number | null
  subcomponent?: { id: number } | null
  partId?: number | null
  isCompletePartRequired?: boolean
  manualItemName?: string | null
  quantity: number
  uom: string | null
  estimatedUnitPrice: number
  equipmentLink?: string | null
  justification: string
  status: RequisitionStatus
  vesselApproved?: boolean
  shoreApproved?: boolean
  attachments?: FileRefDto[]
  categoryId?: number | null
  lines?: Array<{
    id: number
    partId: number
    subcomponentId: number
    quantity: number
    estimatedUnitPrice: number
    notes?: string | null
  }>
}

// Create Requisition Request (matching API format)
export interface CreateRequisitionRequest {
  title: string
  requisition_code: string
  description: string
  type: RequisitionUrgency
  category: { id: number }
  inventoryItemHeadId?: number | null
  inventoryItemSubHeadId?: number | null
  make?: string
  model?: string
  serialNumber?: string
  vesselId: number
  requestedPortId: number | null
  customPortName?: string
  requiredDeliveryDate: string
  partId?: number | null
  subcomponent?: { id: number } | null
  isCompletePartRequired?: boolean
  quantity?: number | null
  uom?: string
  estimatedUnitPrice?: number | null
  equipmentLink?: string | null
  justification: string
  status: RequisitionStatus
}

// Requisition Line Item
export interface RequisitionLine {
  partId: number
  subcomponentId?: number | null
  quantity: number
  unitOfMeasurement?: string
  estimatedUnitPrice?: number
  remarks?: string
}

// Update Requisition Request (matching API format)
export interface UpdateRequisitionRequest {
  title: string
  requisition_code?: string
  description?: string
  type?: RequisitionUrgency
  category?: { id: number }
  inventoryItemHeadId?: number | null
  inventoryItemSubHeadId?: number | null
  accountCode?: string
  subAccountingCode?: string
  make?: string
  model?: string
  serialNumber?: string
  vesselId?: number
  requestedPortId?: number | null
  customPortName?: string
  requiredDeliveryDate?: string
  equipmentId?: number | null
  subcomponent?: { id: number } | null
  partId?: number | null
  isCompletePartRequired?: boolean
  manualItemName?: string | null
  quantity?: number
  uom?: string
  estimatedUnitPrice?: number
  equipmentLink?: string | null
  justification?: string
  status?: RequisitionStatus
  lines?: RequisitionLine[]
}

// Approve Vessel Request
export interface ApproveVesselRequest {
  status: 'VESSEL_APPROVED' | 'REJECTED'
  vesselApproved: boolean
}

// Approve Shore Request
export interface ApproveShoreRequest {
  status: 'SHORE_APPROVED' | 'REJECTED'
  shoreApproved: boolean
}

// Requisition Page Response
export interface RequisitionPageResponse {
  content: Requisition[]
  pageable: Pageable
  last: boolean
  totalPages: number
  totalElements: number
  size: number
  number: number
  sort: PageableSort
  first: boolean
  numberOfElements: number
  empty: boolean
}

// Next Code Response
export interface NextCodeResponse {
  nextCode: string
}

// Display model for Requisition List
export interface RequisitionDisplay {
  id: number
  reqNumber: string
  title: string
  itemName: string
  itemDescription: string
  category: string
  urgency: 'High' | 'Medium' | 'Low'
  requestedPort: string
  requiredDate: string
  quantity: string
  estimatedValue: string
  equipmentLink: string
  justification: string
  status: string
  vesselStatus: string
  shoreStatus: string
  type: string
  subComponent?: string
  subComponents?: string[] | null
  vesselName?: string
  vesselId?: number
}

// Port Model 
export interface Port {
  id: number
  name: string
  code?: string
  country?: string
  latitude?: number
  longitude?: number
  main_port?: string
}

export interface CreatePortRequest {
  name: string
  code?: string
  country?: string
  latitude?: number
  longitude?: number
  main_port?: string
}

// ============= RFQ MODELS =============

export type RFQStatus = 'DRAFT' | 'SENT' | 'RESPONDED' | 'PENDING'

// File Reference DTO
export interface FileRefDto {
  fileName: string
  url: string
  sizeBytes: number
}

// RFQ Model
export interface RFQ {
  id: number
  title: string
  requisitionId: number
  responseDueDate: string
  cgaid: number
  caid: number
  status: RFQStatus
  itemDescription: string
  technicalSpecifications: string
  deliveryPortOverrideId?: number | null
  invitedVendorIds: number[]
  attachments: FileRefDto[]
  // Optional fields for backward compatibility
  rfqNumber?: string
  itemName?: string
  deliveryPortId?: number
  deliveryPort?: Port
  estimatedValue?: number
  quantity?: number
  uom?: string
  createdAt?: string
  updatedAt?: string
}

// Create RFQ from Requisition Request
export interface CreateRFQFromRequisitionRequest {
  title: string
  responseDueDate: string
  cgaid: number
  caid?: number | null
  itemDescription: string
  technicalSpecifications: string
  deliveryPortOverrideId?: number | null
}

// Create RFQ Manually Request
export interface CreateRFQRequest {
  itemName: string
  itemDescription: string
  technicalSpecifications?: string
  responseDueDate: string
  deliveryPortId: number
  estimatedValue: number
  quantity: number
  uom: string
}

// Update RFQ Status Request
export interface UpdateRFQStatusRequest {
  status: RFQStatus
}

// RFQ Page Response
export interface RFQPageResponse {
  content: RFQ[]
  pageable: Pageable
  last: boolean
  totalPages: number
  totalElements: number
  size: number
  number: number
  sort: PageableSort
  first: boolean
  numberOfElements: number
  empty: boolean
}

// Vendor Details for RFQ
export interface VendorRFQDetails {
  vendorId: number
  vendorName: string
  status: 'Responded' | 'Pending'
  responseDate?: string
}

// RFQ Display Model
export interface RFQDisplay {
  id: number
  rfqNumber: string
  status: RFQStatus
  itemName: string
  itemDescription: string
  requisitionNumber?: string
  responseDueDate: string
  deliveryPort: string
  estimatedValue: string
  quantity: string
  vendors: number
  responses: string
  vendorDetails: VendorRFQDetails[]
}

// ============= VENDOR MODELS =============

export type VendorStatus = 'Preferred' | 'Approved' | 'Under Review' | 'Blocklisted'

// Vendor Model
export interface Vendor {
  id: number
  vendorCode?: string
  code?: string
  name: string
  contactPerson?: string
  contactNo?: string
  email: string
  phone?: string
  categories?: string[]
  categoryIds?: number[]
  regions?: string[]
  status?: VendorStatus
  tag?: string
  orderCount?: number
  totalOrders?: number
  avgDeliveryTime?: string
  avgDeliveryDays?: number
  rating?: number
  issueCount?: number
  address?: string
  paymentTerms?: string
  createdAt?: string
  updatedAt?: string
}

// Create Vendor Request
export interface CreateVendorRequest {
  name: string
  contactPerson: string
  email: string
  phone: string
  categories: string[]
  regions: string[]
  status: VendorStatus
  address: string
  paymentTerms: string
}

// Update Vendor Request
export interface UpdateVendorRequest {
  name?: string
  contactPerson?: string
  email?: string
  phone?: string
  categories?: string[]
  regions?: string[]
  status?: VendorStatus
  address?: string
  paymentTerms?: string
}

// Vendor Page Response
export interface VendorPageResponse {
  content: Vendor[]
  pageable: Pageable
  last: boolean
  totalPages: number
  totalElements: number
  size: number
  number: number
  sort: PageableSort
  first: boolean
  numberOfElements: number
  empty: boolean
}

// Vendor Display Model
export interface VendorDisplay {
  id: number
  vendorId: string
  name: string
  contact?: string
  email: string
  phone?: string
  categories: string[]
  regions: string[]
  status?: VendorStatus
  orders: number
  avgDelivery: string
  rating: number
  address?: string
  paymentTerms?: string
}

// ============= NEW INVENTORY MODELS =============

// Inventory Category Model
export interface InventoryCategory {
  id: number
  name: string
  cgaid: {
    id: number
    name: string
  }
  vesselType: string | {
    id: number
    fleet_name: string
  }
}

// Inventory Item Head Model
export interface InventoryItemHead {
  id: number
  name: string
  inventoryItemCategoryId: number
  inventoryItemCategoryName?: string
}

// Create Inventory Item Head Request
export interface CreateInventoryItemHeadRequest {
  name: string
  inventoryItemCategoryId: number
}

// Inventory Item Sub Head Model
export interface InventoryItemSubHead {
  id: number
  name: string
  inventoryItemHeadId: number
  inventoryItemHeadName?: string
}

// Create Inventory Item Sub Head Request
export interface CreateInventoryItemSubHeadRequest {
  name: string
  inventoryItemHeadId: number
}

// Accounting Account Model
export interface AccountingAccount {
  id: number
  accountCodes: string
  cgaid: number | {
    id: number
    uid: string | null
    name: string
    username: string | null
    contactNo: string | null
    altContactNo: string | null
    email: string | null
    addressLine1: string | null
    addressLine2: string | null
    landmark: string | null
    country: string | null
    state: string | null
    city: string | null
    companyGroupAdminDetails: any | null
    password: string | null
    active: boolean
  } | null
  caid: number | null
  vesselType: string | null
  category?: {
    id: number
    name: string | null
    cgaid: number | null
    caid: number | null
    vesselType: string | null
  }
}

// Sub Account Model
export interface SubAccount {
  id: number
  subaccountCodes: string
  accountCodeId: number
  accountCode: string
  cgaid: {
    id: number
    name: string
  }
  vesselType?: string
}

// Sub Catalogue Model
export interface SubCatalogue {
  id: number
  name: string
  vesselType: string
  subaccounts: any
  cgaid?: {
    id: number
    name: string
    username?: string
  } | null
  subCatalogueType?: {
    id: number
    name: string
  } | null
  location?: string | null
}

// Sub Component Model
export interface SubComponent {
  id: number
  name: string
  part: {
    id: number
    code: string
    name: string
  }
}

// Create Sub Component Request
export interface CreateSubComponentRequest {
  part: { id: number }
  name: string
}
// Company Admin Model (for role-based dropdowns)
export interface CompanyAdmin {
  id: number
  uid: {
    username: string
    password: string
    role: {
      id: number
      roleType: string
    }
    enabled: boolean
  }
  cgaid: {
    id: number
  }
  name: string
  contactNo: string
  altContactNo: string
  email: string
  addressLine1: string
  addressLine2: string
  landmark: string
  country: string
  state: string
  city: string
  companyDetails: string
  active: boolean
}

// Company Group Admin Model (for superadmin dropdowns)
export interface CompanyGroupAdmin {
  id: number
  uid: number
  name: string
  username: string
  contactNo: string
  altContactNo: string
  email: string
  addressLine1: string
  addressLine2: string
  landmark: string
  country: string
  state: string
  city: string
  companyGroupAdminDetails: string
  password: string
  active: boolean
}

// Sub Company Admin Model (for subcompany dropdowns)
export interface SubCompanyAdmin {
  id: number
  uid: number
  cgaid: number
  cga: any | null
  name: string
  username: string
  contactNo: string
  altContactNo: string
  email: string
  addressLine1: string
  addressLine2: string
  landmark: string
  country: string
  state: string
  city: string
  companyDetails: string
  password: string
  active: boolean
}

// Vessel Model (for vessel type dropdowns)
export interface Vessel {
  id: number
  fleet_name: string
  vesselType: string
  imoNumber: string
  mmsi: number
  call_sign: string
  flag: string
  classes: string
  area: string
  dwt: string
  dynamicUrl: string
  companyAdminId: number | null
  companyGroupAdminId: number
  voyages: any[] | null
  active: boolean
  companyAdmin: {
    id: number
    uid: number
    cgaid: number
    cga: any | null
    name: string
    username: string
    contactNo: string
    altContactNo: string
    email: string
    addressLine1: string
    addressLine2: string
    landmark: string
    country: string
    state: string
    city: string
    companyDetails: string
    password: string
    active: boolean
  } | null
  companyGroupAdmin: {
    id: number
    uid: number
    name: string
    username: string
    contactNo: string
    altContactNo: string
    email: string
    addressLine1: string
    addressLine2: string
    landmark: string
    country: string
    state: string
    city: string
    companyGroupAdminDetails: string
    password: string
    active: boolean
  }
}

// ============= PURCHASE ORDER MODELS =============

export interface PurchaseOrder {
  id: number
  poNumber: string
  vendorId: number
  vendor: {
    id: number
    code: string
    name: string
    cgaid: number
    caId: number | null
    email: string
    password: string
    contactNo: string
    altContactNo: string
    tag: string
    categoryIds: number[]
    attachments: any[]
    totalOrders: number
    avgDeliveryDays: number
    issueCount: number
  }
  quotationId: number
  status: string
  description: string
  category: {
    id: number
    name: string
    cgaid: number | null
    caid: number | null
    vesselType: string | null
    location: string | null
  }
  requisitionNo: string
  rfqNo: string
  deliveryPortId: number
  deliveryDate?: string
  terms?: string | null
  specialInstructions?: string | null
  paymentTerms?: string | null
  deliveryTerms?: string | null
  quantity?: number | null
  unitPrice?: number | null
  totalAmount: number
  vendorContactName?: string | null
  vendorContactEmail?: string | null
  vendorContactPhone?: string | null
  vendorAddress?: string | null
  trackingNumber?: string | null
  currentLocation?: string | null
  estimatedArrivalDate?: string | null
  attachments?: any[]
}

// ============= GOODS RECEIPT MODELS =============

export type GoodsReceiptCondition = 'GOOD' | 'DAMAGED' | 'MISSING'
export type GoodsReceiptStatus = 'DRAFT' | 'PENDING' | 'POSTED' | 'COMPLETED'

// Goods Receipt Line Item
export interface GoodsReceiptLine {
  id: number
  inventoryItemId: number
  itemDescription: string
  partNumber: string
  expectedQty: number
  receivedQty: number
  condition: string
  notes: string
}

// Goods Receipt Photo
export interface GoodsReceiptPhoto {
  fileName: string
  url: string
  sizeBytes: number
}

// Goods Receipt Response
export interface GoodsReceipt {
  id: number
  purchaseOrderId: number
  receivedDate: string
  receivedBy: string
  generalNotes: string
  photos: GoodsReceiptPhoto[]
  lines: GoodsReceiptLine[]
  receivedQty: number | null
  discrepancy: number | null
  inventoryItemId: number | null
  status: GoodsReceiptStatus
}

// Create Goods Receipt Request
export interface CreateGoodsReceiptRequest {
  purchaseOrderId: number
  receivedDate: string
  receivedBy: string
  generalNotes: string
  lines: Array<{
    inventoryItemId: number
    itemDescription: string
    partNumber: string
    expectedQty: number
    receivedQty: number
    condition: GoodsReceiptCondition
    notes?: string
  }>
}

// ============= INVOICE MODELS =============

export type InvoiceStatus = 'THREE_WAY_MATCHED' | 'PENDING' | 'DISCREPANCY' | 'PAID'

// Invoice Response
export interface Invoice {
  id: number
  vendorId: number
  purchaseOrderId: number
  goodsReceiptId: number | null
  invoiceNumber: string
  invoiceDate: string
  amount: number
  currency: string
  threeWayMatched: boolean
  status: InvoiceStatus
}

// Create Invoice Request
export interface CreateInvoiceRequest {
  purchaseOrderId: number
  goodsReceiptId?: number | null
  invoiceDate: string
  amount: number
  currency: string
}


// ============= DELIVERY TRACKING MODELS =============

export type DeliveryStatus = 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED'
export type DeliveryPriority = 'HIGH' | 'MEDIUM' | 'LOW'

// Delivery Response from API
export interface Delivery {
  id: number
  deliveryNumber: string
  purchaseOrderId: number
  poNumber: string
  vendorId: number
  vendorName: string
  portId: number
  portName: string
  itemName: string
  dueDate: string
  value: number
  status: DeliveryStatus
  priority: DeliveryPriority
  lastGoodsReceiptId: number | null
  lastInvoiceId: number | null
  fullyReceived: boolean
  invoiced: boolean
  paid: boolean
}

// Delivery Display Model
export interface DeliveryDisplay {
  id: number
  deliveryNumber: string
  poNumber: string
  status: DeliveryStatus
  priority: DeliveryPriority
  itemName: string
  vendorName: string
  portName: string
  dueDate: string
  value: string
  fullyReceived: boolean
  invoiced: boolean
  paid: boolean
}
