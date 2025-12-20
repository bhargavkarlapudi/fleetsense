import { FC, useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import {
  getInventory,
  getSubcatalogueTypes,
  createPart,
  createInventory,
  deleteInventory,
  getParts,
  getInventoryCategories,
  getInventoryItemHeads,
  createInventoryItemHead,
  updateInventoryItemHead,
  deleteInventoryItemHead,
  getInventoryItemSubHeads,
  createInventoryItemSubHead,
  updateInventoryItemSubHead,
  deleteInventoryItemSubHead,
  getSubAccounts,
  getAllSubAccounts,
  getSubCatalogues,
  getAllSubCatalogues,
  getPartsBySubCatalogue,
  createInventoryCategory,
  updateInventoryCategory,
  createAccountingAccount,
  updateAccountingAccount,
  createSubAccount,
  updateSubAccount,
  createSubCatalogue,
  updateSubCatalogue,
  getSubComponents,
  createSubComponent,
  deleteSubComponent,
  getCompanyAdminList,
  getUnitsOfMeasure,
  getInventoryCategoriesByVesselType,
  getAllInventoryCategoriesForCompany,
  getAllInventoryCategoriesForAllCompanies,
  getCompanyGroupAdmins,
  getSubCompanyAdmins,
  getVesselsByCompany,
  getVesselById,
  getAccountingAccountsWithParams,
  getAllAccountingAccounts,
  getPartById,
  deleteInventoryCategory,
  deleteAccountingAccount,
  deleteSubAccount,
  deleteSubCatalogue,
  deletePart
} from '../core/_requests'
import {
  InventoryItemDisplay,
  SubcatalogueType,
  Part,
  InventoryCategory,
  InventoryItemHead,
  InventoryItemSubHead,
  AccountingAccount,
  SubAccount,
  SubCatalogue,
  SubComponent,
  CreateSubComponentRequest,
  CompanyAdmin,
  CompanyGroupAdmin,
  SubCompanyAdmin,
  Vessel,
  UnitOfMeasure,
  CreateInventoryRequest
} from '../core/_models'
import AddItemModal from './AddItemModal'
import UpdateInventoryModal from './UpdateInventoryModal'
import CategoryModal from './CategoryModal'
import EditCategoryModal from './EditCategoryModal'
import HeadModal from './HeadModal'
import EditHeadModal from './EditHeadModal'
import SubHeadModal from './SubHeadModal'
import EditSubHeadModal from './EditSubHeadModal'
import AccountingCodeModal from './AccountingCodeModal'
import EditAccountingCodeModal from './EditAccountingCodeModal'
import SubAccountingModal from './SubAccountingModal'
import EditSubAccountingModal from './EditSubAccountingModal'
import SubCatalogueModal from './SubCatalogueModal'
import EditSubCatalogueModal from './EditSubCatalogueModal'
import PartModal from './PartModal'
import EditPartModal from './EditPartModal'
import SubComponentModal from './SubComponentModal'
import EditSubComponentModal from './EditSubComponentModal'

// ✅ Add a tiny <Cell> helper for per-cell spinner
const Cell: FC<{ value?: string; loading?: boolean }> = ({ value, loading }) => {
  if (loading) {
    return <span className="spinner-border spinner-border-sm text-muted" role="status" aria-hidden="true" />;
  }
  return <span>{value && value.trim() !== '' ? value : '—'}</span>;
};

// ✅ Simple table skeleton to reuse across tabs
const TableSkeleton: FC<{ rows?: number; cols: number }> = ({ rows = 8, cols }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`sk-${i}`}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={`sk-${i}-${c}`} className="py-3">
            <div className="placeholder-wave">
              <div className="placeholder w-100" style={{ height: 14, borderRadius: 4 }} />
            </div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

// 👉 Column counts for each table (match the <thead> th count)
const COLS = {
  inventory: 18,
  category: 5,
  head: 4,
  subHead: 4,
  accounting: 5,
  subAccounting: 6,
  subCatalogue: 5,
  part: 5,
  subComponent: 5,
};

interface ViewInventoryModalProps {
  visible: boolean
  onClose: () => void
  item: InventoryItemDisplay | null
}

const ViewInventoryModal: FC<ViewInventoryModalProps> = ({ visible, onClose, item }) => {
  if (!visible || !item) return null

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      'Active': { bg: 'bg-success', text: 'Active' },
      'Obsolete': { bg: 'bg-secondary', text: 'Obsolete' },
      'Reserved': { bg: 'bg-warning', text: 'Reserved' }
    }
    const statusInfo = statusMap[status] || { bg: 'bg-secondary', text: status }
    return <span className={`badge ${statusInfo.bg} text-white`}>{statusInfo.text}</span>
  }

  const getStockStatusBadge = (stockStatus: string) => {
    if (!stockStatus) return null
    const statusMap: { [key: string]: { bg: string; text: string } } = {
      'Low Stock': { bg: 'bg-warning', text: 'Low Stock' },
      'Critical': { bg: 'bg-danger', text: 'Critical' }
    }
    const statusInfo = statusMap[stockStatus] || { bg: 'bg-info', text: stockStatus }
    return <span className={`badge ${statusInfo.bg} text-white ms-2`}>{statusInfo.text}</span>
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
      <div className='modal-dialog modal-xl modal-dialog-centered' role='document'>
        <div className='modal-content bg-white'>
          <div className='modal-header border-bottom'>
            <div>
              <h3 className='modal-title fw-bold text-dark mb-1'>Inventory Item Details</h3>
              <p className='text-muted mb-0 fs-7'>{item.itemId}</p>
            </div>
            <button type='button' className='btn-close' onClick={onClose}></button>
          </div>

          <div className='modal-body' style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Status and Basic Info */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <div className='d-flex justify-content-between align-items-center mb-3'>
                  <h5 className='fw-bold text-primary mb-0'>General Information</h5>
                  <div>
                    {item.stockStatus ? getStockStatusBadge(item.stockStatus) : getStatusBadge(item.status)}
                  </div>
                </div>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Item ID</label>
                <p className='fs-6 text-dark fw-bold'>{item.itemId}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Item Name</label>
                <p className='fs-6 text-dark'>{item.itemName}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Part Number</label>
                <p className='fs-6 text-dark'>{item.partNumber}</p>
              </div>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Category</label>
                <p className='fs-6 text-dark'>{item.category}</p>
              </div>
              {item.description && (
                <div className='col-md-12'>
                  <label className='form-label fw-semibold text-muted fs-7'>Description</label>
                  <p className='fs-6 text-dark'>{item.description}</p>
                </div>
              )}
            </div>

            {/* Stock Information */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <h5 className='fw-bold text-primary mb-3'>Stock Information</h5>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-muted fs-7'>Current Quantity</label>
                <p className='fs-6 text-dark fw-bold'>{item.currentQty} {item.uom}</p>
              </div>
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-muted fs-7'>Reorder Level</label>
                <p className='fs-6 text-dark'>{item.reorderLevel}</p>
              </div>
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-muted fs-7'>Unit of Measure</label>
                <p className='fs-6 text-dark'>{item.uom}</p>
              </div>
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-muted fs-7'>Min Threshold</label>
                <p className='fs-6 text-dark'>{item.minThreshold}</p>
              </div>
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-muted fs-7'>Max Threshold</label>
                <p className='fs-6 text-dark'>{item.maxThreshold}</p>
              </div>
              <div className='col-md-4'>
                <label className='form-label fw-semibold text-muted fs-7'>Unit Cost</label>
                <p className='fs-6 text-dark fw-bold text-success'>${item.unitCost.toFixed(2)}</p>
              </div>
            </div>

            {/* Location & Identification */}
            <div className='row mb-4'>
              <div className='col-md-12'>
                <h5 className='fw-bold text-primary mb-3'>Location & Identification</h5>
              </div>
            </div>

            <div className='row g-4 mb-4'>
              <div className='col-md-6'>
                <label className='form-label fw-semibold text-muted fs-7'>Location</label>
                <p className='fs-6 text-dark'>{item.location}</p>
              </div>
              {item.serialNumber && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Serial Number</label>
                  <p className='fs-6 text-dark'>{item.serialNumber}</p>
                </div>
              )}
              {item.manufacturer && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Manufacturer</label>
                  <p className='fs-6 text-dark'>{item.manufacturer}</p>
                </div>
              )}
              {item.expiryDate && (
                <div className='col-md-6'>
                  <label className='form-label fw-semibold text-muted fs-7'>Expiry Date</label>
                  <p className='fs-6 text-dark'>{new Date(item.expiryDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Additional Information */}
            {(item.subAccounting || item.subComponent || item.equipmentHierarchy || item.supplier || item.company || item.vesselType) && (
              <>
                <div className='row mb-4'>
                  <div className='col-md-12'>
                    <h5 className='fw-bold text-primary mb-3'>Additional Information</h5>
                  </div>
                </div>

                <div className='row g-4'>
                  {item.subAccounting && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Sub Accounting</label>
                      <p className='fs-6 text-dark'>{item.subAccounting}</p>
                    </div>
                  )}
                  {item.subComponent && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Sub Component</label>
                      <p className='fs-6 text-dark'>{item.subComponent}</p>
                    </div>
                  )}
                  {item.equipmentHierarchy && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Equipment Hierarchy</label>
                      <p className='fs-6 text-dark'>{item.equipmentHierarchy}</p>
                    </div>
                  )}
                  {item.supplier && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Supplier</label>
                      <p className='fs-6 text-dark'>{item.supplier}</p>
                    </div>
                  )}
                  {item.company && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Company</label>
                      <p className='fs-6 text-dark'>{item.company}</p>
                    </div>
                  )}
                  {item.vesselType && (
                    <div className='col-md-6'>
                      <label className='form-label fw-semibold text-muted fs-7'>Vessel Type</label>
                      <p className='fs-6 text-dark'>{item.vesselType}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className='modal-footer border-top'>
            <button type='button' className='btn btn-light' onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const InventoryList: FC = () => {
  const { currentUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'catalogue' | 'addItem'>('catalogue')
  const [addItemSubTab, setAddItemSubTab] = useState<'category' | 'head' | 'subHead' | 'accountingCode' | 'subAccounting' | 'subCatalogue' | 'part' | 'subComponent'>('category')
  const [searchTerm, setSearchTerm] = useState('')

  // Company filter state for all tabs
  const [categoryCompanyFilter, setCategoryCompanyFilter] = useState<string>('')
  const [categoryVesselTypeFilter, setCategoryVesselTypeFilter] = useState<string>('')
  const [accountingCodeCompanyFilter, setAccountingCodeCompanyFilter] = useState<string>('')
  const [subAccountingCompanyFilter, setSubAccountingCompanyFilter] = useState<string>('')
  const [subCatalogueCompanyFilter, setSubCatalogueCompanyFilter] = useState<string>('')
  const [partCompanyFilter, setPartCompanyFilter] = useState<string>('')
  const [subComponentCompanyFilter, setSubComponentCompanyFilter] = useState<string>('')
  const [companiesForFilter, setCompaniesForFilter] = useState<CompanyGroupAdmin[]>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [inventoryData, setInventoryData] = useState<InventoryItemDisplay[]>([])
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false)
  const [isViewModalVisible, setIsViewModalVisible] = useState(false)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItemDisplay | null>(null)
  const [categories, setCategories] = useState<SubcatalogueType[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalElements, setTotalElements] = useState(0)
  const [vesselId, setVesselId] = useState<number | null>(null) // Dynamic vesselId - null means fetch all for superadmin

  // Individual modal states for each tab
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false)
  const [isEditCategoryModalVisible, setIsEditCategoryModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | null>(null)
  const [isHeadModalVisible, setIsHeadModalVisible] = useState(false)
  const [isEditHeadModalVisible, setIsEditHeadModalVisible] = useState(false)
  const [selectedHead, setSelectedHead] = useState<InventoryItemHead | null>(null)
  const [isSubHeadModalVisible, setIsSubHeadModalVisible] = useState(false)
  const [isEditSubHeadModalVisible, setIsEditSubHeadModalVisible] = useState(false)
  const [selectedSubHead, setSelectedSubHead] = useState<InventoryItemSubHead | null>(null)
  const [isAccountingCodeModalVisible, setIsAccountingCodeModalVisible] = useState(false)
  const [isEditAccountingCodeModalVisible, setIsEditAccountingCodeModalVisible] = useState(false)
  const [selectedAccountingCode, setSelectedAccountingCode] = useState<AccountingAccount | null>(null)
  const [isSubAccountingModalVisible, setIsSubAccountingModalVisible] = useState(false)
  const [isEditSubAccountingModalVisible, setIsEditSubAccountingModalVisible] = useState(false)
  const [selectedSubAccount, setSelectedSubAccount] = useState<SubAccount | null>(null)
  const [isSubCatalogueModalVisible, setIsSubCatalogueModalVisible] = useState(false)
  const [isEditSubCatalogueModalVisible, setIsEditSubCatalogueModalVisible] = useState(false)
  const [selectedSubCatalogue, setSelectedSubCatalogue] = useState<SubCatalogue | null>(null)
  const [isPartModalVisible, setIsPartModalVisible] = useState(false)
  const [isEditPartModalVisible, setIsEditPartModalVisible] = useState(false)
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [isSubComponentModalVisible, setIsSubComponentModalVisible] = useState(false)
  const [isEditSubComponentModalVisible, setIsEditSubComponentModalVisible] = useState(false)
  const [selectedSubComponent, setSelectedSubComponent] = useState<SubComponent | null>(null)

  // Refresh triggers for modal sub catalogues
  const [partModalRefreshTrigger, setPartModalRefreshTrigger] = useState(0)
  const [addItemModalRefreshTrigger, setAddItemModalRefreshTrigger] = useState(0)

  // Data states for each tab
  const [categoryData, setCategoryData] = useState<InventoryCategory[]>([])
  const [headData, setHeadData] = useState<InventoryItemHead[]>([])
  const [subHeadData, setSubHeadData] = useState<InventoryItemSubHead[]>([])
  const [accountingCodeData, setAccountingCodeData] = useState<AccountingAccount[]>([])
  const [subAccountingData, setSubAccountingData] = useState<SubAccount[]>([])
  const [subCatalogueData, setSubCatalogueData] = useState<SubCatalogue[]>([])
  const [partData, setPartData] = useState<Part[]>([])
  const [subComponentData, setSubComponentData] = useState<SubComponent[]>([])
  const [isLoadingSubComponents, setIsLoadingSubComponents] = useState(false)
  // 👉 Loading states for Add Item tables
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [headLoading, setHeadLoading] = useState(false);
  const [subHeadLoading, setSubHeadLoading] = useState(false);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [subAccountingLoading, setSubAccountingLoading] = useState(false);
  const [subCatalogueLoading, setSubCatalogueLoading] = useState(false);
  const [partLoading, setPartLoading] = useState(false);
  // subComponent already has: isLoadingSubComponents

  // Pagination states for category table
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1)
  const [categoryRowsPerPage, setCategoryRowsPerPage] = useState(10)

  // Pagination states for head table
  const [headCurrentPage, setHeadCurrentPage] = useState(1)
  const [headRowsPerPage, setHeadRowsPerPage] = useState(10)

  // Pagination states for sub head table
  const [subHeadCurrentPage, setSubHeadCurrentPage] = useState(1)
  const [subHeadRowsPerPage, setSubHeadRowsPerPage] = useState(10)

  // Pagination states for accounting code table
  const [accountingCodeCurrentPage, setAccountingCodeCurrentPage] = useState(1)
  const [accountingCodeRowsPerPage, setAccountingCodeRowsPerPage] = useState(10)

  // Pagination states for sub accounting table
  const [subAccountingCurrentPage, setSubAccountingCurrentPage] = useState(1)
  const [subAccountingRowsPerPage, setSubAccountingRowsPerPage] = useState(10)

  // Pagination states for sub catalogue table
  const [subCatalogueCurrentPage, setSubCatalogueCurrentPage] = useState(1)
  const [subCatalogueRowsPerPage, setSubCatalogueRowsPerPage] = useState(10)

  // Pagination states for part table
  const [partCurrentPage, setPartCurrentPage] = useState(1)
  const [partRowsPerPage, setPartRowsPerPage] = useState(10)

  // Pagination states for sub component table
  const [subComponentCurrentPage, setSubComponentCurrentPage] = useState(1)
  const [subComponentRowsPerPage, setSubComponentRowsPerPage] = useState(10)

  const [sortConfig, setSortConfig] = useState<{
    key: keyof InventoryItemDisplay | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })

  // Sort configurations for each tab
  const [categorySortConfig, setCategorySortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  })

  const [headSortConfig, setHeadSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  })

  const [subHeadSortConfig, setSubHeadSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  })

  const [accountingCodeSortConfig, setAccountingCodeSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  })

  const [subAccountingSortConfig, setSubAccountingSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  })

  const [subCatalogueSortConfig, setSubCatalogueSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  })

  const [partSortConfig, setPartSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  })

  const [subComponentSortConfig, setSubComponentSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc';
  }>({
    key: null,
    direction: 'asc',
  })

  // 👉 Loader states for table skeleton (boot vs subsequent fetches)
  const [bootLoading, setBootLoading] = useState(true);        // first ever load
  const [listLoading, setListLoading] = useState(false);        // subsequent list fetches
  const [noDataDelayPassed, setNoDataDelayPassed] = useState(false); // avoid flicker before "No data"

  // 👉 Marks when lazy field-mapping (name, uom, subAccounting, etc.) is done
  const [mapReady, setMapReady] = useState(false);

  // Optional: number of columns used in table <td colSpan>
  const COLUMNS_COUNT = 18;

  // Role-based permissions
  const userRole = currentUser?.role?.id
  const canCreateItems = userRole === 1 || userRole === 5 // Super Admin (1) and Company (5)

  // ---- Lazy mapping helpers & caches (inside component) ----

  // Caches scoped to this component instance
  const partCache = useRef<Map<number, Part>>(new Map());
  const vesselCache = useRef<Map<number, Vessel>>(new Map());

  // Sub-Catalogue cache (id -> SubCatalogue)
  const subcatCache = useRef<Map<number, SubCatalogue>>(new Map());

  // Sub-Component cache (id -> SubComponent)
  const subComponentCache = useRef<Map<number, SubComponent>>(new Map());

  // Small concurrency limiter
  const concurrency = 5;
  const limit = useCallback(<T,>(pool: number, tasks: Array<() => Promise<T>>): Promise<Promise<T>[]> => {
    const results: Promise<T>[] = [];
    let i = 0;
    const run = async (): Promise<void> => {
      while (i < tasks.length) {
        const idx = i++;
        results[idx] = tasks[idx]();
        await results[idx].catch(() => undefined as unknown as T);
      }
    };
    return Promise.all(Array.from({ length: Math.min(pool, tasks.length) }, run)).then(() => results);
  }, []);

  // Resolve & fill mapping for visible rows only
  const lazyMapInventoryCells = useCallback(async (rows: InventoryItemDisplay[]) => {
    try {
      // collect unique ids
      const partIds = Array.from(new Set(rows.map(r => r.partId).filter(Boolean))) as number[];
      const vesselIds = Array.from(new Set(rows.map(r => r.vesselId).filter(Boolean))) as number[];
      const subComponentIds = Array.from(new Set(rows.map(r => r.subcomponentId).filter(Boolean))) as number[];

      // PARTS
      const partTasks = partIds
        .filter(id => !partCache.current.has(id))
        .map(id => async () => {
          try {
            const p = await getPartById(id);
            partCache.current.set(id, p);
          } catch { /* noop */ }
        });

      // VESSELS
      const vesselTasks = vesselIds
        .filter(id => !vesselCache.current.has(id))
        .map(id => async () => {
          try {
            const v = await getVesselById(id);
            vesselCache.current.set(id, v);
          } catch { /* noop */ }
        });

      // SUB COMPONENTS - fetch all once and cache
      if (subComponentIds.length > 0 && subComponentCache.current.size === 0) {
        try {
          const allSubComponents = await getSubComponents();
          allSubComponents.forEach(sc => {
            if (sc?.id) subComponentCache.current.set(sc.id, sc);
          });
        } catch { /* noop */ }
      }

      await Promise.all([
        limit(concurrency, partTasks),
        limit(concurrency, vesselTasks),
      ]);

      // Apply mapped values in one state update to avoid reflows
      setInventoryData((prev: InventoryItemDisplay[]) =>
        prev.map((r: InventoryItemDisplay) => {
          const p = r.partId ? partCache.current.get(r.partId) : undefined;
          const v = r.vesselId ? vesselCache.current.get(r.vesselId) : undefined;
          const subComp = r.subcomponentId ? subComponentCache.current.get(r.subcomponentId) : undefined;

          // Category from Part->SubCatalogue
          const categoryName =
            p?.subcatalogue?.subCatalogueType?.name ||
            p?.subcatalogue?.name ||
            '';

          // Sub Accounting from:
          // 1) subcatCache by r.subcatId
          // 2) or from part->subcatalogue if present
          // 3) fallback to 'N/A'
          let subAcc = 'N/A';
          if (r.subcatId && subcatCache.current.has(r.subcatId)) {
            const sc = subcatCache.current.get(r.subcatId)!;
            // try common property names safely
            // @ts-ignore
            subAcc = sc?.subaccountCodes || sc?.subAccountCodes || sc?.subAccountCode || 'N/A';
          } else if (p?.subcatalogue) {
            // @ts-ignore
            subAcc = p.subcatalogue?.subaccountCodes || p.subcatalogue?.subAccountCodes || p.subcatalogue?.subAccountCode || 'N/A';
          }

          // REPLACE the returned object inside lazyMapInventoryCells mapping
          return {
            ...r,
            itemName: p?.name || r.itemName,
            partNumber: (p as any)?.partNo || (p as any)?.code || r.partNumber,
            manufacturer: (p as any)?.manufacturer || r.manufacturer,
            uom: (p as any)?.uom?.code || r.uom,
            quantity: `${r.currentQty} ${((p as any)?.uom?.code || '').trim()}`.trim(),
            category: categoryName,
            subAccounting: subAcc,
            subComponent: subComp?.name || '',

            // Only fill these if we *didn't* already get them from the API
            company: r.company || (v as any)?.companyGroupAdmin?.name || (v as any)?.companyAdmin?.name || '',
            vesselType: r.vesselType || (v as any)?.vesselType || '',
          };
        })
      );
    } finally {
      // mark mapping finished (stops per-cell loaders)
      setMapReady(true);
    }
  }, [limit, setInventoryData]);


  // Load INVENTORY immediately on mount & whenever page/size/vessel changes
  useEffect(() => {
    loadInventory(); // no gating — shows skeleton first, then rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, rowsPerPage, vesselId])

  // OPTIONAL: once parts arrive, re-run to enrich names/UOM without blocking first paint
  useEffect(() => {
    if (parts.length > 0) {
      loadInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts])

  // Keep a local cache for fast id -> subCatalogue lookups
  useEffect(() => {
    if (Array.isArray(subCatalogueData) && subCatalogueData.length > 0) {
      const map = new Map<number, SubCatalogue>();
      for (const sc of subCatalogueData) {
        if (sc?.id != null) map.set(sc.id as number, sc);
      }
      subcatCache.current = map;
    }
  }, [subCatalogueData]);

  // Debug logging for permissions
  useEffect(() => {
    console.log('InventoryList - User Role:', userRole)
    console.log('InventoryList - Can Create Items:', canCreateItems)
    console.log('InventoryList - Current User:', currentUser)
  }, [userRole, canCreateItems, currentUser])

  // Redirect unauthorized users away from Add Item tab
  useEffect(() => {
    if (activeTab === 'addItem' && !canCreateItems) {
      setActiveTab('catalogue')
    }
  }, [activeTab, canCreateItems])

  const [filters, setFilters] = useState({
    category: '',
    location: '',
    status: ''
  })

  // useEffect(() => {
  //   loadInventory();
  //   loadInitialData()
  //   loadCategoryData() // Load category data when component mounts
  //   loadAccountingCodeData() // Load accounting code data when component mounts
  //   loadSubAccountingData() // Load sub accounting data when component mounts
  //   loadSubCatalogueData() // Load sub catalogue data when component mounts
  //   loadCompaniesForFilter() // Load companies for filter
  // }, [])

  // ✅ First paint: inventory only (sub-catalogues loaded on-demand when tab is opened)
  useEffect(() => {
    loadInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadInitialData = async () => {
    setIsLoading(true)
    try {
      const [categoriesData, partsData] = await Promise.all([
        getSubcatalogueTypes(),
        getParts()
      ])
      setCategories(categoriesData)
      setParts(partsData)
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load initial data. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }

  const loadInventory = async () => {
    setListLoading(true);
    try {
      const roleId = currentUser?.role?.id;
      const roleEntityId = currentUser?.roleEntityId;
      const companyGroupAdminId =
        (currentUser as any)?.companyGroupAdminId ??
        (currentUser as any)?.companyGroupAdmin?.id ??
        null;

      const isOperator = roleId === 6;
      const isSuperadminOperator = isOperator && companyGroupAdminId == null;
      const isCompanyOperator = isOperator && companyGroupAdminId != null;

      const actsAsCga = roleId === 5 || isCompanyOperator;
      const cgaIdToUse = actsAsCga
        ? (roleId === 5 ? Number(roleEntityId || companyGroupAdminId) : Number(companyGroupAdminId))
        : undefined;

      // Determine vesselId based on role
      // Superadmin (roleId === 1): fetch ALL inventory (vesselId = null)
      // Other users: fetch for specific vessel or their first vessel
      let effectiveVesselId = vesselId;
      if (roleId === 1) {
        // Superadmin - fetch all inventory
        effectiveVesselId = null;
      } else if (vesselId === null) {
        // Non-superadmin but no vessel set - try to get first vessel
        const companyUsername = (currentUser as any)?.companyGroupAdmin?.username || (currentUser as any)?.username;
        if (companyUsername) {
          try {
            const vessels = await getVesselsByCompany(companyUsername);
            if (vessels.length > 0) {
              effectiveVesselId = vessels[0].id;
              setVesselId(vessels[0].id); // Set for future calls
            }
          } catch (error) {
            console.error('Error loading vessels:', error);
          }
        }
      }

      // 1) fetch ONLY the page of base rows
      const pageRes = await getInventory(effectiveVesselId, currentPage - 1, rowsPerPage, cgaIdToUse);

      // 2) paint ASAP with placeholders (no secondary mapping calls here)
      // REPLACE the baseRows mapping with this version
      const baseRows: InventoryItemDisplay[] = pageRes.content.map((it: any) => {
        const vesselObj = it?.vessel; // <- NEW: directly from updated API
        const companyName =
          vesselObj?.companyGroupAdmin?.name ??
          vesselObj?.companyAdmin?.name ??
          '';

        const vType = vesselObj?.vesselType ?? '';

        // Extract sub accounting from the subcat object if available
        const subcatObj = it?.subcat;
        let subAccounting = 'N/A';
        if (subcatObj?.subaccounts) {
          subAccounting = subcatObj.subaccounts?.code || subcatObj.subaccounts?.name || (typeof subcatObj.subaccounts === 'string' ? subcatObj.subaccounts : 'N/A');
        }

        return {
          id: it.id,
          itemId: `INV-${String(it.id).padStart(3, '0')}`,
          itemName: '',          // (still lazy mapped from part if needed)
          partNumber: '',        // (still lazy mapped)
          category: '',          // (still lazy mapped)
          subAccounting: subAccounting,  // Get from API response
          subComponent: '',      // (lazy mapped)
          quantity: `${it.currentQty}`, // UOM lazy mapped
          location: it.location,
          status: 'Active',
          stockStatus:
            it.currentQty <= it.minThreshold ? 'Critical' :
              it.currentQty <= it.reorderLevel ? 'Low Stock' : '',
          currentQty: it.currentQty,
          reorderLevel: it.reorderLevel,
          minThreshold: it.minThreshold,
          maxThreshold: it.maxThreshold,
          unitCost: it.unitCost,
          manufacturer: '',      // lazy mapped
          uom: '',               // lazy mapped
          expiryDate: it.expiryDate,
          serialNumber: it.serialNumber ?? null,

          vesselId: it.vesselId,
          partId: it.partId,
          subcatId: it.subcatId,
          subcomponentId: it.subcomponentId ?? null,

          // NEW: fill immediately from response so we don't need extra GETs
          company: companyName,
          vesselType: vType,
        };
      });

      setInventoryData(baseRows);
      setTotalElements(pageRes.totalElements);

      // 3) after paint: lazy-map heavy fields with small concurrency and caching
      //    (no getAllSubCatalogues; we avoid N*N calls)
      // 3) after paint: lazy-map heavy fields with small concurrency and caching
      setMapReady(false);
      queueMicrotask(() => {
        lazyMapInventoryCells(baseRows).finally(() => setMapReady(true));
      });
    } catch (e) {
      console.error('Error loading inventory:', e);
    } finally {
      setIsLoading(false);
      setListLoading(false);
      if (bootLoading) setBootLoading(false);
    }
  };


  const handleViewItem = (item: InventoryItemDisplay) => {
    setSelectedInventoryItem(item)
    setIsViewModalVisible(true)
  }

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this inventory item?')) return

    try {
      await deleteInventory(id)
      await loadInventory()
      toast.success('Inventory item deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting inventory item:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete inventory item'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this inventory item because it has associated records. Please check dependencies first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleDeleteSubComponent = async (id: number) => {
    // Check if sub component has associated inventory items
    const associatedInventory = inventoryData.filter(item => item.subcomponentId === id)

    if (associatedInventory.length > 0) {
      toast.error(`Cannot delete this sub component because it has ${associatedInventory.length} associated inventory item(s). Please delete the inventory items first.`)
      return
    }

    if (!window.confirm('Are you sure you want to delete this sub component?')) return

    try {
      await deleteSubComponent(id)
      await loadSubComponentData()
      toast.success('Sub component deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting sub component:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete sub component'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this sub component because it has associated inventory items. Please delete the inventory items first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return

    try {
      await deleteInventoryCategory(id)
      await loadCategoryData()
      toast.success('Category deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting category:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete category'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this category because it has associated items. Please delete or reassign the items first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleDeleteAccountingCode = async (id: number) => {
    // Check if accounting code has associated sub accounts
    const associatedSubAccounts = subAccountingData.filter(subAccount =>
      (subAccount as any).accountingAccountId === id || subAccount.accountCode === accountingCodeData.find(ac => ac.id === id)?.accountCodes
    )

    if (associatedSubAccounts.length > 0) {
      toast.error(`Cannot delete this accounting code because it has ${associatedSubAccounts.length} associated sub account(s). Please delete or reassign the sub accounts first.`)
      return
    }

    if (!window.confirm('Are you sure you want to delete this accounting code?')) return

    try {
      await deleteAccountingAccount(id)
      await loadAccountingCodeData()
      toast.success('Accounting code deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting accounting code:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete accounting code'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this accounting code because it has associated sub accounts. Please delete or reassign the sub accounts first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleDeleteSubAccount = async (id: number) => {
    // Check if sub account has associated sub catalogues
    const associatedSubCatalogues = subCatalogueData.filter(subCat =>
      (subCat as any).subaccountId === id
    )

    if (associatedSubCatalogues.length > 0) {
      toast.error(`Cannot delete this sub accounting code because it has ${associatedSubCatalogues.length} associated sub catalogue(s). Please delete or reassign the sub catalogues first.`)
      return
    }

    if (!window.confirm('Are you sure you want to delete this sub accounting code?')) return

    try {
      await deleteSubAccount(id)
      await loadSubAccountingData()
      toast.success('Sub accounting code deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting sub accounting code:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete sub accounting code'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this sub accounting code because it has associated sub catalogues. Please delete or reassign the sub catalogues first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleDeleteSubCatalogue = async (id: number) => {
    // Check if sub catalogue has associated parts
    const associatedParts = partData.filter(part => part.subcatalogue?.id === id)

    if (associatedParts.length > 0) {
      toast.error(`Cannot delete this sub catalogue because it has ${associatedParts.length} associated part(s). Please delete or reassign the parts first.`)
      return
    }

    if (!window.confirm('Are you sure you want to delete this sub catalogue?')) return

    try {
      await deleteSubCatalogue(id)
      await loadSubCatalogueData()
      toast.success('Sub catalogue deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting sub catalogue:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete sub catalogue'

      // Check if it's a foreign key constraint error
      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this sub catalogue because it has associated parts. Please delete or reassign the parts first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleDeletePart = async (id: number) => {
    // Check if part has associated inventory items
    const associatedInventory = inventoryData.filter(item => item.partId === id)

    if (associatedInventory.length > 0) {
      toast.error(`Cannot delete this part because it has ${associatedInventory.length} associated inventory item(s). Please delete the inventory items first.`)
      return
    }

    // Check if part has associated sub components
    const associatedSubComponents = subComponentData.filter(subComp => subComp.part?.id === id)

    if (associatedSubComponents.length > 0) {
      toast.error(`Cannot delete this part because it has ${associatedSubComponents.length} associated sub component(s). Please delete the sub components first.`)
      return
    }

    if (!window.confirm('Are you sure you want to delete this part?')) return

    try {
      await deletePart(id)
      await loadPartData()
      toast.success('Part deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting part:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete part'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this part because it has associated items. Please delete or reassign the items first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  // Calculate total items based on active tab
  const totalItems = useMemo(() => {
    if (activeTab === 'catalogue') {
      return inventoryData.filter(item => item.status === 'Active').length
    } else if (activeTab === 'addItem') {
      switch (addItemSubTab) {
        case 'category':
          return categoryData.length
        case 'accountingCode':
          return accountingCodeData.length
        case 'subAccounting':
          return subAccountingData.length
        case 'subCatalogue':
          return subCatalogueData.length
        case 'part':
          return partData.length
        case 'subComponent':
          return subComponentData.length
        default:
          return 0
      }
    }
    return 0
  }, [activeTab, addItemSubTab, inventoryData, categoryData, accountingCodeData, subAccountingData, subCatalogueData, partData, subComponentData])

  const lowStockItems = inventoryData.filter(item => item.stockStatus === 'Low Stock').length
  const criticalItems = inventoryData.filter(item => item.stockStatus === 'Critical').length
  const totalValue = inventoryData.reduce((sum, item) => sum + (item.unitCost * item.currentQty), 0) / 1000

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const filteredInventoryData = useMemo(() => {
    console.log('inventoryData', inventoryData);
    return inventoryData.filter(record => {
      const matchesSearch = searchTerm === '' ||
        record.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.location.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = filters.category === '' || record.category === filters.category
      const matchesStatus = filters.status === '' || record.status === filters.status

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [searchTerm, inventoryData, filters])

  const sortedData = useMemo(() => {
    let sortedRecords = [...filteredInventoryData]

    if (sortConfig.key !== null) {
      sortedRecords.sort((a: any, b: any) => {
        const aVal = String(a[sortConfig.key!] || '').toLowerCase()
        const bVal = String(b[sortConfig.key!] || '').toLowerCase()

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [filteredInventoryData, sortConfig])

  // Delay showing "No inventory..." so users first see skeleton instead of flicker
  useEffect(() => {
    if (bootLoading || listLoading || isLoading) {
      setNoDataDelayPassed(false);
      return;
    }
    const t = setTimeout(() => setNoDataDelayPassed(true), 600); // 0.6s feels snappy-but-smooth
    return () => clearTimeout(t);
  }, [bootLoading, listLoading, isLoading, sortedData.length]);


  // Sorted data for each tab
  const sortedCategoryData = useMemo(() => {
    if (!categoryCompanyFilter) {
      // Reverse the data to show newest first
      let sortedRecords = [...categoryData].reverse()
      if (categorySortConfig.key !== null) {
        sortedRecords.sort((a: any, b: any) => {
          let aVal = ''
          let bVal = ''

          switch (categorySortConfig.key) {
            case 'id':
              aVal = String(a.id || '')
              bVal = String(b.id || '')
              break
            case 'name':
              aVal = String(a.name || '').toLowerCase()
              bVal = String(b.name || '').toLowerCase()
              break
            case 'company':
              aVal = String(a.cgaid?.name || '').toLowerCase()
              bVal = String(b.cgaid?.name || '').toLowerCase()
              break
            case 'vesselType':
              aVal = String(typeof a.vesselType === 'string' ? a.vesselType : a.vesselType?.fleet_name || '').toLowerCase()
              bVal = String(typeof b.vesselType === 'string' ? b.vesselType : b.vesselType?.fleet_name || '').toLowerCase()
              break
            default:
              aVal = String(a[categorySortConfig.key!] || '').toLowerCase()
              bVal = String(b[categorySortConfig.key!] || '').toLowerCase()
          }

          if (aVal < bVal) return categorySortConfig.direction === 'asc' ? -1 : 1
          if (aVal > bVal) return categorySortConfig.direction === 'asc' ? 1 : -1
          return 0
        })
      }
      return sortedRecords
    }

    let filteredRecords = categoryData.filter(category =>
      category.cgaid?.id === parseInt(categoryCompanyFilter)
    )

    // Reverse the filtered data to show newest first
    filteredRecords = filteredRecords.reverse()

    if (categorySortConfig.key !== null) {
      filteredRecords.sort((a: any, b: any) => {
        let aVal = ''
        let bVal = ''

        switch (categorySortConfig.key) {
          case 'id':
            aVal = String(a.id || '')
            bVal = String(b.id || '')
            break
          case 'name':
            aVal = String(a.name || '').toLowerCase()
            bVal = String(b.name || '').toLowerCase()
            break
          case 'company':
            aVal = String(a.cgaid?.name || '').toLowerCase()
            bVal = String(b.cgaid?.name || '').toLowerCase()
            break
          case 'vesselType':
            aVal = String(typeof a.vesselType === 'string' ? a.vesselType : a.vesselType?.fleet_name || '').toLowerCase()
            bVal = String(typeof b.vesselType === 'string' ? b.vesselType : b.vesselType?.fleet_name || '').toLowerCase()
            break
          default:
            aVal = String(a[categorySortConfig.key!] || '').toLowerCase()
            bVal = String(b[categorySortConfig.key!] || '').toLowerCase()
        }

        if (aVal < bVal) return categorySortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return categorySortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return filteredRecords
  }, [categoryData, categoryCompanyFilter, categorySortConfig])

  const sortedHeadData = useMemo(() => {
    let sortedRecords = [...headData].reverse()
    if (headSortConfig.key !== null) {
      sortedRecords.sort((a: any, b: any) => {
        let aVal = ''
        let bVal = ''

        switch (headSortConfig.key) {
          case 'id':
            aVal = String(a.id || '')
            bVal = String(b.id || '')
            break
          case 'name':
            aVal = String(a.name || '').toLowerCase()
            bVal = String(b.name || '').toLowerCase()
            break
          case 'inventoryItemCategoryName':
            aVal = String(a.inventoryItemCategoryName || '').toLowerCase()
            bVal = String(b.inventoryItemCategoryName || '').toLowerCase()
            break
          default:
            aVal = String(a[headSortConfig.key!] || '').toLowerCase()
            bVal = String(b[headSortConfig.key!] || '').toLowerCase()
        }

        if (aVal < bVal) return headSortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return headSortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [headData, headSortConfig])

  const sortedSubHeadData = useMemo(() => {
    let sortedRecords = [...subHeadData].reverse()
    if (subHeadSortConfig.key !== null) {
      sortedRecords.sort((a: any, b: any) => {
        let aVal = ''
        let bVal = ''

        switch (subHeadSortConfig.key) {
          case 'id':
            aVal = String(a.id || '')
            bVal = String(b.id || '')
            break
          case 'name':
            aVal = String(a.name || '').toLowerCase()
            bVal = String(b.name || '').toLowerCase()
            break
          case 'inventoryItemHeadName':
            aVal = String(a.inventoryItemHeadName || '').toLowerCase()
            bVal = String(b.inventoryItemHeadName || '').toLowerCase()
            break
          default:
            aVal = String(a[subHeadSortConfig.key!] || '').toLowerCase()
            bVal = String(b[subHeadSortConfig.key!] || '').toLowerCase()
        }

        if (aVal < bVal) return subHeadSortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return subHeadSortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [subHeadData, subHeadSortConfig])

  const sortedAccountingCodeData = useMemo(() => {
    // Filter by company if filter is set
    let filteredRecords = accountingCodeCompanyFilter
      ? accountingCodeData.filter(code => {
        const cgaId = typeof code.cgaid === 'object' ? (code.cgaid as any)?.id : code.cgaid
        return cgaId === parseInt(accountingCodeCompanyFilter)
      })
      : [...accountingCodeData]

    // Reverse the data to show newest first
    let sortedRecords = filteredRecords.reverse()
    if (accountingCodeSortConfig.key !== null) {
      sortedRecords.sort((a: any, b: any) => {
        let aVal = ''
        let bVal = ''

        switch (accountingCodeSortConfig.key) {
          case 'id':
            aVal = String(a.id || '')
            bVal = String(b.id || '')
            break
          case 'accountCodes':
            aVal = String(a.accountCodes || '').toLowerCase()
            bVal = String(b.accountCodes || '').toLowerCase()
            break
          case 'company':
            aVal = String(a.cgaid?.name || '').toLowerCase()
            bVal = String(b.cgaid?.name || '').toLowerCase()
            break
          case 'vesselType':
            aVal = String(a.vesselType || '').toLowerCase()
            bVal = String(b.vesselType || '').toLowerCase()
            break
          default:
            aVal = String(a[accountingCodeSortConfig.key!] || '').toLowerCase()
            bVal = String(b[accountingCodeSortConfig.key!] || '').toLowerCase()
        }

        if (aVal < bVal) return accountingCodeSortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return accountingCodeSortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [accountingCodeData, accountingCodeCompanyFilter, accountingCodeSortConfig])

  const sortedSubAccountingData = useMemo(() => {
    // Filter by company if filter is set
    let filteredRecords = subAccountingCompanyFilter
      ? subAccountingData.filter(subAccount => {
        const cgaId = typeof subAccount.cgaid === 'object' ? (subAccount.cgaid as any)?.id : subAccount.cgaid
        return cgaId === parseInt(subAccountingCompanyFilter)
      })
      : [...subAccountingData]

    // Reverse the data to show newest first
    let sortedRecords = filteredRecords.reverse()
    if (subAccountingSortConfig.key !== null) {
      sortedRecords.sort((a: any, b: any) => {
        let aVal = ''
        let bVal = ''

        switch (subAccountingSortConfig.key) {
          case 'id':
            aVal = String(a.id || '')
            bVal = String(b.id || '')
            break
          case 'subaccountCodes':
            aVal = String(a.subaccountCodes || '').toLowerCase()
            bVal = String(b.subaccountCodes || '').toLowerCase()
            break
          case 'accountCode':
            aVal = String(a.accountCode || '').toLowerCase()
            bVal = String(b.accountCode || '').toLowerCase()
            break
          case 'company':
            aVal = String(a.cgaid?.name || '').toLowerCase()
            bVal = String(b.cgaid?.name || '').toLowerCase()
            break
          default:
            aVal = String(a[subAccountingSortConfig.key!] || '').toLowerCase()
            bVal = String(b[subAccountingSortConfig.key!] || '').toLowerCase()
        }

        if (aVal < bVal) return subAccountingSortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return subAccountingSortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [subAccountingData, subAccountingCompanyFilter, subAccountingSortConfig])

  const sortedSubCatalogueData = useMemo(() => {
    // Filter by company if filter is set
    let filteredRecords = subCatalogueCompanyFilter
      ? subCatalogueData.filter(subCat => {
        const cgaId = typeof subCat.cgaid === 'object' ? (subCat.cgaid as any)?.id : subCat.cgaid
        return cgaId === parseInt(subCatalogueCompanyFilter)
      })
      : [...subCatalogueData]

    // Reverse the data to show newest first
    let sortedRecords = filteredRecords.reverse()
    if (subCatalogueSortConfig.key !== null) {
      sortedRecords.sort((a: any, b: any) => {
        let aVal = ''
        let bVal = ''

        switch (subCatalogueSortConfig.key) {
          case 'id':
            aVal = String(a.id || '')
            bVal = String(b.id || '')
            break
          case 'name':
            aVal = String(a.name || '').toLowerCase()
            bVal = String(b.name || '').toLowerCase()
            break
          case 'company':
            aVal = String(a.subCatalogueType?.name || '').toLowerCase()
            bVal = String(b.subCatalogueType?.name || '').toLowerCase()
            break
          case 'vesselType':
            aVal = String(a.vesselType || '').toLowerCase()
            bVal = String(b.vesselType || '').toLowerCase()
            break
          default:
            aVal = String(a[subCatalogueSortConfig.key!] || '').toLowerCase()
            bVal = String(b[subCatalogueSortConfig.key!] || '').toLowerCase()
        }

        if (aVal < bVal) return subCatalogueSortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return subCatalogueSortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [subCatalogueData, subCatalogueCompanyFilter, subCatalogueSortConfig])

  const sortedPartData = useMemo(() => {
    // Filter by company if filter is set
    let filteredRecords = partCompanyFilter
      ? partData.filter(part => {
        // Parts are linked to company through subcatalogue
        const subcat = part.subcatalogue as any
        const subcatCgaId = typeof subcat?.cgaid === 'object'
          ? subcat?.cgaid?.id
          : subcat?.cgaid
        return subcatCgaId === parseInt(partCompanyFilter)
      })
      : [...partData]

    // Reverse the data to show newest first
    let sortedRecords = filteredRecords.reverse()
    if (partSortConfig.key !== null) {
      sortedRecords.sort((a: any, b: any) => {
        let aVal = ''
        let bVal = ''

        switch (partSortConfig.key) {
          case 'id':
            aVal = String(a.id || '')
            bVal = String(b.id || '')
            break
          case 'name':
            aVal = String(a.name || '').toLowerCase()
            bVal = String(b.name || '').toLowerCase()
            break
          case 'code':
            aVal = String(a.code || '').toLowerCase()
            bVal = String(b.code || '').toLowerCase()
            break
          case 'manufacturer':
            aVal = String(a.manufacturer || '').toLowerCase()
            bVal = String(b.manufacturer || '').toLowerCase()
            break
          default:
            aVal = String(a[partSortConfig.key!] || '').toLowerCase()
            bVal = String(b[partSortConfig.key!] || '').toLowerCase()
        }

        if (aVal < bVal) return partSortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return partSortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [partData, partCompanyFilter, partSortConfig])

  const sortedSubComponentData = useMemo(() => {
    // Filter by company if filter is set
    let filteredRecords = subComponentCompanyFilter
      ? subComponentData.filter(subComp => {
        // Sub components are linked to company through part -> subcatalogue
        const part = subComp.part as any
        const subcat = part?.subcatalogue as any
        const subcatCgaId = typeof subcat?.cgaid === 'object'
          ? subcat?.cgaid?.id
          : subcat?.cgaid
        return subcatCgaId === parseInt(subComponentCompanyFilter)
      })
      : [...subComponentData]

    let sortedRecords = filteredRecords
    if (subComponentSortConfig.key !== null) {
      sortedRecords.sort((a: any, b: any) => {
        let aVal = ''
        let bVal = ''

        switch (subComponentSortConfig.key) {
          case 'id':
            aVal = String(a.id || '')
            bVal = String(b.id || '')
            break
          case 'name':
            aVal = String(a.name || '').toLowerCase()
            bVal = String(b.name || '').toLowerCase()
            break
          case 'partCode':
            aVal = String(a.part?.code || '').toLowerCase()
            bVal = String(b.part?.code || '').toLowerCase()
            break
          case 'partName':
            aVal = String(a.part?.name || '').toLowerCase()
            bVal = String(b.part?.name || '').toLowerCase()
            break
          default:
            aVal = String(a[subComponentSortConfig.key!] || '').toLowerCase()
            bVal = String(b[subComponentSortConfig.key!] || '').toLowerCase()
        }

        if (aVal < bVal) return subComponentSortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return subComponentSortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortedRecords
  }, [subComponentData, subComponentCompanyFilter, subComponentSortConfig])

  const handleSort = (key: any) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Sort handlers for each tab
  const handleCategorySort = (key: string) => {
    setCategorySortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleAccountingCodeSort = (key: string) => {
    setAccountingCodeSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleSubAccountingSort = (key: string) => {
    setSubAccountingSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleSubCatalogueSort = (key: string) => {
    setSubCatalogueSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handlePartSort = (key: string) => {
    setPartSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleSubComponentSort = (key: string) => {
    setSubComponentSortConfig(prev => ({
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

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1)
  }

  const handleAddItemSuccess = () => {
    loadInitialData().then(() => loadInventory())
  }

  // Category pagination logic
  // Category pagination logic

  const categoryIndexOfLastRecord = categoryCurrentPage * categoryRowsPerPage
  const categoryIndexOfFirstRecord = categoryIndexOfLastRecord - categoryRowsPerPage
  const categoryCurrentRecords = sortedCategoryData.slice(categoryIndexOfFirstRecord, categoryIndexOfLastRecord)
  const categoryTotalPages = Math.ceil(sortedCategoryData.length / categoryRowsPerPage)

  const handleCategoryPageChange = (page: number) => {
    if (page > 0 && page <= categoryTotalPages) {
      setCategoryCurrentPage(page)
    }
  }

  const handleCategoryRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryRowsPerPage(parseInt(e.target.value))
    setCategoryCurrentPage(1)
  }

  // Head pagination logic
  const headIndexOfLastRecord = headCurrentPage * headRowsPerPage
  const headIndexOfFirstRecord = headIndexOfLastRecord - headRowsPerPage
  const headCurrentRecords = sortedHeadData.slice(headIndexOfFirstRecord, headIndexOfLastRecord)
  const headTotalPages = Math.ceil(sortedHeadData.length / headRowsPerPage)

  const handleHeadPageChange = (page: number) => {
    if (page > 0 && page <= headTotalPages) {
      setHeadCurrentPage(page)
    }
  }

  const handleHeadRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHeadRowsPerPage(parseInt(e.target.value))
    setHeadCurrentPage(1)
  }

  const handleHeadSort = (key: string) => {
    setHeadSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Sub Head pagination logic
  const subHeadIndexOfLastRecord = subHeadCurrentPage * subHeadRowsPerPage
  const subHeadIndexOfFirstRecord = subHeadIndexOfLastRecord - subHeadRowsPerPage
  const subHeadCurrentRecords = sortedSubHeadData.slice(subHeadIndexOfFirstRecord, subHeadIndexOfLastRecord)
  const subHeadTotalPages = Math.ceil(sortedSubHeadData.length / subHeadRowsPerPage)

  const handleSubHeadPageChange = (page: number) => {
    if (page > 0 && page <= subHeadTotalPages) {
      setSubHeadCurrentPage(page)
    }
  }

  const handleSubHeadRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubHeadRowsPerPage(parseInt(e.target.value))
    setSubHeadCurrentPage(1)
  }

  const handleSubHeadSort = (key: string) => {
    setSubHeadSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Accounting Code pagination logic
  const accountingCodeIndexOfLastRecord = accountingCodeCurrentPage * accountingCodeRowsPerPage
  const accountingCodeIndexOfFirstRecord = accountingCodeIndexOfLastRecord - accountingCodeRowsPerPage
  const accountingCodeCurrentRecords = sortedAccountingCodeData.slice(accountingCodeIndexOfFirstRecord, accountingCodeIndexOfLastRecord)
  const accountingCodeTotalPages = Math.ceil(sortedAccountingCodeData.length / accountingCodeRowsPerPage)

  const handleAccountingCodePageChange = (page: number) => {
    if (page > 0 && page <= accountingCodeTotalPages) {
      setAccountingCodeCurrentPage(page)
    }
  }

  const handleAccountingCodeRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAccountingCodeRowsPerPage(parseInt(e.target.value))
    setAccountingCodeCurrentPage(1)
  }

  // Sub Accounting pagination logic
  const subAccountingIndexOfLastRecord = subAccountingCurrentPage * subAccountingRowsPerPage
  const subAccountingIndexOfFirstRecord = subAccountingIndexOfLastRecord - subAccountingRowsPerPage
  const subAccountingCurrentRecords = sortedSubAccountingData.slice(subAccountingIndexOfFirstRecord, subAccountingIndexOfLastRecord)
  const subAccountingTotalPages = Math.ceil(sortedSubAccountingData.length / subAccountingRowsPerPage)

  const handleSubAccountingPageChange = (page: number) => {
    if (page > 0 && page <= subAccountingTotalPages) {
      setSubAccountingCurrentPage(page)
    }
  }

  const handleSubAccountingRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubAccountingRowsPerPage(parseInt(e.target.value))
    setSubAccountingCurrentPage(1)
  }

  // Sub Catalogue pagination logic
  const subCatalogueIndexOfLastRecord = subCatalogueCurrentPage * subCatalogueRowsPerPage
  const subCatalogueIndexOfFirstRecord = subCatalogueIndexOfLastRecord - subCatalogueRowsPerPage
  const subCatalogueCurrentRecords = sortedSubCatalogueData.slice(subCatalogueIndexOfFirstRecord, subCatalogueIndexOfLastRecord)
  const subCatalogueTotalPages = Math.ceil(sortedSubCatalogueData.length / subCatalogueRowsPerPage)

  const handleSubCataloguePageChange = (page: number) => {
    if (page > 0 && page <= subCatalogueTotalPages) {
      setSubCatalogueCurrentPage(page)
    }
  }

  const handleSubCatalogueRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubCatalogueRowsPerPage(parseInt(e.target.value))
    setSubCatalogueCurrentPage(1)
  }

  // Part pagination logic
  const partIndexOfLastRecord = partCurrentPage * partRowsPerPage
  const partIndexOfFirstRecord = partIndexOfLastRecord - partRowsPerPage
  const partCurrentRecords = sortedPartData.slice(partIndexOfFirstRecord, partIndexOfLastRecord)
  const partTotalPages = Math.ceil(sortedPartData.length / partRowsPerPage)

  const handlePartPageChange = (page: number) => {
    if (page > 0 && page <= partTotalPages) {
      setPartCurrentPage(page)
    }
  }

  const handlePartRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPartRowsPerPage(parseInt(e.target.value))
    setPartCurrentPage(1)
  }

  // Sub Component pagination
  const subComponentIndexOfLastRecord = subComponentCurrentPage * subComponentRowsPerPage
  const subComponentIndexOfFirstRecord = subComponentIndexOfLastRecord - subComponentRowsPerPage
  const subComponentCurrentRecords = sortedSubComponentData.slice(subComponentIndexOfFirstRecord, subComponentIndexOfLastRecord)
  const subComponentTotalPages = Math.ceil(sortedSubComponentData.length / subComponentRowsPerPage)

  const handleSubComponentPageChange = (page: number) => {
    if (page > 0 && page <= subComponentTotalPages) {
      setSubComponentCurrentPage(page)
    }
  }

  const handleSubComponentRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSubComponentRowsPerPage(parseInt(e.target.value))
    setSubComponentCurrentPage(1)
  }

  // Load companies for category filter
  const loadCompaniesForFilter = async () => {
    if (currentUser?.role?.id !== 1) return // Only for superadmin

    setIsLoadingCompanies(true)
    try {
      const companiesData = await getCompanyGroupAdmins()
      setCompaniesForFilter(companiesData)
    } catch (error) {
      console.error('Error loading companies for filter:', error)
    } finally {
      setIsLoadingCompanies(false)
    }
  }

  // Load data functions for each tab
  const loadCategoryData = async () => {
    setCategoryLoading(true);
    try {
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
        : 13 // Default fallback for superadmin

      let data: InventoryCategory[] = []

      // Use vessel type filter if available
      const vesselTypeParam = categoryVesselTypeFilter || undefined

      console.log('loadCategoryData - Role:', roleId, 'CGA ID:', effectiveCgaId, 'VesselType filter:', vesselTypeParam)

      if (actsAsSuperadmin) {
        if (categoryCompanyFilter) {
          const cgaIdToUse = parseInt(categoryCompanyFilter)
          data = await getAllInventoryCategoriesForCompany(cgaIdToUse, vesselTypeParam)
        } else {
          data = await getAllInventoryCategoriesForAllCompanies()
        }
      } else {
        // For Company Group Admin, pass vessel type (will fetch all if undefined)
        data = await getAllInventoryCategoriesForCompany(effectiveCgaId, vesselTypeParam)
      }

      console.log('loadCategoryData - Loaded', data.length, 'categories')
      setCategoryData(data)
    } catch (error) {
      console.error('Error loading category data:', error)
      setCategoryData([])
    } finally {
      setCategoryLoading(false)
    }
  }

  const loadHeadData = async () => {
    setHeadLoading(true)
    try {
      const data = await getInventoryItemHeads()
      console.log('loadHeadData - Loaded', data.length, 'heads')
      setHeadData(data)
    } catch (error) {
      console.error('Error loading head data:', error)
      setHeadData([])
    } finally {
      setHeadLoading(false)
    }
  }

  const loadSubHeadData = async () => {
    setSubHeadLoading(true)
    try {
      const data = await getInventoryItemSubHeads()
      console.log('loadSubHeadData - Loaded', data.length, 'sub heads')
      setSubHeadData(data)
    } catch (error) {
      console.error('Error loading sub head data:', error)
      setSubHeadData([])
    } finally {
      setSubHeadLoading(false)
    }
  }

  const loadAccountingCodeData = async (forceCgaId?: number, forceVesselType?: string) => {
    setAccountingLoading(true);
    try {
      const roleId = currentUser?.role?.id
      const roleEntityId = currentUser?.roleEntityId
      const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null

      const isOperator = roleId === 6
      const isSuperadminOperator = isOperator && companyGroupAdminId == null
      const isCompanyOperator = isOperator && companyGroupAdminId != null

      const actsAsSuperadmin = roleId === 1 || isSuperadminOperator
      const actsAsCga = roleId === 5 || isCompanyOperator

      const vesselTypes = ['OIL_TANKER', 'TANKER', 'GAS_CARRIER', 'CHEMICAL_TANKER', 'PRODUCT_TANKER', 'LNG_CARRIER', 'LPG_CARRIER', 'CRUDE_OIL_TANKER', 'BUNKER_TANKER', 'CONTAINER_SHIP', 'BULK_CARRIER', 'GENERAL_CARGO_SHIP', 'RORO_CARGO_SHIP', 'HEAVY_LIFT_VESSEL', 'REEFER_SHIP', 'MULTI_PURPOSE_VESSEL', 'CRUISE_SHIP', 'FERRY', 'ROPAX_VESSEL', 'HIGH_SPEED_CRAFT', 'OFFSHORE_SUPPLY_VESSEL', 'AHTS', 'PSV', 'SEISMIC_SURVEY_VESSEL', 'CABLE_LAYER', 'RESEARCH_VESSEL', 'DSV', 'FIREFIGHTING_VESSEL', 'PIPE_LAYING_VESSEL', 'HARBOR_TUG', 'OCEAN_TUG', 'WORK_BOAT', 'PILOT_BOAT', 'BARGE']

      if (actsAsSuperadmin) {
        const allAccountingCodes = await getAllAccountingAccounts()
        setAccountingCodeData(allAccountingCodes)
      } else if (actsAsCga) {
        const effectiveCgaId = forceCgaId ?? (roleId === 5 ? Number(roleEntityId || companyGroupAdminId) : Number(companyGroupAdminId))
        const fetchPromises = vesselTypes.map(vesselType =>
          getAccountingAccountsWithParams(effectiveCgaId, forceVesselType ?? vesselType).then(c => c || []).catch(() => [])
        )
        const results = await Promise.all(fetchPromises)
        const all: AccountingAccount[] = []
        const seen = new Set<number>()
        results.forEach(list => list.forEach(code => {
          if (!seen.has(code.id)) { seen.add(code.id); all.push(code); }
        }))
        setAccountingCodeData(all)
      } else {
        const allAccountingCodes = await getAllAccountingAccounts()
        setAccountingCodeData(allAccountingCodes)
      }
    } catch (error) {
      console.error('Error loading accounting code data:', error)
      setAccountingCodeData([])
    } finally {
      setAccountingLoading(false);
    }
  }

  const loadSubAccountingData = async () => {
    setSubAccountingLoading(true);
    try {
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

      const allData = await getAllSubAccounts(effectiveCgaId)
      const dataArray = Array.isArray(allData) ? allData : [allData]

      // Filter by company for Company Group Admin
      if (actsAsCga && effectiveCgaId) {
        console.log('Filtering sub accounts for company:', effectiveCgaId)
        const filteredData = dataArray.filter(item => {
          const itemCgaId = typeof item.cgaid === 'object' ? item.cgaid?.id : item.cgaid
          return itemCgaId === effectiveCgaId
        })
        console.log(`Filtered ${filteredData.length} sub accounts out of ${dataArray.length} for company ${effectiveCgaId}`)
        setSubAccountingData(filteredData)
      } else {
        // Superadmin sees all
        setSubAccountingData(dataArray)
      }
    } catch (error) {
      console.error('Error loading sub accounting data:', error)
      setSubAccountingData([])
    } finally {
      setSubAccountingLoading(false);
    }
  }

  const loadSubCatalogueData = async () => {
    setSubCatalogueLoading(true);
    try {
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

      let allData: SubCatalogue[] = []

      // Superadmin: Fetch all sub catalogues without parameters (fast!)
      if (actsAsSuperadmin) {
        console.log('🚀 Superadmin: Fetching all sub catalogues without parameters...')
        allData = await getAllSubCatalogues()
        console.log(`✅ Superadmin: Loaded ${allData.length} sub catalogues`)
        setSubCatalogueData(allData)
      }
      // Company users: Fetch with parameters and filter by company
      else if (actsAsCga && effectiveCgaId) {
        console.log('🏢 Company user: Fetching sub catalogues with parameters...')

        // Get all sub accounts for this company
        const subAccounts = await getAllSubAccounts()
        const companySubAccounts = subAccounts.filter(sa => {
          const saCgaId = typeof sa.cgaid === 'object' ? sa.cgaid?.id : sa.cgaid
          return saCgaId === effectiveCgaId
        })

        console.log(`Found ${companySubAccounts.length} sub accounts for company ${effectiveCgaId}`)

        // Get vessels for this company to determine vessel types
        const companyUsername = (currentUser as any)?.companyGroupAdmin?.username || (currentUser as any)?.username
        let vesselTypes: string[] = []

        if (companyUsername) {
          try {
            const vessels = await getVesselsByCompany(companyUsername)
            vesselTypes = Array.from(new Set(vessels.map(v => v.vesselType).filter(Boolean)))
            console.log(`Found ${vesselTypes.length} vessel types for company:`, vesselTypes)
          } catch (error) {
            console.error('Error loading vessels:', error)
          }
        }

        // If no vessel types found, use common ones
        if (vesselTypes.length === 0) {
          vesselTypes = ['OIL_TANKER', 'TANKER', 'CONTAINER_SHIP', 'BULK_CARRIER']
          console.log('Using default vessel types:', vesselTypes)
        }

        // Fetch sub catalogues for each combination
        const allSubCatalogues: SubCatalogue[] = []
        const seenIds = new Set<number>()

        const combinations = vesselTypes.flatMap(vesselType =>
          companySubAccounts.map(sa => ({ vesselType, subaccountId: sa.id }))
        )

        console.log(`Fetching ${combinations.length} combinations...`)

        // Process in batches
        const BATCH_SIZE = 20
        for (let i = 0; i < combinations.length; i += BATCH_SIZE) {
          const batch = combinations.slice(i, i + BATCH_SIZE)
          const batchPromises = batch.map(({ vesselType, subaccountId }) =>
            getSubCatalogues(vesselType, subaccountId).catch(() => [])
          )

          const batchResults = await Promise.all(batchPromises)

          batchResults.forEach(data => {
            if (Array.isArray(data) && data.length > 0) {
              data.forEach(item => {
                if (!seenIds.has(item.id)) {
                  seenIds.add(item.id)
                  allSubCatalogues.push(item)
                }
              })
            }
          })
        }

        console.log(`✅ Company user: Loaded ${allSubCatalogues.length} sub catalogues`)
        setSubCatalogueData(allSubCatalogues)
      } else {
        // Fallback
        console.log('⚠️ Unknown user type, loading all sub catalogues...')
        allData = await getAllSubCatalogues()
        setSubCatalogueData(allData)
      }
    } catch (error) {
      console.error('Error loading sub catalogue data:', error)
      setSubCatalogueData([])
    } finally {
      setSubCatalogueLoading(false);
    }
  }

  const loadPartData = async () => {
    setPartLoading(true);
    try {
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

      const allData = await getParts()

      // Filter by company for Company Group Admin
      if (actsAsCga && effectiveCgaId) {
        console.log('Filtering parts for company:', effectiveCgaId)
        const filteredData = allData.filter(part => {
          // Parts are linked to company through subcatalogue
          // The API returns cgaid but TypeScript doesn't know about it
          const subcat = part.subcatalogue as any
          const subcatCgaId = typeof subcat?.cgaid === 'object'
            ? subcat?.cgaid?.id
            : subcat?.cgaid
          return subcatCgaId === effectiveCgaId
        })
        console.log(`Filtered ${filteredData.length} parts out of ${allData.length} for company ${effectiveCgaId}`)
        setPartData(filteredData)
      } else {
        // Superadmin sees all
        setPartData(allData)
      }
    } catch (error) {
      console.error('Error loading part data:', error)
      setPartData([])
    } finally {
      setPartLoading(false);
    }
  }

  const loadSubComponentData = async () => {
    setIsLoadingSubComponents(true)
    try {
      console.log('Loading sub component data...')

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

      const allData = await getSubComponents()
      console.log('Sub component data received:', allData)

      // Filter by company for Company Group Admin
      if (actsAsCga && effectiveCgaId) {
        console.log('Filtering sub components for company:', effectiveCgaId)

        // Fetch all parts to get the subcatalogue information
        const allParts = await getParts()
        console.log('All parts fetched for filtering:', allParts.length)

        // Create a map of part IDs that belong to this company
        const companyPartIds = new Set(
          allParts
            .filter(part => {
              const subcat = (part as any)?.subcatalogue
              const subcatCgaId = typeof subcat?.cgaid === 'object'
                ? subcat?.cgaid?.id
                : subcat?.cgaid
              return subcatCgaId === effectiveCgaId
            })
            .map(part => part.id)
        )

        console.log('Company part IDs:', Array.from(companyPartIds))

        // Filter sub components based on whether their part belongs to the company
        const filteredData = allData.filter(subComp => {
          return companyPartIds.has(subComp.part.id)
        })

        console.log(`Filtered ${filteredData.length} sub components out of ${allData.length} for company ${effectiveCgaId}`)
        setSubComponentData(filteredData)
      } else {
        // Superadmin sees all
        setSubComponentData(allData)
      }
    } catch (error) {
      console.error('Error loading sub component data:', error)
      setSubComponentData([]) // Set empty array on error
    } finally {
      setIsLoadingSubComponents(false)
    }
  }

  // Handle modal submissions for each tab
  const handleCategorySubmit = async () => {
    console.log('Category submitted, refreshing category data...')
    // Add a small delay to ensure the category is fully created
    setTimeout(() => {
      loadCategoryData()
    }, 500)
  }

  const handleEditCategory = (category: InventoryCategory) => {
    setSelectedCategory(category)
    setIsEditCategoryModalVisible(true)
  }

  const handleEditCategorySubmit = async () => {
    console.log('Category updated, refreshing category data...')
    setTimeout(() => {
      loadCategoryData()
    }, 500)
  }

  const handleHeadSubmit = async (payload: { name: string; inventoryItemCategoryId: number }) => {
    try {
      await createInventoryItemHead(payload)
      await loadHeadData()
    } catch (error) {
      throw error
    }
  }

  const handleEditHead = (head: InventoryItemHead) => {
    setSelectedHead(head)
    setIsEditHeadModalVisible(true)
  }

  const handleEditHeadSubmit = async (id: number, payload: { name: string; inventoryItemCategoryId: number }) => {
    try {
      await updateInventoryItemHead(id, payload)
      await loadHeadData()
    } catch (error) {
      throw error
    }
  }

  const handleDeleteHead = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this head?')) return

    try {
      await deleteInventoryItemHead(id)
      await loadHeadData()
      toast.success('Head deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting head:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete head'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this head because it has associated items. Please delete or reassign the items first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleSubHeadSubmit = async (payload: { name: string; inventoryItemHeadId: number }) => {
    try {
      await createInventoryItemSubHead(payload)
      await loadSubHeadData()
    } catch (error) {
      throw error
    }
  }

  const handleEditSubHead = (subHead: InventoryItemSubHead) => {
    setSelectedSubHead(subHead)
    setIsEditSubHeadModalVisible(true)
  }

  const handleEditSubHeadSubmit = async (id: number, payload: { name: string; inventoryItemHeadId: number }) => {
    try {
      await updateInventoryItemSubHead(id, payload)
      await loadSubHeadData()
    } catch (error) {
      throw error
    }
  }

  const handleDeleteSubHead = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this sub head?')) return

    try {
      await deleteInventoryItemSubHead(id)
      await loadSubHeadData()
      toast.success('Sub head deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting sub head:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete sub head'

      if (errorMessage.includes('foreign key constraint') || errorMessage.includes('Cannot delete or update a parent row')) {
        toast.error('Cannot delete this sub head because it has associated items. Please delete or reassign the items first.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  const handleAccountingCodeSubmit = async (cgaId?: number, vesselType?: string) => {
    console.log('Accounting code submitted, refreshing accounting code data with cgaId:', cgaId, 'vesselType:', vesselType)

    // Check if user is superadmin
    const roleId = currentUser?.role?.id
    const companyGroupAdminId = (currentUser as any)?.companyGroupAdminId ?? (currentUser as any)?.companyGroupAdmin?.id ?? null
    const isOperator = roleId === 6
    const isSuperadminOperator = isOperator && companyGroupAdminId == null
    const actsAsSuperadmin = roleId === 1 || isSuperadminOperator

    if (actsAsSuperadmin) {
      // For superadmin, reload all accounting codes
      await loadAccountingCodeData()
      console.log('All accounting codes refreshed for superadmin')
    } else {
      // For company users, refresh with specific parameters
      await loadAccountingCodeData(cgaId, vesselType)
      console.log('Accounting code data refreshed for company')
    }

    // Also add a delayed refresh as backup
    setTimeout(async () => {
      console.log('Backup refresh of accounting code data...')
      if (actsAsSuperadmin) {
        await loadAccountingCodeData()
      } else {
        await loadAccountingCodeData(cgaId, vesselType)
      }
      console.log('Backup accounting code data refreshed')
    }, 1000)
  }

  const handleEditAccountingCode = (accountingCode: AccountingAccount) => {
    setSelectedAccountingCode(accountingCode)
    setIsEditAccountingCodeModalVisible(true)
  }

  const handleEditAccountingCodeSubmit = async () => {
    console.log('Accounting code updated, refreshing accounting code data...')
    setTimeout(() => {
      loadAccountingCodeData()
    }, 500)
  }

  const handleSubAccountingSubmit = () => {
    console.log('InventoryList - Sub accounting submitted, refreshing data...')
    loadSubAccountingData()
  }

  const handleEditSubAccounting = (subAccount: SubAccount) => {
    setSelectedSubAccount(subAccount)
    setIsEditSubAccountingModalVisible(true)
  }

  const handleEditSubAccountingSubmit = async () => {
    console.log('Sub accounting updated, refreshing sub accounting data...')
    setTimeout(() => {
      loadSubAccountingData()
    }, 500)
  }

  const handleSubCatalogueSubmit = async () => {
    console.log('InventoryList - Sub catalogue submitted, refreshing data...')
    await loadSubCatalogueData()
    console.log('InventoryList - Sub catalogue data refreshed successfully')
    // Trigger refresh of modal sub catalogues
    setPartModalRefreshTrigger(prev => prev + 1)
    setAddItemModalRefreshTrigger(prev => prev + 1)
  }

  const handleEditSubCatalogue = (subCatalogue: SubCatalogue) => {
    setSelectedSubCatalogue(subCatalogue)
    setIsEditSubCatalogueModalVisible(true)
  }

  const handleEditSubCatalogueSubmit = async () => {
    console.log('Sub catalogue updated, refreshing sub catalogue data...')
    await loadSubCatalogueData()
    // Trigger refresh of modal sub catalogues
    setPartModalRefreshTrigger(prev => prev + 1)
    setAddItemModalRefreshTrigger(prev => prev + 1)
  }

  const handleEditPart = (part: Part) => {
    setSelectedPart(part)
    setIsEditPartModalVisible(true)
  }

  const handleEditPartSubmit = async () => {
    console.log('Part updated, refreshing part data...')
    await loadPartData()
    setIsEditPartModalVisible(false)
    setSelectedPart(null)
  }

  const handlePartSubmit = () => {
    loadPartData()
  }

  const handleEditSubComponent = (subComponent: SubComponent) => {
    setSelectedSubComponent(subComponent)
    setIsEditSubComponentModalVisible(true)
  }

  const handleEditSubComponentSubmit = async () => {
    console.log('Sub component updated, refreshing sub component data...')
    await loadSubComponentData()
    setIsEditSubComponentModalVisible(false)
    setSelectedSubComponent(null)
  }

  const handleSubComponentSubmit = () => {
    loadSubComponentData()
  }

  // ✅ REPLACE with one-time loaders per tab/subtab
  const loadedFlags = useRef({
    add_category: false,
    add_head: false,
    add_subHead: false,
    add_accountingCode: false,
    add_subAccounting: false,
    add_subCatalogue: false,
    add_part: false,
    add_subComponent: false,
    companies_for_filter: false,
  });

  useEffect(() => {
    if (activeTab !== 'addItem') return;

    const needs = (key: keyof typeof loadedFlags.current) => !loadedFlags.current[key];

    if (addItemSubTab === 'category') {
      if (needs('add_category')) {
        loadCategoryData().finally(() => { loadedFlags.current.add_category = true; });
      }
      if (currentUser?.role?.id === 1 && needs('companies_for_filter')) {
        loadCompaniesForFilter().finally(() => { loadedFlags.current.companies_for_filter = true; });
      }
    }

    if (addItemSubTab === 'head' && needs('add_head')) {
      loadHeadData().finally(() => { loadedFlags.current.add_head = true; });
    }

    if (addItemSubTab === 'subHead' && needs('add_subHead')) {
      loadSubHeadData().finally(() => { loadedFlags.current.add_subHead = true; });
    }

    if (addItemSubTab === 'accountingCode' && needs('add_accountingCode')) {
      loadAccountingCodeData().finally(() => { loadedFlags.current.add_accountingCode = true; });
    }

    if (addItemSubTab === 'subAccounting' && needs('add_subAccounting')) {
      loadSubAccountingData().finally(() => { loadedFlags.current.add_subAccounting = true; });
    }

    if (addItemSubTab === 'subCatalogue' && needs('add_subCatalogue')) {
      loadSubCatalogueData().finally(() => { loadedFlags.current.add_subCatalogue = true; });
    }

    if (addItemSubTab === 'part' && needs('add_part')) {
      loadPartData().finally(() => { loadedFlags.current.add_part = true; });
    }

    if (addItemSubTab === 'subComponent' && needs('add_subComponent')) {
      loadSubComponentData().finally(() => { loadedFlags.current.add_subComponent = true; });
    }
  }, [activeTab, addItemSubTab]);


  // Reset company filter when switching away from category tab
  useEffect(() => {
    if (addItemSubTab !== 'category') {
      setCategoryCompanyFilter('')
    }
  }, [addItemSubTab])

  // Reload category data when company or vessel type filter changes
  useEffect(() => {
    if (addItemSubTab === 'category') {
      console.log('Filter changed - Company:', categoryCompanyFilter, 'VesselType:', categoryVesselTypeFilter)
      loadCategoryData()
    }
  }, [categoryCompanyFilter, categoryVesselTypeFilter, addItemSubTab])

  // Export function for Add Item tabs
  const exportAddItemTab = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      const today = new Date().toLocaleDateString();

      // Common header
      doc.setFontSize(16);
      doc.setFontSize(10);

      let title = '';
      let tableData: any[] = [];
      let headers: string[] = [];

      switch (addItemSubTab) {
        case 'category':
          title = 'Inventory Categories';
          headers = ['Sr. No.', 'Category Name', 'Company', 'Vessel Type'];
          tableData = sortedCategoryData.map((cat, idx) => [
            (idx + 1).toString(),
            cat.name || '',
            (cat.cgaid as any)?.name || 'N/A',
            typeof cat.vesselType === 'string' ? cat.vesselType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'N/A'
          ]);
          break;

        case 'head':
          title = 'Inventory Item Heads';
          headers = ['Sr. No.', 'Head Name', 'Category'];
          tableData = sortedHeadData.map((head, idx) => [
            (idx + 1).toString(),
            head.name || '',
            head.inventoryItemCategoryName || 'N/A'
          ]);
          break;

        case 'subHead':
          title = 'Inventory Item Sub Heads';
          headers = ['Sr. No.', 'Sub Head Name', 'Head'];
          tableData = sortedSubHeadData.map((subHead, idx) => [
            (idx + 1).toString(),
            subHead.name || '',
            subHead.inventoryItemHeadName || 'N/A'
          ]);
          break;

        case 'accountingCode':
          title = 'Accounting Codes';
          headers = ['Sr. No.', 'Account Code', 'Company', 'Vessel Type'];
          tableData = sortedAccountingCodeData.map((acc, idx) => [
            (idx + 1).toString(),
            acc.accountCodes || '',
            typeof acc.cgaid === 'object' && acc.cgaid !== null ? (acc.cgaid as any).name || 'N/A' : 'N/A',
            typeof acc.vesselType === 'string' ? acc.vesselType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'N/A'
          ]);
          break;

        case 'subAccounting':
          title = 'Sub Accounting Codes';
          headers = ['Sr. No.', 'Sub Account Code', 'Account Code', 'Company', 'Vessel Type'];
          tableData = sortedSubAccountingData.map((sub, idx) => [
            (idx + 1).toString(),
            (sub as any).subaccountCodes || (sub as any).subAccountCodes || '',
            (sub as any).accountCode || 'N/A',
            (sub as any).cgaid?.name || 'N/A',
            typeof (sub as any).vesselType === 'string' ? (sub as any).vesselType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'N/A'
          ]);
          break;

        case 'subCatalogue':
          title = 'Sub Catalogues';
          headers = ['Sr. No.', 'Sub Catalogue Name', 'Company', 'Vessel Type'];
          tableData = sortedSubCatalogueData.map((sub, idx) => [
            (idx + 1).toString(),
            sub.name || '',
            (sub as any).cgaid?.name || 'N/A',
            typeof (sub as any).vesselType === 'string' ? (sub as any).vesselType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'N/A'
          ]);
          break;

        case 'part':
          title = 'Parts';
          headers = ['Sr. No.', 'Part Name', 'Part Code', 'Manufacturer'];
          tableData = sortedPartData.map((part, idx) => [
            (idx + 1).toString(),
            part.name || '',
            (part as any).partNo || (part as any).code || 'N/A',
            part.manufacturer || 'N/A'
          ]);
          break;

        case 'subComponent':
          title = 'Sub Components';
          headers = ['Sr. No.', 'ID', 'Sub Component Name', 'Part Code', 'Part Name'];
          tableData = sortedSubComponentData.map((comp, idx) => [
            (idx + 1).toString(),
            comp.id?.toString() || '',
            comp.name || '',
            comp.part?.code || 'N/A',
            comp.part?.name || 'N/A'
          ]);
          break;
      }

      // Add title and metadata
      doc.text(title, 14, 15);
      doc.text(`Generated on: ${today}`, 14, 22);
      doc.text(`Total Records: ${tableData.length}`, 14, 28);

      // Generate table
      (doc as any).autoTable({
        head: [headers],
        body: tableData,
        startY: 35,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 10,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        margin: { top: 35, left: 10, right: 10 },
        pageBreak: 'auto',
        tableLineWidth: 0.1,
        tableLineColor: [200, 200, 200],
      });

      // Save PDF
      const fileName = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success('PDF exported successfully!');

    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <>
      <style>{`
        @media print {
          /* Hide non-essential elements */
          .card-header,
          .card-toolbar,
          .pagination-wrapper,
          button,
          .btn,
          nav,
          .sidebar,
          .app-sidebar,
          #kt_app_sidebar,
          .header,
          .app-header,
          #kt_app_header,
          .footer,
          .app-footer {
            display: none !important;
          }

          /* Make table fit on page */
          body {
            margin: 0;
            padding: 5px;
          }

          .app-main,
          .app-content,
          .card,
          .card-body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            display: block !important;
            visibility: visible !important;
          }

          .table-responsive {
            overflow: visible !important;
            page-break-inside: auto !important;
            display: block !important;
            visibility: visible !important;
          }

          .report-table {
            page-break-inside: auto !important;
            display: block !important;
            visibility: visible !important;
          }
          
          /* Ensure all divs containing the table are visible */
          div {
            visibility: visible !important;
          }

          table {
            width: 100% !important;
            font-size: 6px !important;
            page-break-inside: auto !important;
            page-break-after: auto !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            display: table !important;
            visibility: visible !important;
          }

          thead {
            display: table-header-group !important;
            visibility: visible !important;
          }

          tbody {
            display: table-row-group !important;
            visibility: visible !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
            display: table-row !important;
            visibility: visible !important;
          }

          td, th {
            display: table-cell !important;
            visibility: visible !important;
          }

          tfoot {
            display: table-footer-group !important;
          }

          th, td {
            padding: 2px 1px !important;
            font-size: 6px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            max-width: 100px !important;
          }

          /* More aggressive column width reduction for A4 */
          th:nth-child(1), td:nth-child(1) { width: 4% !important; max-width: 40px !important; }
          th:nth-child(2), td:nth-child(2) { width: 7% !important; max-width: 60px !important; }
          th:nth-child(3), td:nth-child(3) { width: 7% !important; max-width: 60px !important; }
          th:nth-child(4), td:nth-child(4) { width: 7% !important; max-width: 60px !important; }
          th:nth-child(5), td:nth-child(5) { width: 6% !important; max-width: 50px !important; }
          th:nth-child(6), td:nth-child(6) { width: 7% !important; max-width: 60px !important; }
          th:nth-child(7), td:nth-child(7) { width: 4% !important; max-width: 35px !important; }
          th:nth-child(8), td:nth-child(8) { width: 3% !important; max-width: 30px !important; }
          th:nth-child(9), td:nth-child(9) { width: 4% !important; max-width: 40px !important; }
          th:nth-child(10), td:nth-child(10) { width: 3% !important; max-width: 30px !important; }
          th:nth-child(11), td:nth-child(11) { width: 3% !important; max-width: 30px !important; }
          th:nth-child(12), td:nth-child(12) { width: 5% !important; max-width: 45px !important; }
          th:nth-child(13), td:nth-child(13) { width: 5% !important; max-width: 50px !important; }
          th:nth-child(14), td:nth-child(14) { width: 6% !important; max-width: 55px !important; }
          th:nth-child(15), td:nth-child(15) { width: 6% !important; max-width: 55px !important; }
          th:nth-child(16), td:nth-child(16) { width: 4% !important; max-width: 40px !important; }
          th:nth-child(17), td:nth-child(17) { width: 3% !important; max-width: 30px !important; }

          /* Hide action column in print */
          th:last-child, td:last-child {
            display: none !important;
          }

          /* Page settings for proper multi-page printing */
          @page {
            size: auto;
            margin: 10mm;
            orphans: 2;
            widows: 2;
          }
        }
      `}</style>
      <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
        <div className='d-flex flex-column flex-column-fluid'>
          <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
            <div className='card'>
              <div className='card-header border-0 pt-6 d-flex justify-content-between align-items-center bg-white'>
                <div>
                  <h3 className='card-label text-dark fw-bold'>Inventory Management</h3>
                  <p className='text-muted mb-0'>Manage vessel inventory, stock levels, and equipment spares</p>
                  {!canCreateItems && (
                    <small className='text-warning'>
                      <i className='fas fa-info-circle me-1'></i>
                      View-only access - Creation permissions limited to Super Admin and Company roles
                    </small>
                  )}
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
                    disabled={listLoading}
                    onClick={async () => {
                      // Determine which tab is active and export accordingly
                      if (activeTab === 'addItem') {
                        // Export Add Item tabs
                        exportAddItemTab();
                        return;
                      }

                      // Export Inventory Catalogue
                      const originalPage = currentPage;
                      const originalRowsPerPage = rowsPerPage;

                      // Temporarily set to fetch all records
                      setRowsPerPage(totalElements || 1000);
                      setCurrentPage(1);

                      // Wait for loading to complete by polling the listLoading state
                      const waitForLoad = async () => {
                        let attempts = 0;
                        const targetCount = totalElements || 1000;
                        while (attempts < 100) { // Max 10 seconds (100 * 100ms)
                          await new Promise(resolve => setTimeout(resolve, 100));
                          // Check if data has been loaded by comparing inventory length
                          console.log(`Waiting for data: ${inventoryData.length} / ${targetCount}, mapReady: ${mapReady}`);
                          if (inventoryData.length >= targetCount - 2) { // Tighter margin
                            console.log('Data loaded, waiting for lazy mapping to complete...');
                            break;
                          }
                          attempts++;
                        }
                      };

                      await waitForLoad();

                      // Wait for lazy mapping to complete (mapReady state)
                      const waitForMapping = async () => {
                        let attempts = 0;
                        while (attempts < 100 && !mapReady) { // Max 10 seconds
                          await new Promise(resolve => setTimeout(resolve, 100));
                          console.log(`Waiting for mapping: mapReady = ${mapReady}`);
                          attempts++;
                        }
                        console.log(`Mapping complete: mapReady = ${mapReady}`);
                        // Extra wait to ensure DOM is fully rendered
                        await new Promise(resolve => setTimeout(resolve, 1000));
                      };

                      await waitForMapping();

                      console.log(`Final inventory count: ${inventoryData.length}, ready to export`);

                      // Export to PDF using jsPDF
                      try {
                        const doc = new jsPDF({ orientation: 'landscape', format: 'a3' });

                        // Title
                        doc.setFontSize(16);
                        doc.text('Inventory Catalogue', 14, 15);

                        // Subtitle with date
                        doc.setFontSize(10);
                        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
                        doc.text(`Total Items: ${inventoryData.length}`, 14, 28);

                        // Prepare table data
                        const tableData = inventoryData.map(item => [
                          item.itemId || '',
                          item.itemName || '',
                          item.company || '',
                          item.vesselType || '',
                          item.partNumber || '',
                          item.category || '',
                          item.currentQty?.toString() || '',
                          item.uom || '',
                          item.reorderLevel?.toString() || '',
                          item.minThreshold?.toString() || '',
                          item.maxThreshold?.toString() || '',
                          `$${item.unitCost?.toFixed(2) || '0.00'}`,
                          item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '',
                          item.serialNumber || '',
                          item.location || '',
                          item.status || ''
                        ]);

                        // Generate table
                        (doc as any).autoTable({
                          head: [[
                            'Item ID', 'Item Name', 'Company', 'Vessel Type', 'Part Number',
                            'Category', 'Qty', 'UOM', 'Reorder', 'Min', 'Max',
                            'Unit Cost', 'Expiry', 'Serial No.', 'Location', 'Status'
                          ]],
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
                          columnStyles: {
                            0: { cellWidth: 20 },  // Item ID
                            1: { cellWidth: 25 },  // Item Name
                            2: { cellWidth: 25 },  // Company
                            3: { cellWidth: 25 },  // Vessel Type
                            4: { cellWidth: 22 },  // Part Number
                            5: { cellWidth: 25 },  // Category
                            6: { cellWidth: 12 },  // Qty
                            7: { cellWidth: 12 },  // UOM
                            8: { cellWidth: 15 },  // Reorder
                            9: { cellWidth: 12 },  // Min
                            10: { cellWidth: 12 }, // Max
                            11: { cellWidth: 18 }, // Unit Cost
                            12: { cellWidth: 20 }, // Expiry
                            13: { cellWidth: 22 }, // Serial No
                            14: { cellWidth: 22 }, // Location
                            15: { cellWidth: 15 }, // Status
                          },
                          margin: { top: 35, left: 10, right: 10 },
                          pageBreak: 'auto',
                          tableLineWidth: 0.1,
                          tableLineColor: [200, 200, 200],
                        });

                        // Save the PDF
                        doc.save(`Inventory_Catalogue_${new Date().toISOString().slice(0, 10)}.pdf`);
                        toast.success('PDF exported successfully!');
                      } catch (error) {
                        console.error('PDF export failed:', error);
                        toast.error('Failed to export PDF');
                      }

                      // Restore original pagination
                      setTimeout(() => {
                        setRowsPerPage(originalRowsPerPage);
                        setCurrentPage(originalPage);
                      }, 500);
                    }}
                  >
                    <KTSVG path='/media/icons/duotune/arrows/arr078.svg' className='svg-icon-2' />
                    Export
                  </button>
                  {activeTab === 'addItem' ? (
                    <>
                      {addItemSubTab === 'category' && (
                        <button
                          type='button'
                          className='btn btn_primary'
                          onClick={() => setIsCategoryModalVisible(true)}
                        >
                          <span className='me-2'>+</span>
                          Add Category
                        </button>
                      )}
                      {addItemSubTab === 'head' && (
                        <button
                          type='button'
                          className='btn btn_primary'
                          onClick={() => setIsHeadModalVisible(true)}
                        >
                          <span className='me-2'>+</span>
                          Add Head
                        </button>
                      )}
                      {addItemSubTab === 'subHead' && (
                        <button
                          type='button'
                          className='btn btn_primary'
                          onClick={() => setIsSubHeadModalVisible(true)}
                        >
                          <span className='me-2'>+</span>
                          Add Sub Head
                        </button>
                      )}
                      {addItemSubTab === 'accountingCode' && (
                        <button
                          type='button'
                          className='btn btn_primary'
                          onClick={() => setIsAccountingCodeModalVisible(true)}
                        >
                          <span className='me-2'>+</span>
                          Add Accounting Code
                        </button>
                      )}
                      {addItemSubTab === 'subAccounting' && (
                        <button
                          type='button'
                          className='btn btn_primary'
                          onClick={() => setIsSubAccountingModalVisible(true)}
                        >
                          <span className='me-2'>+</span>
                          Add Sub Accounting
                        </button>
                      )}
                      {addItemSubTab === 'subCatalogue' && (
                        <button
                          type='button'
                          className='btn btn_primary'
                          onClick={() => setIsSubCatalogueModalVisible(true)}
                        >
                          <span className='me-2'>+</span>
                          Add Sub Catalogue
                        </button>
                      )}
                      {addItemSubTab === 'part' && (
                        <button
                          type='button'
                          className='btn btn_primary'
                          onClick={() => setIsPartModalVisible(true)}
                        >
                          <span className='me-2'>+</span>
                          Add Part
                        </button>
                      )}
                      {addItemSubTab === 'subComponent' && (
                        <button
                          type='button'
                          className='btn btn_primary'
                          onClick={() => setIsSubComponentModalVisible(true)}
                        >
                          <span className='me-2'>+</span>
                          Add Sub Component
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type='button'
                      className='btn btn_primary'
                      onClick={() => setIsUpdateModalVisible(true)}
                    >
                      <span className='me-2'>⟳</span>
                      Update Inventory
                    </button>
                  )}
                </div>
              </div>

              <div className='card-body py-4 bg-white border-top'>
                <div className='d-flex justify-content-between align-items-center mb-4'>
                  <div className='btn-group' style={{ marginBottom: '10px' }}>
                    {canCreateItems && (
                      <button
                        className={`btn btn-sm ${activeTab === 'addItem' ? 'btn_primary' : 'btn-light'
                          }`}
                        onClick={() => setActiveTab('addItem')}
                      >
                        Add Item
                      </button>
                    )}
                    <button
                      className={`btn btn-sm ${activeTab === 'catalogue' ? 'btn_primary' : 'btn-light'
                        }`}
                      onClick={() => setActiveTab('catalogue')}
                    >
                      Inventory Catalogue ({inventoryData.length})
                    </button>
                  </div>
                </div>

                <div className="row mb-4">
                  {[
                    { title: "Total Items", value: totalItems.toString(), path: "/media/map/box-delivery.svg" },
                    { title: "Low Stock Items", value: lowStockItems.toString(), path: "/media/map/block-alerted.svg" },
                    { title: "Critical Items", value: criticalItems.toString(), path: "/media/map/box.svg" },
                    { title: "Total Value", value: `${totalValue.toFixed(2)}K`, path: "/media/map/tags-category.svg" },
                  ].map((card, index) => (
                    <div key={index} className="col-md-3 mb-3">
                      <div className="custom-card p-3">
                        <div className='d-flex justify-content-between'>
                          <div>
                            <h2 className="fw-bold mb-1">{card.value}</h2>
                            <h6 className="card-title">{card.title}</h6>
                          </div>
                          <KTSVG path={card.path} className='svg-icon svg-icon-2x' />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {activeTab === 'catalogue' && (
                  <div className='row gx-3 gy-3 mb-4'>
                    <div className='col-md-4'>
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
                          placeholder='Search items, part numbers, or descriptions...'
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className='col-md-2'>
                      <label className='form-label fw-semibold fs-7' style={{ color: '#A1A5B7' }}>
                        All Locations
                      </label>
                      <select
                        className='form-select'
                        style={{
                          border: '1px solid #E4E6EF',
                          borderRadius: '6px',
                          fontSize: '14px',
                          padding: '8px 12px',
                          color: '#5E6278',
                        }}
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                      >
                        <option value=''>All Locations</option>
                        <option value='Engine Room'>Engine Room</option>
                        <option value='Bridge'>Bridge</option>
                        <option value='Deck Store'>Deck Store</option>
                        <option value='Safety Equipment Locker'>Safety Equipment Locker</option>
                        <option value='Workshop'>Workshop</option>
                      </select>
                    </div>
                  </div>
                )}

                {activeTab === 'addItem' && !canCreateItems && (
                  <div className='card shadow-sm'>
                    <div className='card-body text-center py-5'>
                      <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-4x text-muted mb-3' />
                      <h5 className='text-muted mb-2'>Access Restricted</h5>
                      <p className='text-muted mb-0'>
                        You don't have permission to create inventory items.
                        <br />
                        Only Super Admin and Company roles can access this functionality.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'addItem' && canCreateItems && (
                  <div style={{ overflow: 'visible', position: 'relative' }}>
                    {/* Nested tabs for Add Item section */}
                    <div className='d-flex justify-content-between align-items-center mb-4' style={{ overflow: 'visible', minHeight: '40px' }}>
                      <div className='d-flex align-items-center gap-3' style={{ marginBottom: '10px' }}>
                        <div className='btn-group'>
                          <button
                            className={`btn btn-sm ${addItemSubTab === 'category' ? 'btn_primary' : 'btn-light'
                              }`}
                            onClick={() => setAddItemSubTab('category')}
                          >
                            Category
                          </button>
                          <button
                            className={`btn btn-sm ${addItemSubTab === 'head' ? 'btn_primary' : 'btn-light'
                              }`}
                            onClick={() => setAddItemSubTab('head')}
                          >
                            Head
                          </button>
                          <button
                            className={`btn btn-sm ${addItemSubTab === 'subHead' ? 'btn_primary' : 'btn-light'
                              }`}
                            onClick={() => setAddItemSubTab('subHead')}
                          >
                            Sub Head
                          </button>
                          {/* <button
                            className={`btn btn-sm ${addItemSubTab === 'subCatalogue' ? 'btn_primary' : 'btn-light'
                              }`}
                            onClick={() => setAddItemSubTab('subCatalogue')}
                          >
                            Sub Catalogue
                          </button> */}
                          <button
                            className={`btn btn-sm ${addItemSubTab === 'part' ? 'btn_primary' : 'btn-light'
                              }`}
                            onClick={() => setAddItemSubTab('part')}
                          >
                            Part
                          </button>
                          <button
                            className={`btn btn-sm ${addItemSubTab === 'subComponent' ? 'btn_primary' : 'btn-light'
                              }`}
                            onClick={() => setAddItemSubTab('subComponent')}
                          >
                            Sub Component
                          </button>
                        </div>

                        {/* Company filter - inline for all tabs */}
                        {currentUser?.role?.id === 1 && (
                          <select
                            className='form-select form-select-sm'
                            value={
                              addItemSubTab === 'category' ? categoryCompanyFilter :
                                addItemSubTab === 'accountingCode' ? accountingCodeCompanyFilter :
                                  addItemSubTab === 'subAccounting' ? subAccountingCompanyFilter :
                                    addItemSubTab === 'subCatalogue' ? subCatalogueCompanyFilter :
                                      addItemSubTab === 'part' ? partCompanyFilter :
                                        subComponentCompanyFilter
                            }
                            onChange={(e) => {
                              if (addItemSubTab === 'category') {
                                setCategoryCompanyFilter(e.target.value)
                                setCategoryCurrentPage(1)
                              } else if (addItemSubTab === 'accountingCode') {
                                setAccountingCodeCompanyFilter(e.target.value)
                                setAccountingCodeCurrentPage(1)
                              } else if (addItemSubTab === 'subAccounting') {
                                setSubAccountingCompanyFilter(e.target.value)
                                setSubAccountingCurrentPage(1)
                              } else if (addItemSubTab === 'subCatalogue') {
                                setSubCatalogueCompanyFilter(e.target.value)
                                setSubCatalogueCurrentPage(1)
                              } else if (addItemSubTab === 'part') {
                                setPartCompanyFilter(e.target.value)
                                setPartCurrentPage(1)
                              } else if (addItemSubTab === 'subComponent') {
                                setSubComponentCompanyFilter(e.target.value)
                                setSubComponentCurrentPage(1)
                              }
                            }}
                            disabled={isLoadingCompanies}
                            style={{
                              width: '180px',
                              border: '1px solid #E4E6EF',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '13px'
                            }}
                          >
                            <option value=''>All Companies</option>
                            {companiesForFilter.map(company => (
                              <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Accounting Code and Sub Accounting tabs moved to the far right */}
                      <div className='btn-group' style={{ marginBottom: '10px' }}>
                        <button
                          className={`btn btn-sm ${addItemSubTab === 'accountingCode' ? 'btn_primary' : 'btn-light'
                            }`}
                          onClick={() => setAddItemSubTab('accountingCode')}
                        >
                          Accounting Code
                        </button>
                        <button
                          className={`btn btn-sm ${addItemSubTab === 'subAccounting' ? 'btn_primary' : 'btn-light'
                            }`}
                          onClick={() => setAddItemSubTab('subAccounting')}
                        >
                          Sub Accounting
                        </button>
                      </div>
                    </div>

                    {/* Category Sub-tab */}
                    {addItemSubTab === 'category' && (
                      <div className='report-table table-responsive'>
                        <div style={{ overflowX: 'auto' }}>
                          <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead className='table-header text-start'>
                              <tr>
                                <th className='align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>Sr. No.</span>
                                  </div>
                                </th>
                                <th onClick={() => handleCategorySort('name')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>CATEGORY NAME</span>
                                    <div style={{ transform: 'translateY(-2px)' }}>
                                      <KTSVG
                                        path={`/media/map/sort-col-${categorySortConfig.key === 'name' ? categorySortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                        className='svg-icon ms-2 custom-sort-icon'
                                      />
                                    </div>
                                  </div>
                                </th>
                                <th onClick={() => handleCategorySort('company')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>COMPANY</span>
                                    <div style={{ transform: 'translateY(-2px)' }}>
                                      <KTSVG
                                        path={`/media/map/sort-col-${categorySortConfig.key === 'company' ? categorySortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                        className='svg-icon ms-2 custom-sort-icon'
                                      />
                                    </div>
                                  </div>
                                </th>
                                <th onClick={() => handleCategorySort('vesselType')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '150px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>VESSEL TYPE</span>
                                    <div style={{ transform: 'translateY(-2px)' }}>
                                      <KTSVG
                                        path={`/media/map/sort-col-${categorySortConfig.key === 'vesselType' ? categorySortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                        className='svg-icon ms-2 custom-sort-icon'
                                      />
                                    </div>
                                  </div>
                                </th>
                                <th className='align-middle text-center' style={{ padding: '12px 16px', width: '120px' }}>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACTIONS</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className='table-body text-start'>
                              {(categoryLoading) ? (
                                <TableSkeleton rows={8} cols={COLS.category} />
                              ) : (categoryCurrentRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={COLS.category} className='text-center text-muted py-5'>
                                    No categories found for the selected criteria.
                                  </td>
                                </tr>
                              ) : (
                                categoryCurrentRecords.map((category, index) => (
                                  <tr key={category.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                    <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                      {categoryIndexOfFirstRecord + index + 1}
                                    </td>
                                    <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
                                      {category.name}
                                    </td>
                                    <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                      {category.cgaid?.name || 'N/A'}
                                    </td>
                                    <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                      {typeof category.vesselType === 'string'
                                        ? category.vesselType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                        : category.vesselType?.fleet_name || 'N/A'
                                      }
                                    </td>
                                    <td className='text-center' style={{ padding: '12px 16px' }}>
                                      <div className='d-flex justify-content-center align-items-center gap-1'>
                                        <button
                                          className='btn btn-sm p-1'
                                          title='Edit'
                                          style={{ width: '28px', height: '28px' }}
                                          onClick={() => handleEditCategory(category)}
                                        >
                                          <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                        </button>
                                        <button
                                          className='btn btn-sm p-1'
                                          title='Delete'
                                          style={{ width: '28px', height: '28px' }}
                                          onClick={() => handleDeleteCategory(category.id)}
                                        >
                                          <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ))}

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
                              value={categoryRowsPerPage}
                              onChange={handleCategoryRowsPerPageChange}
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                            </select>
                          </div>
                          <div className='d-flex align-items-center'>
                            <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                              Showing <strong>{categoryCurrentRecords.length > 0 ? ((categoryCurrentPage - 1) * categoryRowsPerPage) + 1 : 0}-{Math.min(categoryCurrentPage * categoryRowsPerPage, sortedCategoryData.length)}</strong> of <strong>{sortedCategoryData.length}</strong>
                            </span>

                            <nav>
                              <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                <li className={`page-item ${categoryCurrentPage === 1 ? 'disabled' : ''}`}>
                                  <button
                                    className='page-link text-muted'
                                    style={{
                                      backgroundColor: '#f8f9fa',
                                      border: '1px solid #dee2e6',
                                      padding: '8px 12px',
                                      fontSize: '14px',
                                      borderRadius: '6px'
                                    }}
                                    onClick={() => handleCategoryPageChange(categoryCurrentPage - 1)}
                                    disabled={categoryCurrentPage === 1}
                                  >
                                    ‹
                                  </button>
                                </li>
                                {(() => {
                                  const pages = []
                                  const showPages = 5
                                  let startPage = Math.max(1, categoryCurrentPage - 2)
                                  let endPage = Math.min(categoryTotalPages, startPage + showPages - 1)

                                  if (endPage - startPage < showPages - 1) {
                                    startPage = Math.max(1, endPage - showPages + 1)
                                  }

                                  for (let i = startPage; i <= endPage; i++) {
                                    pages.push(
                                      <li key={i} className={`page-item ${categoryCurrentPage === i ? 'active' : ''}`}>
                                        <button
                                          className='page-link text-muted'
                                          style={{
                                            backgroundColor: categoryCurrentPage === i ? '#F4F9FF' : 'transparent',
                                            color: categoryCurrentPage === i ? '#1B84FF' : '#7E8299',
                                            border: '1px solid #dee2e6',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            borderRadius: '6px'
                                          }}
                                          onClick={() => handleCategoryPageChange(i)}
                                        >
                                          {i}
                                        </button>
                                      </li>
                                    )
                                  }
                                  return pages
                                })()}
                                <li className={`page-item ${categoryCurrentPage === categoryTotalPages || categoryTotalPages === 0 ? 'disabled' : ''}`}>
                                  <button
                                    className='page-link text-muted'
                                    style={{
                                      backgroundColor: '#f8f9fa',
                                      border: '1px solid #dee2e6',
                                      padding: '8px 12px',
                                      fontSize: '14px',
                                      borderRadius: '6px'
                                    }}
                                    onClick={() => handleCategoryPageChange(categoryCurrentPage + 1)}
                                    disabled={categoryCurrentPage === categoryTotalPages || categoryTotalPages === 0}
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

                    {/* Head Sub-tab */}
                    {addItemSubTab === 'head' && (
                      <div className='report-table table-responsive'>
                        <div style={{ overflowX: 'auto' }}>
                          <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead className='table-header text-start'>
                              <tr>
                                <th className='align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>Sr. No.</span>
                                  </div>
                                </th>
                                <th onClick={() => handleHeadSort('name')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '300px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>HEAD NAME</span>
                                    <div style={{ transform: 'translateY(-2px)' }}>
                                      <KTSVG
                                        path={`/media/map/sort-col-${headSortConfig.key === 'name' ? headSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                        className='svg-icon ms-2 custom-sort-icon'
                                      />
                                    </div>
                                  </div>
                                </th>
                                <th onClick={() => handleHeadSort('inventoryItemCategoryName')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '300px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>CATEGORY</span>
                                    <div style={{ transform: 'translateY(-2px)' }}>
                                      <KTSVG
                                        path={`/media/map/sort-col-${headSortConfig.key === 'inventoryItemCategoryName' ? headSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                        className='svg-icon ms-2 custom-sort-icon'
                                      />
                                    </div>
                                  </div>
                                </th>
                                <th className='align-middle text-center' style={{ padding: '12px 16px', width: '120px' }}>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACTIONS</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className='table-body text-start'>
                              {headLoading ? (
                                <TableSkeleton rows={8} cols={COLS.head} />
                              ) : (headCurrentRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={COLS.head} className='text-center text-muted py-5'>
                                    No heads found.
                                  </td>
                                </tr>
                              ) : (
                                headCurrentRecords.map((head, index) => (
                                  <tr key={head.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                    <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                      {headIndexOfFirstRecord + index + 1}
                                    </td>
                                    <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
                                      {head.name}
                                    </td>
                                    <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                      {head.inventoryItemCategoryName || 'N/A'}
                                    </td>
                                    <td className='text-center' style={{ padding: '12px 16px' }}>
                                      <div className='d-flex justify-content-center align-items-center gap-1'>
                                        <button
                                          className='btn btn-sm p-1'
                                          title='Edit'
                                          style={{ width: '28px', height: '28px' }}
                                          onClick={() => handleEditHead(head)}
                                        >
                                          <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                        </button>
                                        <button
                                          className='btn btn-sm p-1'
                                          title='Delete'
                                          style={{ width: '28px', height: '28px' }}
                                          onClick={() => handleDeleteHead(head.id)}
                                        >
                                          <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ))}
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
                              value={headRowsPerPage}
                              onChange={handleHeadRowsPerPageChange}
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                            </select>
                          </div>
                          <div className='d-flex align-items-center'>
                            <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                              Showing <strong>{headCurrentRecords.length > 0 ? ((headCurrentPage - 1) * headRowsPerPage) + 1 : 0}-{Math.min(headCurrentPage * headRowsPerPage, headData.length)}</strong> of <strong>{headData.length}</strong>
                            </span>

                            <nav>
                              <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                <li className={`page-item ${headCurrentPage === 1 ? 'disabled' : ''}`}>
                                  <button
                                    className='page-link text-muted'
                                    style={{
                                      backgroundColor: '#f8f9fa',
                                      border: '1px solid #dee2e6',
                                      padding: '8px 12px',
                                      fontSize: '14px',
                                      borderRadius: '6px'
                                    }}
                                    onClick={() => handleHeadPageChange(headCurrentPage - 1)}
                                    disabled={headCurrentPage === 1}
                                  >
                                    ‹
                                  </button>
                                </li>
                                {(() => {
                                  const pages = []
                                  const showPages = 5
                                  let startPage = Math.max(1, headCurrentPage - 2)
                                  let endPage = Math.min(headTotalPages, startPage + showPages - 1)

                                  if (endPage - startPage < showPages - 1) {
                                    startPage = Math.max(1, endPage - showPages + 1)
                                  }

                                  for (let i = startPage; i <= endPage; i++) {
                                    pages.push(
                                      <li key={i} className={`page-item ${headCurrentPage === i ? 'active' : ''}`}>
                                        <button
                                          className='page-link text-muted'
                                          style={{
                                            backgroundColor: headCurrentPage === i ? '#F4F9FF' : 'transparent',
                                            color: headCurrentPage === i ? '#1B84FF' : '#7E8299',
                                            border: '1px solid #dee2e6',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            borderRadius: '6px'
                                          }}
                                          onClick={() => handleHeadPageChange(i)}
                                        >
                                          {i}
                                        </button>
                                      </li>
                                    )
                                  }
                                  return pages
                                })()}
                                <li className={`page-item ${headCurrentPage === headTotalPages || headTotalPages === 0 ? 'disabled' : ''}`}>
                                  <button
                                    className='page-link text-muted'
                                    style={{
                                      backgroundColor: '#f8f9fa',
                                      border: '1px solid #dee2e6',
                                      padding: '8px 12px',
                                      fontSize: '14px',
                                      borderRadius: '6px'
                                    }}
                                    onClick={() => handleHeadPageChange(headCurrentPage + 1)}
                                    disabled={headCurrentPage === headTotalPages || headTotalPages === 0}
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

                    {/* Sub Head Sub-tab */}
                    {addItemSubTab === 'subHead' && (
                      <div className='report-table table-responsive'>
                        <div style={{ overflowX: 'auto' }}>
                          <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead className='table-header text-start'>
                              <tr>
                                <th className='align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>Sr. No.</span>
                                  </div>
                                </th>
                                <th onClick={() => handleSubHeadSort('name')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '300px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>SUB HEAD NAME</span>
                                    <div style={{ transform: 'translateY(-2px)' }}>
                                      <KTSVG
                                        path={`/media/map/sort-col-${subHeadSortConfig.key === 'name' ? subHeadSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                        className='svg-icon ms-2 custom-sort-icon'
                                      />
                                    </div>
                                  </div>
                                </th>
                                <th onClick={() => handleSubHeadSort('inventoryItemHeadName')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '300px' }}>
                                  <div className='d-flex align-items-center'>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>HEAD</span>
                                    <div style={{ transform: 'translateY(-2px)' }}>
                                      <KTSVG
                                        path={`/media/map/sort-col-${subHeadSortConfig.key === 'inventoryItemHeadName' ? subHeadSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                        className='svg-icon ms-2 custom-sort-icon'
                                      />
                                    </div>
                                  </div>
                                </th>
                                <th className='align-middle text-center' style={{ padding: '12px 16px', width: '120px' }}>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACTIONS</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody className='table-body text-start'>
                              {subHeadLoading ? (
                                <TableSkeleton rows={8} cols={COLS.subHead} />
                              ) : (subHeadCurrentRecords.length === 0 ? (
                                <tr>
                                  <td colSpan={COLS.subHead} className='text-center text-muted py-5'>
                                    No sub heads found.
                                  </td>
                                </tr>
                              ) : (
                                subHeadCurrentRecords.map((subHead, index) => (
                                  <tr key={subHead.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                    <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                      {subHeadIndexOfFirstRecord + index + 1}
                                    </td>
                                    <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
                                      {subHead.name}
                                    </td>
                                    <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                      {subHead.inventoryItemHeadName || 'N/A'}
                                    </td>
                                    <td className='text-center' style={{ padding: '12px 16px' }}>
                                      <div className='d-flex justify-content-center align-items-center gap-1'>
                                        <button
                                          className='btn btn-sm p-1'
                                          title='Edit'
                                          style={{ width: '28px', height: '28px' }}
                                          onClick={() => handleEditSubHead(subHead)}
                                        >
                                          <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                        </button>
                                        <button
                                          className='btn btn-sm p-1'
                                          title='Delete'
                                          style={{ width: '28px', height: '28px' }}
                                          onClick={() => handleDeleteSubHead(subHead.id)}
                                        >
                                          <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ))}
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
                              value={subHeadRowsPerPage}
                              onChange={handleSubHeadRowsPerPageChange}
                            >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                            </select>
                          </div>
                          <div className='d-flex align-items-center'>
                            <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                              Showing <strong>{subHeadCurrentRecords.length > 0 ? ((subHeadCurrentPage - 1) * subHeadRowsPerPage) + 1 : 0}-{Math.min(subHeadCurrentPage * subHeadRowsPerPage, subHeadData.length)}</strong> of <strong>{subHeadData.length}</strong>
                            </span>

                            <nav>
                              <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                <li className={`page-item ${subHeadCurrentPage === 1 ? 'disabled' : ''}`}>
                                  <button
                                    className='page-link text-muted'
                                    style={{
                                      backgroundColor: '#f8f9fa',
                                      border: '1px solid #dee2e6',
                                      padding: '8px 12px',
                                      fontSize: '14px',
                                      borderRadius: '6px'
                                    }}
                                    onClick={() => handleSubHeadPageChange(subHeadCurrentPage - 1)}
                                    disabled={subHeadCurrentPage === 1}
                                  >
                                    ‹
                                  </button>
                                </li>
                                {(() => {
                                  const pages = []
                                  const showPages = 5
                                  let startPage = Math.max(1, subHeadCurrentPage - 2)
                                  let endPage = Math.min(subHeadTotalPages, startPage + showPages - 1)

                                  if (endPage - startPage < showPages - 1) {
                                    startPage = Math.max(1, endPage - showPages + 1)
                                  }

                                  for (let i = startPage; i <= endPage; i++) {
                                    pages.push(
                                      <li key={i} className={`page-item ${subHeadCurrentPage === i ? 'active' : ''}`}>
                                        <button
                                          className='page-link text-muted'
                                          style={{
                                            backgroundColor: subHeadCurrentPage === i ? '#F4F9FF' : 'transparent',
                                            color: subHeadCurrentPage === i ? '#1B84FF' : '#7E8299',
                                            border: '1px solid #dee2e6',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            borderRadius: '6px'
                                          }}
                                          onClick={() => handleSubHeadPageChange(i)}
                                        >
                                          {i}
                                        </button>
                                      </li>
                                    )
                                  }
                                  return pages
                                })()}
                                <li className={`page-item ${subHeadCurrentPage === subHeadTotalPages || subHeadTotalPages === 0 ? 'disabled' : ''}`}>
                                  <button
                                    className='page-link text-muted'
                                    style={{
                                      backgroundColor: '#f8f9fa',
                                      border: '1px solid #dee2e6',
                                      padding: '8px 12px',
                                      fontSize: '14px',
                                      borderRadius: '6px'
                                    }}
                                    onClick={() => handleSubHeadPageChange(subHeadCurrentPage + 1)}
                                    disabled={subHeadCurrentPage === subHeadTotalPages || subHeadTotalPages === 0}
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

                    {/* Accounting Code Sub-tab */}
                    {addItemSubTab === 'accountingCode' && (
                      <>
                        <div className='report-table table-responsive'>
                          <div style={{ overflowX: 'auto' }}>
                            <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                              <thead className='table-header text-start'>
                                <tr>
                                  <th className='align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>Sr. No.</span>
                                    </div>
                                  </th>
                                  <th onClick={() => handleAccountingCodeSort('accountCodes')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '250px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACCOUNT CODE</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${accountingCodeSortConfig.key === 'accountCodes' ? accountingCodeSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th onClick={() => handleAccountingCodeSort('company')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>COMPANY</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${accountingCodeSortConfig.key === 'company' ? accountingCodeSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th onClick={() => handleAccountingCodeSort('vesselType')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '180px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>VESSEL TYPE</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${accountingCodeSortConfig.key === 'vesselType' ? accountingCodeSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th className='align-middle text-center' style={{ padding: '12px 16px', width: '120px' }}>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACTIONS</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className='table-body text-start'>
                                {(accountingLoading) ? (
                                  <TableSkeleton rows={8} cols={COLS.accounting} />
                                ) : (accountingCodeCurrentRecords.length === 0 ? (
                                  <tr>
                                    <td colSpan={COLS.accounting} className='text-center text-muted py-5'>
                                      No accounting codes found for the selected criteria.
                                    </td>
                                  </tr>
                                ) : (
                                  accountingCodeCurrentRecords.map((account, index) => (
                                    <tr key={account.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                      <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {accountingCodeIndexOfFirstRecord + index + 1}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
                                        {account.accountCodes}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {(account.cgaid as any)?.name || 'N/A'}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {account.vesselType ? account.vesselType.replace(/_/g, ' ') : 'N/A'}
                                      </td>
                                      <td className='text-center' style={{ padding: '12px 16px' }}>
                                        <div className='d-flex justify-content-center align-items-center gap-1'>
                                          <button
                                            className='btn btn-sm p-1'
                                            title='Edit'
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={() => handleEditAccountingCode(account)}
                                          >
                                            <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                          </button>
                                          <button
                                            className='btn btn-sm p-1'
                                            title='Delete'
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={() => handleDeleteAccountingCode(account.id)}
                                          >
                                            <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ))}
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
                                value={accountingCodeRowsPerPage}
                                onChange={handleAccountingCodeRowsPerPageChange}
                              >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                            <div className='d-flex align-items-center'>
                              <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                                Showing <strong>{accountingCodeCurrentRecords.length > 0 ? ((accountingCodeCurrentPage - 1) * accountingCodeRowsPerPage) + 1 : 0}-{Math.min(accountingCodeCurrentPage * accountingCodeRowsPerPage, accountingCodeData.length)}</strong> of <strong>{accountingCodeData.length}</strong>
                              </span>

                              <nav>
                                <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                  <li className={`page-item ${accountingCodeCurrentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handleAccountingCodePageChange(accountingCodeCurrentPage - 1)}
                                      disabled={accountingCodeCurrentPage === 1}
                                    >
                                      ‹
                                    </button>
                                  </li>
                                  {(() => {
                                    const pages = []
                                    const showPages = 5
                                    let startPage = Math.max(1, accountingCodeCurrentPage - 2)
                                    let endPage = Math.min(accountingCodeTotalPages, startPage + showPages - 1)

                                    if (endPage - startPage < showPages - 1) {
                                      startPage = Math.max(1, endPage - showPages + 1)
                                    }

                                    for (let i = startPage; i <= endPage; i++) {
                                      pages.push(
                                        <li key={i} className={`page-item ${accountingCodeCurrentPage === i ? 'active' : ''}`}>
                                          <button
                                            className='page-link text-muted'
                                            style={{
                                              backgroundColor: accountingCodeCurrentPage === i ? '#F4F9FF' : 'transparent',
                                              color: accountingCodeCurrentPage === i ? '#1B84FF' : '#7E8299',
                                              border: '1px solid #dee2e6',
                                              padding: '8px 12px',
                                              fontSize: '14px',
                                              borderRadius: '6px'
                                            }}
                                            onClick={() => handleAccountingCodePageChange(i)}
                                          >
                                            {i}
                                          </button>
                                        </li>
                                      )
                                    }
                                    return pages
                                  })()}
                                  <li className={`page-item ${accountingCodeCurrentPage === accountingCodeTotalPages || accountingCodeTotalPages === 0 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handleAccountingCodePageChange(accountingCodeCurrentPage + 1)}
                                      disabled={accountingCodeCurrentPage === accountingCodeTotalPages || accountingCodeTotalPages === 0}
                                    >
                                      ›
                                    </button>
                                  </li>
                                </ul>
                              </nav>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Sub Accounting Sub-tab */}
                    {addItemSubTab === 'subAccounting' && (
                      <>
                        <div className='report-table table-responsive'>
                          <div style={{ overflowX: 'auto' }}>
                            <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                              <thead className='table-header text-start'>
                                <tr>
                                  <th className='align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>Sr. No.</span>
                                    </div>
                                  </th>
                                  <th onClick={() => handleSubAccountingSort('subaccountCodes')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>SUBACCOUNT CODE</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${subAccountingSortConfig.key === 'subaccountCodes' ? subAccountingSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th onClick={() => handleSubAccountingSort('accountCode')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACCOUNT CODE</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${subAccountingSortConfig.key === 'accountCode' ? subAccountingSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th onClick={() => handleSubAccountingSort('company')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>COMPANY</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${subAccountingSortConfig.key === 'company' ? subAccountingSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th className='align-middle' style={{ padding: '12px 16px', width: '150px' }}>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>VESSEL TYPE</span>
                                  </th>
                                  <th className='align-middle text-center' style={{ padding: '12px 16px', width: '120px' }}>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACTIONS</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className='table-body text-start'>
                                {(subAccountingLoading) ? (
                                  <TableSkeleton rows={8} cols={COLS.subAccounting} />
                                ) : (subAccountingCurrentRecords.length === 0 ? (
                                  <tr>
                                    <td colSpan={COLS.subAccounting} className='text-center text-muted py-5'>
                                      No sub accounting codes found for the selected criteria.
                                    </td>
                                  </tr>
                                ) : (
                                  subAccountingCurrentRecords.map((subAccount, index) => (
                                    <tr key={subAccount.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                      <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {subAccountingIndexOfFirstRecord + index + 1}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
                                        {subAccount.subaccountCodes}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {subAccount.accountCode || 'N/A'}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {subAccount.cgaid?.name || 'N/A'}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {(subAccount as any).vesselType || 'N/A'}
                                      </td>
                                      <td className='text-center' style={{ padding: '12px 16px' }}>
                                        <div className='d-flex justify-content-center align-items-center gap-1'>
                                          <button
                                            className='btn btn-sm p-1'
                                            title='Edit'
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={() => handleEditSubAccounting(subAccount)}
                                          >
                                            <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                          </button>
                                          <button
                                            className='btn btn-sm p-1'
                                            title='Delete'
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={() => handleDeleteSubAccount(subAccount.id)}
                                          >
                                            <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ))}
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
                                value={subAccountingRowsPerPage}
                                onChange={handleSubAccountingRowsPerPageChange}
                              >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                            <div className='d-flex align-items-center'>
                              <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                                Showing <strong>{subAccountingCurrentRecords.length > 0 ? ((subAccountingCurrentPage - 1) * subAccountingRowsPerPage) + 1 : 0}-{Math.min(subAccountingCurrentPage * subAccountingRowsPerPage, subAccountingData.length)}</strong> of <strong>{subAccountingData.length}</strong>
                              </span>

                              <nav>
                                <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                  <li className={`page-item ${subAccountingCurrentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handleSubAccountingPageChange(subAccountingCurrentPage - 1)}
                                      disabled={subAccountingCurrentPage === 1}
                                    >
                                      ‹
                                    </button>
                                  </li>
                                  {(() => {
                                    const pages = []
                                    const showPages = 5
                                    let startPage = Math.max(1, subAccountingCurrentPage - 2)
                                    let endPage = Math.min(subAccountingTotalPages, startPage + showPages - 1)

                                    if (endPage - startPage < showPages - 1) {
                                      startPage = Math.max(1, endPage - showPages + 1)
                                    }

                                    for (let i = startPage; i <= endPage; i++) {
                                      pages.push(
                                        <li key={i} className={`page-item ${subAccountingCurrentPage === i ? 'active' : ''}`}>
                                          <button
                                            className='page-link text-muted'
                                            style={{
                                              backgroundColor: subAccountingCurrentPage === i ? '#F4F9FF' : 'transparent',
                                              color: subAccountingCurrentPage === i ? '#1B84FF' : '#7E8299',
                                              border: '1px solid #dee2e6',
                                              padding: '8px 12px',
                                              fontSize: '14px',
                                              borderRadius: '6px'
                                            }}
                                            onClick={() => handleSubAccountingPageChange(i)}
                                          >
                                            {i}
                                          </button>
                                        </li>
                                      )
                                    }
                                    return pages
                                  })()}
                                  <li className={`page-item ${subAccountingCurrentPage === subAccountingTotalPages || subAccountingTotalPages === 0 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handleSubAccountingPageChange(subAccountingCurrentPage + 1)}
                                      disabled={subAccountingCurrentPage === subAccountingTotalPages || subAccountingTotalPages === 0}
                                    >
                                      ›
                                    </button>
                                  </li>
                                </ul>
                              </nav>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Sub Catalogue Sub-tab - COMMENTED OUT */}
                    {/* {addItemSubTab === 'subCatalogue' && (
                      <>
                        <div className='report-table table-responsive'>
                          <div style={{ overflowX: 'auto' }}>
                            <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                              <thead className='table-header text-start'>
                                <tr>
                                  <th className='align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>Sr. No.</span>
                                    </div>
                                  </th>
                                  <th onClick={() => handleSubCatalogueSort('name')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>SUB CATALOGUE NAME</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${subCatalogueSortConfig.key === 'name' ? subCatalogueSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th onClick={() => handleSubCatalogueSort('company')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>COMPANY</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${subCatalogueSortConfig.key === 'company' ? subCatalogueSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th onClick={() => handleSubCatalogueSort('vesselType')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '150px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>VESSEL TYPE</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${subCatalogueSortConfig.key === 'vesselType' ? subCatalogueSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th className='align-middle text-center' style={{ padding: '12px 16px', width: '120px' }}>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACTIONS</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className='table-body text-start'>
                                {(subCatalogueLoading) ? (
                                  <TableSkeleton rows={8} cols={COLS.subCatalogue} />
                                ) : (subCatalogueCurrentRecords.length === 0 ? (
                                  <tr>
                                    <td colSpan={COLS.subCatalogue} className='text-center text-muted py-5'>
                                      No sub catalogues found for the selected criteria.
                                    </td>
                                  </tr>
                                ) : (
                                  subCatalogueCurrentRecords.map((subCatalogue, index) => (
                                    <tr key={subCatalogue.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                      <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {subCatalogueIndexOfFirstRecord + index + 1}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
                                        {subCatalogue.name}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {subCatalogue.cgaid?.name || subCatalogue.subCatalogueType?.name || 'N/A'}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {subCatalogue.vesselType || 'N/A'}
                                      </td>
                                      <td className='text-center' style={{ padding: '12px 16px' }}>
                                        <div className='d-flex justify-content-center align-items-center gap-1'>
                                          <button
                                            className='btn btn-sm p-1'
                                            title='Edit'
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={() => handleEditSubCatalogue(subCatalogue)}
                                          >
                                            <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                          </button>
                                          <button
                                            className='btn btn-sm p-1'
                                            title='Delete'
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={() => handleDeleteSubCatalogue(subCatalogue.id)}
                                          >
                                            <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ))}
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
                                value={subCatalogueRowsPerPage}
                                onChange={handleSubCatalogueRowsPerPageChange}
                              >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                            <div className='d-flex align-items-center'>
                              <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                                Showing <strong>{subCatalogueCurrentRecords.length > 0 ? ((subCatalogueCurrentPage - 1) * subCatalogueRowsPerPage) + 1 : 0}-{Math.min(subCatalogueCurrentPage * subCatalogueRowsPerPage, subCatalogueData.length)}</strong> of <strong>{subCatalogueData.length}</strong>
                              </span>

                              <nav>
                                <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                  <li className={`page-item ${subCatalogueCurrentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handleSubCataloguePageChange(subCatalogueCurrentPage - 1)}
                                      disabled={subCatalogueCurrentPage === 1}
                                    >
                                      ‹
                                    </button>
                                  </li>
                                  {(() => {
                                    const pages = []
                                    const showPages = 5
                                    let startPage = Math.max(1, subCatalogueCurrentPage - 2)
                                    let endPage = Math.min(subCatalogueTotalPages, startPage + showPages - 1)

                                    if (endPage - startPage < showPages - 1) {
                                      startPage = Math.max(1, endPage - showPages + 1)
                                    }

                                    for (let i = startPage; i <= endPage; i++) {
                                      pages.push(
                                        <li key={i} className={`page-item ${subCatalogueCurrentPage === i ? 'active' : ''}`}>
                                          <button
                                            className='page-link text-muted'
                                            style={{
                                              backgroundColor: subCatalogueCurrentPage === i ? '#F4F9FF' : 'transparent',
                                              color: subCatalogueCurrentPage === i ? '#1B84FF' : '#7E8299',
                                              border: '1px solid #dee2e6',
                                              padding: '8px 12px',
                                              fontSize: '14px',
                                              borderRadius: '6px'
                                            }}
                                            onClick={() => handleSubCataloguePageChange(i)}
                                          >
                                            {i}
                                          </button>
                                        </li>
                                      )
                                    }
                                    return pages
                                  })()}
                                  <li className={`page-item ${subCatalogueCurrentPage === subCatalogueTotalPages || subCatalogueTotalPages === 0 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handleSubCataloguePageChange(subCatalogueCurrentPage + 1)}
                                      disabled={subCatalogueCurrentPage === subCatalogueTotalPages || subCatalogueTotalPages === 0}
                                    >
                                      ›
                                    </button>
                                  </li>
                                </ul>
                              </nav>
                            </div>
                          </div>
                        </div>
                      </>
                    )} */}

                    {/* Part Sub-tab */}
                    {addItemSubTab === 'part' && (
                      <>
                        <div className='report-table table-responsive'>
                          <div style={{ overflowX: 'auto' }}>
                            <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                              <thead className='table-header text-start'>
                                <tr>
                                  <th className='align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>Sr. No.</span>
                                    </div>
                                  </th>
                                  <th onClick={() => handlePartSort('name')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>PART NAME</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${partSortConfig.key === 'name' ? partSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th onClick={() => handlePartSort('code')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>PART CODE</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${partSortConfig.key === 'code' ? partSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th onClick={() => handlePartSort('manufacturer')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '150px' }}>
                                    <div className='d-flex align-items-center'>
                                      <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>MANUFACTURER</span>
                                      <div style={{ transform: 'translateY(-2px)' }}>
                                        <KTSVG
                                          path={`/media/map/sort-col-${partSortConfig.key === 'manufacturer' ? partSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                          className='svg-icon ms-2 custom-sort-icon'
                                        />
                                      </div>
                                    </div>
                                  </th>
                                  <th className='align-middle text-center' style={{ padding: '12px 16px', width: '120px' }}>
                                    <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACTIONS</span>
                                  </th>
                                </tr>
                              </thead>
                              <tbody className='table-body text-start'>
                                {(partLoading) ? (
                                  <TableSkeleton rows={8} cols={COLS.part} />
                                ) : (partCurrentRecords.length === 0 ? (
                                  <tr>
                                    <td colSpan={COLS.part} className='text-center text-muted py-5'>
                                      No parts found for the selected criteria.
                                    </td>
                                  </tr>
                                ) : (
                                  partCurrentRecords.map((part, index) => (
                                    <tr key={part.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                      <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {partIndexOfFirstRecord + index + 1}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
                                        {part.name}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {part.code || 'N/A'}
                                      </td>
                                      <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                        {part.manufacturer || 'N/A'}
                                      </td>
                                      <td className='text-center' style={{ padding: '12px 16px' }}>
                                        <div className='d-flex justify-content-center align-items-center gap-1'>
                                          <button
                                            className='btn btn-sm p-1'
                                            title='Edit'
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={() => handleEditPart(part)}
                                          >
                                            <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                          </button>
                                          <button
                                            className='btn btn-sm p-1'
                                            title='Delete'
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={() => handleDeletePart(part.id)}
                                          >
                                            <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ))}
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
                                value={partRowsPerPage}
                                onChange={handlePartRowsPerPageChange}
                              >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                              </select>
                            </div>
                            <div className='d-flex align-items-center'>
                              <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                                Showing <strong>{partCurrentRecords.length > 0 ? ((partCurrentPage - 1) * partRowsPerPage) + 1 : 0}-{Math.min(partCurrentPage * partRowsPerPage, partData.length)}</strong> of <strong>{partData.length}</strong>
                              </span>

                              <nav>
                                <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                                  <li className={`page-item ${partCurrentPage === 1 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handlePartPageChange(partCurrentPage - 1)}
                                      disabled={partCurrentPage === 1}
                                    >
                                      ‹
                                    </button>
                                  </li>
                                  {(() => {
                                    const pages = []
                                    const showPages = 5
                                    let startPage = Math.max(1, partCurrentPage - 2)
                                    let endPage = Math.min(partTotalPages, startPage + showPages - 1)

                                    if (endPage - startPage < showPages - 1) {
                                      startPage = Math.max(1, endPage - showPages + 1)
                                    }

                                    for (let i = startPage; i <= endPage; i++) {
                                      pages.push(
                                        <li key={i} className={`page-item ${partCurrentPage === i ? 'active' : ''}`}>
                                          <button
                                            className='page-link text-muted'
                                            style={{
                                              backgroundColor: partCurrentPage === i ? '#F4F9FF' : 'transparent',
                                              color: partCurrentPage === i ? '#1B84FF' : '#7E8299',
                                              border: '1px solid #dee2e6',
                                              padding: '8px 12px',
                                              fontSize: '14px',
                                              borderRadius: '6px'
                                            }}
                                            onClick={() => handlePartPageChange(i)}
                                          >
                                            {i}
                                          </button>
                                        </li>
                                      )
                                    }
                                    return pages
                                  })()}
                                  <li className={`page-item ${partCurrentPage === partTotalPages || partTotalPages === 0 ? 'disabled' : ''}`}>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        borderRadius: '6px'
                                      }}
                                      onClick={() => handlePartPageChange(partCurrentPage + 1)}
                                      disabled={partCurrentPage === partTotalPages || partTotalPages === 0}
                                    >
                                      ›
                                    </button>
                                  </li>
                                </ul>
                              </nav>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Sub Component Sub-tab */}
                {activeTab === 'addItem' && addItemSubTab === 'subComponent' && (
                  <>
                    <div className='report-table table-responsive'>
                      <div style={{ overflowX: 'auto' }}>
                        <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                          <thead className='table-header text-start'>
                            <tr>
                              <th onClick={() => handleSubComponentSort('id')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>Sr. No.</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                  </div>
                                </div>
                              </th>
                              <th onClick={() => handleSubComponentSort('name')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '250px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>SUB COMPONENT NAME</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                    <KTSVG
                                      path={`/media/map/sort-col-${subComponentSortConfig.key === 'name' ? subComponentSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                      className='svg-icon ms-2 custom-sort-icon'
                                    />
                                  </div>
                                </div>
                              </th>
                              <th onClick={() => handleSubComponentSort('partCode')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>PART CODE</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                    <KTSVG
                                      path={`/media/map/sort-col-${subComponentSortConfig.key === 'partCode' ? subComponentSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                      className='svg-icon ms-2 custom-sort-icon'
                                    />
                                  </div>
                                </div>
                              </th>
                              <th onClick={() => handleSubComponentSort('partName')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '200px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>PART NAME</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                    <KTSVG
                                      path={`/media/map/sort-col-${subComponentSortConfig.key === 'partName' ? subComponentSortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                      className='svg-icon ms-2 custom-sort-icon'
                                    />
                                  </div>
                                </div>
                              </th>
                              <th className='align-middle text-center' style={{ padding: '12px 16px', width: '120px' }}>
                                <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ACTIONS</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className='table-body text-start'>
                            {(isLoadingSubComponents) ? (
                              <TableSkeleton rows={8} cols={COLS.subComponent} />
                            ) : (subComponentCurrentRecords.length === 0 ? (
                              <tr>
                                <td colSpan={COLS.subComponent} className='text-center text-muted py-5'>
                                  No sub components found for the selected criteria.
                                </td>
                              </tr>
                            ) : (
                              subComponentCurrentRecords.map((subComponent, index) => (
                                <tr key={subComponent.id} style={{ borderBottom: '1px solid #E4E6EF' }}>
                                  <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                    {subComponent.id}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 500 }}>
                                    {subComponent.name}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                    {subComponent.part?.code || 'N/A'}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                    {subComponent.part?.name || 'N/A'}
                                  </td>
                                  <td className='text-center' style={{ padding: '12px 16px' }}>
                                    <div className='d-flex justify-content-center align-items-center gap-1'>
                                      <button
                                        className='btn btn-sm p-1'
                                        title='Edit'
                                        style={{ width: '28px', height: '28px' }}
                                        onClick={() => handleEditSubComponent(subComponent)}
                                      >
                                        <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                      </button>
                                      <button
                                        className='btn btn-sm p-1'
                                        title='Delete'
                                        onClick={() => handleDeleteSubComponent(subComponent.id)}
                                        style={{ width: '28px', height: '28px' }}
                                      >
                                        <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ))}
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
                            value={subComponentRowsPerPage}
                            onChange={handleSubComponentRowsPerPageChange}
                          >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>
                        <div className='d-flex align-items-center'>
                          <span className='text-muted me-3' style={{ fontSize: '14px' }}>
                            Showing <strong>{subComponentCurrentRecords.length > 0 ? ((subComponentCurrentPage - 1) * subComponentRowsPerPage) + 1 : 0}-{Math.min(subComponentCurrentPage * subComponentRowsPerPage, subComponentData.length)}</strong> of <strong>{subComponentData.length}</strong>
                          </span>

                          <nav>
                            <ul className='pagination pagination-sm mb-0' style={{ gap: '2px' }}>
                              <li className={`page-item ${subComponentCurrentPage === 1 ? 'disabled' : ''}`}>
                                <button
                                  className='page-link text-muted'
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => handleSubComponentPageChange(subComponentCurrentPage - 1)}
                                  disabled={subComponentCurrentPage === 1}
                                >
                                  ‹
                                </button>
                              </li>
                              {(() => {
                                const pages = []
                                const showPages = 5
                                let startPage = Math.max(1, subComponentCurrentPage - 2)
                                let endPage = Math.min(subComponentTotalPages, startPage + showPages - 1)

                                if (endPage - startPage < showPages - 1) {
                                  startPage = Math.max(1, endPage - showPages + 1)
                                }

                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(
                                    <li key={i} className={`page-item ${subComponentCurrentPage === i ? 'active' : ''}`}>
                                      <button
                                        className='page-link text-muted'
                                        style={{
                                          backgroundColor: subComponentCurrentPage === i ? '#F4F9FF' : 'transparent',
                                          color: subComponentCurrentPage === i ? '#1B84FF' : '#7E8299',
                                          border: '1px solid #dee2e6',
                                          padding: '8px 12px',
                                          fontSize: '14px',
                                          borderRadius: '6px'
                                        }}
                                        onClick={() => handleSubComponentPageChange(i)}
                                      >
                                        {i}
                                      </button>
                                    </li>
                                  )
                                }
                                return pages
                              })()}
                              <li className={`page-item ${subComponentCurrentPage === subComponentTotalPages || subComponentTotalPages === 0 ? 'disabled' : ''}`}>
                                <button
                                  className='page-link text-muted'
                                  style={{
                                    backgroundColor: '#f8f9fa',
                                    border: '1px solid #dee2e6',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => handleSubComponentPageChange(subComponentCurrentPage + 1)}
                                  disabled={subComponentCurrentPage === subComponentTotalPages || subComponentTotalPages === 0}
                                >
                                  ›
                                </button>
                              </li>
                            </ul>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'catalogue' && (
                  <div className='mb-8'>
                    <h4 className='fw-bold text-primary mb-4'>Inventory Items ({sortedData.length})</h4>


                    <div className='report-table table-responsive'>
                      <div style={{ overflowX: 'auto' }}>
                        <table className='table table-bordered align-middle' style={{ tableLayout: 'fixed', width: '100%' }}>
                          <thead className='table-header text-start'>
                            <tr>
                              <th onClick={() => handleSort('itemId')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '90px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ITEM ID</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                    <KTSVG
                                      path={`/media/map/sort-col-${sortConfig.key === 'itemId' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                      className='svg-icon ms-2 custom-sort-icon'
                                    />
                                  </div>
                                </div>
                              </th>
                              <th onClick={() => handleSort('itemName')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '120px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>ITEM NAME</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                    <KTSVG
                                      path={`/media/map/sort-col-${sortConfig.key === 'itemName' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                      className='svg-icon ms-2 custom-sort-icon'
                                    />
                                  </div>
                                </div>
                              </th>
                              <th onClick={() => handleSort('company')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '120px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>COMPANY</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                    <KTSVG
                                      path={`/media/map/sort-col-${sortConfig.key === 'company' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                      className='svg-icon ms-2 custom-sort-icon'
                                    />
                                  </div>
                                </div>
                              </th>
                              <th onClick={() => handleSort('vesselType')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '130px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>VESSEL TYPE</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                    <KTSVG
                                      path={`/media/map/sort-col-${sortConfig.key === 'vesselType' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                      className='svg-icon ms-2 custom-sort-icon'
                                    />
                                  </div>
                                </div>
                              </th>
                              <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '100px' }}>PART NUMBER</th>
                              <th onClick={() => handleSort('category')} className='cursor-pointer align-middle' style={{ padding: '12px 16px', width: '130px' }}>
                                <div className='d-flex align-items-center'>
                                  <span style={{ color: '#3F4254', fontWeight: 600, fontSize: '13px' }}>CATEGORY</span>
                                  <div style={{ transform: 'translateY(-2px)' }}>
                                    <KTSVG
                                      path={`/media/map/sort-col-${sortConfig.key === 'category' ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black' : 'grey'}.svg`}
                                      className='svg-icon ms-2 custom-sort-icon'
                                    />
                                  </div>
                                </div>
                              </th>
                              {/* <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '130px' }}>SUB ACCOUNTING</th> */}
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '70px' }}>QTY</th>
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '60px' }}>UOM</th>
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '80px' }}>REORDER</th>
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '70px' }}>MIN</th>
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '70px' }}>MAX</th>
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '90px' }}>UNIT COST</th>
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '100px' }}>EXPIRY</th>
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '120px' }}>SERIAL NO.</th>
                              <th className='align-middle' style={{ padding: '12px 16px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '120px' }}>LOCATION</th>
                              <th className='align-middle' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '80px' }}>STATUS</th>
                              <th className='align-middle text-center' style={{ padding: '12px 8px', color: '#3F4254', fontWeight: 600, fontSize: '13px', width: '100px' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          {/* Inventory Lists */}
                          <tbody className='table-body text-start'>
                            {(bootLoading || listLoading || isLoading) ? (
                              // 🔁 Skeleton: 8 shimmering rows, 18 cells (matches table columns)
                              Array.from({ length: 8 }).map((_, i) => (
                                <tr key={`skeleton-${i}`}>
                                  {Array.from({ length: COLUMNS_COUNT }).map((__, c) => (
                                    <td key={`s-${i}-${c}`} className="py-3">
                                      <div className="placeholder-wave">
                                        <div className="placeholder w-100" style={{ height: 14, borderRadius: 4 }} />
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (sortedData.length === 0 && noDataDelayPassed) ? (
                              <tr>
                                <td colSpan={COLUMNS_COUNT} className='text-center text-muted py-5'>
                                  No inventory items found for the selected criteria.
                                </td>
                              </tr>
                            ) : (
                              currentRecords.map((record) => (
                                <tr
                                  key={record.id}
                                  style={{ borderBottom: '1px solid #E4E6EF' }}
                                >
                                  <td className='text-dark fw-semibold fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                    <Link to={`/inventory/${record.id}`} className='text-primary text-hover-primary'>
                                      {record.itemId}
                                    </Link>
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <Cell value={record.itemName || '—'} loading={!mapReady} />
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {record.company || 'N/A'}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {record.vesselType ? record.vesselType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px' }}>
                                    <Cell value={record.partNumber || '—'} loading={!mapReady} />
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                    <Cell value={record.category || '—'} loading={!mapReady} />
                                  </td>
                                  {/* <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                    <Cell value={record.subAccounting || 'N/A'} loading={!mapReady} />
                                  </td> */}
                                  <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                    {record.currentQty}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                    <Cell value={record.uom || '—'} loading={!mapReady} />
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                    {record.reorderLevel}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                    {record.minThreshold}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                    {record.maxThreshold}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px' }}>
                                    ${record.unitCost.toFixed(2)}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                    {record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : '-'}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 8px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {record.serialNumber || '-'}
                                  </td>
                                  <td className='text-dark fs-6' style={{ padding: '12px 16px', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {record.location}
                                  </td>
                                  <td style={{ padding: '12px 8px' }}>
                                    <span className={`badge ${record.status === 'Active' ? 'submitted' : 'rejected'} text-white`} style={{ fontSize: '12px' }}>
                                      {record.status}
                                    </span>
                                  </td>
                                  <td className='text-center' style={{ padding: '12px 8px' }}>
                                    <div className='d-flex justify-content-center align-items-center gap-1'>
                                      <button
                                        className='btn btn-sm p-1'
                                        title='View'
                                        style={{ width: '28px', height: '28px' }}
                                        onClick={() => handleViewItem(record)}
                                      >
                                        <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-5' />
                                      </button>
                                      <button className='btn btn-sm p-1' title='Edit' style={{ width: '28px', height: '28px' }}>
                                        <KTSVG path='/media/map/edit-active.svg' className='svg-icon-5' />
                                      </button>
                                      <button
                                        className='btn btn-sm p-1'
                                        title='Delete'
                                        onClick={() => handleDeleteItem(record.id)}
                                        style={{ width: '28px', height: '28px' }}
                                      >
                                        <KTSVG path='/media/map/trash.svg' className='svg-icon-5' />
                                      </button>
                                    </div>
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


                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <ViewInventoryModal
          visible={isViewModalVisible}
          onClose={() => {
            setIsViewModalVisible(false)
            setSelectedInventoryItem(null)
          }}
          item={selectedInventoryItem}
        />

        <AddItemModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          onSubmit={handleAddItemSuccess}
          vesselId={vesselId || 0}
          categories={categories}
          parts={parts}
          refreshTrigger={addItemModalRefreshTrigger}
        />

        <UpdateInventoryModal
          visible={isUpdateModalVisible}
          onClose={() => setIsUpdateModalVisible(false)}
          onSubmit={handleAddItemSuccess}
          vesselId={vesselId || 0}
          categories={categories}
          parts={parts}
        />

        {/* Individual Tab Modals */}
        <CategoryModal
          visible={isCategoryModalVisible}
          onClose={() => setIsCategoryModalVisible(false)}
          onSubmit={handleCategorySubmit}
          vesselId={vesselId || 0}
        />

        <EditCategoryModal
          visible={isEditCategoryModalVisible}
          onClose={() => {
            setIsEditCategoryModalVisible(false)
            setSelectedCategory(null)
          }}
          onSubmit={handleEditCategorySubmit}
          category={selectedCategory}
        />

        <HeadModal
          visible={isHeadModalVisible}
          onClose={() => setIsHeadModalVisible(false)}
          onSubmit={handleHeadSubmit}
        />

        <EditHeadModal
          visible={isEditHeadModalVisible}
          onClose={() => {
            setIsEditHeadModalVisible(false)
            setSelectedHead(null)
          }}
          onSubmit={handleEditHeadSubmit}
          head={selectedHead}
        />

        <SubHeadModal
          visible={isSubHeadModalVisible}
          onClose={() => setIsSubHeadModalVisible(false)}
          onSubmit={handleSubHeadSubmit}
        />

        <EditSubHeadModal
          visible={isEditSubHeadModalVisible}
          onClose={() => {
            setIsEditSubHeadModalVisible(false)
            setSelectedSubHead(null)
          }}
          onSubmit={handleEditSubHeadSubmit}
          subHead={selectedSubHead}
        />

        <AccountingCodeModal
          visible={isAccountingCodeModalVisible}
          onClose={() => setIsAccountingCodeModalVisible(false)}
          onSubmit={handleAccountingCodeSubmit}
          vesselId={vesselId || 0}
        />

        <EditAccountingCodeModal
          visible={isEditAccountingCodeModalVisible}
          onClose={() => {
            setIsEditAccountingCodeModalVisible(false)
            setSelectedAccountingCode(null)
          }}
          onSubmit={handleEditAccountingCodeSubmit}
          accountingCode={selectedAccountingCode}
        />

        <SubAccountingModal
          visible={isSubAccountingModalVisible}
          onClose={() => setIsSubAccountingModalVisible(false)}
          onSubmit={handleSubAccountingSubmit}
        />

        <EditSubAccountingModal
          visible={isEditSubAccountingModalVisible}
          onClose={() => {
            setIsEditSubAccountingModalVisible(false)
            setSelectedSubAccount(null)
          }}
          onSubmit={handleEditSubAccountingSubmit}
          subAccount={selectedSubAccount}
        />

        <SubCatalogueModal
          visible={isSubCatalogueModalVisible}
          onClose={() => setIsSubCatalogueModalVisible(false)}
          onSubmit={handleSubCatalogueSubmit}
        />

        <EditSubCatalogueModal
          visible={isEditSubCatalogueModalVisible}
          onClose={() => {
            setIsEditSubCatalogueModalVisible(false)
            setSelectedSubCatalogue(null)
          }}
          onSubmit={handleEditSubCatalogueSubmit}
          subCatalogue={selectedSubCatalogue}
        />

        <PartModal
          visible={isPartModalVisible}
          onClose={() => setIsPartModalVisible(false)}
          onSubmit={handlePartSubmit}
          refreshTrigger={partModalRefreshTrigger}
        />

        <EditPartModal
          visible={isEditPartModalVisible}
          onClose={() => {
            setIsEditPartModalVisible(false)
            setSelectedPart(null)
          }}
          onSubmit={handleEditPartSubmit}
          part={selectedPart}
        />

        <SubComponentModal
          visible={isSubComponentModalVisible}
          onClose={() => setIsSubComponentModalVisible(false)}
          onSubmit={handleSubComponentSubmit}
        />

        <EditSubComponentModal
          visible={isEditSubComponentModalVisible}
          onClose={() => {
            setIsEditSubComponentModalVisible(false)
            setSelectedSubComponent(null)
          }}
          onSubmit={handleEditSubComponentSubmit}
          subComponent={selectedSubComponent}
        />

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
    </>
  )
}

export { InventoryList } 
