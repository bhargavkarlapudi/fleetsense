import { FC, useState, useMemo, useEffect } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'
import AddAllotmentModal from './AddAllotmentModal'
import { getCrewList, getRanks } from '../core/_requests'
import { Crew, Rank } from '../core/_models'

const CrewAllotment: FC = () => {
// Define type for Crew Allotment
  interface CrewAllotmentType {
    id: number;
    name: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
    payeeName: string;
    percentage: string;
  }

  // State for sorting and pagination
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CrewAllotmentType | null;
    direction: 'asc' | 'desc';
  }>({
    key: 'name',
    direction: 'asc',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [crewMembers, setCrewMembers] = useState<{ id: number; name: string; rank: string }[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);

  useEffect(() => {
    const fetchCrewAndRanks = async () => {
      setLoading(true);
      try {
        const [crewData, ranksData] = await Promise.all([
          getCrewList(),
          getRanks(),
        ]);

        const ranksMap = new Map(ranksData.map((rank) => [rank.id, rank.rank]));

        const enrichedCrew = crewData.map((crew) => ({
          id: crew.id,
          name: crew.name,
          rank: ranksMap.get(crew.rankId) || 'Unknown Rank',
        }));

        setCrewMembers(enrichedCrew);
        setRanks(ranksData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCrewAndRanks();
  }, []);

  const handleAddModalOpen = () => {
    setIsAddModalOpen(true);
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
  };

  const handleAddAllotmentSubmit = (allotmentEntry: Omit<CrewAllotmentType, 'id'>) => {
    const newEntry: CrewAllotmentType = {
      id: Date.now(), // Simple ID generation
      ...allotmentEntry
    };
    setCrewAllotments(prevAllotments => [...prevAllotments, newEntry]);
    handleAddModalClose();
  };

  // Placeholder crew allotments
  const [crewAllotments, setCrewAllotments] = useState<CrewAllotmentType[]>([
    { id: 1, name: 'John Doe', bankName: 'State Bank of India', accountNumber: '1234567890123456', ifsc: 'SBIN0001234', payeeName: 'John Doe', percentage: '60%' },
    { id: 2, name: 'Jane Smith', bankName: 'HDFC Bank', accountNumber: '9876543210987654', ifsc: 'HDFC0004567', payeeName: 'Jane Smith', percentage: '40%' },
    // Add more if needed
  ]);

  const handleSort = (key: keyof CrewAllotmentType) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDelete = (id: number) => {
    setCrewAllotments(crewAllotments.filter((allotment) => allotment.id !== id));
  };

  const sortedAllotments = useMemo(() => {
    let sortableItems = [...crewAllotments];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key!;
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal === undefined || bVal === undefined) {
          return 0;
        }
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [crewAllotments, sortConfig]);

  const indexOfLastAllotment = currentPage * rowsPerPage;
  const indexOfFirstAllotment = indexOfLastAllotment - rowsPerPage;
  const currentAllotments = sortedAllotments.slice(indexOfFirstAllotment, indexOfLastAllotment);
  const totalPages = Math.ceil(sortedAllotments.length / rowsPerPage);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className='d-flex flex-column flex-column-fluid'>
      <div className='card flex-column-fluid d-flex flex-column bg-white' style={{ flex: 1 }}>
        <div className='px-5 py-3' style={{ backgroundColor: '#ffffff' }}>
          <div className='d-flex justify-content-between'>
            <h3 className='card-title fw-bold text-dark'>Crew Allotment</h3>
            <button className="btn btn-primary" onClick={handleAddModalOpen}>Add Allotment</button>
          </div>
        </div>
        <div className='border-top pt-5 px-5'>
          <div className="report-table table-responsive">
            <table className="table table-bordered align-middle" style={{ tableLayout: 'fixed' }}>
              <thead className="table-header text-start">
                <tr>
                  <th onClick={() => handleSort('name')} className="cursor-pointer" style={{ width: '14.28%', paddingLeft: "1rem" }}>
                    NAME
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('bankName')} className="cursor-pointer" style={{ width: '14.28%' }}>
                    BANK NAME
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'bankName' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('accountNumber')} className="cursor-pointer" style={{ width: '14.28%' }}>
                    ACCOUNT NUMBER
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'accountNumber' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('ifsc')} className="cursor-pointer" style={{ width: '14.28%' }}>
                    IFSC
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'ifsc' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('payeeName')} className="cursor-pointer" style={{ width: '14.28%' }}>
                    PAYEE NAME
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'payeeName' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th onClick={() => handleSort('percentage')} className="cursor-pointer" style={{ width: '14.28%' }}>
                    PERCENTAGE
                    <KTSVG
                      path={`/media/map/sort-col-${sortConfig.key === 'percentage' ? (sortConfig.direction === 'asc' ? 'up-black' : 'down-black') : 'grey'}.svg`}
                      className="svg-icon ms-2 custom-sort-icon"
                    />
                  </th>
                  <th style={{ width: '14.32%' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody className="table-body text-start">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-3">
                      <div className="d-flex justify-content-center align-items-center">
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Loading allotments...
                      </div>
                    </td>
                  </tr>
                ) : currentAllotments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-3">
                      No allotments found.
                    </td>
                  </tr>
                ) : (
                  currentAllotments.map((allotment) => (
                    <tr key={allotment.id}>
                      <td style={{ paddingLeft: "1rem" }}>{allotment.name}</td>
                      <td>{allotment.bankName}</td>
                      <td>{allotment.accountNumber}</td>
                      <td>{allotment.ifsc}</td>
                      <td>{allotment.payeeName}</td>
                      <td>{allotment.percentage}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(allotment.id)}
                          className="btn btn-sm px-0"
                          title="Delete Allotment"
                        >
                          <KTSVG path="/media/map/trash.svg" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="pagination-wrapper d-flex justify-content-between align-items-center py-3">
              <div className="d-flex align-items-center">
                <span className="text-muted me-2">Rows per page</span>
                <select
                  className="form-select"
                  style={{
                    borderRadius: "20px",
                    width: "70px",
                    border: "1px solid #dee2e6",
                    fontSize: "14px",
                    padding: "4px 8px"
                  }}
                  value={rowsPerPage}
                  onChange={handleRowsPerPageChange}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="d-flex align-items-center">
                <span className="text-muted me-3" style={{ fontSize: "14px" }}>
                  Showing <strong>{((currentPage - 1) * rowsPerPage) + 1}-{Math.min(currentPage * rowsPerPage, sortedAllotments.length)}</strong> of <strong>{sortedAllotments.length}</strong>
                </span>

                <nav>
                  <ul className="pagination pagination-sm mb-0" style={{ gap: "2px" }}>
                    <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                      <button
                        className="page-link text-muted"
                        style={{
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #dee2e6",
                          padding: "8px 12px",
                          fontSize: "14px",
                          borderRadius: "6px"
                        }}
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        ‹
                      </button>
                    </li>

                    {(() => {
                      const pages = [];
                      const showPages = 5; // Show 5 page numbers at most
                      let startPage = Math.max(1, currentPage - 2);
                      let endPage = Math.min(totalPages, startPage + showPages - 1);

                      if (endPage - startPage < showPages - 1) {
                        startPage = Math.max(1, endPage - showPages + 1);
                      }

                      if (startPage > 1) {
                        pages.push(
                          <li key={1} className="page-item">
                            <button
                              className="page-link text-muted"
                              style={{
                                backgroundColor: "#f8f9fa",
                                border: "1px solid #dee2e6",
                                padding: "8px 12px",
                                fontSize: "14px",
                                minWidth: "40px",
                                borderRadius: "6px"
                              }}
                              onClick={() => handlePageChange(1)}
                            >
                              1
                            </button>
                          </li>
                        );

                        if (startPage > 2) {
                          pages.push(
                            <li key="ellipsis1" className="page-item disabled">
                              <span className="page-link border-0 text-muted" style={{ backgroundColor: "transparent", padding: "4px 8px" }}>
                                ...
                              </span>
                            </li>
                          );
                        }
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <li key={i} className={`page-item ${currentPage === i ? "active" : ""}`}>
                            <button
                              className="page-link text-muted"
                              style={{
                                backgroundColor: currentPage === i ? "#F4F9FF" : "transparent",
                                border: "1px solid #dee2e6",
                                padding: "8px 12px",
                                fontSize: "14px",
                                minWidth: "40px",
                                borderRadius: "6px",
                                outline: "none",
                                boxShadow: "none"
                              }}
                              onClick={() => handlePageChange(i)}
                            >
                              {i}
                            </button>
                          </li>
                        );
                      }

                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <li key="ellipsis2" className="page-item disabled">
                              <span className="page-link border-0 text-muted" style={{ backgroundColor: "transparent", padding: "4px 8px" }}>
                                ...
                              </span>
                            </li>
                          );
                        }

                        pages.push(
                          <li key={totalPages} className="page-item">
                            <button
                              className="page-link text-muted"
                              style={{
                                backgroundColor: "#f8f9fa",
                                border: "1px solid #dee2e6",
                                padding: "8px 12px",
                                fontSize: "14px",
                                minWidth: "40px",
                                borderRadius: "6px"
                              }}
                              onClick={() => handlePageChange(totalPages)}
                            >
                              {totalPages}
                            </button>
                          </li>
                        );
                      }

                      return pages;
                    })()}

                    <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                      <button
                        className="page-link text-muted"
                        style={{
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #dee2e6",
                          padding: "8px 12px",
                          fontSize: "14px",
                          borderRadius: "6px"
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
      
      <AddAllotmentModal
        isOpen={isAddModalOpen}
        onClose={handleAddModalClose}
        onSubmit={handleAddAllotmentSubmit}
        crewMembers={crewMembers}
      />
    </div>
  )
}

export default CrewAllotment