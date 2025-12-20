import React, { FC, useState, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import AddAppraisalModal from './AddAppraisalModal'
import ViewAppraisalModal from './ViewAppraisalModal'
import ViewPreviousAppraisalsModal from './ViewPreviousAppraisalsModal'

interface AppraisalData {
  id: number
  name: string
  rank: string
  status: string
}

const Appraisal: FC = () => {
  console.log('Appraisal component loaded')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isViewPreviousModalOpen, setIsViewPreviousModalOpen] = useState(false)
  const [selectedAppraisal, setSelectedAppraisal] = useState<any>(null)

  // State to store submitted appraisals (most recent) - in production, this would come from an API
  const [submittedAppraisals, setSubmittedAppraisals] = useState<{[key: string]: any}>({
    // Sample data for demonstration
    'John Smith': { crewMember: 'John Smith', parameter: 'Communication Skills', remarks: 'Excellent communication', rating: 5 },
    'Mary Johnson': { crewMember: 'Mary Johnson', parameter: 'Technical Knowledge', remarks: 'Good technical skills', rating: 4 },
  })

  // State to store ALL appraisals for each crew member (for historical view)
  const [allAppraisals, setAllAppraisals] = useState<{[key: string]: any[]}>({
    // Sample historical data
    'John Smith': [
      { crewMember: 'John Smith', parameter: 'Communication Skills', remarks: 'Excellent communication with team members and superiors', rating: 5, date: '2024-01-15' },
      { crewMember: 'John Smith', parameter: 'Leadership', remarks: 'Shows strong leadership qualities during emergencies', rating: 4, date: '2024-02-20' },
      { crewMember: 'John Smith', parameter: 'Technical Skills', remarks: 'Proficient in navigation and ship operations', rating: 5, date: '2024-03-10' },
    ],
    'Mary Johnson': [
      { crewMember: 'Mary Johnson', parameter: 'Technical Knowledge', remarks: 'Excellent understanding of engine systems', rating: 4, date: '2024-01-20' },
      { crewMember: 'Mary Johnson', parameter: 'Problem Solving', remarks: 'Quick to identify and resolve technical issues', rating: 5, date: '2024-02-25' },
    ],
    'David Brown': [
      { crewMember: 'David Brown', parameter: 'Navigation Skills', remarks: 'Competent in chart work and GPS systems', rating: 4, date: '2024-01-18' },
    ]
  })

  const handleViewAppraisal = (crewName: string) => {
    const appraisal = submittedAppraisals[crewName];
    setSelectedAppraisal(appraisal);
    setIsViewModalOpen(true);
  };

  const handleViewModalClose = () => {
    setIsViewModalOpen(false);
    setSelectedAppraisal(null);
  };

  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'rank' | 'status' | null
    direction: 'asc' | 'desc'
  }>({
    key: null,
    direction: 'asc',
  })

  // Sample data - replace with actual API call
  const [appraisalData, setAppraisalData] = useState<AppraisalData[]>([
    { id: 1, name: 'John Smith', rank: 'Captain', status: 'Active' },
    { id: 2, name: 'Mary Johnson', rank: 'Chief Engineer', status: 'Active' },
    { id: 3, name: 'David Brown', rank: 'First Officer', status: 'Active' },
    { id: 4, name: 'Sarah Davis', rank: 'Second Engineer', status: 'On Leave' },
    { id: 5, name: 'Michael Wilson', rank: 'Bosun', status: 'Active' },
    { id: 6, name: 'Jennifer Garcia', rank: 'Cook', status: 'Active' },
    { id: 7, name: 'Robert Martinez', rank: 'AB Seaman', status: 'Active' },
    { id: 8, name: 'Lisa Anderson', rank: 'Oiler', status: 'On Leave' },
    { id: 9, name: 'James Taylor', rank: 'Ordinary Seaman', status: 'Active' },
    { id: 10, name: 'Patricia Thomas', rank: 'Wiper', status: 'Active' },
    { id: 11, name: 'Christopher Lee', rank: 'Steward', status: 'Active' },
    { id: 12, name: 'Amanda White', rank: 'Radio Officer', status: 'Active' },
  ])

  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1) // reset to first page
  }

  // Sort data
  const sortedData = [...appraisalData].sort((a, b) => {
    if (!sortConfig.key) return 0

    let valA: string | number = a[sortConfig.key]
    let valB: string | number = b[sortConfig.key]

    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  // Pagination calculations
  const indexOfLast = currentPage * rowsPerPage
  const indexOfFirst = indexOfLast - rowsPerPage
  const currentData = sortedData.slice(indexOfFirst, indexOfLast)
  const totalPages = Math.ceil(sortedData.length / rowsPerPage)

  const handleAppraisal = () => {
    setIsAddModalOpen(true)
  }

  const handleViewPreviousAppraisals = () => {
    setIsViewPreviousModalOpen(true)
  }

  const handleViewPreviousModalClose = () => {
    setIsViewPreviousModalOpen(false)
  }

  const handleAddAppraisalSubmit = (formData: any) => {
    const newAppraisal = { ...formData, date: new Date().toISOString().split('T')[0] }; // Add current date

    // Update the most recent appraisal
    setSubmittedAppraisals(prev => ({
      ...prev,
      [newAppraisal.crewMember]: newAppraisal
    }));

    // Add to the historical appraisals
    setAllAppraisals(prev => ({
      ...prev,
      [newAppraisal.crewMember]: [...(prev[newAppraisal.crewMember] || []), newAppraisal]
    }));
    
    setIsAddModalOpen(false)
  }

  const handleAddAppraisalClose = () => {
    setIsAddModalOpen(false)
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='container-fluid'>
            <div className='card'>
              <div className='card-header d-flex justify-content-between align-items-center bg-white'>
                <h3 className='card-title fw-bold'>Appraisal</h3>
                <div className='d-flex gap-2'>
                  <button className='btn btn-primary' onClick={handleAppraisal}>
                    Add Appraisal
                  </button>
                  <button className='btn btn-secondary' onClick={handleViewPreviousAppraisals}>
                    View Previous Appraisals
                  </button>
                </div>
              </div>

              <div className='card-body bg-white'>
                {/* Appraisal Table */}
                <div className='report-table table-responsive'>
                  <table className='table table-bordered align-middle'>
                    <thead className='table-header text-start'>
                      <tr>
                        <th 
                          onClick={() => handleSort('name')} 
                          className='cursor-pointer'
                          style={{ paddingLeft: '3rem' }}
                        >
                          NAME
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
                        </th>

                        <th onClick={() => handleSort('rank')} className='cursor-pointer'>
                          RANK
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'rank'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className='svg-icon ms-2 custom-sort-icon'
                          />
                        </th>

                        <th onClick={() => handleSort('status')} className='cursor-pointer'>
                          STATUS
                          <KTSVG
                            path={`/media/map/sort-col-${
                              sortConfig.key === 'status'
                                ? sortConfig.direction === 'asc'
                                  ? 'up-black'
                                  : 'down-black'
                                : 'grey'
                            }.svg`}
                            className='svg-icon ms-2 custom-sort-icon'
                          />
                        </th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className='table-body text-start'>
                      {currentData.length === 0 ? (
                        <tr>
                          <td colSpan={4} className='text-center text-muted py-3'>
                            No appraisal data available.
                          </td>
                        </tr>
                      ) : (
                        currentData.map((row) => (
                          <tr key={row.id}>
                            <td>{row.name}</td>
                            <td>{row.rank}</td>
                            <td>
                              <span
                                className={`badge ${
                                  row.status === 'Active' ? 'bg-success' : 'bg-warning'
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => {
                                  console.log('Edit appraisal for:', row.name)
                                  // Add your edit logic here
                                }}
                                className='btn btn-sm px-0 me-2'
                              >
                                <KTSVG path='/media/map/edit-active.svg' />
                              </button>
                              <button
                                onClick={() => handleViewAppraisal(row.name)}
                                className='btn btn-sm px-0'
                              >
                                <KTSVG path='/media/map/ph_eye.svg' />
                              </button>
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
                            const showPages = 5 // Show 5 page numbers at most
                            let startPage = Math.max(1, currentPage - 2)
                            let endPage = Math.min(totalPages, startPage + showPages - 1)

                            // Adjust start if we're near the end
                            if (endPage - startPage < showPages - 1) {
                              startPage = Math.max(1, endPage - showPages + 1)
                            }

                            // Add first page and ellipsis if needed
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
                                    <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>
                                      ...
                                    </span>
                                  </li>
                                )
                              }
                            }

                            // Add page numbers
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

                            // Add ellipsis and last page if needed
                            if (endPage < totalPages) {
                              if (endPage < totalPages - 1) {
                                pages.push(
                                  <li key='ellipsis2' className='page-item disabled'>
                                    <span className='page-link border-0 text-muted' style={{ backgroundColor: 'transparent', padding: '4px 8px' }}>
                                      ...
                                    </span>
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
      </div>
      
      <ViewAppraisalModal
        isOpen={isViewModalOpen}
        onClose={handleViewModalClose}
        appraisalData={selectedAppraisal}
      />

      {/* View Previous Appraisals Modal */}
      <ViewPreviousAppraisalsModal
        isOpen={isViewPreviousModalOpen}
        onClose={handleViewPreviousModalClose}
        crewMembers={appraisalData}
        allAppraisals={allAppraisals}
      />

      {/* Add Appraisal Modal */}
      <AddAppraisalModal
        isOpen={isAddModalOpen}
        onClose={handleAddAppraisalClose}
        onSubmit={handleAddAppraisalSubmit}
        crewMembers={appraisalData}
      />
    </div>
  )
}

export default Appraisal