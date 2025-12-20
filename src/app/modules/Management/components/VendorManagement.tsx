import React, { useState, useEffect, useMemo } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { getVendors, getVendorCategories } from '../core/_requests'
import type { Vendor, VendorCategory } from '../core/_models'
import { useAuth } from '../../auth'
import AddVendorModal from './AddVendorModal'

interface VendorRow {
  id: number
  code: string
  name: string
  email: string
  password: string | null
  contactNo: string
  altContactNo: string
  tag: string
  categoryIds: number[]
  totalOrders: number
  avgDeliveryDays: number
  issueCount: number
  companyName?: string
}

const VendorManagement = () => {
  const [vendors, setVendors] = useState<VendorRow[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const { currentUser } = useAuth()

  const roleId = useMemo(() => {
    const role = (currentUser as any)?.uid?.role ?? (currentUser as any)?.role
    return typeof role === 'number' ? role : role?.id ?? 0
  }, [currentUser])

  const myCompanyGroupAdminId = useMemo(() => {
    return (currentUser as any)?.companyGroupAdminId ??
      (currentUser as any)?.companyGroupAdmin?.id ??
      null
  }, [currentUser])

  const [showAddVendorModal, setShowAddVendorModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof VendorRow | null
    direction: 'asc' | 'desc'
  }>({ key: null, direction: 'asc' })

  const [companyAdmins, setCompanyAdmins] = useState<any[]>([])
  const [visiblePasswords, setVisiblePasswords] = useState<Set<number>>(new Set())
  const [copiedPasswords, setCopiedPasswords] = useState<Set<number>>(new Set())
  const [vendorCategories, setVendorCategories] = useState<VendorCategory[]>([])

  const loadVendors = async () => {
    setLoading(true)
    try {
      const vendorList = await getVendors()

      let filtered: Vendor[] = vendorList
      if (roleId === 1) {
        filtered = vendorList
      } else if (roleId === 5 && myCompanyGroupAdminId != null) {
        const cga = Number(myCompanyGroupAdminId)
        filtered = vendorList.filter(v => Number(v.cgaid) === cga)
      } else {
        filtered = []
      }

      const companyById = new Map<number, string>(
        companyAdmins.map(c => [Number(c.id), String(c.name || `#${c.id}`)])
      )

      const showCompanyCol = roleId === 1
      const mapped: VendorRow[] = filtered.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        email: v.email,
        password: v.password,
        contactNo: v.contactNo,
        altContactNo: v.altContactNo,
        tag: v.tag,
        categoryIds: v.categoryIds,
        totalOrders: v.totalOrders,
        avgDeliveryDays: v.avgDeliveryDays,
        issueCount: v.issueCount,
        companyName: showCompanyCol
          ? (v.cgaid != null ? (companyById.get(Number(v.cgaid)) || `#${v.cgaid}`) : '— Superadmin —')
          : undefined,
      }))

      setVendors(mapped)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load vendors', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    loadVendors()
    loadVendorCategories()
  }, [roleId, myCompanyGroupAdminId])

  const loadVendorCategories = async () => {
    try {
      const categories = await getVendorCategories()
      setVendorCategories(categories)
    } catch (e: any) {
      console.error('Error loading vendor categories:', e)
    }
  }


  const handleSort = (key: keyof VendorRow) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const filteredVendors = vendors.filter(vendor =>
    (vendor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (roleId === 1 && (vendor.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const sortedVendors = useMemo(() => {
    let sorted = [...filteredVendors]
    if (sortConfig.key !== null) {
      sorted.sort((a, b) => {
        const aVal = String((a as any)[sortConfig.key!] ?? '').toLowerCase()
        const bVal = String((b as any)[sortConfig.key!] ?? '').toLowerCase()
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    } else {
      sorted.sort((a, b) => b.id - a.id)
    }
    return sorted
  }, [filteredVendors, sortConfig])

  const indexOfLastVendor = currentPage * rowsPerPage
  const indexOfFirstVendor = indexOfLastVendor - rowsPerPage
  const currentVendors = sortedVendors.slice(indexOfFirstVendor, indexOfLastVendor)
  const totalPages = Math.ceil(sortedVendors.length / rowsPerPage)

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1)
  }

  // Export Vendors to PDF
  const exportVendorsToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })

      // Title
      doc.setFontSize(16)
      doc.text('Vendor Management', 14, 15)

      // Subtitle with date
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22)
      doc.text(`Total Vendors: ${sortedVendors.length}`, 14, 28)

      // Prepare table data based on role
      const tableData = sortedVendors.map(vendor => {
        const categories = vendor.categoryIds.length > 0
          ? vendor.categoryIds
            .map(id => vendorCategories.find(c => c.id === id)?.name || id)
            .join(', ')
          : '-'

        const baseData = [
          vendor.code || '',
          vendor.name || '',
          vendor.email || '',
          vendor.contactNo || '',
          vendor.tag || '',
          categories,
          vendor.totalOrders?.toString() || '0',
          vendor.avgDeliveryDays?.toString() || '0',
          vendor.issueCount?.toString() || '0'
        ]

        // Add company name for superadmin (role 1)
        if (roleId === 1) {
          return [vendor.companyName || '', ...baseData]
        }
        return baseData
      })

      // Define table headers based on user role
      const headers = roleId === 1
        ? [['Company', 'Code', 'Name', 'Email', 'Contact', 'Tag', 'Categories', 'Total Orders', 'Avg Delivery Days', 'Issue Count']]
        : [['Code', 'Name', 'Email', 'Contact', 'Tag', 'Categories', 'Total Orders', 'Avg Delivery Days', 'Issue Count']]

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
          columnStyles: roleId === 1 ? {
            0: { cellWidth: 30 },  // Company
            1: { cellWidth: 22 },  // Code
            2: { cellWidth: 35 },  // Name
            3: { cellWidth: 40 },  // Email
            4: { cellWidth: 28 },  // Contact
            5: { cellWidth: 20 },  // Tag
            6: { cellWidth: 35 },  // Categories
            7: { cellWidth: 22 },  // Total Orders
            8: { cellWidth: 25 },  // Avg Delivery Days
            9: { cellWidth: 20 },  // Issue Count
          } : {
            0: { cellWidth: 25 },  // Code
            1: { cellWidth: 40 },  // Name
            2: { cellWidth: 50 },  // Email
            3: { cellWidth: 32 },  // Contact
            4: { cellWidth: 22 },  // Tag
            5: { cellWidth: 45 },  // Categories
            6: { cellWidth: 25 },  // Total Orders
            7: { cellWidth: 28 },  // Avg Delivery Days
            8: { cellWidth: 22 },  // Issue Count
          },
          margin: { top: 35, left: 10, right: 10 },
          pageBreak: 'auto',
          tableLineWidth: 0.1,
          tableLineColor: [200, 200, 200],
        })

      // Save the PDF
      doc.save(`Vendor_List_${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF exported successfully!', { position: 'top-center' })
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('Failed to export PDF', { position: 'top-center' })
    }
  }

  const togglePasswordVisibility = (vendorId: number) => {
    const newVisible = new Set(visiblePasswords)
    if (newVisible.has(vendorId)) {
      newVisible.delete(vendorId)
    } else {
      newVisible.add(vendorId)
    }
    setVisiblePasswords(newVisible)
  }

  const copyPasswordToClipboard = (vendorId: number, password: string) => {
    navigator.clipboard.writeText(password).then(() => {
      setCopiedPasswords(prev => new Set([...Array.from(prev), vendorId]))
      toast.success('Password copied to clipboard!', {
        position: 'top-center',
        autoClose: 2000
      })
      setTimeout(() => {
        setCopiedPasswords(prev => {
          const newSet = new Set(prev)
          newSet.delete(vendorId)
          return newSet
        })
      }, 2000)
    }).catch(() => {
      toast.error('Failed to copy password', {
        position: 'top-center'
      })
    })
  }


  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
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

      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>Vendor Management</h3>
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
                  onClick={exportVendorsToPDF}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr078.svg' className='svg-icon-2' />
                  Export
                </button>
                <button
                  type='button'
                  className='btn btn_primary'
                  onClick={() => setShowAddVendorModal(true)}
                >
                  <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                  Add Vendor
                </button>
              </div>
            </div>

            <div className='card-body py-4 bg-white border-top'>
              <div className='row g-3 align-items-end mb-4'>
                <div className='col-md-6'>
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
                      placeholder='Search vendors...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>


              <div className='report-table table-responsive'>
                <table className='table table-bordered align-middle'>
                  <thead className='table-header text-start'>
                    <tr>
                      <th style={{ width: '90px' }}>SR/NO</th>
                      <th onClick={() => handleSort('code')} className='cursor-pointer'>
                        <div className='d-flex align-items-center'>
                          CODE
                          <div style={{ transform: 'translateY(-2px)' }}>
                            <KTSVG
                              path={`/media/map/sort-col-${sortConfig.key === 'code'
                                ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black'
                                : 'grey'
                                }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </div>
                        </div>
                      </th>
                      <th onClick={() => handleSort('name')} className='cursor-pointer'>
                        <div className='d-flex align-items-center'>
                          NAME
                          <div style={{ transform: 'translateY(-2px)' }}>
                            <KTSVG
                              path={`/media/map/sort-col-${sortConfig.key === 'name'
                                ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black'
                                : 'grey'
                                }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </div>
                        </div>
                      </th>
                      {roleId === 1 && (
                        <th onClick={() => handleSort('companyName' as keyof VendorRow)} className='cursor-pointer'>
                          <div className='d-flex align-items-center'>
                            COMPANY
                            <div style={{ transform: 'translateY(-2px)' }}>
                              <KTSVG
                                path={`/media/map/sort-col-${sortConfig.key === 'companyName'
                                  ? sortConfig.direction === 'asc' ? 'up-black' : 'down-black'
                                  : 'grey'
                                  }.svg`}
                                className='svg-icon ms-2 custom-sort-icon'
                              />
                            </div>
                          </div>
                        </th>
                      )}
                      <th onClick={() => handleSort('email')} className='cursor-pointer'>EMAIL</th>
                      <th onClick={() => handleSort('contactNo')} className='cursor-pointer'>CONTACT</th>
                      <th>TAG</th>
                      <th>CATEGORIES</th>
                      <th>TOTAL ORDERS</th>
                      <th>AVG DELIVERY DAYS</th>
                      <th>ISSUE COUNT</th>
                      <th style={{ minWidth: '200px' }}>ACTIONS</th>
                    </tr>
                  </thead>


                  <tbody className='table-body text-start'>
                    {currentVendors.length === 0 ? (
                      <tr>
                        <td colSpan={roleId === 1 ? 12 : 11} className='text-center text-muted py-5'>
                          No vendors found.
                        </td>
                      </tr>
                    ) : (
                      currentVendors.map((vendor, idx) => (
                        <tr key={vendor.id}>
                          <td className='text-dark fs-6'>{indexOfFirstVendor + idx + 1}</td>
                          <td className='text-dark fw-semibold fs-6'>{vendor.code}</td>
                          <td className='text-dark fw-bold fs-6'>{vendor.name}</td>
                          {roleId === 1 && (
                            <td className='text-dark fs-6'>
                              {vendor.companyName === '— Superadmin —' ? (
                                <span className='badge rounded-pill bg-light text-muted border'>
                                  — Superadmin —
                                </span>
                              ) : (
                                vendor.companyName || '-'
                              )}
                            </td>
                          )}
                          <td className='text-dark fs-6'>{vendor.email}</td>
                          <td className='text-dark fs-6'>{vendor.contactNo}</td>
                          <td className='text-dark fs-6'>
                            <span className={`badge ${vendor.tag === 'NORMAL' ? 'bg-success' : 'bg-warning'}`}>
                              {vendor.tag}
                            </span>
                          </td>
                          <td className='text-dark fs-6'>
                            {vendor.categoryIds.length > 0
                              ? vendor.categoryIds
                                .map(id => vendorCategories.find(c => c.id === id)?.name || id)
                                .join(', ')
                              : '-'}
                          </td>
                          <td className='text-dark fs-6'>{vendor.totalOrders}</td>
                          <td className='text-dark fs-6'>{vendor.avgDeliveryDays}</td>
                          <td className='text-dark fs-6'>{vendor.issueCount}</td>
                          <td className='text-dark fs-6'>
                            <div className='d-flex align-items-center'>
                              <span style={{ fontFamily: 'monospace', minWidth: '80px' }}>
                                {vendor.password ? (visiblePasswords.has(vendor.id) ? vendor.password : '••••••••') : '••••••••'}
                              </span>
                              {vendor.password && (
                                <>
                                  <button
                                    onClick={() => togglePasswordVisibility(vendor.id)}
                                    className='btn btn-icon btn-sm ms-2'
                                    title={visiblePasswords.has(vendor.id) ? 'Hide password' : 'Show password'}
                                  >
                                    <KTSVG path='/media/map/ph_eye.svg' className='svg-icon-3' />
                                  </button>
                                  <button
                                    onClick={() => copyPasswordToClipboard(vendor.id, vendor.password!)}
                                    className={`btn btn-icon btn-sm ms-1 ${copiedPasswords.has(vendor.id) ? 'btn-success' : ''}`}
                                    title={copiedPasswords.has(vendor.id) ? 'Copied!' : 'Copy password'}
                                  >
                                    <KTSVG path={`/media/icons/duotune/general/${copiedPasswords.has(vendor.id) ? 'gen043' : 'gen054'}.svg`} className='svg-icon-3' />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>


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
                      Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedVendors.length)}</strong> of <strong>{sortedVendors.length}</strong>
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
                                    borderRadius: '6px'
                                  }}
                                  onClick={() => handlePageChange(i)}
                                >
                                  {i}
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


      <AddVendorModal
        visible={showAddVendorModal}
        onClose={() => setShowAddVendorModal(false)}
        onSubmit={() => {
          loadVendors()
          toast.success('Vendor created successfully!', { position: 'top-center' })
        }}
      />
    </div>
  )
}

export default VendorManagement
