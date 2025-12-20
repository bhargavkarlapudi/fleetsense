import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import React from "react"
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useAuth } from '../../auth'                                // adjust if path differs
import { getCompanyAdminList } from '../../Management/core/_requests' // adjust if you keep these elsewhere
import { AddManualPlanModal } from './AddManualPlanModal' 
import { ManualPlanViewer } from './ManualPlanViewer'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import {
  listManualsByCompany,
  createManualPlan,
  softDeleteManualPlan,
  mapDtoToRow,
  updateManualPlan,
  replaceManualPlanFile, 
} from '../core/_requests'
import { EditManualPlanModal } from '../components/EditManualPlanModal' 
import { ManualPlanRevisionsModal } from './ManualPlanRevisionsModal'
import type { ManualPlanRecord } from '../core/_models'

// Narrow helper types (match your Management/_models if you have them)
type CompanyGroup = { id: number; name: string }


// --- helper: detect a Company Admin record (NOT a Group) ---
const isCompanyAdminRecord = (s: any) => {
  // Treat as a company admin if it has explicit admin name or nested companyAdmin object
  if (s?.companyAdminName) return true
  if (s?.companyAdmin?.id) return true
  // Some APIs flatten fields; if it's clearly a group (has group name), exclude
  if (s?.companyGroupAdminName) return false
  return false
}
const ManualsAndPlans: FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [manualsPlansData, setManualsPlansData] = useState<ManualPlanRecord[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ManualPlanRecord | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' })
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedManual, setSelectedManual] = useState<ManualPlanRecord | null>(null)

// === ROLE HELPERS (drop-in, replaces your current roleId/isSuperadmin lines) ===
const { currentUser, auth } = useAuth()

// robust role & cga resolvers (same flavor as other pages)
const roleId: number =
  Number((auth?.userDetails as any)?.roleId ??
  (currentUser?.role?.id ?? 0)) || 0

const myCgaId: number | null =
  currentUser?.companyGroupAdminId ??
  currentUser?.companyGroupAdmin?.id ??
  (currentUser?.role?.id === 5 ? (currentUser as any)?.roleEntityId : null) ??
  null

const isOperator = roleId === 6
const isSuperadmin = roleId === 1
// "Top-level" = Superadmin OR Operator without CGA (i.e., superadmin's operator)
const isTopLevel = isSuperadmin || (isOperator && !myCgaId)

// who can ADD: superadmin (1), operator under superadmin (6 no CGA),
// company group admin (5), operator under a CGA (6 with CGA)
const canAddManualPlan =
  isTopLevel || roleId === 5 || (isOperator && !!myCgaId)

// For any non-top-level user (role 5, role 6 under CGA, role 2, role 4, etc.),
// they should be scoped to their CGA and not see the company dropdown.
const isCompanyScoped = !isTopLevel

  // Lists
  const [companies, setCompanies] = useState<CompanyGroup[]>([])
  // Selections
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('')
  // UI helpers
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)

  const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)

// EDIT modal state
const [isEditVisible, setIsEditVisible] = useState(false)
const [editingRecord, setEditingRecord] = useState<ManualPlanRecord | null>(null)

const [revModal, setRevModal] = useState<{id:number,name:string,visible:boolean}>({id:0,name:'',visible:false})

const openEdit = (rec: ManualPlanRecord) => {
  setEditingRecord(rec)
  setIsEditVisible(true)
}

const closeEdit = () => {
  setIsEditVisible(false)
  setEditingRecord(null)
}

// Submit handler for edit modal
type EditManualPlanPayload = {
  id: number
  name: string
  revisionNo?: string
  approvedBy?: string
  remarks?: string
  dateOfApproval?: string
  __file?: File | null            // optional; if present we will replace the file
}


// Unified "effective" company id used when calling the API
// - top-level: what is selected in dropdown
// - others: force to own CGA
const effectiveCompanyId = isTopLevel
  ? (selectedCompanyId ? Number(selectedCompanyId) : undefined)
  : (myCgaId ?? undefined)


const loadManuals = async () => {
  // guard: we must have a company id to query
  const companyId = effectiveCompanyId
  if (!companyId) {
    setManualsPlansData([])
    return
  }

  setLoading(true); setError(null)
  try {
    const list = await listManualsByCompany(Number(companyId))
    const rows = (list || []).map(mapDtoToRow)
    setManualsPlansData(rows)
} catch (e: any) {
  console.error(e)
  setError(e?.message || 'Failed to load manuals')
  toast.error(e?.message || 'Failed to load manuals')
  setManualsPlansData([])
} finally {
    setLoading(false)
  }
}

  // Filter data based on search
const filteredData = useMemo(() => {
  const bySearch = (r: ManualPlanRecord) =>
  r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (r.approvedBy && r.approvedBy.toLowerCase().includes(searchTerm.toLowerCase())) ||
  ((r.uploadedByName || '').toLowerCase().includes(searchTerm.toLowerCase())) ||
  r.file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (r.remarks && r.remarks.toLowerCase().includes(searchTerm.toLowerCase()))

  const byHierarchy = (r: ManualPlanRecord) => {
  if (!isSuperadmin) return true
  if (selectedCompanyId && r.companyGroupAdminId && r.companyGroupAdminId !== selectedCompanyId) return false
  return true
}

  return manualsPlansData.filter(r => bySearch(r) && byHierarchy(r))
}, [
  searchTerm,
  manualsPlansData,
  isSuperadmin,
  selectedCompanyId,
])

  // Apply sorting
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

// Load companies (Company Groups) for TOP-LEVEL only
useEffect(() => {
  if (!isTopLevel) return
  const run = async () => {
    setIsLoadingCompanies(true)
    try {
      const list = (await getCompanyAdminList()) as any[]
      const groups: CompanyGroup[] = (list || [])
        .map((g: any) => ({
          id: Number(g?.id),
          name: g?.name ?? g?.companyGroupAdminName ?? `Company Group #${g?.id}`,
        }))
        .filter((g) => Number.isFinite(g.id) && g.name)

      setCompanies(groups)

      // Auto-select FIRST company (you asked to show first directly on load)
      if (groups.length > 0) {
        setSelectedCompanyId(groups[0].id)
      } else {
        setSelectedCompanyId('') // none
      }
    } catch (e) {
      console.error('Failed to load company groups', e)
      setCompanies([])
      setSelectedCompanyId('')
    } finally {
      setIsLoadingCompanies(false)
    }
  }
  run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isTopLevel])

// Non-top-level users: force to their own CGA and load data
useEffect(() => {
  if (!isCompanyScoped) return
  if (!myCgaId) {
    setManualsPlansData([]) // nothing to scope by (crew without parent CGA?)
    return
  }
  // pin local state (even though we never show dropdown)
  setSelectedCompanyId(Number(myCgaId))
  // load straight away
  loadManuals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isCompanyScoped, myCgaId])


// Re-load when the "effective" company id changes
useEffect(() => {
  if (!effectiveCompanyId) {
    setManualsPlansData([])
    return
  }
  loadManuals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [effectiveCompanyId, searchTerm])

  const handleSort = (key: keyof ManualPlanRecord) => {
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

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1)
  }

  type AddManualPlanPayload = {
  name: string
  revisionNo?: string
  approvedBy?: string
  remarks?: string
  dateOfApproval?: string
  companyGroupAdminId?: number | null
  companyAdminId?: number | null
  vesselId?: number | null
  __file: File
}

const handleAddManualPlan = async (data: AddManualPlanPayload) => {
  // must have a target company id:
  const companyId = effectiveCompanyId
  if (!companyId) {
  toast.error('No company is selected/assigned.')
  return
}

  const getUserId = () =>
    String(
      (auth?.userDetails as any)?.id ??
      (currentUser as any)?.id ??
      ''
    )

  const getUserDisplayName = () => {
    const u = (auth?.userDetails as any) || {}
    const cu = (currentUser as any) || {}
    return (
      u.username ||
      cu.username ||
      [cu.firstName, cu.lastName].filter(Boolean).join(' ').trim() ||
      u.name ||
      `User#${getUserId()}`
    )
  }

  const userId = getUserId()
  const userName = getUserDisplayName()

  const file = data.__file
if (!file) { toast.warning('File is required'); return }

  try {
  await createManualPlan({
    companyGroupId: Number(companyId),
    name: data.name,
    dateOfApproval: data.dateOfApproval,
    revisionNo: data.revisionNo,
    approvedBy: data.approvedBy,
    uploadedBy: userId || '0',
    uploadedByName: userName,
    remarks: data.remarks,
    file,
  })

  // refresh table
  await loadManuals()

  // ✅ success toast
  toast.success(`Manual/Plan "${data.name}" added successfully`)
} catch (e: any) {
  console.error(e)
  toast.error(e?.message || 'Failed to create manual/plan')
}

}

const handleEditManualPlan = async (data: EditManualPlanPayload & { __file?: File | null }) => {
  try {
    // 1) Update metadata (no revision)
    await updateManualPlan(data.id, {
      id: data.id,
      name: data.name,
      approvedBy: data.approvedBy ?? null,
      dateOfApproval: data.dateOfApproval ?? null,
      remarks: data.remarks ?? null,
      // revisionNo removed from UI; legacy ignored
    })

    // 2) Optional: replace file -> creates new revision (+1)
    if (data.__file) {
      await replaceManualPlanFile(data.id, data.__file)
    }

    await loadManuals()
    toast.success('Manual/Plan updated successfully')
  } catch (e: any) {
    console.error(e)
    toast.error(e?.message || 'Update failed')
  } finally {
    closeEdit()
  }
}


  const handleDelete = async (id: number) => {
  if (!window.confirm('Are you sure you want to delete this manual/plan?')) return
  try {
  await softDeleteManualPlan(id)
  setManualsPlansData(prev => prev.filter(r => r.id !== id))

  // ✅ success toast
  toast.success('Manual/Plan deleted successfully')
} catch (e: any) {
  console.error(e)
  toast.error(e?.message || 'Delete failed')
}

}

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return 'pdf'
    if (type.includes('word') || type.includes('document')) return 'word'
    if (type.includes('excel') || type.includes('sheet')) return 'excel'
    if (type.includes('powerpoint') || type.includes('presentation')) return 'powerpoint'
    return 'document-text'
  }

  const truncateText = (text: string, maxLength: number = 100) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // ---- PDF helpers ----
const fmtDDMonYYYY = (iso?: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dd = String(d.getDate()).padStart(2, '0')
  return `${dd}-${months[d.getMonth()]}-${d.getFullYear()}`
}

const resolveCompanyName = () => {
  // If top-level user, find selected company name from dropdown
  if (isTopLevel) {
    const c = companies.find(c => c.id === Number(selectedCompanyId))
    return c?.name || '—'
  }
  // Scoped users: try to read from currentUser
  const cu: any = currentUser || {}
  return (
    cu?.companyGroupAdmin?.name ||
    cu?.companyGroupAdminName ||
    cu?.cga?.name ||
    cu?.cgaid?.name ||
    '—'
  )
}

const exportTableToPDF = () => {
  const companyName = resolveCompanyName()
  const generatedOn = fmtDDMonYYYY(new Date().toISOString())
  const title = 'Manuals & Plans'
  const subtitle = `Company: ${companyName}   |   Exported: ${generatedOn}`
  const total = sortedData.length

  if (!effectiveCompanyId || total === 0) {
    toast.info('Nothing to export.')
    return
  }

  // Build rows from ALL filtered+sorted records (not just current page)
  const rows = sortedData.map((r, idx) => ([
    String(idx + 1),
    r.name || '-',
    r.dateOfApproval ? fmtDDMonYYYY(r.dateOfApproval) : '-',
    String(r.revisionCount ?? '-'),
    r.approvedBy || '-',
    (r.uploadedByName && r.uploadedByName.trim()) ? r.uploadedByName : '-',
    r.file?.name || '-',
    r.file?.size != null ? formatFileSize(Number(r.file.size)) : '-',
    (r.remarks || '-') as string,
  ]))

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  // Page metrics
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Keep left/right margins consistent so table never touches edges
  const marginX = 40
  const startY = 95

  // Header
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text(title, marginX, 40)
  doc.setFontSize(11)
  doc.text(subtitle, marginX, 60)
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Total records: ${total}`, marginX, 78)

  // Table head
  const head = [[
    'SR/NO',
    'PLAN / MANUAL',
    'DATE OF APPROVAL',
    'REVISION NO',
    'APPROVED BY',
    'CREATED BY',
    'FILE NAME',
    'FILE SIZE',
    'REMARKS',
  ]]

  // IMPORTANT: These widths are tuned to fit inside A4 landscape with margins:
  // Sum ≈ 755pt (page ~842pt - 2*40pt margins ≈ 762pt available)
  const colWidths = {
    0: { cellWidth: 30 },   // SR/NO
    1: { cellWidth: 120 },  // PLAN / MANUAL
    2: { cellWidth: 70 },   // DATE OF APPROVAL
    3: { cellWidth: 55 },   // REVISION NO
    4: { cellWidth: 85 },   // APPROVED BY
    5: { cellWidth: 85 },   // CREATED BY
    6: { cellWidth: 110 },  // FILE NAME
    7: { cellWidth: 50 },   // FILE SIZE
    8: { cellWidth: 150 },  // REMARKS  (was overflowing before)
  }

  // Build table
  ;(doc as any).autoTable({
    head,
    body: rows,
    startY,
    margin: { left: marginX, right: marginX },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      overflow: 'linebreak', // wrap long text (esp. Remarks)
      valign: 'top',
    },
    headStyles: {
      fillColor: [231, 238, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: colWidths,
    theme: 'grid',
    tableLineWidth: 0.3,
    tableLineColor: [200, 200, 200],
    didDrawPage: () => {
      const page = doc.getNumberOfPages()
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(`Page ${page}`, pageWidth - marginX - 60, pageHeight - 20)
    },
    // Avoid rows painting outside table area on split
    rowPageBreak: 'auto',
    pageBreak: 'auto',
  })

  doc.save(`Manuals_Plans_${companyName.replace(/[^\w]+/g, '_')}_${generatedOn}.pdf`)
}

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            {/* Header */}
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Manuals & Plans</h3>
              </div>
             <div className='card-toolbar'>
  {canAddManualPlan && (
    <button
      type='button'
      className='btn btn_primary'
      onClick={() => setIsModalVisible(true)}
    >
      <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
      Add Manual/Plan
    </button>
  )}
</div>
            </div>

            
            <div className='card-body py-4 bg-white border-top'>
              {/* Search and Filters */}
             <div className='row g-3 align-items-end mb-4'>

    {/* LEFT: Company (if top-level) + Search (always) */}
    <div className='col-lg-8'>
      <div className='row g-3 align-items-end'>

        {/* Company (Company Group) — only for top-level users */}
        {isTopLevel && (
          <div className='col-auto'>
            <label className='form-label text-muted fw-semibold fs-7 mb-2'>Company</label>
            <div style={{ maxWidth: 260, width: '100%' }}>
              <select
                className='form-select form-select-sm'
                value={selectedCompanyId || ''}
                onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : '')}
                disabled={isLoadingCompanies}
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Search — sits to the right of company (or takes its place if scoped user) */}
        <div className='col-auto'>
          <label className='form-label text-muted fw-semibold fs-7 mb-2'>Search</label>
          <div className='d-flex align-items-center'>
            <div
              className='position-relative'
              style={{ maxWidth: 340, width: '100%' }}  // <-- fixed upper bound, responsive downwards
            >
              <div
                className='position-absolute ms-3'
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                <KTSVG path='/media/icons/duotune/general/gen021.svg' className='svg-icon-2' />
              </div>
              <input
                type='text'
                className='form-control form-control-sm ps-10'
                placeholder='Search manuals and plans...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Clear button only when there is text; sits to the right of the search bar */}
            {searchTerm && (
              <button
                type='button'
                className='btn btn-outline-secondary btn-sm ms-2'
                onClick={() => setSearchTerm('')}
                title='Clear search'
              >
                Clear
              </button>
            )}
          </div>
        </div>

      </div>
    </div>

    {/* RIGHT: Actions (Export) */}
    <div className='col-lg-4 d-flex justify-content-end'>
      <button
        type='button'
        className='btn btn-light-primary btn-sm'
        onClick={exportTableToPDF}
        disabled={!effectiveCompanyId || sortedData.length === 0}
        title={!effectiveCompanyId ? 'Select a company first' : (sortedData.length === 0 ? 'No data to export' : 'Export to PDF')}
      >
        <KTSVG path='/media/icons/duotune/general/gen005.svg' className='svg-icon-2' />
        Export
      </button>
    </div>

  </div>


              {/* Table */}
              <div className='report-table table-responsive'>
                {loading && <div className='text-muted px-3 pb-2'>Loading...</div>}
{/* {error && <div className='text-danger px-3 pb-2'>{error}</div>} */}

                <table className='table table-bordered align-middle'>
                  <thead className='table-header text-start'>
                    <tr>
                      <th className='text-center' style={{ minWidth: '80px' }}>SR/NO</th>
                      <th onClick={() => handleSort('name')} className='cursor-pointer' style={{ minWidth: '200px' }}>
                        <div className='d-flex align-items-center'>
                          PLANS/MANUAL
                          <div style={{ transform: 'translateY(-2px)' }}>
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'name'
                                  ? sortConfig.direction === 'asc'
                                    ? 'up-black'
                                    : 'down-black'
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </div>
                        </div>
                      </th>
                      <th onClick={() => handleSort('dateOfApproval')} className='cursor-pointer text-nowrap' style={{ minWidth: '120px' }}>
                        <div className='d-flex align-items-center'>
                          DATE OF APPROVAL
                          <div style={{ transform: 'translateY(-2px)' }}>
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'dateOfApproval'
                                  ? sortConfig.direction === 'asc'
                                    ? 'up-black'
                                    : 'down-black'
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </div>
                        </div>
                      </th>
                      <th onClick={() => handleSort('revisionCount')} className='cursor-pointer text-nowrap' style={{ minWidth: '120px' }}>
                        <div className='d-flex align-items-center'>
                          REVISION NO
                          <div style={{ transform: 'translateY(-2px)' }}>
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'revisionCount'
                                  ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black')
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </div>
                        </div>
                      </th>
                      <th onClick={() => handleSort('approvedBy')} className='cursor-pointer text-nowrap' style={{ minWidth: '120px' }}>
                        <div className='d-flex align-items-center'>
                          APPROVED BY
                          <div style={{ transform: 'translateY(-2px)' }}>
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'approvedBy'
                                  ? sortConfig.direction === 'asc'
                                    ? 'up-black'
                                    : 'down-black'
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </div>
                        </div>
                      </th>
                      <th onClick={() => handleSort('uploadedByName')} className='cursor-pointer text-nowrap' style={{ minWidth: '120px' }}>
  <div className='d-flex align-items-center'>
    CREATED BY
    <div style={{ transform: 'translateY(-2px)' }}>
      <KTSVG
        path={`/media/map/sort-col-${
          sortConfig.key === 'uploadedByName'
            ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black')
            : 'grey'
        }.svg`}
        className='svg-icon ms-2 custom-sort-icon'
      />
    </div>
  </div>
</th>
                      <th className='text-center' style={{ minWidth: '150px' }}>FILE</th>
                      <th style={{ minWidth: '200px' }}>REMARKS</th>
                      <th className='text-center' style={{ minWidth: '100px' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className='table-body text-start'>
                    {currentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={9} className='text-center text-muted py-5'>
                          No manuals or plans found for the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      currentRecords.map((record, index) => (
                        <tr key={record.id}>
                          <td className='text-center'>{index + 1}</td>
                          <td className='text-dark fw-bold fs-6'>
                            {record.name}
                            <div className='text-muted fs-8'>
                              Uploaded: {formatDate(record.uploadedDate)}
                            </div>
                          </td>
                          <td className='text-dark fs-6'>
                            {formatDate(record.dateOfApproval)}
                          </td>
                          <td className='text-dark fs-6 text-nowrap'>
                            {record.revisionCount || '-'}
                          </td>
                          <td className='text-dark fs-6 text-nowrap'>
                            {record.approvedBy || '-'}
                          </td>
                          <td className='text-dark fs-6 text-nowrap'>
  {record.uploadedByName && record.uploadedByName.trim() ? record.uploadedByName : '-'}
</td>

                          <td className='text-center'>
                            <div className='d-flex align-items-center justify-content-left text-nowrap'>
                             
                                <KTSVG
                                  path='/media/icons/duotune/files/fil003.svg'
                                  className='svg-icon-3'
                                />
                              
                              <div className='text-start'>
                                <div className='text-dark fs-8 fw-bold'>
                                  {record.file.name.length > 20
                                    ? record.file.name.substring(0, 20) + '...'
                                    : record.file.name}
                                </div>
                                <div className='text-muted fs-9'>
                                  {formatFileSize(record.file.size)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='text-gray-600 fs-7 text-nowrap'>
                            <div title={record.remarks || ''}>
                              {record.remarks ? truncateText(record.remarks, 50) : '-'}
                            </div>
                          </td>
                          <td className='text-center'>
  <div className='d-flex align-items-center justify-content-center'>
    <button
      className='btn btn-icon btn-sm me-1'
      title='View'
      onClick={() => setSelectedManual(record)}
    >
      <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3 text-primary' />
    </button>

       <button
      className='btn btn-icon btn-sm me-1'
      title='Edit'
      onClick={() => openEdit(record)}
    >
      <KTSVG path='/media/map/edit-active.svg' className='' />
    </button>
<button
  className='btn btn-icon btn-sm me-1'
  title='History'
  onClick={() => setRevModal({ id: record.id, name: record.name, visible: true })}
>
  <KTSVG path='/media/icons/duotune/abstract/abs026.svg' className='svg-icon-3 text-info' />
</button>

    <button
      className='btn btn-icon btn-sm'
      title='Delete'
      onClick={() => handleDelete(record.id)}
    >
      <KTSVG path='/media/map/trash.svg' className='' />
    </button>
  </div>
</td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {/* Pagination */}
                <div className='pagination-wrapper d-flex justify-content-between align-items-center py-3'>
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
                      Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedData.length)}</strong> of <strong>{sortedData.length}</strong>
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

                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
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
                            disabled={currentPage === totalPages}
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
          </div>
        </div>
      </div>
      {/* Manual/Plan Viewer */}
{selectedManual && (
  <ManualPlanViewer
    manual={{
      id: selectedManual.id,
      name: selectedManual.name,
      uploadedDate: selectedManual.uploadedDate,
      file: { name: selectedManual.file?.name || selectedManual.name },
      remarks: selectedManual.remarks,
    }}
    onClose={() => setSelectedManual(null)}
  />
)}


      {/* Add Manual/Plan Modal */}
      <AddManualPlanModal
  visible={isModalVisible}
  onClose={() => setIsModalVisible(false)}
  onSubmit={handleAddManualPlan}

  // NEW props
  isTopLevel={isTopLevel}
  companies={companies}
  selectedCompanyId={selectedCompanyId}
  setSelectedCompanyId={setSelectedCompanyId}
  isLoadingCompanies={isLoadingCompanies}

  // For scoped users (company, operator under company, subcompany, crew)
  derivedCompanyGroupId={isCompanyScoped ? (myCgaId ?? null) : null}
/>

{/* Edit Manual/Plan Modal */}
{isEditVisible && editingRecord && (
  <EditManualPlanModal
    visible={isEditVisible}
    onClose={closeEdit}
    record={editingRecord}
    onSubmit={handleEditManualPlan}
    onViewFile={(id) => {
      // Use the full record so file has url/type/size
      setSelectedManual(editingRecord) 
    }}
    companyName={resolveCompanyName()}
  />
)}

<ManualPlanRevisionsModal
  manualId={revModal.id}
  name={revModal.name}
  visible={revModal.visible}
  onClose={() => setRevModal(s => ({...s, visible:false}))}
/>



<ToastContainer
  position="top-center"
  newestOnTop
  closeOnClick
  pauseOnHover={false}
  autoClose={3000}
  theme="colored"
/>


    </div>
  )
}

export default ManualsAndPlans